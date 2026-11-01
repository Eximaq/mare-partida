'use strict';
// Regression for native weapon origins obstructed by scenery despite a clear feet ray.
// Disposable browser state only; the bridge is injected into the test response.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const origin=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/dist/';
const evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const width=process.argv.includes('--narrow')?390:1366;
const cases=[
 {name:'east-emitter',hero:{x:1770.933945703496,y:1791.596495062619},target:{x:1872.12516783032,y:1803.433455863569},anchor:{x:1872,y:1840}},
 {name:'west-emitter-seed22',hero:{x:1192.689682532616,y:1504.58787749769},target:{x:1081.8541602858643,y:1489.7208431370327},anchor:{x:1040,y:1488}}
];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width,height:768}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>route.fulfill({status:404,body:'{}'}));
 await page.route('**/game.js*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const hook=`window.__rangedQA={get g(){return game},get w(){return world},get s(){return session},r:lobby96,nav:navigator,stats:getDerived,enterHunt,heroAttack,stepCombatVfx,faceCombatTarget,combatChest,draw:presentWorld,tick,center(){camera.update(world.hero,activeMap(),0,true)},equip(){cancelBasicAttack();game.classId='healer';configureFactionVisual();const item=newItem(itemDefs[31],1,false);game.inventory.push(item);equipItem(item.id);},auto(){autoPlay=true;autoSkills=false},stop(){autoPlay=false;autoSkills=false}};`;
  assert(source.includes('  window.__mareDiagnostics='),'test bridge insertion point');
  await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});
 });
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__rangedQA&&__mareDiagnostics().lobby96.state==='ready');
 await page.locator('#characterName').fill('Ranged QA');
 await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
 await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
 await page.evaluate(async()=>{const q=__rangedQA;q.equip();q.g.appearance96={...MareCharacterAppearance.read(q.g),gender:'feminino'};if(!await q.r.ensure(q.g))throw Error('Native weapon composition failed');});
 if(evidence)await fs.mkdir(evidence,{recursive:true});
 for(const scenario of cases){
  const result=await page.evaluate(scenario=>{
   const q=__rangedQA;q.enterHunt();q.stop();q.w.spawnClock=1e9;q.g.hp=q.stats().maxHP;
   const hero=q.w.hero;Object.assign(hero,scenario.hero);
   const target={...q.w.mobs[0],id:'ranged-regression',...scenario.target,anchorX:scenario.anchor.x,anchorY:scenario.anchor.y,alive:true,hp:10000,maxHP:10000,defense:0,magicDefense:0,speed:0,patrolClock:1e9,attackClock:1e9,engaged:false,returning:false};
   q.w.mobs=[target];q.w.target=target;q.faceCombatTarget(target);
   const accepted=q.heroAttack(target,1,null,false,true),shot=q.s.combatProjectiles[0],point=q.combatChest(target),nav=q.nav();
   if(!shot)throw Error('Expected native projectile');
   const feetClear=nav.projectileClear(hero,target),shotClear=nav.projectileClear({x:shot.origin.x,y:shot.origin.y+24},{x:point.x,y:point.y+24});
   for(let i=0;i<30;i++){q.w.time+=.05;q.stepCombatVfx(.05);}
   const blockedDamage=10000-target.hp;
   q.auto();for(let i=0;i<400;i++){q.tick(.05);if(i%5===0)q.draw();}
   q.center();q.draw();
   return {accepted,feetClear,shotClear,blockedDamage,autoDamage:10000-target.hp,moved:Math.hypot(hero.x-scenario.hero.x,hero.y-scenario.hero.y),walkable:nav.walkable(hero.x,hero.y),visualErrors:q.r.snapshot().errors};
  },scenario);
  if(evidence)await page.screenshot({path:path.join(evidence,scenario.name+'-'+width+'.png')});
  console.log(JSON.stringify({case:scenario.name,...result}));
  assert.equal(result.accepted,true);assert.equal(result.feetClear,true,scenario.name);
  assert.equal(result.shotClear,false,'fixture must exercise the obstructed native emitter');
  assert.equal(result.blockedDamage,0,'scenery must continue blocking the original projectile');
  assert(result.autoDamage>0,scenario.name+': auto hunt must reposition and land damage');
  assert(result.moved>1,'auto hunt must leave the obstructed firing position');
  assert.equal(result.walkable,true);assert.deepEqual(result.visualErrors,[]);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
