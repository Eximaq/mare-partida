'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
let source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const bridge=`  window.__spritesQA={paused:false,enterHunt,returnLobby,outputDamage,takeDamage,draw:drawWorld,drawPlayerSpriteBase,drawMobArt,useFruitSkill,saveGame,syncFruitVfx,cancelBasicAttack,heroAttack,stepBasicAttack,stepRyuAction,stepUshiAction,stepWolfAction,stepNekoAction,stepExpansion,stats:getDerived,get game(){return game},get session(){return session},get world(){return world},get defs(){return itemDefs},nav:navigator,auto(value){autoPlay=value;autoSkills=false},stop(){autoPlay=false;autoSkills=false},runTick(dt){this.paused=false;try{tick(dt)}finally{this.paused=true}},center(){camera.update(world.hero,activeMap(),0,true)}};\n  window.__mareDiagnostics=`;
// Test access is confined to this intercepted response, never shipped in the game.
source=source.replace('  window.__mareDiagnostics=',bridge).replace('function tick(dt){','function tick(dt){if(window.__spritesQA?.paused)return;');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/sprites-combat-v2/'))failed.push(r.url());});
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8158/',{waitUntil:'networkidle'});
  await page.locator('#characterName').fill('Sprites QA');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  // Supports the red run before the entry point is wired.
  if(!await page.evaluate(()=>!!globalThis.MareSpriteCombatV2Data)){
   await page.addScriptTag({url:'sprite-combat-v2-data.js'});await page.addScriptTag({url:'sprite-combat-v2.js'});
  }
  await page.evaluate(()=>{const q=__spritesQA;q.game.level=80;q.enterHunt();q.stop();q.paused=true;Math.random=()=>.5;const n=q.nav();let o;
   for(let y=128;y<n.map.height-128&&!o;y+=64)for(let x=128;x<n.map.width-128&&!o;x+=64)if(n.walkable(x,y)&&n.clear({x,y},{x:x+60,y}))o={x,y};
   Object.assign(q.world.hero,o);q.center();q.world.mobs=[{id:'hurt-victim',type:'cocox',district:'entrada',alive:true,hp:100000,maxHP:100000,defense:0,level:18,area:q.game.area,x:o.x+60,y:o.y,anchorX:o.x+60,anchorY:o.y,attack:0,attackClock:999,bob:0,speed:0,emberFacing:'south'}];q.world.target=q.world.mobs[0];
  });
  const damage=await page.evaluate(()=>{const q=__spritesQA,m=q.world.mobs[0],s=MareSpriteCombatV2,t=q.world.time;
   q.outputDamage(m,0);const zero=s.hurtProgress(m,t);const hp=m.hp,dealt=q.outputDamage(m,7),immediate=s.hurtProgress(m,t);q.world.time+=.05;q.outputDamage(m,3);const consecutive=s.hurtProgress(m,q.world.time);q.world.time=t+.181;const ended=s.hurtProgress(m,q.world.time);return {zero,immediate,consecutive,ended,loss:hp-m.hp,dealt};
  });
  assert.equal(damage.zero,null);assert.equal(damage.immediate,0,'Hurt starts in the actual HP mutation event');assert.equal(damage.loss,10);assert.equal(damage.dealt,7);assert.ok(damage.consecutive>.27&&damage.consecutive<.29);assert.equal(damage.ended,null);
  await page.evaluate(()=>{for(const k of Object.keys(MareSpriteCombatV2Data))MareSpriteCombatV2.preload(k);});
  await page.waitForFunction(()=>Object.entries(MareSpriteCombatV2Data).every(([k,e])=>Object.entries(e.clips).every(([a,ds])=>Object.keys(ds).every(d=>MareSpriteCombatV2.status(k,a,d)==='ready'))),null,{timeout:60000});
  const rendering=await page.evaluate(()=>{const s=MareSpriteCombatV2,results=[];const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');
   for(const [key,e]of Object.entries(MareSpriteCombatV2Data))for(const [action,ds]of Object.entries(e.clips))for(const direction of Object.keys(ds))for(const progress of [0,.5,1]){
    c.clearRect(0,0,256,256);const ok=s.draw(c,key,128,220,{action,direction,progress,height:80});const pixels=c.getImageData(0,0,256,256).data;let opaque=0;for(let i=3;i<pixels.length;i+=4)opaque+=pixels[i]>0;
    if(!ok||opaque<20)throw Error('Empty visual '+key+'/'+action+'/'+direction+'/'+progress);results.push([key,action,direction]);
   }return results.length;
  });assert.ok(rendering>1000);
  // Confirm actual game renderers use the new assets, not only the review adapter.
  const surfaces=await page.evaluate(()=>{const q=__spritesQA,c=document.createElement('canvas').getContext('2d'),urls=[],original=c.drawImage.bind(c);c.drawImage=(im,...args)=>{urls.push(im.src);original(im,...args);};
   for(const id of Object.keys(MareSpriteCombatV2.fruits))MareZoanArt.draw(c,id,128,220,{action:'idle',scale:1});
   for(const sys of [MareNeko,MareUshi,MareWolf,MareRyu,MareRankCExpansion])sys.drawActor(c,128,220,{action:'attack',progress:.5});
   for(const key of Object.keys(MareSpriteCombatV2Data).filter(k=>MareSpriteCombatV2Data[k].monster))MareNewIslandArt.monster(c,{type:key,x:128,y:220,alive:true,moving:0,emberFacing:'south'},q.world.time);
   const g=MareHoya.create(q.stats(),128,220,q.world.time);MareHoya.drawActor(c,g,q.world.time);return urls;
  });assert.equal(surfaces.length,26);assert.ok(surfaces.every(u=>u.includes('/assets/sprites-combat-v2/')));
  for(const id of Object.keys(await page.evaluate(()=>MareSpriteCombatV2.fruits))){
   const r=await page.evaluate(id=>{const q=__spritesQA;q.cancelBasicAttack();q.game.equipment.akuma_no_mi={id:'qa-'+id,def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.zoanTransformed=true;q.syncFruitVfx();q.game.hp=q.stats().maxHP;q.session.respawn=0;q.session.fruitInvulnerable=0;q.world.hero.direction='front';q.session.zoanTransition=null;q.world.time+=1;const before=q.game.hp;q.takeDamage(5,null,false,true);const hurt=MareSpriteCombatV2.hurtProgress(q.world.hero,q.world.time);const c=document.createElement('canvas').getContext('2d');let url;c.drawImage=(im)=>{url=im.src};q.drawPlayerSpriteBase(c,128,220);return {loss:before-q.game.hp,hurt,url};},id);
   assert.equal(r.loss,5,id);assert.equal(r.hurt,0,id);assert.ok(r.url.includes('/assets/sprites-combat-v2/'),id);
  }
  const specials=[['akuma_uma_uma','2','uma','special'],['akuma_neko_leopard','1','neko','special'],['akuma_ushi_giraffe','1','ushi','special'],['akuma_inu_wolf','1','wolf','special'],['akuma_ryu_ryu','1','ryu','special'],['akuma_ryu_ryu','2','ryu','special-2'],['akuma_ushi_bison','1','bison','special']];
  for(const [id,key,asset,action]of specials){
   console.log('Skill validation',asset,key);
   const result=await page.evaluate(async({id,key,asset,action})=>{const q=__spritesQA,m=q.world.mobs[0];q.cancelBasicAttack();q.game.equipment.akuma_no_mi={id:'qa-'+id,def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.zoanTransformed=true;q.syncFruitVfx();q.session.ryuAction=q.session.wolfAction=q.session.ushiAction=q.session.nekoAction=q.session.bisonAction=q.session.zoanDash=null;q.session.zoanActionUntil=0;q.session.zoanTransition=null;q.session.respawn=0;q.world.hero.talentControl=null;q.game.hp=q.stats().maxHP;q.game.energy=1000;q.game.fruitCooldowns={};q.world.time+=2;q.world.spawnClock=1e9;Object.assign(m,{hp:100000,alive:true,returning:false,x:q.world.hero.x+45,y:q.world.hero.y,attackClock:1e9,speed:0,telegraph:null});delete m.wolfBleed;delete m.talentPoison;delete m.ultimateBurn;m.ryuStunUntil=0;m.talentControl=null;q.world.target=m;q.world.hero.direction='right';
    const ok=await q.useFruitSkill(true,key);const energy=q.game.energy;let safety=0;while(m.hp===100000&&safety++<300)q.runTick(.01);
    const c=document.createElement('canvas').getContext('2d');let url,frame;c.drawImage=(im,sx,sy,w)=>{url=im.src;frame=sx/w};q.drawPlayerSpriteBase(c,128,220);const expected=MareSpriteCombatV2.resolve(asset,action,q.world.hero.direction).clip.impact_frame;
    const damage=100000-m.hp;q.drawPlayerSpriteBase(c,128,220);q.drawPlayerSpriteBase(c,128,220);return {ok,energy,damage,same:m.hp===100000-damage,url,frame,expected};
   },{id,key,asset,action});
   assert.equal(result.ok,true,id+'/'+key);assert.ok(result.damage>0,id+'/'+key);assert.equal(result.same,true,'rendering cannot apply damage');assert.ok(result.url.includes(`/${asset}/${action}-`),JSON.stringify(result));assert.ok(Math.abs(result.frame-result.expected)<=1,JSON.stringify(result));
  }
  if(process.env.MARE_QA_DIR){
   await page.evaluate(()=>{const gallery=document.createElement('canvas');gallery.id='qa-gallery';gallery.width=1260;gallery.height=840;Object.assign(gallery.style,{position:'fixed',inset:'0',zIndex:'99999',background:'#20282e'});document.body.append(gallery);});
   await page.setViewportSize({width:1280,height:900});
   for(const action of ['idle','walk','attack','hurt','special']){
    await page.evaluate(action=>{const canvas=document.querySelector('#qa-gallery'),c=canvas.getContext('2d');c.clearRect(0,0,1260,840);c.fillStyle='#20282e';c.fillRect(0,0,1260,840);c.font='14px sans-serif';for(const [i,[key,e]]of Object.entries(MareSpriteCombatV2Data).entries()){const x=(i%7)*180+90,y=Math.floor(i/7)*280+235;MareSpriteCombatV2.draw(c,key,x,y,{action,direction:'south',height:145,progress:.5});c.fillStyle='#ffffff';c.fillText(key,x-75,y+25);c.fillStyle='#d0c4a0';c.fillText(MareSpriteCombatV2.resolve(key,action,'south').requested?action:'fallback: idle/run',x-75,y+44);}},action);
    await page.locator('#qa-gallery').screenshot({path:path.join(process.env.MARE_QA_DIR,'gallery-'+action+'.png')});
   }await page.evaluate(()=>document.querySelector('#qa-gallery').remove());
  }
  const kills=await page.evaluate(()=>{const q=__spritesQA;q.game.zoanTransformed=false;q.game.equipment.akuma_no_mi=null;q.syncFruitVfx();q.session.ryuAction=q.session.wolfAction=q.session.ushiAction=q.session.nekoAction=q.session.bisonAction=q.session.zoanDash=null;q.game.hp=q.stats().maxHP;q.session.respawn=0;q.cancelBasicAttack();q.world.hero.combat?.reset();q.returnLobby();q.game.area='rare';q.enterHunt();q.world.spawnClock=1e9;q.auto(true);const start=q.game.stats.kills,template={...q.world.mobs[0]};let steps=0;
   for(let i=0;i<20;i++){q.world.mobs=[{...template,id:'cycle-'+i,alive:true,returning:false,hp:1,maxHP:1,x:q.world.hero.x+35,y:q.world.hero.y,attackClock:1e9,speed:0,telegraph:null,wolfBleed:null,talentControl:null}];q.world.target=q.world.mobs[0];q.session.attackClock=0;while(q.world.mobs[0]?.alive&&steps++<2000)q.runTick(.05);}
   q.stop();return q.game.stats.kills-start;});assert.equal(kills,20,'20 consecutive auto-hunt kills and real rewards');
  const maps=await page.evaluate(()=>{const q=__spritesQA,results=[];for(const area of ['beach','swamp','orange','rare','syrup','baratie','arlong','loguetown','alabasta']){q.returnLobby();q.game.area=area;q.enterHunt();q.stop();q.draw();results.push({area,walkable:q.nav().walkable(q.world.hero.x,q.world.hero.y)});}q.returnLobby();return results;});assert.ok(maps.every(m=>m.walkable),JSON.stringify(maps));
  const performanceSample=await page.evaluate(async()=>{const times=[];let prev=performance.now();for(let i=0;i<120;i++)await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now-prev);prev=now;resolve()}));times.sort((a,b)=>a-b);return {medianFrameMs:times[60],heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null};});console.log('Short browser performance sample',JSON.stringify(performanceSample));
  const save=await page.evaluate(()=>{const q=__spritesQA;q.saveGame();return {level:q.game.level,gold:q.game.gold,kills:q.game.stats.kills};});
  if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});for(const [w,h]of [[1920,1080],[1366,768],[1280,720],[390,844]]){await page.setViewportSize({width:w,height:h});await page.evaluate(()=>__spritesQA.draw());await page.screenshot({path:path.join(process.env.MARE_QA_DIR,`world-${w}.png`)});}}
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!__spritesQA.game);assert.deepEqual(await page.evaluate(()=>({level:__spritesQA.game.level,gold:__spritesQA.game.gold,kills:__spritesQA.game.stats.kills})),save);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('Sprite v2 browser: 21 characters, '+rendering+' native poses, all render surfaces, real HP/Hurt boundary, repeated hits, all Zoans and save reload passed.');await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
