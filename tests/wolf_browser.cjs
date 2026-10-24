'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const bridge=`  window.__wolfQA={paused:false,enterHunt,returnLobby,useFruitSkill,heroAttack,outputDamage,toggleZoanTransform,unequip,takeDamage,saveGame,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs},nav:navigator,active:wolfAuraActive,stats:getDerived,draw:drawWorld,center(){camera.update(world.hero,activeMap(),0,true)},stopAuto(){autoPlay=false;autoSkills=false},step(dt,key){if(key)keys.add(key);world.time+=dt;stepWolfAction(dt);stepWolfBleeds();keys.clear();updateUI()}};\n  window.__mareDiagnostics=`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:Number(process.env.MARE_TEST_WIDTH)||1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',bridge).replace('function tick(dt){','function tick(dt){if(window.__wolfQA?.paused)return;')}));
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8140/',{waitUntil:'domcontentloaded'});
  await page.locator('#characterName').fill('Lobo QA');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  await page.locator('#characterMenuTrigger').click();await page.locator('[data-character-section=akuma]').click();await page.locator('[data-akuma-rank=D]').click();await page.locator('[data-fruit-register=akuma_inu_wolf]').click();await page.waitForFunction(()=>__mareDiagnostics().akuma.registered.includes('akuma_inu_wolf'));
  await page.keyboard.press('Escape');await page.keyboard.press('i');
  const id=await page.evaluate(()=>__wolfQA.game.inventory.find(i=>i.fruitId==='akuma_inu_wolf').id);
  await page.locator('[data-item="'+id+'"]').click();assert.match(await page.locator('#dialogBody').innerText(),/Zoan Carnívora/);await page.locator('[data-equip="'+id+'"]').click();await page.waitForFunction(()=>__wolfQA.game.zoanTransformed);await page.keyboard.press('Escape');
  await page.waitForFunction(()=>['idle','walk','attack','charge','finish'].every(a=>['front','back','left','right'].every(d=>MareWolf.status(a,d)==='ready')));
  if(process.env.MARE_EXPECT_API)await page.waitForFunction(async()=>{const r=await fetch('/api/akuma/state?player_id='+__wolfQA.game.akumaPlayerId);return r.ok&&(await r.json()).transformed;});
  assert.match(await page.locator('#skill1').getAttribute('aria-label'),/Fome Incessante/);assert.match(await page.locator('#skill2').getAttribute('aria-label'),/Aura Sanguinária/);
  const setup=await page.evaluate(()=>{
   const q=__wolfQA;q.game.level=30;q.enterHunt();q.stopAuto();q.paused=true;q.world.spawnClock=1e9;q.game.hp=q.stats().maxHP;q.game.energy=200;
   const nav=q.nav();let origin,v;
   for(let y=128;y<nav.map.height-128&&!origin;y+=128)for(let x=128;x<nav.map.width-128&&!origin;x+=128)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const from={x,y},to={x:x+dx*240,y:y+dy*240},side={x:to.x-dy*64,y:to.y+dx*64};if(nav.walkable(x,y)&&nav.clear(from,to)&&nav.clear(from,side)&&nav.clear(from,{x:x-dy*32,y:y+dx*32})){origin=from;v={dx,dy};break;}
   }
   if(!origin)throw Error('No open charge segment');Object.assign(q.world.hero,origin);q.center();window.wolfOrigin=origin;window.wolfVector=v;
   const mob=(id,d,side)=>({id,type:'bandit',district:__mareDiagnostics().hunt.sector.id,alive:true,hp:10000,maxHP:10000,defense:0,level:8,area:q.game.area,x:origin.x+v.dx*d-v.dy*side,y:origin.y+v.dy*d+v.dx*side,anchorX:origin.x,anchorY:origin.y,attack:0,attackClock:999,patrolClock:999,bob:0,speed:0,aggro:300,emberFacing:'south'});
   q.world.mobs=[mob('selected',160,0),mob('nearby',164,48)];q.world.target=q.world.mobs[0];return {attack:q.stats().physical,speed:q.stats().speed,power:q.stats().power,def:q.game.equipment.akuma_no_mi.def};
  });assert.equal(setup.def,79);
  const walks=await page.evaluate(()=>{
   const q=__wolfQA,actor=MareWolf.drawActor,calls=[];q.world.hero.walking=1;
   MareWolf.drawActor=(...args)=>{calls.push(args[3]);return actor(...args)};
   try{for(const direction of ['front','back','left','right'])for(let i=0;i<8;i++){q.world.hero.direction=direction;q.world.time=i/12;q.draw();}}finally{MareWolf.drawActor=actor;q.world.hero.walking=0;}
   return {actions:calls.map(c=>c.action),frames:Object.values(MareWolf.clips.walk).map(c=>({frames:c.frames,source:c.source[0]})),noFrontParticles:MareWolf.drawAuraParticles===undefined};
  });assert.equal(walks.actions.length,32);assert.ok(walks.actions.every(a=>a==='walk'));assert.ok(walks.frames.every(c=>c.frames===8&&c.source.includes('/Running_Jump/')));assert.equal(walks.noFrontParticles,true);
  const steering=await page.evaluate(async()=>{const q=__wolfQA,v=wolfVector,ok=await q.useFruitSkill(true,'1'),key=v.dx?'s':'d';q.step(.1,key);const dx=q.world.hero.x-wolfOrigin.x,dy=q.world.hero.y-wolfOrigin.y;return {ok,side:Math.abs(dx*v.dy-dy*v.dx),hp:q.world.mobs[0].hp,energy:q.game.energy};});assert.equal(steering.ok,true);assert.ok(steering.side>30);assert.equal(steering.hp,10000);assert.equal(steering.energy,174);
  await page.evaluate(()=>{__wolfQA.step(.15);});
  const shot=async name=>{if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,name+'.png')});}};
  await shot('wolf-charge');
  const impact=await page.evaluate(()=>{const q=__wolfQA;for(let i=0;i<30&&q.session.wolfAction?.phase==='charge';i++)q.step(.05);return {phase:q.session.wolfAction?.phase,damage:10000-q.world.mobs[0].hp,other:q.world.mobs[1].hp,tick:q.world.mobs[0].wolfBleed?.nextTick};});assert.equal(impact.phase,'finish');assert.equal(impact.damage,setup.attack);assert.equal(impact.other,10000);assert.equal(impact.tick,1);
  await page.evaluate(()=>__wolfQA.step(.25));await shot('wolf-finish');await page.evaluate(()=>__wolfQA.step(.084));
  const aura=await page.evaluate(async()=>{const q=__wolfQA,ok=await q.useFruitSkill(true,'2');q.game.hp=100;const order=[],effect=MareWolf.drawEffect,actor=MareWolf.drawActor;MareWolf.drawEffect=(...a)=>{order.push(a[1]);return effect(...a)};MareWolf.drawActor=(...a)=>{order.push('actor');return actor(...a)};try{q.draw();}finally{MareWolf.drawEffect=effect;MareWolf.drawActor=actor;}return {ok,speed:q.stats().speed,power:q.stats().power,order,energy:q.game.energy};});assert.equal(aura.ok,true);assert.ok(Math.abs(aura.speed/setup.speed-1.3)<.00001);assert.equal(aura.power,setup.power);assert.ok(aura.order.indexOf('aura')<aura.order.indexOf('actor'));assert.equal(aura.energy,144);
  await shot('wolf-aura');
  const dot=await page.evaluate(()=>{const q=__wolfQA,m=q.world.mobs[0];q.step(.665);const before=10000-m.hp;q.step(.0011);const first=10000-m.hp;q.step(4);return {before,first,final:10000-m.hp,bleed:!!m.wolfBleed,hp:q.game.hp};});const tickDamage=Math.floor(setup.attack*.2);assert.equal(dot.before,setup.attack);assert.equal(dot.first,setup.attack+tickDamage);assert.equal(dot.final,setup.attack+tickDamage*5);assert.equal(dot.bleed,false);assert.ok(Math.abs(dot.hp-(100+tickDamage*.1*5))<.001);
  const leech=await page.evaluate(()=>{const q=__wolfQA,m=q.world.mobs[1];q.game.hp=100;q.outputDamage(m,100);const allDamage=q.game.hp;m.hp=3;q.outputDamage(m,10000);const cappedDamage=q.game.hp;const copy={...m,id:'cap',alive:true,hp:10000};q.world.mobs.push(copy);q.game.hp=q.stats().maxHP-.2;q.outputDamage(copy,100);const max=q.game.hp===q.stats().maxHP;q.session.wolfAuraUntil=Date.now()-1;const speed=q.stats().speed,hp=q.game.hp;q.outputDamage(copy,100);return {allDamage,cappedDamage,max,speed,noHeal:hp===q.game.hp};});assert.equal(leech.allDamage,110);assert.ok(Math.abs(leech.cappedDamage-110.3)<.001);assert.equal(leech.max,true);assert.equal(leech.noHeal,true);assert.equal(leech.speed,setup.speed);
  const basic=await page.evaluate(()=>{const q=__wolfQA,m=q.world.mobs.find(m=>m.alive);m.x=q.world.hero.x+wolfVector.dx*50;m.y=q.world.hero.y+wolfVector.dy*50;q.session.wolfBasicUntil=0;q.session.wolfAuraUntil=0;q.heroAttack(m);const normal=q.session.wolfBasicDuration;q.session.wolfBasicUntil=0;q.session.wolfAuraUntil=Date.now()+6000;q.heroAttack(m);return {normal,boost:q.session.wolfBasicDuration};});assert.ok(Math.abs(basic.normal/basic.boost-1.3)<.0001);
  const cancel=await page.evaluate(async()=>{const q=__wolfQA;await q.toggleZoanTransform();const off=q.active();await q.toggleZoanTransform();const restored=q.active();q.game.hp=1;q.session.wolfAuraUntil=Date.now()+6000;q.takeDamage(1e6,null,false,true);return {off,restored,hp:q.game.hp,until:q.session.wolfAuraUntil,action:q.session.wolfAction};});assert.deepEqual(cancel,{off:false,restored:false,hp:0,until:0,action:null});
  await page.evaluate(()=>{const q=__wolfQA;q.game.hp=100;q.game.zoanTransformed=false;q.saveGame();});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__wolfQA?.game?.equipment?.akuma_no_mi?.fruitId==='akuma_inu_wolf');
  const save=await page.evaluate(()=>({form:__wolfQA.game.zoanTransformed,def:__wolfQA.game.equipment.akuma_no_mi.def,active:__wolfQA.active(),registered:__wolfQA.game.akumaCompendium.filter(id=>id==='akuma_inu_wolf').length,cooldowns:Object.keys(__wolfQA.game.fruitCooldowns)}));assert.equal(save.form,false);assert.equal(save.def,79);assert.equal(save.active,false);assert.equal(save.registered,1);assert.ok(save.cooldowns.includes('akuma_inu_wolf:1')&&save.cooldowns.includes('akuma_inu_wolf:2'));
  assert.deepEqual(errors,[]);console.log('Wolf browser: Rank D, native clips, controllable charge, selected target impact, five bleed ticks, aura depth, speed/animation boost, all-damage leech and caps, cancellation and save reload passed');await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
