'use strict';
// Real game navigation, isolated local character. Online mutations have separate contract tests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const out=process.env.MARE_QA_DIR||'tmp/collection-glass';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=','  window.__collectionQA={open:openPanel,get game(){return game}};window.__mareDiagnostics=');
 await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__collectionQA);
 await p.locator('#characterName').fill('Nauta');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 const identity=await p.evaluate(()=>JSON.stringify({f:__collectionQA.game.factionId,t:__collectionQA.game.hierarchyTier,inventory:__collectionQA.game.inventory,registered:__collectionQA.game.akumaCompendium}));
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>__collectionQA.open('inventory'));
  const inventory=await(await p.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;})).jsonValue();
  for(const section of ['akuma','hierarchy']){
   await p.evaluate(s=>__collectionQA.open('character',s),section);await p.evaluate(()=>document.fonts.ready);
   const panel=p.locator('#panelOverlay > .dialog'),r=await panel.boundingBox();
   assert(Math.abs(r.width-inventory.width)<2&&Math.abs(r.height-inventory.height)<2,section+' must match inventory at '+width);
   assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1);assert.equal(await panel.evaluate(e=>getComputedStyle(e).borderImageSource),'none');
   assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   if(section==='akuma'){
    await p.locator('[data-compendium-query]').fill('Albatroz');assert.equal(await p.locator('[data-compendium-fruit]').count(),1);
    await p.locator('[data-compendium-fruit]').click();assert(await p.locator('[data-fruit-register=akuma_tori_albatroz]').isEnabled());
    await p.locator('[data-compendium-clear]').first().click();assert.equal(await p.locator('[data-compendium-fruit]').count(),30);
    await p.waitForFunction(()=>[...document.querySelectorAll('[data-compendium-art]')].every(c=>c.dataset.artReady==='true'));
    const colors=await p.locator('[data-compendium-fruit]').evaluateAll(es=>new Set(es.map(e=>getComputedStyle(e).borderTopColor)).size);assert(colors>=4,'Rarity colors remain distinct');
   }else{
    await p.locator('[data-hierarchy-faction=marine]').click();assert(await p.locator('[data-hierarchy-promote]').isDisabled());
    await p.locator('[data-hierarchy-tier-select]').selectOption('8');assert.match(await p.locator('.hierarchy-title-pair').innerText(),/Almirante de Frota/);
    await p.locator('[data-hierarchy-faction=pirate]').click();
   }
   await p.mouse.move(1,1);await p.screenshot({path:path.join(out,section+'-'+width+'.png')});
  }
 }
 assert.equal(await p.evaluate(()=>JSON.stringify({f:__collectionQA.game.factionId,t:__collectionQA.game.hierarchyTier,inventory:__collectionQA.game.inventory,registered:__collectionQA.game.akumaCompendium})),identity,'Read-only browsing must preserve character and collection');assert.deepEqual(errors,[]);
 console.log('PASS collection glass: both windows in eight viewports, inventory geometry, fruit search/art/rarities, faction/tier consultation and unchanged character.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
