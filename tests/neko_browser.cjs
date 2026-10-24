'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const bridge=`  window.__nekoQA={paused:false,enterHunt,returnLobby,useFruitSkill,heroAttack,toggleZoanTransform,unequip,takeDamage,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs},nav:navigator,stopAuto(){autoPlay=false;autoSkills=false},step(dt){world.time+=dt;stepBasicAttack(dt);stepNekoAction(dt)},manual(key,dt){keys.add(key);const result=moveManually(dt);keys.clear();return result;}};\n  window.__mareDiagnostics=`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:Number(process.env.MARE_TEST_WIDTH)||1440,height:Number(process.env.MARE_TEST_HEIGHT)||900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',bridge).replace('function tick(dt){','function tick(dt){if(window.__nekoQA?.paused)return;')}));
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8132/',{waitUntil:'domcontentloaded'});
  await page.locator('#characterName').fill('Neko QA');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  await page.locator('#characterMenuTrigger').click();await page.locator('[data-character-section=akuma]').click();await page.locator('[data-akuma-rank=D]').click();await page.locator('[data-fruit-register=akuma_neko_leopard]').click();
  await page.waitForFunction(()=>__mareDiagnostics().akuma.registered.includes('akuma_neko_leopard'));
  await page.keyboard.press('Escape');await page.keyboard.press('i');
  const id=await page.evaluate(()=>__nekoQA.game.inventory.find(i=>i.fruitId==='akuma_neko_leopard').id);
  await page.locator('[data-item="'+id+'"]').click();assert.match(await page.locator('#dialogBody').innerText(),/Zoan Carnívora/);
  await page.locator('[data-equip="'+id+'"]').click();await page.waitForFunction(()=>__mareDiagnostics().akuma.nekoTransformed);
  await page.waitForFunction(()=>['idle','walk','attack','dash'].every(a=>['front','back','left','right'].every(d=>MareNeko.status(a,d)==='ready')));
  assert.match(await page.locator('#skill1').getAttribute('aria-label'),/Bote Feroz/);assert.match(await page.locator('#skill2').getAttribute('aria-label'),/Fúria Felina/);
  const setup=await page.evaluate(()=>{
   const q=__nekoQA;q.game.level=30;q.enterHunt();q.stopAuto();q.paused=true;q.world.spawnClock=1e9;q.game.hp=__mareDiagnostics().stats.maxHP;q.game.energy=200;
   const hero=q.world.hero,nav=q.nav();let vector;
   for(const [dx,dy,facing] of [[1,0,'east'],[-1,0,'west'],[0,1,'south'],[0,-1,'north']])if(nav.clear(hero,{x:hero.x+dx*140,y:hero.y+dy*140})){vector={dx,dy,facing};break;}
   if(!vector)throw Error('No open test segment near spawn');
   const mob=(id,offset)=>({id,type:'helmeppo',alive:true,hp:10000,maxHP:10000,defense:0,level:8,area:q.game.area,x:hero.x+vector.dx*offset,y:hero.y+vector.dy*offset,anchorX:hero.x,anchorY:hero.y,bob:0,attackClock:999,patrolClock:999,speed:0,emberFacing:vector.facing});
   q.world.mobs=[mob('selected',64),mob('nearby',68)];q.world.target=q.world.mobs[0];window.nekoTestVector=vector;
   return {physical:__mareDiagnostics().stats.physical,critical:__mareDiagnostics().stats.critMultiplier,hero:{x:hero.x,y:hero.y},indices:q.defs.slice(75,77).map(d=>d.name)};
  });
  assert.deepEqual(setup.indices,['Supa Supa no Mi','Neko Neko no Mi: Modelo Leopardo']);
  const basic=await page.evaluate(()=>{const q=__nekoQA,ok=q.heroAttack(q.world.target);const anim=q.world.hero.attackAnim,expected=MareCombatAnimation.attackDuration(__mareDiagnostics().stats.speed),immediate=q.world.target.hp;q.step(anim+.0001);q.world.target.hp=10000;q.world.hero.attackAnim=0;return {ok,anim,expected,immediate};});
  assert.equal(basic.ok,true);assert.equal(basic.anim,basic.expected);assert.equal(basic.immediate,10000);
  const combo=await page.evaluate(async()=>{
   const q=__nekoQA,selected=q.world.target,ok=await q.useFruitSkill(true,'2'),damage=[10000-selected.hp],p={x:q.world.hero.x,y:q.world.hero.y};
   q.world.target=q.world.mobs[1];q.manual('d',.1);const blocked=q.world.hero.x===p.x&&q.world.hero.y===p.y;
   for(let i=0;i<3;i++){q.step(.167);damage.push(10000-selected.hp);}
   return {ok,blocked,damage,other:q.world.mobs[1].hp,spent:q.session.skillEnergySpent};
  });
  assert.equal(combo.ok,true);assert.equal(combo.blocked,true);assert.equal(combo.other,10000);assert.equal(combo.spent,32);
  assert.deepEqual(combo.damage,[1,2,3,4].map(n=>n*Math.floor(setup.physical*.8)));
  if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'neko-combo.png')});}
  const unlocked=await page.evaluate(()=>{const q=__nekoQA;q.step(.4);const free=!q.session.nekoAction;q.manual('d',.1);return {free,moved:q.world.hero.x};});assert.equal(unlocked.free,true);
  const dash=await page.evaluate(async p=>{
   const q=__nekoQA,v=nekoTestVector;Object.assign(q.world.hero,p.hero);q.world.target=q.world.mobs[0];q.world.target.hp=10000;const start={x:q.world.hero.x,y:q.world.hero.y};const ok=await q.useFruitSkill(true,'1');q.step(.2);
   return {ok,damage:10000-q.world.target.hp,other:q.world.mobs[1].hp,travel:(q.world.hero.x-start.x)*v.dx+(q.world.hero.y-start.y)*v.dy,spent:q.session.skillEnergySpent,active:q.session.nekoAction?.kind};
  },setup);
  assert.equal(dash.ok,true);assert.equal(dash.damage,Math.floor(setup.physical*1.45*setup.critical));assert.equal(dash.other,10000);assert.ok(dash.travel>64);assert.equal(dash.spent,57);assert.equal(dash.active,'dash');
  if(process.env.MARE_QA_DIR)await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'neko-dash.png')});
  const collision=await page.evaluate(()=>{
   const q=__nekoQA;q.step(.6);const start={x:q.world.hero.x,y:q.world.hero.y},nav=q.nav();let vector;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(!nav.clear(start,{x:start.x+dx*200,y:start.y+dy*200})){vector={dx,dy};break;}
   if(!vector)throw Error('No blocked segment near test spawn');
   q.session.nekoAction={kind:'dash',targetId:'collision-fixture',dx:vector.dx,dy:vector.dy,remaining:200,hit:false,started:q.world.time};q.step(.3);
   const result={walkable:nav.walkable(q.world.hero.x,q.world.hero.y),travel:Math.hypot(q.world.hero.x-start.x,q.world.hero.y-start.y),remaining:q.session.nekoAction?.remaining};q.step(.6);return result;
  });assert.equal(collision.walkable,true);assert.ok(collision.travel<200);assert.equal(collision.remaining,0);
  const end=await page.evaluate(async()=>{const q=__nekoQA;q.step(.6);const before=q.session.skillEnergySpent;const recast=await q.useFruitSkill(true,'1');await q.toggleZoanTransform();const transformed=__mareDiagnostics().akuma.nekoTransformed;const untransformedCast=await q.useFruitSkill(true,'2');return {recast,before,spent:q.session.skillEnergySpent,transformed,untransformedCast,action:q.session.nekoAction};});
  assert.equal(end.recast,false);assert.equal(end.before,end.spent);assert.equal(end.transformed,false);assert.equal(end.untransformedCast,false);assert.equal(end.action,null);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__nekoQA?.game?.equipment?.akuma_no_mi?.fruitId==='akuma_neko_leopard');
  const restored=await page.evaluate(()=>{const q=__nekoQA;return {form:q.game.zoanTransformed,def:q.game.equipment.akuma_no_mi.def,duplicates:q.game.inventory.filter(i=>i.fruitId==='akuma_neko_leopard').length,cooldowns:Object.keys(q.game.fruitCooldowns),registered:q.game.akumaCompendium.filter(id=>id==='akuma_neko_leopard').length};});
  assert.equal(restored.form,false);assert.equal(restored.def,76);assert.equal(restored.duplicates,0);assert.equal(restored.registered,1);assert.ok(restored.cooldowns.includes('akuma_neko_leopard:1')&&restored.cooldowns.includes('akuma_neko_leopard:2'));
  await page.evaluate(async()=>{const q=__nekoQA;await q.toggleZoanTransform();q.enterHunt();q.stopAuto();q.paused=true;});
  const death=await page.evaluate(()=>{const q=__nekoQA;q.game.zoanTransformed=true;q.game.hp=1;q.session.nekoAction={kind:'combo',targetId:q.world.mobs[0].id,nextHit:0,started:q.world.time};q.takeDamage(1000000,null,false,true);return {hp:q.game.hp,action:q.session.nekoAction};});assert.equal(death.hp,0);assert.equal(death.action,null);
  assert.deepEqual(errors,[]);
  console.log('Neko browser: Rank D, auto-transform, four native directional clips, Cross Punch, selected-target-only four hits, movement lock/release, through-target dash, guaranteed rear critical, terrain collision, costs, cooldown, reload/save indices and transformation/death cancellation passed.');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
