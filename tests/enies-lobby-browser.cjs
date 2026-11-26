'use strict';
// Focal browser integration test. Fixtures are injected only into this isolated page.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/enies-lobby');
const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8185/';
const cases=[['enies-lobby-01','fukurou',97],['enies-lobby-02','kalifa',101],['enies-lobby-03','jabra',104],['enies-lobby-04','blueno',107],['enies-lobby-05','kaku',110]];
let source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const hook='  window.__mareDiagnostics=',tick='function tickSimulation(dt){';
assert(source.includes(hook)&&source.includes(tick),'current game exposes the established test injection points');
source=source.replace(tick,tick+'if(window.__eniesQA?.paused&&!window.__eniesQA.stepping)return;');
source=source.replace(hook,`  window.__eniesQA={paused:true,stepping:false,
 get game(){return game},get world(){return world},get run(){return dungeonRun},get writer(){return saveWriter},
 open:openPanel,save:saveGame,enter:enterBossDungeon,damage:outputDamage,claim:claimDungeonChest,back:returnLobby,
 draw:presentWorld,state:mapArtState,nav:navigator,
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 start(){autoPlay=true;autoSkills=false;},
 fixture(level,strong=false){game.level=level;if(strong)Object.assign(game.attributes,{strength:50000,vitality:50000});game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
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
 const errors=[],missing=[],results={destinations:[],bosses:[]};let phase='boot',page;
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});page=await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/enies-lobby|fukurou|kalifa|jabra|blueno|kaku|rob-lucci|gecko-moria/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  const ready=()=>page.waitForFunction(()=>window.__eniesQA?.game&&__eniesQA.writer.owner&&__eniesQA.state()==='ready',null,{timeout:60000});
  const screenshot=name=>page.screenshot({path:path.join(out,name+'.png')});
  const openMap=async()=>{await page.locator('#mainMenu [data-panel=modes]').click();await page.locator('[data-quick-mode=map]').click();await page.locator('[data-voyage-region=enies-lobby]').click();};
  const travel=async(id,type)=>{
   await openMap();await page.locator('[data-island='+id+']').click();await page.locator('[data-travel-area='+id+']').click();
   await page.waitForFunction(({id,type})=>__mareDiagnostics().map.id===id&&__eniesQA.state()==='ready'&&MareSpriteCombatV2.status(type,'idle','south')==='ready',{id,type},{timeout:60000});
   await page.evaluate(()=>__eniesQA.stop());
  };
  const economy=()=>page.evaluate(()=>{const g=__eniesQA.game;return {gold:g.gold,xp:g.xp,items:g.inventory.map(i=>[i.id,i.quantity??1]),kills:g.stats.kills,xpEarned:g.stats.xpEarned,goldEarned:g.stats.goldEarned};});
  const panelFits=async()=>{
   const bounds=await page.locator('#panelOverlay .dialog').boundingBox(),view=page.viewportSize();
   assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=view.width+1&&bounds.y+bounds.height<=view.height+1,'active dialog stays within viewport');
   assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'active content has no horizontal overflow');
  };
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__eniesQA);
  await page.locator('#characterName').fill('Enies QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();

  phase='travel gates';
  await page.evaluate(()=>{__eniesQA.stop();__eniesQA.fixture(94);});await openMap();
  assert.equal(await page.locator('[data-island]').count(),5);
  await page.locator('[data-island=enies-lobby-01]').click();assert(await page.locator('[data-travel-area=enies-lobby-01]').isDisabled(),'below level95 cannot travel');
  await panelFits();await screenshot('enies-five-destinations');await page.locator('#closePanel').click();
  await page.evaluate(()=>__eniesQA.fixture(110,true));
  for(const [id,type,level]of cases){
   phase='travel '+id;await travel(id,type);
   const snapshot=await page.evaluate(()=>{const q=__eniesQA;return {area:q.game.area,map:__mareDiagnostics().map.id,walkable:q.nav().walkable(q.world.hero.x,q.world.hero.y),mobs:q.world.mobs.map(m=>[m.type,m.level])};});
   assert.equal(snapshot.area,id);assert.equal(snapshot.map,id);assert(snapshot.walkable);assert.equal(snapshot.mobs.length,6);assert(snapshot.mobs.every(m=>m[0]===type&&m[1]===level));
   if(id==='enies-lobby-01'){
    await page.evaluate(()=>__eniesQA.stage());await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await screenshot('enies-player-and-fukurou');
    phase='normal combat';const before=await economy();
    const combat=await page.evaluate(()=>{const q=__eniesQA,first=q.game.stats.kills;q.start();let steps=0;for(;steps<1200&&q.game.stats.kills===first;steps++)q.step(.05);q.stop();q.save();return {steps,kills:q.game.stats.kills-first};});
    assert(combat.kills>0,'automatic combat must defeat the authored opponent');
    const after=await economy();assert(after.xpEarned>before.xpEarned,'world kill grants XP');assert(after.gold>before.gold,'world kill grants Berry');results.combat=combat;
   }
   results.destinations.push({id,type,level,mobs:snapshot.mobs.length});
   if(id==='enies-lobby-05'){
    phase='ordinary save reload';await page.evaluate(()=>__eniesQA.save());const before=await economy();
    await page.reload({waitUntil:'domcontentloaded'});await ready();
    assert.equal(await page.evaluate(()=>__eniesQA.game.area),id,'selected area survives reload');
    assert.equal(await page.evaluate(()=>__mareDiagnostics().map.id),'lobby','offline startup returns to port while retaining selected destination');
    assert.deepEqual(await economy(),before,'reload preserves earned progress');
    await travel(id,type);results.travelReload=true;
   }
   await page.evaluate(()=>__eniesQA.back());assert.equal(await page.evaluate(()=>__mareDiagnostics().map.id),'lobby');
  }

  for(const [id,type,level]of [['rob-lucci','dungeon-rob-lucci',100],['gecko-moria','dungeon-gecko-moria',110]]){
   phase='boss '+id;
   await page.evaluate(()=>{__eniesQA.fixture(110,true);__eniesQA.open('dungeons');});
   await page.locator('[data-dungeon-select='+id+']').click();await page.locator('[data-dungeon-enter='+id+']').click();
   await page.waitForFunction(({id,type})=>__eniesQA.run?.id===id&&__eniesQA.state()==='ready'&&MareSpriteCombatV2.status(type,'idle','south')==='ready',{id,type},{timeout:60000});
   const actor=await page.evaluate(()=>({count:__eniesQA.world.mobs.length,type:__eniesQA.world.mobs[0].type,level:__eniesQA.world.mobs[0].level}));
   assert.deepEqual(actor,{count:1,type,level});await page.evaluate(()=>__eniesQA.stage());await screenshot(id+'-encounter');
   if(id==='rob-lucci'){
    await page.evaluate(()=>{const q=__eniesQA;q.damage(q.world.mobs[0],1);for(let i=0;i<5;i++)q.step(.05);});
    assert(await page.evaluate(()=>__eniesQA.world.mobs[0].cp9Transformed),'Lucci keeps the hybrid form after the first positive hit');
   }
   const before=await economy();
   await page.evaluate(()=>{const q=__eniesQA,m=q.world.mobs[0];q.damage(m,m.hp*2);q.draw();});
   assert.equal(await page.evaluate(id=>MareBossDungeons.status(__eniesQA.game,id),id),'pending');
   await page.evaluate(()=>{__eniesQA.nearChest();__eniesQA.claim();__eniesQA.claim();});
   const after=await economy();assert.deepEqual(after,before,'bosses without configured rewards cannot grant or duplicate currency/items');
   await page.evaluate(()=>{__eniesQA.back();__eniesQA.save();});results.bosses.push({id,level,pending:true,rewardUnchanged:true});
  }
  phase='boss victory reload';const victoryEconomy=await economy();await page.reload({waitUntil:'domcontentloaded'});await ready();
  for(const {id}of results.bosses){
   assert.equal(await page.evaluate(id=>MareBossDungeons.status(__eniesQA.game,id),id),'pending');
   await page.evaluate(async id=>{await __eniesQA.enter(id);},id);await ready();
   assert.equal(await page.evaluate(()=>__eniesQA.world.mobs.length),0,'reopening victory never spawns another boss');
   await page.evaluate(()=>{__eniesQA.nearChest();__eniesQA.claim();__eniesQA.back();});
  }
  assert.deepEqual(await economy(),victoryEconomy);results.victoryReload=true;

  phase='mobile';await page.setViewportSize({width:393,height:852});await page.evaluate(()=>__eniesQA.fixture(110));await openMap();
  assert.equal(await page.locator('[data-island]').count(),5);await panelFits();await screenshot('enies-mobile-destinations');
  await page.locator('[data-island=enies-lobby-05]').click();await panelFits();await page.locator('[data-travel-area=enies-lobby-05]').click();
  await page.waitForFunction(()=>__mareDiagnostics().map.id==='enies-lobby-05'&&__eniesQA.state()==='ready');
  await page.evaluate(()=>__eniesQA.stage());await screenshot('enies-mobile-player-and-kaku');
  await page.evaluate(()=>{__eniesQA.back();__eniesQA.open('dungeons');});await page.locator('[data-dungeon-select=gecko-moria]').click();await panelFits();await screenshot('enies-mobile-bosses');
  results.viewports=['1366x768','393x852'];assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(path.join(out,'enies-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){
  if(page)await page.screenshot({path:path.join(out,'enies-failure.png')}).catch(()=>{});
  console.error({phase,errors,missing});throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
