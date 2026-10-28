'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const bridge=`  window.__doruQA={paused:false,enterHunt,returnLobby,useFruitSkill,saveGame,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs},nav:navigator,stopAuto(){autoPlay=false;autoSkills=false},center(){camera.update(world.hero,activeMap(),0,true)},step(dt){world.time+=dt;stepDoruProjectiles(dt);updateUI()},runTick(dt){this.paused=false;tick(dt);this.paused=true;}};\n  window.__mareDiagnostics=`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:Number(process.env.MARE_TEST_WIDTH)||1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',bridge).replace('function tick(dt){','function tick(dt){if(window.__doruQA?.paused)return;')}));
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8136/',{waitUntil:'domcontentloaded'});
  await page.locator('#characterName').fill('Doru QA');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  await page.locator('#characterMenuTrigger').click();await page.locator('[data-character-section=akuma]').click();await page.locator('[data-akuma-rank=D]').click();await page.locator('[data-fruit-register=akuma_doru_doru]').click();
  await page.waitForFunction(()=>__mareDiagnostics().akuma.registered.includes('akuma_doru_doru'));
  await page.keyboard.press('Escape');await page.keyboard.press('i');
  const id=await page.evaluate(()=>__doruQA.game.inventory.find(i=>i.fruitId==='akuma_doru_doru').id);
  await page.locator('[data-item="'+id+'"]').click();assert.match(await page.locator('#dialogBody').innerText(),/Explosão de Cera/);
  await page.locator('[data-equip="'+id+'"]').click();await page.keyboard.press('Escape');
  if(process.env.MARE_EXPECT_API)await page.waitForFunction(async()=>{const r=await fetch('/api/akuma/state?player_id='+__doruQA.game.akumaPlayerId);return r.ok&&(await r.json()).equipped==='akuma_doru_doru';});
  assert.match(await page.locator('#skill1').getAttribute('aria-label'),/Explosão de Cera/);assert.match(await page.locator('#skill2').getAttribute('aria-label'),/Grilhões de Cera/);
  const setup=await page.evaluate(()=>{
   const q=__doruQA;q.game.level=30;q.enterHunt();q.stopAuto();q.paused=true;q.world.spawnClock=1e9;q.game.hp=__mareDiagnostics().stats.maxHP;q.game.energy=200;
   const nav=q.nav();let origin,v;
   for(let y=128;y<nav.map.height-128&&!origin;y+=128)for(let x=128;x<nav.map.width-128&&!origin;x+=128)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const from={x,y},to={x:x+dx*300,y:y+dy*300},side={x:to.x-dy*80,y:to.y+dx*80};
    const contact={x:x+dx*76,y:y+dy*76},splash={x:x+dx*112-dy*32,y:y+dy*112+dx*32};
    if(nav.walkable(x,y)&&nav.clear(from,to)&&nav.clear(from,side)&&nav.walkable(splash.x,splash.y)&&nav.clear(contact,splash)){origin=from;v={dx,dy};break;}
   }
   if(!origin)throw Error('No open 300px test segment');
   Object.assign(q.world.hero,origin);q.center();window.doruVector=v;window.doruOrigin=origin;
   const mob=(id,d,side=0)=>({id,type:'helmeppo',alive:true,hp:10000,maxHP:10000,defense:20,level:8,area:q.game.area,x:origin.x+v.dx*d-v.dy*side,y:origin.y+v.dy*d+v.dx*side,anchorX:origin.x,anchorY:origin.y,attack:0,attackClock:999,patrolClock:999,bob:0,speed:100,aggro:300,reach:30,emberFacing:'south'});
   q.world.mobs=[mob('selected',200),mob('interceptor',96),mob('splash',112,32),mob('outside',180,70)];q.world.target=q.world.mobs[0];
   return {attack:__mareDiagnostics().stats.attack+__mareDiagnostics().stats.fruitSpecialAttack,def:q.game.equipment.akuma_no_mi.def,form:q.game.zoanTransformed};
  });assert.equal(setup.def,78);assert.equal(setup.form,false);
  const flight=await page.evaluate(async()=>{const q=__doruQA,ok=await q.useFruitSkill(true,'1');q.step(.1);return {ok,phase:q.session.doruProjectiles[0].phase,distance:q.session.doruProjectiles[0].travel,hp:q.world.mobs.map(m=>m.hp),energy:q.game.energy};});
  assert.equal(flight.ok,true);assert.equal(flight.phase,'flight');assert.equal(flight.distance,48);assert.deepEqual(flight.hp,[10000,10000,10000,10000]);assert.equal(flight.energy,176);
  const shot=async name=>{if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,name+'.png')});}};
  await shot('doru-flight');
  const burst=await page.evaluate(()=>{const q=__doruQA;q.step(.1);return {phase:q.session.doruProjectiles[0].phase,travel:q.session.doruProjectiles[0].travel,hp:q.world.mobs.map(m=>m.hp)};});
  assert.equal(burst.phase,'burst');assert.equal(burst.travel,76);const damage=Math.floor(setup.attack*1.6-6);assert.deepEqual(burst.hp,[10000,10000-damage,10000-damage,10000]);
  await shot('doru-burst');
  const once=await page.evaluate(()=>{const q=__doruQA;q.step(.5);return {shots:q.session.doruProjectiles.length,hp:q.world.mobs.map(m=>m.hp)};});assert.equal(once.shots,0);assert.deepEqual(once.hp,burst.hp);
  const root=await page.evaluate(async()=>{const q=__doruQA,ok=await q.useFruitSkill(true,'2');q.step(.2);const m=q.world.mobs[1],start={x:m.x,y:m.y};q.nav().move(m,64,0);q.nav().follow(m,[{x:m.x+64,y:m.y}],100,.2);return {ok,phase:q.session.doruProjectiles[0].phase,rooted:m.isRooted,moved:Math.hypot(m.x-start.x,m.y-start.y),hp:q.world.mobs.map(m=>m.hp),until:m.doruRootUntil,now:q.world.time,energy:q.game.energy};});
  assert.equal(root.ok,true);assert.equal(root.phase,'root');assert.equal(root.rooted,true);assert.equal(root.moved,0);assert.deepEqual(root.hp,burst.hp);assert.equal(root.until-root.now,3);assert.equal(root.energy,148);
  const ai=await page.evaluate(()=>{const q=__doruQA,m=q.world.mobs[1],from={x:m.x,y:m.y},clock=m.attackClock;q.runTick(.1);return {moved:Math.hypot(m.x-from.x,m.y-from.y),clockAdvanced:m.attackClock<clock};});assert.equal(ai.moved,0);assert.equal(ai.clockAdvanced,true,'root stops movement without pausing attack timers');
  await shot('doru-root');
  if(process.env.MARE_EXPECT_API){await page.waitForFunction(()=>!__mareDiagnostics().akuma.doruImpactPending);assert.equal(await page.evaluate(()=>__mareDiagnostics().akuma.doruSyncError),null);const active=await page.evaluate(async()=>await(await fetch('/api/akuma/doru-movement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player_id:__doruQA.game.akumaPlayerId,instance:__doruQA.game.area,enemy_id:'interceptor'})})).json());assert.equal(active.can_move,false);}
  const timing=await page.evaluate(()=>{const q=__doruQA,m=q.world.mobs[1];q.step(2.899);const before=MareDoru.isRooted(m,q.world.time);q.step(.0011);const released=!m.isRooted,phase=q.session.doruProjectiles[0].phase;const x=m.x,y=m.y;q.nav().move(m,doruVector.dx*10,doruVector.dy*10);const moved=Math.hypot(m.x-x,m.y-y);q.step(.101);return {before,released,phase,moved,shots:q.session.doruProjectiles.length};});
  assert.equal(timing.before,true);assert.equal(timing.released,true);assert.equal(timing.phase,'release');assert.ok(timing.moved>9.9);assert.equal(timing.shots,0);
  const maxRange=await page.evaluate(()=>{const q=__doruQA;q.world.mobs=[];q.session.doruProjectiles=[MareDoru.create('1',doruOrigin,[doruVector.dx,doruVector.dy],100)];q.step(1);const shot=q.session.doruProjectiles[0];return {travel:shot.travel,phase:shot.phase};});assert.equal(maxRange.travel,256);assert.equal(maxRange.phase,'burst');
  const cd=await page.evaluate(async()=>{const q=__doruQA;const spent=q.session.skillEnergySpent;const result=await q.useFruitSkill(true,'1');q.returnLobby();return {result,spent,after:q.session.skillEnergySpent,shots:q.session.doruProjectiles||[]};});assert.equal(cd.result,false);assert.deepEqual(cd.shots,[]);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__doruQA?.game?.equipment?.akuma_no_mi?.fruitId==='akuma_doru_doru');
  const saved=await page.evaluate(()=>({def:__doruQA.game.equipment.akuma_no_mi.def,registered:__doruQA.game.akumaCompendium.filter(id=>id==='akuma_doru_doru').length,shots:__doruQA.session.doruProjectiles||[],cooldowns:Object.keys(__doruQA.game.fruitCooldowns)}));assert.equal(saved.def,78);assert.equal(saved.registered,1);assert.deepEqual(saved.shots,[]);assert.ok(saved.cooldowns.includes('akuma_doru_doru:1')&&saved.cooldowns.includes('akuma_doru_doru:2'));
  assert.deepEqual(errors,[]);console.log('Doru browser: Rank D, equip/HUD, delayed projectile, first collision, single AoE damage, exact 3s root, movement guard/release, 256px limit, phase cleanup, independent cooldowns and save reload passed');await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
