'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
// Private fixture is injected only in this isolated browser response.
const bridge=`  window.__ushiQA={paused:false,enterHunt,returnLobby,useFruitSkill,heroAttack,toggleZoanTransform,unequip,equipItem,takeDamage,saveGame,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs},nav:navigator,active:ushiBuffActive,stopAuto(){autoPlay=false;autoSkills=false},step(dt){world.time+=dt;stepBasicAttack(dt);stepUshiAction()},manual(key,dt){keys.add(key);const result=moveManually(dt);keys.clear();return result;}};\n  window.__mareDiagnostics=`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:Number(process.env.MARE_TEST_WIDTH)||1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',bridge).replace('function tick(dt){','function tick(dt){if(window.__ushiQA?.paused)return;')}));
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8134/',{waitUntil:'domcontentloaded'});
  await page.locator('#characterName').fill('Girafa QA');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  await page.locator('#characterMenuTrigger').click();await page.locator('[data-character-section=akuma]').click();await page.locator('[data-akuma-rank=D]').click();await page.locator('[data-fruit-register=akuma_ushi_giraffe]').click();
  await page.waitForFunction(()=>__mareDiagnostics().akuma.registered.includes('akuma_ushi_giraffe'));
  await page.keyboard.press('Escape');await page.keyboard.press('i');
  const id=await page.evaluate(()=>__ushiQA.game.inventory.find(i=>i.fruitId==='akuma_ushi_giraffe').id);
  await page.locator('[data-item="'+id+'"]').click();assert.match(await page.locator('#dialogBody').innerText(),/Chicote de Marfim/);
  await page.locator('[data-equip="'+id+'"]').click();await page.waitForFunction(()=>__ushiQA.game.zoanTransformed);
  if(process.env.MARE_EXPECT_API)await page.waitForFunction(async()=>{const q=__ushiQA,r=await fetch('/api/akuma/state?player_id='+q.game.akumaPlayerId);if(!r.ok)return false;const s=await r.json();return s.equipped==='akuma_ushi_giraffe'&&s.transformed;});
  await page.waitForFunction(()=>['idle','walk','attack','headbutt'].every(a=>['front','back','left','right'].every(d=>MareUshi.status(a,d)==='ready')));
  assert.match(await page.locator('#skill1').getAttribute('aria-label'),/Chicote de Marfim/);assert.match(await page.locator('#skill2').getAttribute('aria-label'),/Fúria Selvagem/);
  const setup=await page.evaluate(()=>{
   const q=__ushiQA;q.game.level=30;q.enterHunt();q.stopAuto();q.paused=true;q.world.spawnClock=1e9;q.game.hp=__mareDiagnostics().stats.maxHP;q.game.energy=200;
   const hero=q.world.hero,nav=q.nav();let v;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(nav.clear(hero,{x:hero.x+dx*144,y:hero.y+dy*144})){v={dx,dy};break;}
   if(!v)throw Error('No open test segment');
   const mob=id=>({id,type:'helmeppo',alive:true,hp:10000,maxHP:10000,defense:100,level:8,area:q.game.area,x:hero.x+v.dx*64,y:hero.y+v.dy*64,anchorX:hero.x,anchorY:hero.y,bob:0,speed:0,emberFacing:'south'});
   q.world.mobs=[mob('selected'),mob('nearby')];q.world.mobs[1].x-=v.dy*48;q.world.mobs[1].y+=v.dx*48;q.world.target=q.world.mobs[0];window.ushiVector=v;window.ushiHero={x:hero.x,y:hero.y};
   return {physical:__mareDiagnostics().stats.physical,def:q.game.equipment.akuma_no_mi.def};
  });assert.equal(setup.def,77);
  const hit=await page.evaluate(async()=>{
   const q=__ushiQA,m=q.world.target,from={x:m.x,y:m.y};const ok=await q.useFruitSkill(true,'1'),before=m.hp;
   q.manual('d',.1);const blocked=q.world.hero.x===ushiHero.x&&q.world.hero.y===ushiHero.y;
   q.step(.249);const early=m.hp;q.step(.002);const damage=10000-m.hp;q.step(.2);
   return {ok,before,early,damage,blocked,push:Math.hypot(m.x-from.x,m.y-from.y),other:q.world.mobs[1].hp,active:!!q.session.ushiAction,energy:q.game.energy};
  });assert.equal(hit.ok,true);assert.equal(hit.before,10000);assert.equal(hit.early,10000);assert.equal(hit.damage,Math.floor(setup.physical*1.8-21));assert.equal(hit.push,64);assert.equal(hit.other,10000);assert.equal(hit.blocked,true);assert.equal(hit.active,false);assert.equal(hit.energy,174);
  const buff=await page.evaluate(async()=>{
   const q=__ushiQA;const ok=await q.useFruitSkill(true,'2');q.game.hp=500;q.takeDamage(100,null,false,true);const hp=q.game.hp;
   const basic=(active)=>{q.session.ushiBuffUntil=active?Date.now()+5000:0; q.session.ushiBasicUntil=0;q.world.target=q.world.mobs[1];q.world.target.defense=0;const before=q.world.target.hp,old=Math.random;Math.random=()=>.5;try{q.heroAttack(q.world.target);q.step(MareCombatAnimation.attackDuration(__mareDiagnostics().stats.speed)+.0001);}finally{Math.random=old;}return before-q.world.target.hp;};
   const normal=basic(false),boosted=basic(true);q.session.ushiBuffStartedAt=Date.now();
   return {ok,hp,active:q.active(),normal,boosted,energy:q.game.energy};
  });assert.equal(buff.ok,true);assert.equal(buff.hp,440);assert.equal(buff.active,true);assert.equal(buff.energy,144);assert.equal(buff.boosted,Math.floor(buff.normal*1.25));
  const buffRules=await page.evaluate(async()=>{
   const q=__ushiQA;
   const m=q.world.mobs[1];q.world.target=m;m.defense=100;m.hp=10000;q.world.hero.attackAnim=0;
   const p={x:q.world.hero.x,y:q.world.hero.y};q.manual('d',.05);const free=Math.hypot(q.world.hero.x-p.x,q.world.hero.y-p.y)>0;
   q.world.hero.x=p.x;q.world.hero.y=p.y;
   // Replay only the impact state to compare buffed skill damage without resetting
   // the genuine persistent cooldown already exercised by the first cast.
   q.session.ushiAction={targetId:m.id,started:q.world.time,hit:false};q.step(.3);const skillDamage=10000-m.hp;q.step(.2);
   return {free,skillDamage};
  });assert.equal(buffRules.free,true);assert.equal(buffRules.skillDamage,Math.floor(setup.physical*1.8-21),'buff must not amplify skill damage');
  if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'girafa-buff.png')});}
  // Exercise the actual map navigator at a solid boundary, not a fabricated collider.
  const solid=await page.evaluate(()=>{
   const q=__ushiQA,nav=q.nav(),hero=q.world.hero;let fixture;
   for(let angle=0;angle<Math.PI*2&&!fixture;angle+=Math.PI/8)for(const reach of [32,48,64,80,96,112]){
    const dx=Math.cos(angle),dy=Math.sin(angle),p={x:hero.x+dx*reach,y:hero.y+dy*reach},end={x:p.x+dx*64,y:p.y+dy*64};
    if(nav.walkable(p.x,p.y)&&nav.clear(hero,p)&&!nav.clear(p,end)){fixture={p,end};break;}
   }
   if(!fixture)throw Error('No solid boundary near spawn');
   const m=q.world.mobs[0];Object.assign(m,fixture.p,{hp:10000,alive:true,defense:0});
   const result=MareUshi.knockback(hero,m,(from,to)=>nav.clear(from,to)&&nav.walkable(to.x,to.y));
   return {start:fixture.p,result};
  });assert.deepEqual(solid.result,solid.start,'solid map boundary prevents the entire knockback');
  const cancel=await page.evaluate(async()=>{const q=__ushiQA;await q.toggleZoanTransform();const active=q.active();await q.toggleZoanTransform();const reactivated=q.active();q.session.ushiBuffUntil=Date.now()-1;const expired=q.active();q.session.ushiBuffUntil=Date.now()+5000;q.takeDamage(1e6,null,false,true);return {active,reactivated,expired,hp:q.game.hp,until:q.session.ushiBuffUntil,action:q.session.ushiAction};});
  assert.deepEqual(cancel,{active:false,reactivated:false,expired:false,hp:0,until:0,action:null});
  await page.evaluate(()=>{const q=__ushiQA;q.game.hp=100;q.session.respawn=0;q.game.zoanTransformed=false;q.saveGame();});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ushiQA?.game?.equipment?.akuma_no_mi?.fruitId==='akuma_ushi_giraffe');
  const save=await page.evaluate(()=>({form:__ushiQA.game.zoanTransformed,def:__ushiQA.game.equipment.akuma_no_mi.def,owned:__ushiQA.game.akumaCompendium.filter(id=>id==='akuma_ushi_giraffe').length,cooldowns:Object.keys(__ushiQA.game.fruitCooldowns),buff:__ushiQA.active()}));
  assert.equal(save.form,false);assert.equal(save.def,77);assert.equal(save.owned,1);assert.equal(save.buff,false);assert.ok(save.cooldowns.includes('akuma_ushi_giraffe:1'));assert.ok(save.cooldowns.includes('akuma_ushi_giraffe:2'));
  if(process.env.MARE_EXPECT_API)await page.waitForFunction(async()=>{const r=await fetch('/api/akuma/state?player_id='+__ushiQA.game.akumaPlayerId),s=await r.json();return s.equipped==='akuma_ushi_giraffe'&&!s.transformed;});
  assert.deepEqual(errors,[]);console.log('Ushi browser: registration, equip/transform, four-direction native clips, delayed single hit, penetration, 64px knockback, movement lock, all-source mitigation, basic-only bonus, cancellation, independent cooldowns and reload passed');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
