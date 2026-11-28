'use strict';
const resumeFemaleSave=require('./existing-female-save.cjs');
// Existing female saves and new male characters use the same movement and combat controls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out=process.env.MARE_EVIDENCE_DIR||'artifacts/rework-movement-ui',rows=[];fs.mkdirSync(out,{recursive:true});
// A cold lateral image may finish decoding after the player has reached a wall.
// Give the keyboard another real run-up when the map has already stopped walking.
async function paintedLateral(page,key,direction,start){
 const deadline=Date.now()+45000,opposite=key==='d'?'a':'d';
 while(Date.now()<deadline){
  const reached=await page.waitForFunction(({start,direction})=>{
   const q=__reworkDefaultQA.read(),painted=q.paintedWalk,draw=q.worldDraw;
   if(painted?.count>start&&painted.direction===direction)return 'drawn';
   const facing={right:'east',left:'west'}[draw?.direction]||draw?.direction;
   return draw?.count>start&&draw.action==='idle'&&facing===direction?'wall':false;
  },{start,direction},{timeout:Math.max(1,deadline-Date.now())});
  if(await reached.jsonValue()==='drawn')return;
  await page.keyboard.up(key);
  const x=await page.evaluate(()=>__mareDiagnostics().hero.x);
  await page.keyboard.down(opposite);
  try{await page.waitForFunction(x=>Math.abs(__mareDiagnostics().hero.x-x)>=160,x,{timeout:10000});}
  finally{await page.keyboard.up(opposite);}
  start=await page.evaluate(()=>__reworkDefaultQA.read().worldDraw.count);
  await page.keyboard.down(key);
 }
 throw Error('No exact walking pose was painted facing '+direction);
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const gender of ['masculino','feminino']){const context=await b.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:path.join(out,gender+'-video'),size:{width:1280,height:800}}}),p=await context.newPage();try{
await p.route('**/game.js*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:(await res.text()).replace('  window.__mareDiagnostics=',"let __lastRealWorldDraw=null,__lastPaintedWalk=null,__realWorldDraws=0;const __observeWorldDraw=lobby96.draw.bind(lobby96);lobby96.draw=function(c,p,o){const result=__observeWorldDraw(c,p,o);if(o.consumer==='world'&&c.canvas.id==='worldCanvas'){const snapshot=lobby96.snapshot();__lastRealWorldDraw={count:++__realWorldDraws,at:performance.now(),returned:result,action:o.action,direction:o.direction,scene:o.scene,viewport:[innerWidth,innerHeight],canvas:[c.canvas.width,c.canvas.height],snapshot,heroScreen:camera.worldToScreen(world.hero.x,world.hero.y),camera:{x:camera.x,y:camera.y,width:camera.width,height:camera.height,masked:camera.masked}};const painted=snapshot.nativeHD?.last;if(result&&snapshot.worldVisual?.displayed?.exact&&o.action==='walk'&&painted?.action==='walk'&&painted.state==='rendered')__lastPaintedWalk={count:__realWorldDraws,direction:painted.direction,frame:painted.frame};}return result;};window.__reworkDefaultQA=Object.freeze({read(){return JSON.parse(JSON.stringify({identity:game?{classId:game.classId,appearance:game.appearance96,equipment:game.equipment,equippedIds:Object.fromEntries(Object.entries(game.equipment).map(([slot,item])=>[slot,item?.def??null]))}:null,snapshot:lobby96.snapshot(),worldDraw:__lastRealWorldDraw,paintedWalk:__lastPaintedWalk}));}});"+'  window.__mareDiagnostics=')});});
await p.goto(process.env.MARE_TEST_URL,{waitUntil:'networkidle',timeout:120000});await p.locator('#characterName').fill('Movimento QA');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();assert(await p.locator('#creation-gender option[value=feminino]').isDisabled());await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();if(gender==='feminino')await resumeFemaleSave(p);await p.waitForTimeout(6000);
for(const equipment of ['starter','bare']){if(equipment==='bare'){await p.locator('#mainMenu [data-panel=inventory]').click();for(const slot of ['weapon','coat']){await p.locator('[data-inv-slot='+slot+']').click();await p.locator('[data-unequip='+slot+']').click();}await p.keyboard.press('Escape');}
await p.waitForFunction(bare=>{
 const q=__reworkDefaultQA.read(),draw=q.worldDraw,shown=draw?.snapshot?.worldVisual?.displayed;
 if(!draw?.returned||!shown?.exact)return false;
 const equipped=JSON.parse(JSON.parse(shown.key)[0])[4],item=slot=>equipped.find(row=>row[0]===slot)?.[1]??null;
 return bare?item('weapon')===null&&item('coat')===null:item('weapon')===q.identity.equippedIds.weapon&&item('coat')===q.identity.equippedIds.coat;
},equipment==='bare',{timeout:90000});
for(const [key,direction]of [['d','east'],['a','west'],['d','east'],['a','west'],['w','north'],['s','south']]){
 const start=await p.evaluate(()=>__reworkDefaultQA.read().worldDraw?.count||0);
 await p.keyboard.down(key);
 try{
  for(let i=0;i<10;i++){
   await p.waitForTimeout(180);
   const q=await p.evaluate(()=>__reworkDefaultQA.read());
   rows.push({gender,equipment,key,phase:'move',q});
   const draw=q.worldDraw,visual=draw?.snapshot?.worldVisual,r=draw?.snapshot?.nativeHD?.last;
   if(draw?.count<=start)continue;
   assert(draw?.returned,'An already visible character remains drawn while moving');
   assert.equal(r.state,'rendered');
   assert.equal(r.direction,visual.displayed.direction);
   assert.equal(JSON.parse(visual.displayed.key)[0],JSON.parse(visual.key)[0],
    'A preceding outfit is never shown after equipment changes');
   if(visual.displayed.exact)assert.equal(r.direction,direction,'The ready direction follows the keyboard');
  }
  if(['a','d'].includes(key))await paintedLateral(p,key,direction,start);
 }finally{await p.keyboard.up(key);}
 await p.waitForTimeout(2300);
 const first=await p.evaluate(()=>__reworkDefaultQA.read());
 await p.waitForTimeout(1500);
 const second=await p.evaluate(()=>__reworkDefaultQA.read());
 for(const q of [first,second]){
  const r=q.worldDraw?.snapshot?.nativeHD?.last;
  rows.push({gender,equipment,key,phase:'idle',q});
  assert(q.worldDraw?.returned,'An idle sprite must have been painted on the map');
  assert(q.worldDraw.snapshot.worldVisual?.displayed?.exact,'Idle uses the exact available pose');
  assert.equal(r?.state,'rendered');assert.equal(r.action,'idle');assert.equal(r.direction,direction);assert.equal(r.frame,0);
 }
 await p.screenshot({path:path.join(out,gender+'-'+equipment+'-'+direction+'.png')});
 fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify({rows},null,2));
}
}
}finally{await p.screenshot({path:path.join(out,gender+'-last.png')}).catch(()=>{});await context.close();}}console.log('Movement and static idle passed for both bodies, starter and bare.');}finally{fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify({rows},null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
