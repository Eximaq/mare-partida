'use strict';
// Isolated session: inspect the real window without changing a player's save.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/prison-glass';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=',
   '  window.__prisonGlassQA={get game(){return game},open:openPanel};window.__mareDiagnostics=');
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto(process.env.MARE_TEST_URL);
  await page.waitForFunction(()=>window.__prisonGlassQA);
  await page.locator('#characterName').fill('Nauta Vidro');
  await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__prisonGlassQA.game);
  await page.evaluate(()=>{const g=__prisonGlassQA.game;g.level=99;g.impelDown={version:1,cleared:4,claimed:[1,2,3],options:{autoAdvance:false,pauseBeforeBoss:true}};});
  const open=name=>page.evaluate(name=>__prisonGlassQA.open(name),name);
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
   await page.setViewportSize({width,height});await open('inventory');
   await page.locator('.op-inventory-shell').waitFor({state:'visible'});
   const inventory=await page.locator('.op-inventory-shell').boundingBox();
   await open('prison');await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>document.querySelector('.prison-hero-monster')?.dataset.state==='available');
   const dialog=await page.locator('#panelOverlay > .dialog').boundingBox();
   assert.equal(await page.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none','Prison uses the thin glass frame');
   assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,'Prison matches inventory dimensions at '+width);
   assert(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=width+1&&dialog.y+dialog.height<=height+1);
   assert.equal(await page.locator('[data-prison-floor]').count(),100);
   assert(await page.locator('[data-prison-floor="6"]').isDisabled());
   assert(await page.locator('[data-prison-enter]').isEnabled());
   const button=await page.locator('[data-prison-enter]').boundingBox();
   assert(button.y>=dialog.y&&button.y+button.height<=dialog.y+dialog.height,'Entry stays visible at '+width);
   assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),'No outer scrollbar at '+width);
   const close=await page.locator('#closePanel').boundingBox();
   assert(close.x+close.width<=width&&close.y+close.height<=height);
   await page.locator('[data-prison-floor="1"]').click();
   assert(await page.locator('[data-prison-enter]').isDisabled(),'Completed floors remain inspection only');
   await page.locator('[data-prison-floor="5"]').click();
   await page.screenshot({path:path.join(out,'prison-'+width+'.png')});
  }
  await page.setViewportSize({width:390,height:844});await open('prison');
  const before=await page.evaluate(()=>__prisonGlassQA.game.inventory.length);
  await page.locator('[data-prison-claim="4"]').click();
  assert(await page.evaluate(()=>__prisonGlassQA.game.impelDown.claimed.includes(4)));
  assert.equal(await page.evaluate(()=>__prisonGlassQA.game.inventory.length),before+1);
  assert.equal(await page.locator('[data-prison-claim="4"]').count(),0,'Claimed reward cannot be claimed twice');
  await page.locator('.prison-rules summary').click();
  assert(await page.locator('.prison-rules details').evaluate(e=>e.open));
  await page.locator('#expeditionBack').click();assert(await page.locator('[data-quick-mode=prison]').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS prison glass: inventory geometry in eight viewports, 100 floors, gated entry, completed inspection, mobile reward claim and rules.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
