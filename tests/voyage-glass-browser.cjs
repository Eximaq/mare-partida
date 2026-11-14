'use strict';
// Real renderer in an isolated local session; no production save or travel API.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), {chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/voyage-glass';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=',
   '  window.__voyageGlassQA={get game(){return game},open:openPanel};window.__mareDiagnostics=');
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto(process.env.MARE_TEST_URL);
  await page.waitForFunction(()=>window.__voyageGlassQA);
  await page.locator('#characterName').fill('Nauta Vidro');
  await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__voyageGlassQA.game);
  const open=name=>page.evaluate(name=>__voyageGlassQA.open(name),name);
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
   await page.setViewportSize({width,height});await open('inventory');
   await page.locator('.op-inventory-shell').waitFor({state:'visible'});
   const inventory=await page.locator('.op-inventory-shell').boundingBox();
   await open('map');await page.evaluate(()=>document.fonts.ready);
   const dialog=await page.locator('#panelOverlay > .dialog').boundingBox();
   assert.equal(await page.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none','Map uses the approved thin glass frame');
   assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,'Map matches inventory dimensions at '+width);
   assert(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=width+1&&dialog.y+dialog.height<=height+1);
   for(const region of ['east-blue','alabasta','skypiea']){
    await page.locator('[data-voyage-region='+region+']').click();
    const islands=page.locator('[data-island]');
    if(await islands.count()){
     await islands.first().click();
     const button=await page.locator('[data-travel-island]').boundingBox();
     assert(button.y>=dialog.y&&button.y+button.height<=dialog.y+dialog.height,'Travel action remains visible at '+width);
     await page.locator('[data-voyage-back]').click();
     assert(await islands.first().isVisible(),'Return restores the islands');
    } else assert(await page.locator('.voyage-empty').isVisible());
    assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),'Window has no outer scrollbar at '+width);
   }
   await page.locator('[data-voyage-region=east-blue]').click();
   await page.screenshot({path:path.join(out,'map-'+width+'.png')});
   await page.locator('[data-island=dawn]').click();
   await page.screenshot({path:path.join(out,'details-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS map glass: inventory dimensions, three regions, selection/back, visible travel and no outer scroll in eight viewports.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
