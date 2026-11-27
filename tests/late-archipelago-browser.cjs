'use strict';
// Focal browser integration test. Fixtures are injected only into this isolated page.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/late-archipelago');
const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8185/';
const cases=require('../late-archipelago-world.js').specs.map(s=>[s.id,s.type,s.level,s.region]);
let source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const hook='  window.__mareDiagnostics=',tick='function tickSimulation(dt){';
assert(source.includes(hook)&&source.includes(tick),'current game exposes the established test injection points');
source=source.replace(tick,tick+'if(window.__lateQA?.paused&&!window.__lateQA.stepping)return;');
source=source.replace(hook,`  window.__lateQA={paused:true,stepping:false,
 get game(){return game},get world(){return world},get run(){return dungeonRun},get writer(){return saveWriter},
 open:openPanel,save:saveGame,enter:enterBossDungeon,damage:outputDamage,claim:claimDungeonChest,back:returnLobby,
 draw:presentWorld,state:mapArtState,nav:navigator,height:combatActorHeight,
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 start(){autoPlay=true;autoSkills=false;},
 fixture(level,strong=false){game.level=level;if(strong){
  Object.assign(game.attributes,{strength:50000,vitality:50000});
  // Strength scales logarithmically; raise fixture weapon power to finish the real attack loop promptly.
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
 }game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt){this.stepping=true;try{tickSimulation(dt)}finally{this.stepping=false}presentWorld();},
 stage(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live test opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No adjacent walkable encounter position');Object.assign(world.hero,p);world.hero.direction='front';
  m.attackClock=10;camera.update(world.hero,activeMap(),0,true);presentWorld();},
 nearChest(){Object.assign(world.hero,{x:MareQuestDungeonWorld.chest.x,y:MareQuestDungeonWorld.chest.y});presentWorld();}
 };\n`+hook);


(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[],missing=[],results={destinations:[],bosses:[]};let page,phase='boot';
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/late-archipelago|thriller|sabaody|marineford|absalom|perona|ryuma|oars|pacifista|urouge|hawkins|x-drake|squard|onigumo|izo|vista|jozu|kuma|kizaru|hancock|magellan|ace|aokiji|akainu/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  const ready=()=>page.waitForFunction(()=>window.__lateQA?.game&&__lateQA.writer.owner&&__lateQA.state()==='ready',null,{timeout:60000});
  const screenshot=name=>page.screenshot({path:path.join(out,name+'.png')});
  const openMap=async region=>{await page.evaluate(()=>__lateQA.open('map'));await page.locator('[data-voyage-region="'+region+'"]').click();};
  const panelFits=async()=>{
   const bounds=await page.locator('#panelOverlay .dialog').boundingBox(),view=page.viewportSize();
   assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=view.width+1&&bounds.y+bounds.height<=view.height+1,'dialog fits the viewport');
   assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'content has no horizontal overflow');
  };
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__lateQA);
  await page.locator('#characterName').fill('Mares QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  await page.evaluate(()=>{__lateQA.stop();__lateQA.fixture(180,true);});
  for(const [id,type,level,region]of cases){
   phase='travel '+id;await openMap(region);
   assert.equal(await page.locator('[data-island]').count(),region==='marineford'?6:4);
   await page.locator('[data-island="'+id+'"]').click();
   await page.waitForFunction(type=>document.querySelector('[data-expedition-monster="'+type+'"]')?.dataset.ready==='true',type);
   await page.locator('[data-travel-area="'+id+'"]').click();
   await page.waitForFunction(({id,type})=>__mareDiagnostics().map.id===id&&__lateQA.state()==='ready'&&MareSpriteCombatV2.status(type,'idle','south')==='ready',{id,type},{timeout:60000});
   const state=await page.evaluate(()=>{__lateQA.stop();const q=__lateQA;return {map:__mareDiagnostics().map.id,walkable:q.nav().walkable(q.world.hero.x,q.world.hero.y),mobs:q.world.mobs.map(m=>[m.type,m.level])};});
   assert.equal(state.map,id);assert(state.walkable);assert.equal(state.mobs.length,6);assert(state.mobs.every(m=>m[0]===type&&m[1]===level));
   await page.evaluate(()=>__lateQA.open('hunt')); // the route must describe this island, not an older opponent
   const route=await page.locator('#dialogBody').innerText();
   assert(route.includes(type==='hawkins'?'Basil Hawkins':type==='x-drake'?'X Drake':type==='little-oars-jr'?'Little Oars Jr.':type[0].toUpperCase()+type.slice(1)));
   await page.evaluate(()=>__lateQA.open('map'));await page.locator('#closePanel').click();
   if(id.endsWith('-01')||id==='sabaody-04'){
    await page.evaluate(()=>__lateQA.stage());await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');
    if(id==='sabaody-04'){
     await page.evaluate(()=>{const q=__lateQA;q.damage(q.world.mobs[0],1);for(let i=0;i<5;i++)q.step(.05);});
     const transformed=await page.evaluate(()=>{const q=__lateQA,m=q.world.mobs[0];return {form:MareSabaodyMonsters.form(m,q.world.time,.18),height:q.height(m)};});
     assert.equal(transformed.form,'x-drake-zoan');assert.equal(transformed.height,155);results.drake=transformed;
    }
    await screenshot(id+'-encounter');
    if(id.endsWith('-01')){
     const combat=await page.evaluate(()=>{const q=__lateQA,before=q.game.stats.kills;q.start();let steps=0;for(;steps<600&&q.game.stats.kills===before;steps++)q.step(.05);q.stop();q.save();return {steps,kills:q.game.stats.kills-before};});
     assert(combat.kills>0,region+' normal combat defeats the opponent');
    }
   }
   results.destinations.push({id,type,level});await page.evaluate(()=>__lateQA.back());
  }
  for(const [id,level]of [['kuma',120],['kizaru',130],['hancock',140],['magellan',150],['ace',160],['aokiji',170],['akainu',180]]){
   phase='dungeon '+id;await page.evaluate(()=>__lateQA.open('dungeons'));await page.locator('[data-dungeon-select="'+id+'"]').click();
   await page.locator('[data-dungeon-enter="'+id+'"]').click();
   await page.waitForFunction(id=>__lateQA.run?.id===id&&__lateQA.state()==='ready'&&MareSpriteCombatV2.status('dungeon-'+id,'idle','south')==='ready',id,{timeout:60000});
   assert.deepEqual(await page.evaluate(()=>__lateQA.world.mobs.map(m=>[m.type,m.level])),[['dungeon-'+id,level]]);
   if(id==='akainu'){await page.evaluate(()=>__lateQA.stage());await screenshot('akainu-180');}
   results.bosses.push({id,level});await page.evaluate(()=>__lateQA.back());
  }
  phase='mobile';await page.setViewportSize({width:393,height:852});
  for(const region of ['thriller-bark','sabaody','marineford']){
   await openMap(region);await panelFits();
   const tabs=await page.locator('#voyageRegionTabs').evaluate(el=>{
    const active=el.querySelector('[aria-selected=true]'),box=el.getBoundingClientRect(),selected=active.getBoundingClientRect();
    return {readable:[...el.querySelectorAll('button')].every(b=>b.scrollWidth<=b.clientWidth+1),selectedVisible:selected.left>=box.left-1&&selected.right<=box.right+1};
   });
   assert(tabs.readable,'region names fit their tabs');assert(tabs.selectedVisible,'selected region stays visible after rendering');
   await screenshot(region+'-mobile-tabs');
   assert.equal(await page.locator('[data-island]').count(),region==='marineford'?6:4);
  }
  await page.evaluate(()=>__lateQA.open('dungeons'));await page.locator('[data-dungeon-select=akainu]').click();await panelFits();await screenshot('bosses-mobile');
  assert.equal(await page.locator('[data-dungeon-select]').count(),18);
  phase='reload';await page.locator('#closePanel').click();await page.evaluate(()=>__lateQA.save());
  const area=await page.evaluate(()=>__lateQA.game.area);await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.evaluate(()=>__lateQA.game.area),area);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  results.viewports=['1366x768','393x852'];results.reload=true;
  fs.writeFileSync(path.join(out,'late-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
