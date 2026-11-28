'use strict';
// Real equipment actions verify the south map pose, headgear preference and skin.
// All inventory fixtures belong to this disposable browser context.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||path.join(__dirname,'../.maintenance-local/browser/inventory-south');
const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8176/';
function instrument(source){
 const marker='  window.__mareDiagnostics=';
 assert(source.includes(marker));
 source=source.replace('function tickSimulation(dt){','function tickSimulation(dt){if(window.__inventorySouthQA?.paused)return;');
 return source.replace(marker,`window.__inventorySouthQA={paused:true,renderer:lobby96,open:openPanel,close:closePanel,
  get game(){return game},get world(){return world},
  add(def){const item=newItem(itemDefs[def],1,false);game.inventory.push(item);renderPanel();return item.id;},
  compare(){
   const before=JSON.stringify([game.equipment,game.appearance96,game.preferences,game.zoanTransformed]);
   const canvas=document.querySelector('#inventorySprite');drawInventoryAvatar(canvas,{force:true});
   const meta=lobby96.snapshot().inventoryPreview;if(!meta?.bounds)return null;
   const player=game.zoanTransformed?{...game,zoanTransformed:false}:game;
   const skin=MareVisualCompletoRenderer.equipped(player);
   const idle={action:'idle',direction:'south',time:world.time,progress:null,consumer:'world'};
   const samePose=skin?meta.action==='walk'&&meta.frame===0:
    lobby96.requestWorldVisual(player,idle,{publish:false}).bundle?.coverage[0]?.source===meta.source;
   const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let pixels=0,left=canvas.width,right=-1,top=canvas.height,bottom=-1;
   for(let i=0;i<a.length;i+=4)if(a[i+3]){
    pixels++;
    const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width);
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
   return {samePose,pixels,source:meta.source||'visual-completo-zoro',direction:meta.direction,
    multiplier:meta.multiplier,width:canvas.width,height:canvas.height,
    bounds:{left,right,top,bottom},unchanged:before===JSON.stringify([game.equipment,game.appearance96,game.preferences,game.zoanTransformed]),
    png:canvas.toDataURL(),skin,hidden:MareHeadgear.hidden(player)};
  }};\n`+marker);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1}),errors=[],rows=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/\/game\.js(?:\?|$)/,async route=>{const r=await route.fetch();await route.fulfill({response:r,body:instrument(await r.text())});});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__inventorySouthQA);
  await page.locator('#characterName').fill('Alubarna QA');
  await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__inventorySouthQA.game);await page.evaluate(()=>__inventorySouthQA.open('inventory'));
  async function verify(label){
   await page.waitForFunction(()=>!!__inventorySouthQA.compare(),null,{timeout:120000});
   const result=await page.evaluate(()=>__inventorySouthQA.compare());
   assert(result.pixels>100,label+' visible sprite');assert(result.samePose,label+' uses the equipped map idle frame');
   assert.equal(result.direction,'south',label+' south');assert(result.unchanged,label+' does not mutate gear/preferences');
   assert(result.bounds.left>=9&&result.bounds.right<result.width-8&&result.bounds.top>=9&&result.bounds.bottom<result.height-8,label+' no clipping: '+JSON.stringify(result.bounds));
   const {left,right,top,bottom}=result.bounds;
   assert(Math.abs(left+right+1-result.width)<=2,label+' centered horizontally: '+JSON.stringify({bounds:result.bounds,width:result.width}));
   assert(Math.abs(top+bottom+1-result.height)<=2,label+' centered vertically: '+JSON.stringify({bounds:result.bounds,height:result.height}));
   assert(Math.abs(right-left+1-(result.width-20))<=2||Math.abs(bottom-top+1-(result.height-20))<=2,label+' fills the available width or height');
   const {png,...record}=result;rows.push({label,...record});console.log('verified',label);return result;
  }
  const initial=await verify('desktop initial');
  const head=await page.evaluate(()=>__inventorySouthQA.add(129));
  await page.locator('[data-item="'+head+'"]').click();await page.locator('[data-equip="'+head+'"]').click();
  const helmet=await verify('desktop equipped helmet');assert.notEqual(helmet.png,initial.png,'equipping changes the displayed south source');
  await page.locator('[data-headgear-visibility]').click();
  const hidden=await verify('desktop hidden helmet');assert(hidden.hidden);assert.notEqual(hidden.png,helmet.png);
  assert.equal(await page.evaluate(()=>__inventorySouthQA.game.equipment.head.def),129);
  await page.locator('[data-headgear-visibility]').click();
  const shown=await verify('desktop shown helmet');assert(!shown.hidden);assert.equal(shown.png,helmet.png,'show restores exact equipped pixels');
  await page.screenshot({path:path.join(out,'inventory-south-desktop.png')});
  await page.setViewportSize({width:393,height:852});await verify('mobile equipped helmet');
  await page.screenshot({path:path.join(out,'inventory-south-mobile.png')});
  const skinId=await page.evaluate(()=>__inventorySouthQA.add(187));
  await page.locator('[data-inv-tab="visual"]').click();
  await page.locator('.op-cosmetic-tile[data-inv-visual-kind="full"][data-inv-visual-id="'+skinId+'"]').click();
  await page.locator('[data-equip="'+skinId+'"]').click();
  const skin=await verify('mobile Zoro');assert(skin.skin);
  await page.screenshot({path:path.join(out,'inventory-south-zoro-mobile.png')});
  await page.setViewportSize({width:1366,height:768});await verify('desktop Zoro');
  await page.screenshot({path:path.join(out,'inventory-south-zoro-desktop.png')});
  await page.locator('[data-inv-slot="visual_completo"]').click();await page.locator('[data-unequip="visual_completo"]').click();
  await page.locator('[data-inv-tab="equipment"]').click();
  const restored=await verify('desktop restored equipment');assert(!restored.skin);assert.equal(restored.png,helmet.png);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'inventory-south-results.json'),JSON.stringify({url,rows,errors},null,2));
  console.log(JSON.stringify({cases:rows.length,fittedSouthPose:true,errors,records:rows.map(({label,width,height,pixels,multiplier})=>({label,width,height,pixels,multiplier}))},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
