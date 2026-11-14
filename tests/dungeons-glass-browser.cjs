'use strict';
// The real selection must fit the inventory frame and keep entry reachable.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/dungeons-glass';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=',
   '  window.__dungeonsGlassQA={get game(){return game},open:openPanel};window.__mareDiagnostics=');
  await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__dungeonsGlassQA);
  await p.locator('#characterName').fill('Nauta Vidro');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();
  await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__dungeonsGlassQA.game);
  await p.evaluate(()=>{__dungeonsGlassQA.game.level=20;});
  const open=name=>p.evaluate(name=>__dungeonsGlassQA.open(name),name);
  const state=()=>p.evaluate(()=>JSON.stringify({gold:__dungeonsGlassQA.game.gold,xp:__dungeonsGlassQA.game.xp,items:__dungeonsGlassQA.game.inventory,dungeons:__dungeonsGlassQA.game.bossDungeons}));
  await open('dungeons');const initial=await state();
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
   await p.setViewportSize({width,height});await open('inventory');await p.locator('.op-inventory-shell').waitFor({state:'visible'});const inventory=await p.locator('.op-inventory-shell').boundingBox();
   await open('dungeons');await p.evaluate(()=>document.fonts.ready);
   const dialog=await p.locator('#panelOverlay > .dialog').boundingBox();
   assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,'Dungeon window matches inventory at '+width);
   assert.equal(await p.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none');
   assert(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=width+1&&dialog.y+dialog.height<=height+1);
   assert.equal(await p.locator('[data-dungeon-select]').count(),9);
   for(const id of ['crocodile','morgan','alvida']){
    await p.locator('[data-dungeon-select='+id+']').click();
    assert.equal(await p.locator('.dungeon-selected-portrait').getAttribute('data-dungeon-portrait'),id);
    const enter=p.locator('[data-dungeon-enter='+id+']');
    assert.equal(await enter.isDisabled(),id==='crocodile');
    const rect=await enter.boundingBox();assert(rect.y>=dialog.y&&rect.y+rect.height<=dialog.y+dialog.height,'Entry stays visible at '+width);
    assert(await enter.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Entry is not covered');
   }
   assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),'No outer scroll at '+width);
   assert(await p.locator('.dungeon-recommended').evaluate(e=>{const r=e.getBoundingClientRect(),n=e.querySelector('strong').getBoundingClientRect();return n.right<=r.right&&e.scrollWidth<=e.clientWidth+1;}),'Recommended level is not clipped');
   await p.locator('.dungeon-selected-portrait').evaluate(e=>e.decode());
   await p.screenshot({path:path.join(out,'dungeons-'+width+'.png')});
  }
  assert.equal(await state(),initial,'Browsing bosses does not mutate progress or rewards');
  await p.locator('#closePanel').click();assert(await p.locator('#panelOverlay').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS dungeons glass: inventory dimensions in eight viewports, nine selectable bosses, gated entry visible, no outer scroll, selection preserves rewards.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
