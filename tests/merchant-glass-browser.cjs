'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const out=process.env.MARE_QA_DIR||'tmp/merchant-glass';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const hook=`  window.__merchantQA={get game(){return game},open(){const npc=npcs.find(n=>n.kind==='shop');Object.assign(world.hero,{x:npc.x,y:npc.y});activateNPC(npc)},far(){world.hero.x=-9999;openPanel('shop')},refresh(){openPanel('shop')}};window.__mareDiagnostics=`;
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=',hook);
 await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__merchantQA);
 await p.locator('#characterName').fill('Nauta');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>__merchantQA.open());const panel=p.locator('#panelOverlay > .dialog'),r=await panel.boundingBox();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1);
  assert.equal(await panel.evaluate(e=>getComputedStyle(e).borderTopWidth),'1px');assert(await panel.evaluate(e=>getComputedStyle(e).backdropFilter.includes('blur')));
  assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));if(height>=720)assert(r.height<650,'Compact potion shop');
  assert.equal(await p.locator('[data-merchant-order]').count(),2);assert(await p.locator('[data-buy-potion=health]').isVisible());await p.screenshot({path:path.join(out,'merchant-'+width+'.png')});await p.keyboard.press('Escape');
 }
 await p.setViewportSize({width:1366,height:768});await p.evaluate(()=>{__merchantQA.game.gold=1000;__merchantQA.open();});const mana=p.locator('[data-merchant-order=mana]');await mana.locator('input').fill('2');assert.match(await mana.locator('[data-merchant-total]').innerText(),/70 Berry/);
 const before=await p.evaluate(()=>({gold:__merchantQA.game.gold,mana:(__merchantQA.game.manaPotions||0)}));await mana.locator('button').click();await p.waitForFunction(()=>__merchantQA.game.gold===930);assert.equal(await p.evaluate(()=>__merchantQA.game.manaPotions),before.mana+2);
 await p.evaluate(()=>{__merchantQA.game.gold=0;__merchantQA.refresh();});assert(await p.locator('[data-buy-potion=health]').isDisabled());assert(await p.locator('[data-buy-potion=mana]').isDisabled());
 await p.evaluate(()=>{__merchantQA.game.gold=1000;__merchantQA.far();});assert(await p.locator('[data-buy-potion=health]').isDisabled());assert.match(await p.locator('.merchant-shop [role=status]').innerText(),/fale com o Mercador/);
 assert.deepEqual(errors,[]);console.log('PASS merchant glass: seven viewports, quantity/total, purchase accounting, insufficient funds and NPC proximity.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

