'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const out=process.env.MARE_QA_DIR||'tmp/profile-glass';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=','  window.__profileQA={open:openPanel,get game(){return game},update:updateUI};window.__mareDiagnostics=');
  await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__profileQA);
  await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
  await p.evaluate(()=>{const g=__profileQA.game;g.equipment.weapon.rarity='legendary';g.equipment.coat.rarity='epic';});
  const snapshot=await p.evaluate(()=>JSON.stringify({eq:__profileQA.game.equipment,appearance:__profileQA.game.appearance96,attributes:__profileQA.game.attributes}));
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
   await p.setViewportSize({width,height});await p.evaluate(()=>__profileQA.open('inventory'));
   const inventory=await(await p.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;})).jsonValue();
   await p.evaluate(()=>__profileQA.open('myprofile'));await p.evaluate(()=>document.fonts.ready);
   for(const tab of ['overview','gear','wall','custom']){
    await p.locator('[data-profile-tab='+tab+']').click();
    const panel=p.locator('#panelOverlay > .dialog'),r=await panel.boundingBox();
    assert(Math.abs(r.width-inventory.width)<2&&Math.abs(r.height-inventory.height)<2,'Profile matches inventory at '+width);
    assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1);
    assert.equal(await panel.evaluate(e=>getComputedStyle(e).borderImageSource),'none');
    assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'No horizontal overflow');
    assert.equal(await p.locator('[data-profile-tab='+tab+']').getAttribute('aria-pressed'),'true');
    const avatar=await p.locator('.captain-profile-avatar').boundingBox();assert(Math.abs(avatar.width-avatar.height)<2,'Portrait stays square');
    if(tab==='overview'&&width>=1280)assert(await p.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'Desktop overview fits without scrolling');
    if(tab==='gear'){
     assert.equal(await p.locator('.captain-equipment-card').count(),12);
     const colors=await p.locator('[data-profile-slot]').evaluateAll(es=>es.map(e=>getComputedStyle(e).borderTopColor));assert(new Set(colors).size>=2,'Equipment rarities retain distinct borders');
    }
    if(tab==='wall'||tab==='custom')assert.match(await p.locator('.captain-empty').innerText(),/em desenvolvimento/);
    if(tab==='overview'||tab==='gear'){
     await p.waitForFunction(()=>document.querySelector('#captainPortraitState')?.hidden);
     const portrait=await p.locator('#captainProfilePortrait').boundingBox();
     assert(portrait.width<=avatar.width&&portrait.height<=avatar.height,'Native-resolution portrait fits its display frame');
     await p.mouse.move(1,1);await p.screenshot({path:path.join(out,tab+'-'+width+'.png')});
    }
   }
  }
  await p.locator('[data-profile-tab=gear]').click();await p.evaluate(()=>{__profileQA.game.preferences.hideItems=true;__profileQA.update();});
  await p.waitForSelector('.captain-private');assert.equal(await p.locator('[data-profile-slot]').count(),0);
  await p.evaluate(()=>{__profileQA.game.preferences.hideItems=false;__profileQA.update();});await p.waitForSelector('[data-profile-slot=weapon]');
  assert.equal(await p.evaluate(()=>JSON.stringify({eq:__profileQA.game.equipment,appearance:__profileQA.game.appearance96,attributes:__profileQA.game.attributes})),snapshot);
  assert.deepEqual(errors,[]);console.log('PASS profile glass: four tabs at eight sizes, inventory geometry, square portrait, desktop overview without scroll, rarity borders and equipment privacy.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
