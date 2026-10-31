'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.MARE_TEST_URL||'http://127.0.0.1:8165/',out=process.env.MARE_QA_DIR||require('node:os').tmpdir();
const hook="  window.__hudQA={get game(){return game},get world(){return world},stats:getDerived,refresh(){updateUI();renderPortrait();drawWorld();presentWorld()},save:saveGame,enterHunt,returnLobby,promote:promoteHierarchy,equipHead(){game.equipment.head=newItem(itemDefs[19]);updateUI();renderPortrait()}};\n  window.__mareDiagnostics=";
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const ctx=await browser.newContext({viewport:{width:1366,height:768}}),p=await ctx.newPage(),errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&/character-hud|Alabasta/.test(r.url()))missing.push(r.url())});
 await p.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));await p.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
 await p.route('**/game.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('  window.__mareDiagnostics=',hook).replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')})});
 await p.goto(base);await p.waitForFunction(()=>window.__hudQA&&__mareDiagnostics().lobby96.state==='ready');
 await p.locator('#characterName').fill("Bento D’Água");await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 assert.equal(await p.locator('#characterPosterToggle').count(),1,'one functional character-poster disclosure must exist');
 assert.equal(await p.locator('#characterPosterToggle').getAttribute('aria-expanded'),'false');assert(await p.locator('#characterPoster').isHidden());
 await p.evaluate(()=>document.fonts.load('24px "Alabasta Pirate"'));assert(await p.evaluate(()=>document.fonts.check('24px "Alabasta Pirate"')));assert.match(await p.locator('#wantedName').evaluate(e=>getComputedStyle(e).fontFamily),/Alabasta Pirate/);
 for(const ratio of [0,.25,1]){await p.evaluate(r=>{__hudQA.game.hp=__hudQA.stats().maxHP*r;__hudQA.game.energy=__hudQA.stats().maxEnergy*r;__hudQA.refresh()},ratio);for(const id of ['miniHP','miniEnergy']){const actual=await p.locator('#'+id).evaluate(e=>e.getBoundingClientRect().width/e.parentElement.getBoundingClientRect().width);assert(Math.abs(actual-ratio)<.012,id+' true fill at '+ratio)}}
 await p.evaluate(()=>{__hudQA.game.gold=987654321;__hudQA.game.xp=20;__hudQA.refresh()});assert.equal(await p.locator('#miniXP').getAttribute('style'),'width: 25%;');
 await p.locator('#characterPosterToggle').click();assert.equal(await p.locator('#characterPosterToggle').getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#wantedBounty').innerText(),'');assert.equal(await p.locator('#wantedName').innerText(),'Bento D’Água');
 assert(await p.locator('#wantedPortrait').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((v,i)=>i%4===3&&v>0)&&a[3]===0}),'shared portrait rendered');
 await p.locator('#characterPosterToggle').focus();await p.keyboard.press('Escape');assert(await p.locator('#characterPoster').isHidden());assert.equal(await p.evaluate(()=>document.activeElement.id),'characterPosterToggle');await p.keyboard.press('Enter');assert(await p.locator('#characterPoster').isVisible());await p.mouse.click(650,400);assert(await p.locator('#characterPoster').isHidden());

 const canonical=require('../hierarchy-system.js');
 for(const [faction,titles]of Object.entries(canonical.titles))for(let i=0;i<titles.length;i++){
  await p.evaluate(({faction,tier})=>{__hudQA.game.factionId=faction;__hudQA.game.hierarchyTier=tier;__hudQA.game.hierarchyFaction=faction;__hudQA.refresh()},{faction,tier:i+1});
  assert.equal(await p.locator('#hudHierarchyTitle').innerText(),titles[i]);
  assert(await p.locator('#hudHierarchyTitle').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'title fits '+titles[i]);
  await p.waitForFunction(()=>document.getElementById('hudRankArt').complete&&document.getElementById('hudRankArt').naturalWidth>0);
  assert.match(await p.locator('#hudFactionEmblem').getAttribute('src'),new RegExp('/'+faction+'.png$'));
 }
 await p.evaluate(async()=>{__hudQA.game.factionId='pirate';__hudQA.game.hierarchyFaction='pirate';__hudQA.game.hierarchyTier=3;__hudQA.game.level=75;await __hudQA.promote();__hudQA.refresh()});
 assert.equal(await p.locator('#hudHierarchyTitle').textContent(),'Supernova','existing promotion immediately updates HUD');
 assert.equal(await p.locator('#miniPortrait').count(),0);assert.equal(await p.locator('#miniName').count(),0);


 await p.locator('#characterPosterToggle').click();
 await p.evaluate(()=>__hudQA.equipHead());
 const portraits=[];
 for(const gender of ['masculino','feminino'])for(const hide of [false,true]){
  await p.evaluate(({gender,hide})=>{__hudQA.game.appearance96=MareCharacterAppearance.normalize({...__hudQA.game.appearance96,gender,hairStyle:'hair-swept',hairColor:'violet',skinColor:'brown'});__hudQA.game.preferences={...__hudQA.game.preferences,hideHeadgear:hide};__hudQA.refresh()},{gender,hide});
  await p.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await p.evaluate(()=>__hudQA.refresh());
  const portrait=await p.locator('#wantedPortrait').evaluate(c=>c.toDataURL());portraits.push(portrait);
  await p.screenshot({path:path.join(out,'hud-appearance-'+gender+'-'+hide+'.png')});
 }
 assert.equal(new Set(portraits).size,4,'body and helmet visibility alter the actual portrait');
 await p.keyboard.press('Escape');

 const layouts=[];
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[360,800],[320,568],[844,390]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(100);if(height<500&&await p.locator('#floatingChat').evaluate(e=>e.classList.contains('hud-open')))await p.locator('#chatCornerToggle').click();await p.evaluate(()=>__hudQA.refresh());
  const compact=await p.locator('.topbar').boundingBox();assert(compact.width<=width-16&&compact.x>=0&&compact.y>=0&&compact.height<=250,'compact profile fits '+width);

  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
  await p.screenshot({path:path.join(out,'hud-compact-'+width+'.png')});
  await p.locator('#characterPosterToggle').click();const poster=await p.locator('#characterPoster').boundingBox();assert(poster.x>=0&&poster.x+poster.width<=width&&poster.y+poster.height<=height+1,'expanded panel within viewport '+width);
  await p.locator('#characterPoster').evaluate(e=>e.scrollTop=e.scrollHeight);assert(await p.locator('#wantedBounty').isVisible());assert(await p.locator('#characterPoster').evaluate(e=>{const r=e.getBoundingClientRect();for(let y=r.top+8;y<r.bottom-8;y+=24)if(!e.contains(document.elementFromPoint(r.left+r.width/2,y)))return false;return true}),'expanded poster remains above other HUD controls '+width);await p.screenshot({path:path.join(out,'hud-poster-'+width+'.png')});
  const unchanged=await p.locator('.topbar').boundingBox();assert(Math.abs(unchanged.height-compact.height)<1,'poster does not displace other HUD widgets');layouts.push({width,height,compact,poster});await p.keyboard.press('Escape');
 }
 await p.setViewportSize({width:1366,height:768});await p.evaluate(()=>{__hudQA.game.name='<img src=x onerror=alert(1)>';__hudQA.refresh()});await p.locator('#characterPosterToggle').click();assert.equal(await p.locator('#wantedName img').count(),0,'names remain text');assert.equal(await p.locator('#wantedName').innerText(),'<img src=x onerror=alert(1)>');await p.keyboard.press('Escape');
 await p.evaluate(()=>{__hudQA.game.name='Bento D’Água';__hudQA.game.haki.unlocked=true;__hudQA.game.has_haki_unlocked=true;__hudQA.game.hp=__hudQA.stats().maxHP;__hudQA.refresh()});await p.locator('#miniWillpower').waitFor({state:'visible'});assert(await p.locator('#hakiQuickCast').isVisible());
 await p.locator('#attributePointsHud').click();await p.locator('#panelOverlay').waitFor({state:'visible'});await p.keyboard.press('Escape');
 await p.locator('#characterPosterToggle').click();await p.evaluate(()=>__hudQA.enterHunt());assert(await p.locator('#characterPoster').isHidden(),'scene transition closes poster');assert(await p.locator('#skill1').isVisible());await p.setViewportSize({width:320,height:568});await p.waitForTimeout(100);if(await p.locator('#floatingChat').evaluate(e=>e.classList.contains('hud-open')))await p.locator('#chatCornerToggle').click();if(await p.locator('#journeyToggle').getAttribute('aria-expanded')==='false')await p.locator('#journeyToggle').click();await p.locator('#huntRoute').click({timeout:3000});assert(await p.locator('#panelOverlay').isVisible(),'hunt routes remain reachable above mobile navigation');await p.keyboard.press('Escape');
 await p.evaluate(()=>{__hudQA.returnLobby();__hudQA.save()});const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('mare-partida-save-v1')));await p.reload();await p.waitForFunction(()=>window.__hudQA&&__hudQA.game);assert.equal(await p.locator('#wantedName').textContent(),'Bento D’Água');assert.equal(await p.locator('#hudHierarchyTitle').textContent(),'Supernova');assert.equal(await p.locator('#wantedBounty').textContent(),'');assert.equal(await p.locator('#characterPosterToggle').getAttribute('aria-expanded'),'false');assert.equal((await p.evaluate(()=>__hudQA.game.gold)),saved.gold);
 const touch=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,storageState:await ctx.storageState(),reducedMotion:'reduce'}),tp=await touch.newPage();tp.on('pageerror',e=>errors.push(e.message));await tp.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));await tp.route('**/__dev_version',r=>r.fulfill({body:'stable'}));await tp.goto(base);await tp.waitForFunction(()=>window.__mareDiagnostics&&__mareDiagnostics().lobby96.state==='ready');await tp.locator('#characterPosterToggle').tap();assert(await tp.locator('#characterPoster').isVisible(),'touch opens poster');await tp.locator('#characterPosterClose').tap();assert(await tp.locator('#characterPoster').isHidden(),'touch closes poster');await tp.screenshot({path:path.join(out,'hud-touch-reduced-motion.png')});await touch.close();
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({layouts,font:true,liveBars:true,bounty:null,reload:true,errors,missing},null,2));console.log(JSON.stringify({viewports:layouts.length,font:true,liveBars:true,bounty:null,keyboard:true,touch:true,reload:true,errors,missing}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
