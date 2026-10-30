'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
let source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
source=source.replace('  window.__mareDiagnostics=',`  window.__zoanScaleQA={paused:false,drawPlayerSpriteBase,syncFruitVfx,combatHudBox,combatActorHeight,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs}};\n  window.__mareDiagnostics=`).replace('function tick(dt){','function tick(dt){if(window.__zoanScaleQA?.paused)return;');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8162/',{waitUntil:'networkidle'});
 await page.locator('#characterName').fill('Escala Zoan QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.evaluate(()=>__zoanScaleQA.paused=true);
 const rows=[];
 for(const [id,key]of Object.entries(await page.evaluate(()=>MareSpriteCombatV2.fruits))){
  const prefetch=['uma','inu','tori'].includes(key)?page.waitForRequest(r=>r.url().includes('/'+key+'/'+(key==='tori'?'walk':'run')+'-east.png'),{timeout:5000}):null;
  await page.evaluate(id=>{const q=__zoanScaleQA;q.game.equipment.akuma_no_mi={id:'scale-'+id,def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.zoanTransformed=true;q.syncFruitVfx();q.session.zoanTransition=null;q.world.hero.walking=0;q.world.hero.attackAnim=0;q.world.time=0;},id);
  // Equipping must request locomotion before the first direction change, without status() starting it.
  if(prefetch)await prefetch;
  await page.evaluate(key=>MareSpriteCombatV2.preload(key),key);
  await page.waitForFunction(key=>['south','north','west','east'].every(d=>MareSpriteCombatV2.status(key,'walk',d)==='ready'&&MareSpriteCombatV2.status(key,'idle',d)==='ready'),key);
  const result=await page.evaluate(key=>{const q=__zoanScaleQA,canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d'),original=c.drawImage.bind(c),calls=[];c.drawImage=(im,...args)=>{calls.push({url:im.src,frame:args[0]/args[2]});original(im,...args);};
   q.world.hero.y=450;const idle=[],frames=[];for(const direction of ['front','back','left','right']){
    q.world.hero.direction=direction;q.world.hero.walking=0;c.clearRect(0,0,512,512);q.drawPlayerSpriteBase(c,256,450);const data=c.getImageData(0,0,512,512).data;let x0=512,x1=0,y0=512,y1=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*512+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}idle.push({direction,width:x1-x0+1,height:y1-y0+1,barBottom:q.combatHudBox(q.world.hero).barY+7,logicalHeight:q.combatActorHeight(q.world.hero)});
    q.world.hero.walking=1;for(let i=0;i<144;i++){q.world.time=i/24;calls.length=0;q.drawPlayerSpriteBase(c,256,450);frames.push({direction,...calls.at(-1)});}
   }return {key,idle,frames};
  },key);
  if(['uma','tori','inu'].includes(key))for(const b of result.idle){assert.ok(b.barBottom<450-b.height,key+' overhead bar must stay above the enlarged sprite');assert.equal(b.logicalHeight,74,'visual resize cannot change projectile/body authority');}
  if(key==='uma')for(const b of result.idle)assert.ok(Math.abs(b.height-136)<=2,JSON.stringify(b));
  if(key==='tori')for(const b of result.idle)assert.ok(Math.abs(b.height-115)<=2,JSON.stringify(b));
  if(key==='inu'){const extents=result.idle.map(b=>Math.max(b.width,b.height));assert.ok(Math.max(...extents)-Math.min(...extents)<=2,JSON.stringify(result.idle));for(const n of extents)assert.ok(Math.abs(n-111)<=2);}
  for(const f of result.frames){assert.ok(!f.url.includes('/idle-'),key+' stays in locomotion');if(key!=='wolf')assert.ok(f.frame>0,key+' omits source Idle frame 0');if(key==='ushi'&&f.direction==='back')assert.ok(f.frame<24,'omit frozen north tail');}
  rows.push({key,idle:result.idle});
 }
 const previews=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d'),results=[];for(const d of ['front','back','left','right']){c.clearRect(0,0,256,256);MareZoanArt.draw(c,'akuma_inu_dachshund',128,220,{direction:d,scale:4,fit:64});const pixels=c.getImageData(0,0,256,256).data;let x0=256,x1=0,y0=256,y1=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}results.push(Math.max(x1-x0+1,y1-y0+1));}return results;});assert.ok(previews.every(n=>n>=63&&n<=65),'portrait fit preserves all four directions without oversized clipping');
 if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});
  await page.setViewportSize({width:1100,height:900});
  await page.evaluate(()=>{const gallery=document.createElement('canvas');gallery.id='scale-gallery';gallery.width=1080;gallery.height=860;Object.assign(gallery.style,{position:'fixed',inset:0,zIndex:99999,background:'#20282e'});document.body.append(gallery);});
  for(const moving of [false,true]){
   await page.evaluate(moving=>{const q=__zoanScaleQA,canvas=document.querySelector('#scale-gallery'),c=canvas.getContext('2d');c.clearRect(0,0,1080,860);c.fillStyle='#20282e';c.fillRect(0,0,1080,860);c.font='16px sans-serif';for(const [row,id]of ['akuma_uma_uma','akuma_tori_albatroz','akuma_inu_dachshund'].entries()){
    q.game.equipment.akuma_no_mi={id:'gallery-'+id,def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.zoanTransformed=true;q.syncFruitVfx();q.session.zoanTransition=null;q.world.hero.walking=moving?1:0;q.world.time=.25;
    for(const [col,direction]of ['front','back','left','right'].entries()){q.world.hero.direction=direction;q.drawPlayerSpriteBase(c,135+col*270,225+row*280);c.fillStyle='white';c.fillText(MareSpriteCombatV2.fruits[id]+' / '+direction,25+col*270,255+row*280);}
   }},moving);
   await page.locator('#scale-gallery').screenshot({path:path.join(process.env.MARE_QA_DIR,moving?'world-walk-gallery.png':'world-idle-gallery.png')});
  }await page.evaluate(()=>document.querySelector('#scale-gallery').remove());
  for(const [w,h]of [[1366,768],[390,844]]){await page.setViewportSize({width:w,height:h});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'scale-walk-'+w+'.png')});}
 }
 assert.deepEqual(errors,[]);console.log('Zoan scale/walk:',JSON.stringify(rows));console.log('All eight forms, four directions and 4608 walking samples passed.');await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
