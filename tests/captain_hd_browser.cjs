'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
 const page=await browser.newPage({viewport:{width:1448,height:1086}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 const hook='  window.__captainQA={get game(){return game},open:openPanel,close:closePanel,update:updateUI,save:saveGame,stats:getDerived,defs:itemDefs,newItem,portrait:renderPortrait,syncVfx:syncFruitVfx};window.__mareDiagnostics=';
 assert(source.includes('  window.__mareDiagnostics='));
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook)}));
 await page.goto(process.env.MARE_TEST_URL);await page.waitForFunction(()=>window.__captainQA);
 await page.locator('#characterName').fill('Navegante');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>__captainQA.game);
 await page.evaluate(()=>{
  const q=__captainQA,g=q.game;g.level=43;g.totalPlay=42540;g.stats.kills=2057;g.stats.damage=1365479;g.stats.goldEarned=98189;g.gold=1234;g.hierarchyTier=2;
  for(const slot of ['head','necklace','coat','legs','boots','cloak','gloves','ring','belt','charm']){
   const def=q.defs.findIndex(d=>d&&d.slot===slot);if(def>=0)g.equipment[slot]=q.newItem(q.defs[def],4,false);
  }
  const fruit=q.defs.findIndex(d=>d?.fruitId==='akuma_mera_mera');if(fruit>=0)g.equipment.akuma_no_mi=q.newItem(q.defs[fruit],1,false);
  q.syncVfx();q.update();q.save();
 });
 const open=async panel=>{await page.evaluate(p=>__captainQA.open(p),panel);await page.evaluate(()=>document.fonts.ready);};
 const shot=async name=>{await page.waitForFunction(()=>document.querySelectorAll('#toastContainer .toast').length===0);await page.screenshot({path:process.env.MARE_QA_DIR+'/'+name+'.png'});};
 const poster=page.locator('#characterPoster');
 await page.locator('#characterPosterToggle').click();
 const statusBox=await page.locator('.topbar').boundingBox(),posterBox=await poster.boundingBox();
 assert(posterBox.x>=statusBox.x+statusBox.width,'Desktop poster opens beside the status');
 await shot('poster');
 await page.locator('#characterPosterClose').click();
 const trigger=page.locator('#modesMenuTrigger');
 await trigger.click();
 const menu=page.locator('#modesQuickMenu'), menuBox=await menu.boundingBox(), triggerBox=await trigger.boundingBox();
 const menuWidth=await page.evaluate(()=>innerWidth);
 assert(menuBox.x>=0&&menuBox.x+menuBox.width<=menuWidth&&Math.abs(menuBox.y-triggerBox.y-triggerBox.height)<20,'Modes submenu is docked to its trigger');
 assert.equal(await menu.getByRole('menuitem',{name:'Expedição',exact:true}).count(),0);
 await shot('menu-modos');
 await page.keyboard.press('Escape');
 await open('myprofile');
 await page.waitForFunction(()=>document.querySelector('#captainPortraitState')?.hidden);
 assert.equal(await page.locator('[data-profile-value=berry]').textContent(),'98.189','total earned, not balance');
 assert.equal(await page.locator('[data-profile-value=title]').textContent(),'Pirata Promissor');
 assert.equal(await page.locator('[data-profile-value=power]').first().textContent(),await page.evaluate(()=>Math.round(__captainQA.stats().power).toLocaleString('pt-BR')));
 assert.equal(await page.locator('#captainProfilePortrait').getAttribute('width'),'256');
 const realState=await page.evaluate(()=>JSON.stringify({eq:__captainQA.game.equipment,appearance:__captainQA.game.appearance96,attributes:__captainQA.game.attributes}));
 await shot('profile-overview');
 await page.locator('[data-profile-tab=gear]').click();await page.waitForFunction(()=>document.querySelector('#captainPortraitState')?.hidden);
 assert.equal(await page.locator('.captain-equipment-card').count(),12);
 assert(await page.locator('[data-profile-slot] .captain-equipment-art img').evaluateAll(es=>es.length>0&&es.every(e=>e.getAttribute('src').startsWith('assets/ui/items-hd/'))));
 // Lazy images may not have a current request when decode() is called.
 // Request every equipment card in this fixture, then retain strict decoding.
 const equipmentImages='[data-profile-slot] .captain-equipment-art img';
 await page.locator(equipmentImages).evaluateAll(es=>es.forEach(e=>{e.loading='eager'}));
 try{
  await page.waitForFunction(selector=>{const images=[...document.querySelectorAll(selector)];return images.length>0&&images.every(e=>e.complete&&e.naturalWidth>0)},equipmentImages);
  await page.locator(equipmentImages).evaluateAll(es=>Promise.all(es.map(async e=>{try{await e.decode()}catch(error){throw Error('Equipment image decode failed: '+e.src+' ('+error.message+')')}})));
 }catch(error){
  const state=await page.locator(equipmentImages).evaluateAll(es=>es.map(e=>({src:e.currentSrc||e.src,complete:e.complete,width:e.naturalWidth,connected:e.isConnected})));
  throw Error('Equipment images failed: '+JSON.stringify(state)+'; '+error.message);
 }
 await page.locator('[data-profile-slot=weapon]').focus();await page.waitForFunction(()=>!document.querySelector('#gameTooltip').classList.contains('hidden'));
 assert((await page.locator('#gameTooltip').textContent()).includes(await page.evaluate(()=>__captainQA.defs[__captainQA.game.equipment.weapon.def].name)));
 await page.mouse.move(1,1);await page.locator('[data-profile-tab=gear]').focus();await shot('profile-equipment');
 assert.equal(await page.evaluate(()=>JSON.stringify({eq:__captainQA.game.equipment,appearance:__captainQA.game.appearance96,attributes:__captainQA.game.attributes})),realState,'display does not mutate game state');
 // Empty slots, live equipment replacement, actual preferences and privacy; no save/cosmetic mutations from display.
 await open('inventory');await page.locator('[data-inv-slot=boots]').click();await page.locator('[data-unequip]').click();await open('myprofile');await page.waitForFunction(()=>document.querySelector('.captain-equipment-card.is-empty'));
 const privateName=await page.evaluate(()=>__captainQA.defs[__captainQA.game.equipment.weapon.def].name);
 await page.locator('[data-profile-slot=weapon]').focus();await page.waitForFunction(()=>!document.querySelector('#gameTooltip').classList.contains('hidden'));
 await page.evaluate(()=>{__captainQA.game.preferences.hideItems=true;__captainQA.update();});
 await page.waitForFunction(()=>document.querySelector('.captain-private'));
 assert.equal(await page.locator('[data-profile-slot]').count(),0);assert(await page.locator('#gameTooltip').evaluate(e=>e.classList.contains('hidden')),'a visible old tooltip must close when privacy changes');
 assert(!(await page.locator('#dialogBody').textContent()).includes(privateName));
 assert.equal(await page.locator('#dialogBody img[src*="items-hd"]').count(),0);
 await page.waitForFunction(()=>document.querySelector('#captainPortraitState')?.hidden);await shot('profile-private');
 await page.evaluate(()=>{__captainQA.game.preferences.hideItems=false;__captainQA.update();});await page.waitForFunction(()=>document.querySelector('[data-profile-slot=weapon]'));
 for(const tab of ['wall','custom']){await page.locator('[data-profile-tab='+tab+']').click();assert((await page.locator('.captain-empty').textContent()).includes('em desenvolvimento'));}
 await open('journal');await page.waitForFunction(()=>document.querySelector('.captain-news-item'));
 assert.equal(await page.locator('#dialogTitle').textContent(),'Jornal do Morgan');
 const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'../journal-feed.json'),'utf8'));
 assert.equal(await page.locator('.captain-news-item').count(),feed.length);
 assert.equal(await page.locator('.captain-news-item h3').first().textContent(),feed[0].title);
 await page.locator('.captain-morgan').evaluate(e=>e.decode());await shot('journal');
 for(const tab of ['event','update','notice','all']){await page.locator('[data-journal-tab='+tab+']').click();assert.equal(await page.locator('.captain-news-item').count(),feed.filter(x=>tab==='all'||x.type===tab).length);}
 await open('settings');assert.equal(await page.locator('[data-settings-card]').count(),5);
 const settingsWindow=page.locator('#panelOverlay > .dialog'), beforeDrag=await settingsWindow.boundingBox();
 const grip=await page.locator('#panelOverlay .dialog-header').boundingBox();
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
 await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+52,grip.y+grip.height/2-24,{steps:4});await page.mouse.up();
 const afterDrag=await settingsWindow.boundingBox();
 assert(afterDrag.x>beforeDrag.x+30&&afterDrag.y<beforeDrag.y-12,'Settings follows a drag on its header');
 await shot('settings');
 for(const section of ['general','audio','graphics','interface','accessibility']){
  await page.locator('[data-settings-card='+section+']').click();await page.locator('#captain-detail-'+section).scrollIntoViewIfNeeded();assert.equal(await page.locator('[data-settings-card='+section+']').getAttribute('aria-expanded'),'true');await shot('settings-'+section);
 }
 await page.locator('[data-captain-setting=motion]').selectOption('reduced');await page.locator('[data-captain-larger]').check();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.mareMotion),'reduced');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.mareText),'large');
 await page.locator('[data-settings-card=interface]').click();await page.locator('[data-captain-setting=density]').selectOption('compact');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.mareDensity),'compact');
 await page.locator('[data-settings-card=graphics]').click();await page.locator('[data-captain-setting=quality]').selectOption('low');assert.equal(await page.evaluate(()=>MarePlayerHub.getPreferences().quality),'low');
 await page.locator('[data-settings-card=audio]').click();await page.locator('[data-captain-mute]').check();
 await page.locator('[data-captain-music-volume]').fill('37');await page.locator('[data-captain-music-volume]').dispatchEvent('input');
 assert.equal(await page.locator('#captainMusicValue').textContent(),'37%');assert.equal(await page.evaluate(()=>Math.round(MareAudio.getState().volume*100)),37);
 const musicToggle=page.getByRole('checkbox',{name:'Ativar música'});
 const effectsToggle=page.getByRole('checkbox',{name:'Ativar efeitos do jogo'});
 const effectsSlider=page.getByRole('slider',{name:'Volume dos efeitos'});
 await effectsSlider.fill('68');
 assert.equal(await page.locator('#captainEffectsValue').textContent(),'68%');
 assert.equal(await page.locator('#captainMusicValue').textContent(),'37%');
 await musicToggle.uncheck();
 assert.equal(await page.evaluate(()=>MareAudio.getState().muted),true);
 assert(await effectsToggle.isChecked());
 await effectsSlider.fill('0');
 assert.equal(await effectsToggle.isChecked(),false);
 await effectsToggle.check();
 assert.equal(await musicToggle.isChecked(),false);
 await effectsSlider.fill('68');
 assert.match(await page.locator('[data-settings-card=audio] em').textContent(),/Música: desligada.*Efeitos: 68%/);
 await page.locator('[data-settings-tab=discord]').click();assert.equal(await page.getByRole('link',{name:'Entrar no Discord'}).getAttribute('href'),'https://discord.gg/uRnP79cp7h');await shot('settings-discord');
 const prefs=await page.evaluate(()=>MarePlayerHub.getPreferences());await page.reload();await page.waitForFunction(()=>window.__captainQA?.game);assert.deepEqual(await page.evaluate(()=>MarePlayerHub.getPreferences()),prefs);
 assert.deepEqual(await page.evaluate(()=>{const {volume,muted,effectsVolume,effectsMuted}=MareAudio.getState();return {volume,muted,effectsVolume,effectsMuted};}),{volume:.37,muted:true,effectsVolume:.68,effectsMuted:false});
 // Restore normal viewing preferences through actual controls for the final captures.
 await open('settings');await page.locator('[data-settings-card=graphics]').click();await page.locator('[data-captain-setting=quality]').selectOption('high');
 await page.locator('[data-settings-card=interface]').click();await page.locator('[data-captain-setting=density]').selectOption('standard');
 await page.locator('[data-settings-card=accessibility]').click();await page.locator('[data-captain-setting=motion]').selectOption('normal');await page.locator('[data-captain-larger]').uncheck();
 await page.locator('[data-settings-card=accessibility]').click();await shot('settings');
 // Responsive layout and actual close/reopen navigation on all screens.
 for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[760,900],[393,852],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  for(const panel of ['myprofile','journal','settings']){
   await open(panel);if(panel==='myprofile')await page.locator('[data-profile-tab=overview]').click();
   const layout=await page.evaluate(()=>{const b=document.querySelector('#dialogBody'),c=document.querySelector('#closePanel').getBoundingClientRect();return {wide:b.scrollWidth>b.clientWidth+2,close:c.right>innerWidth||c.bottom>innerHeight||c.left<0};});
   if(layout.wide)console.log(await page.locator('#dialogBody').evaluate(b=>[...b.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>b.getBoundingClientRect().right+1).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width,text:e.textContent?.slice(0,70)}))));assert.deepEqual(layout,{wide:false,close:false},panel+' '+width+'x'+height);
   if(width===393)await shot(panel+'-mobile');
   if(panel==='myprofile'){await page.locator('[data-profile-tab=gear]').click();assert.equal(await page.locator('.captain-equipment-card').count(),12);}
   if(panel==='settings'){if(await page.locator('[data-settings-card=interface]').getAttribute('aria-expanded')!=='true')await page.locator('[data-settings-card=interface]').click();await page.locator('[data-captain-setting=density]').scrollIntoViewIfNeeded();assert(await page.locator('[data-captain-setting=density]').isVisible());}
   await page.locator('#closePanel').click();assert(await page.locator('#panelOverlay').evaluate(e=>e.classList.contains('hidden')));
  }
 }
 await page.setViewportSize({width:1448,height:1086});
 const portraits=[];
 for(const gender of ['masculino','feminino']){
  await page.evaluate(gender=>{__captainQA.game.appearance96={...MareCharacterAppearance.read(__captainQA.game),gender};},gender);
  await open('myprofile');await page.locator('[data-profile-tab=overview]').click();await page.waitForFunction(()=>document.querySelector('#captainPortraitState')?.hidden);await shot('profile-'+gender);portraits.push(await page.locator('#captainProfilePortrait').evaluate(c=>c.toDataURL()));
 }
 assert.notEqual(portraits[0],portraits[1],'both body sprites must be rendered from persisted appearance');
 assert.deepEqual(errors,[]);
 console.log('Captain HD: profile, official HD equipment/tooltips, privacy, live updates, real news, all five settings, audio/preferences persistence, both bodies and 7 responsive sizes passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
