'use strict';
// Isolated save and intercepted QA hooks. Exercise the real human fruit cast,
// then the same pose supplied by online snapshots; never contact an account.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.MARE_TEST_URL||'http://127.0.0.1:8183/',out=process.env.MARE_EVIDENCE_DIR;
const hook=`window.__visibilityQA={get game(){return game},get session(){return session},get world(){return world},runtime:lobby96,cast:useFruitSkill,draw:presentWorld,start(){game=createGame('Akuma QA','sword');startGame();enterHunt();autoPlay=false;autoSkills=false;},setup(body,cls){game.classId=cls;game.appearance96={...MareCharacterAppearance.read(game),gender:body};game.equipment.weapon=newItem(itemDefs[starterWeapon(cls)]);game.equipment.akuma_no_mi=newItem(itemDefs.find(d=>d.fruitId==='akuma_mera_mera'));game.fruitCooldowns={};syncFruitVfx();initializeSession();autoPlay=false;autoSkills=false;game.energy=10000;game.hp=100000;const nav=navigator();let point;for(let y=256;y<1400&&!point;y+=32)for(let x=256;x<1700&&!point;x+=32)if([[0,0],[80,0],[-80,0],[0,80],[0,-80]].every(([dx,dy])=>nav.walkable(x+dx,y+dy)&&nav.clear({x,y},{x:x+dx,y:y+dy})))point={x,y};if(!point)throw Error('No clear test arena');Object.assign(world.hero,point,{direction:'front'});world.spawnClock=999;world.mobs=[{...monsterTypes.bandit,id:98765,type:'bandit',area:game.area,x:point.x,y:point.y+80,anchorX:point.x,anchorY:point.y+80,hp:1e8,maxHP:1e8,alive:true,level:1,defense:0,attack:0,speed:0,bob:0,attackClock:99,patrolClock:100}];world.target=world.mobs[0];camera.update(world.hero,activeMap(),0,true);updateUI();},aim(direction){const [dx,dy]={south:[0,80],north:[0,-80],east:[80,0],west:[-80,0]}[direction];Object.assign(world.target,{x:world.hero.x+dx,y:world.hero.y+dy,anchorX:world.hero.x+dx,anchorY:world.hero.y+dy});world.hero.direction=direction;},step(dt){tick(dt);updateUI();presentWorld()},probe(){const c=document.createElement('canvas');c.width=c.height=256;const ok=drawPlayerSprite(c.getContext('2d'),128,220);return {ok,pixels:[...c.getContext('2d').getImageData(0,0,256,256).data].filter((v,i)=>i%4===3&&v).length};}};`;
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/paper-doll-96-v3/assets/'))requests.push(r.url())});
 await p.route('**/api/akuma/**',r=>r.fulfill({status:404,body:'{}'}));await p.route('**/__dev_version',r=>r.fulfill({body:'stable'}));await p.route('**/game.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
 await p.goto(base);await p.waitForFunction(()=>window.__visibilityQA&&__mareDiagnostics().lobby96.state==='ready');await p.evaluate(()=>__visibilityQA.start());
 await p.evaluate(async()=>{for(let i=0;i<180;i++){__testFrame(performance.now());await new Promise(r=>setTimeout(r,1));}});
 let casts=0,frames=0;
 for(const body of ['masculino','feminino'])for(const cls of ['sword','brawler','gunner','rogue','cyborg','strategist','healer']){
  await p.evaluate(({body,cls})=>__visibilityQA.setup(body,cls),{body,cls});assert(await p.evaluate(()=>__visibilityQA.runtime.ensure(__visibilityQA.game)));
  for(const [index,direction]of ['south','north','east','west'].entries()){
   await p.evaluate(({direction,key})=>{const q=__visibilityQA;q.aim(direction);q.game.energy=10000;q.game.fruitCooldowns={};q.session.rankA=null;void q.cast(true,key);q.draw();},{direction,key:String(index%3+1)});
   const requestCount=requests.length;
   for(let i=0;i<8;i++){
    const sample=await p.evaluate(()=>{const q=__visibilityQA;q.draw();return {pose:__mareDiagnostics().lobby96.lastPose,probe:q.probe(),loading:q.runtime.snapshot().loading,equipment:q.game.equipment.weapon.def,casting:!!q.session.fruitAction,diag:{hp:q.game.hp,energy:q.game.energy,respawn:q.session.respawn,pending:q.session.fruitCastPending,actionUntil:q.session.onlineActionUntil,control:q.world.hero.talentControl,target:q.world.target?.id,mobs:q.world.mobs.map(m=>({id:m.id,hp:m.hp,alive:m.alive,x:m.x,y:m.y})),cooldowns:q.game.fruitCooldowns}}});
    assert(sample.casting,JSON.stringify({body,cls,direction,i,sample}));assert(sample.pose,JSON.stringify({body,cls,direction,i,sample}));assert.equal(sample.pose.action,'attack-unarmed');assert.equal(sample.pose.weapon,'original');assert(sample.probe.ok&&sample.probe.pixels>100,'the current body must draw on every cast frame');assert.equal(sample.loading,false,'a cast cannot rebuild the equipped wardrobe');
    frames++;if(out&&body==='feminino'&&cls==='gunner'&&direction==='south'&&i===3){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'akuma-cast-visible.png')});}
    await p.evaluate(()=>__visibilityQA.step(.05));
   }
   for(let i=0;i<120&&await p.evaluate(()=>!!__visibilityQA.session.fruitAction);i++){await p.evaluate(()=>__visibilityQA.step(.05));await p.waitForTimeout(10);}
   assert.equal(await p.evaluate(()=>!!__visibilityQA.session.fruitAction),false);await p.evaluate(()=>__visibilityQA.draw());
   const after=await p.evaluate(()=>({pose:__mareDiagnostics().lobby96.lastPose,probe:__visibilityQA.probe()}));assert(after.pose&&after.probe.ok&&after.probe.pixels>100);assert.notEqual(after.pose.weapon,'original');assert.equal(requests.length,requestCount,'a cast must reuse prepared sprite sources');casts++;
  }
  // The online adapter populates this same action from castVisual snapshots.
  await p.evaluate(()=>{const q=__visibilityQA;q.session.fruitAction={online:true,fruit:'akuma_mera_mera',area:q.game.area,direction:'north',started:q.world.time,until:q.world.time+.5};q.draw()});
  assert(await p.evaluate(()=>__visibilityQA.probe().ok));assert.equal(await p.evaluate(()=>__mareDiagnostics().lobby96.lastPose.weapon),'original');await p.evaluate(()=>{__visibilityQA.session.fruitAction=null;__visibilityQA.draw()});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({casts,frames,classes:7,bodies:2,directions:4,onlinePose:true,wardrobeReloadsDuringCast:0,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
