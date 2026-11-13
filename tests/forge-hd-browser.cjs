const {chromium}=require('playwright'),fs=require('node:fs/promises'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));await p.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
await p.route('**/game.js*',async r=>{const a=await r.fetch(),source=await a.text();await r.fulfill({response:a,body:source.replace('  window.__mareDiagnostics=','  window.__forgeQA={get game(){return game},get ui(){return forgeUI},defs:itemDefs,newItem,openPanel,refresh:updateUI,render:renderPanel,save:saveGame};\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')})});
await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__forgeQA&&__mareDiagnostics().lobby96.state==='ready',null,{timeout:90000});
await p.locator('#characterName').fill('Nauta Forja');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>window.__forgeQA?.game);
await p.evaluate(()=>{const q=__forgeQA,g=q.game;const priorRandom=Math.random;let artSeed=731;Math.random=()=>((artSeed=(artSeed*1664525+1013904223)>>>0)/4294967296);g.level=30;g.gold=100000;g.materials=1000;const d=q.defs.find(d=>d.slot==='weapon'&&d.type==='sword'),weapon=q.newItem(d,4,false,'epic');weapon.sockets=['pearl_int_1',null,null];g.equipment.weapon=weapon;const head=q.defs.find(d=>d.name==='Capacete do Corsário');g.equipment.head=q.newItem(head,3,false,'uncommon');g.equipment.head.plus=2;g.inventory=q.defs.filter(d=>d.slot&&d.type!=='akuma_no_mi'&&!d.kind).slice(0,8).map((d,i)=>q.newItem(d,i+1,false,'common'));for(const pd of q.defs.filter(d=>d.kind==='pearl'))for(let n=0;n<(pd.pearlId.endsWith('_1')?7:1);n++)g.inventory.push(q.newItem(pd));Math.random=priorRandom;q.ui.itemId=weapon.id;q.openPanel('forge')});
await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth));

const out=process.env.MARE_FORGE_EVIDENCE||path.join(os.tmpdir(),'mare-forge-hd');await fs.mkdir(out,{recursive:true});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>p.evaluate(()=>JSON.stringify({equipment:__forgeQA.game.equipment,inventory:__forgeQA.game.inventory,gold:__forgeQA.game.gold,materials:__forgeQA.game.materials,forgeSeq:__forgeQA.game.forgeSeq}));
const before=await snapshot();
const glass=await p.locator('#panelOverlay > .dialog').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,border:getComputedStyle(e).borderImageSource,blur:getComputedStyle(e).backdropFilter}));
assert.ok(glass.width<=1120&&glass.height<=660,'Forge stays compact on desktop: '+JSON.stringify(glass));
assert.equal(glass.border,'none');assert.match(glass.blur,/blur/);
const priorUpgrade=await p.evaluate(()=>{
 const q=__forgeQA, weapon=q.game.equipment.weapon, plus=weapon.plus;
 weapon.plus=7;q.render();return plus;
});
const beforeConfirmation=await snapshot();
const upgrade=p.locator('[data-forge-action=upgrade]');
await upgrade.click();
const confirmation=p.getByRole('alertdialog');
assert.match(await confirmation.evaluate(e=>getComputedStyle(e).borderImageSource),/hud-nautical-v2\/rope-frame\.png/);
assert.match(await confirmation.locator('#confirmationMessage').evaluate(e=>getComputedStyle(e).fontFamily),/Barlow Semi Condensed/);
assert.equal(await confirmation.locator('.confirmation-chance b').innerText(),'75%');
assert.ok(await confirmation.locator('.confirmation-risk').isVisible());
for(const [width,height] of [[1440,900],[768,1024],[390,844],[844,390]]){
 await p.setViewportSize({width,height});
 const bounds=await confirmation.boundingBox();
 const action=await confirmation.locator('[data-confirm-accept]').boundingBox();
 assert.ok(bounds.width<=500&&bounds.x>=0&&bounds.x+bounds.width<=width+1,JSON.stringify(bounds));
 assert.ok(action.y>=0&&action.y+action.height<=height,JSON.stringify(action));
 const {vertical,horizontal}=await confirmation.locator('.confirmation-content').evaluate(e=>({vertical:e.scrollHeight-e.clientHeight,horizontal:e.scrollWidth-e.clientWidth}));
 assert.ok(horizontal<=1);
 if(height>=844)assert.ok(vertical<=1,JSON.stringify({width,height,vertical}));
 if(width===1440||width===390)await confirmation.screenshot({path:path.join(out,'confirmation-'+width+'.png')});
}
await p.keyboard.press('Escape');
assert.ok(await confirmation.isHidden());
assert.equal(await snapshot(),beforeConfirmation,'Cancelling must preserve resources and refinement');
assert.ok(await upgrade.evaluate(e=>document.activeElement===e));
await p.evaluate(plus=>{__forgeQA.game.equipment.weapon.plus=plus;__forgeQA.render();},priorUpgrade);
for(const [width,height] of [[1920,1080],[1672,940],[1448,1086],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,740]]){
 await p.setViewportSize({width,height});
 for(const tab of ['upgrade','imbue','fusion','reforge']){
  await p.locator('[data-forge-tab="'+tab+'"]').click();
  if(tab==='imbue'){await p.locator('[data-forge-socket="1"]').click();await p.locator('[data-forge-pearl]').nth(15).click()}
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth));
  assert.equal(await p.locator('#dialogTitle').textContent(),'Forja das Correntes');
  assert.ok(await p.locator('.dialog-header small').isHidden());
  assert.ok(!/Maré Partida/i.test(await p.locator('#panelOverlay').innerText()));
  assert.equal(await p.locator('[data-forge-tab][aria-selected=true]').count(),1);
  const overflow=await p.locator('.forge2-operation-content').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(overflow<=2,JSON.stringify({width,height,tab,overflow}));
  const fields=await p.locator('#dialogBody input,#dialogBody .ui-select-trigger').evaluateAll(xs=>xs.map(e=>({frame:getComputedStyle(e).borderImageSource,font:getComputedStyle(e).fontFamily})));assert.ok(fields.every(x=>x.frame==='none'&&x.font.includes('Inter')),'Forge controls share the modern glass treatment');
  const legacy=await p.locator('#dialogBody img.item-icon').evaluateAll(xs=>xs.filter(i=>!i.getAttribute('src').includes('items-hd/')).map(i=>i.getAttribute('src')));assert.deepEqual(legacy,[]);
  for(const sel of ['.forge2-tabs','.forge2-operation']){
   const rect=await p.locator(sel).boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1,JSON.stringify({width,height,tab,sel,rect}));
  }
  if(['upgrade','imbue','reforge'].includes(tab)&&width>=1280){
   const vertical=await p.locator('.forge2-operation-content').evaluate(e=>e.scrollHeight-e.clientHeight);
   assert.ok(vertical<=2,JSON.stringify({width,height,tab,vertical}));
  }
  if(tab==='upgrade'&&width===768){
   const operation=await p.locator('.forge2-operation').boundingBox(),comparison=await p.locator('.forge-reference-sidebar').boundingBox(),action=await p.locator('[data-forge-action=upgrade]').boundingBox();
   assert.ok(action.y+action.height<=operation.y+operation.height+1,'Tablet action stays inside its panel');
   assert.ok(comparison.y>=operation.y+operation.height,'Tablet comparison cannot overlap the upgrade');
  }
  const action=p.locator('.forge2-operation-content [data-forge-action]').last();await action.scrollIntoViewIfNeeded();const rect=await action.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=height+1,JSON.stringify({width,height,tab,rect}));
  if(tab==='imbue'){await p.locator('.forge2-imbue-preview summary').click();assert.ok(await p.locator('.forge2-imbue-preview .forge2-preview').isVisible());await p.locator('.forge2-imbue-preview summary').click()}
  if(width===1672&&tab==='upgrade'){
   const comparison=await p.locator('.forge-reference-sidebar .forge2-preview').boundingBox();
   const operation=await p.locator('.forge2-operation').boundingBox();
   assert.ok(comparison.x>=operation.x+operation.width,'Comparison stays to the right of the upgrade');
   await p.locator('.forge2-operation-content').evaluate(e=>e.scrollTop=0);
   for(const selector of ['#panelOverlay > .dialog','.forge2-selection','.forge2-operation','.forge-reference-sidebar','.forge-hd-art']){
    const frame=await p.locator(selector).evaluate(e=>({image:getComputedStyle(e).borderImageSource,width:parseFloat(getComputedStyle(e).borderTopWidth)}));
    assert.ok(frame.image==='none'&&frame.width<=1,selector+' uses thin glass borders: '+JSON.stringify(frame));
   }
   await p.screenshot({path:path.join(out,'upgrade-desktop.png')});
   const chosen=await p.evaluate(()=>({head:__forgeQA.game.equipment.head.id,weapon:__forgeQA.game.equipment.weapon.id}));
   const stage=p.locator('.forge-anvil-stage');
   assert.equal(await stage.locator('.forge-fire').count(),1);
   assert.equal(await stage.locator('.forge-embers i').count(),20);
   assert.equal(await p.locator('.forge2-operation-content details').count(),0);

   const artwork=await stage.locator('.forge-bench-art').getAttribute('src');
   const weaponArt=await stage.locator('.forge-bench-item .item-icon').getAttribute('src');
   await p.locator('[data-forge-item="'+chosen.head+'"]').click();
   assert.equal(await stage.locator('.forge-bench-art').getAttribute('src'),artwork);
   assert.notEqual(await stage.locator('.forge-bench-item .item-icon').getAttribute('src'),weaponArt);
   assert.ok(await stage.evaluate(e=>e.getAnimations({subtree:true}).some(a=>a.playState==='running')));
   assert.equal(await p.locator('.forge-chance-meter').evaluate(e=>e.value),100);
   await p.waitForFunction(()=>[...document.querySelectorAll('.forge-anvil-stage img')].every(i=>i.complete&&i.naturalWidth));
   await p.screenshot({path:path.join(out,'upgrade-helmet.png')});
   await p.emulateMedia({reducedMotion:'reduce'});
   await p.waitForFunction(()=>document.querySelector('.forge-anvil-stage').getAnimations({subtree:true}).length===0);
   await p.emulateMedia({reducedMotion:'no-preference'});
   await p.locator('[data-forge-item="'+chosen.weapon+'"]').click();

  }
  if(tab==='reforge'){
   const rows=await p.locator('.forge2-reforge-lines li').evaluateAll(xs=>xs.map(e=>({value:e.querySelector('span b').getBoundingClientRect().right,action:e.querySelector('[data-forge-action]').getBoundingClientRect().left})));
   assert.ok(rows.every(r=>r.value+4<=r.action),JSON.stringify({width,height,rows}));
  }
  if(width===390&&tab==='reforge')await p.screenshot({path:path.join(out,'mobile-reforge.png')});
 }
 console.log(width+'x'+height+': four tabs, HD images, reachable actions, no horizontal overflow');
}
await p.setViewportSize({width:1920,height:1080});await p.locator('[data-forge-tab=fusion]').click();
await p.locator('[data-forge-fusion-mode=pearls]').click();assert.equal(await p.locator('[data-fusion-slot-index]').count(),5);
for(let i=0;i<5;i++)await p.locator('[data-forge-fusion-pearl=pearl_for_1]').click();
assert.equal(await p.locator('.forge2-material-slot.filled').count(),5);assert.ok(await p.locator('[data-forge-action=fuse]').isEnabled());
await p.locator('[data-forge-clear]').click();assert.equal(await p.locator('.forge2-material-slot.filled').count(),0);
assert.equal(await snapshot(),before,'navigation must not consume materials or mutate gear');
assert.equal(await p.locator('.forge-hd-art').evaluate(e=>getComputedStyle(e).pointerEvents),'none');


await p.setViewportSize({width:1672,height:940});
await p.locator('[data-forge-tab=fusion]').click();await p.locator('[data-forge-fusion-mode=equipment]').click();
assert.equal(await p.locator('[data-fusion-base-stat=attack]').innerText(),'—');
await p.locator('[data-forge-auto]').click();
const expected=await p.evaluate(()=>{const q=__forgeQA,F=MareForge,plan=F.equipmentFusion(q.game,q.ui.fusionIds,q.ui.outputSlot,q.defs);return F.itemStats({def:plan.def,level:plan.level,rarity:plan.target,plus:0,extras:[]},q.defs)});
for(const k of ['attack','defense','hp'])assert.equal(Number((await p.locator('[data-fusion-base-stat='+k+']').innerText()).replace(/\D/g,'')),expected[k]);
assert.ok((await p.locator('.forge-fusion-stat-preview').innerText()).includes('sem os extras sorteados'));
await p.evaluate(()=>{const old=Math.random;Math.random=()=>{throw Error('Visual preview must not draw RNG')};try{__forgeQA.render()}finally{Math.random=old}});
let buttonBox=await p.locator('[data-forge-action=fuseEquipment]').boundingBox();assert.ok(buttonBox.y+buttonBox.height<=940);
let materialBox=await p.locator('.forge2-fusion-materials').boundingBox(),resultBox=await p.locator('.forge2-fusion-details').boundingBox();assert.ok(resultBox.x>=materialBox.x+materialBox.width);
assert.ok(await p.locator('.forge-fusion-equipment .forge-result-scroll').evaluate(e=>e.scrollHeight<=e.clientHeight+2),'Desktop fusion shows costs, chance and result without scrolling');
await p.locator('[data-forge-clear]').click();await p.locator('[data-forge-fusion-mode=pearls]').click();
for(let i=0;i<5;i++)await p.locator('[data-forge-fusion-pearl=pearl_for_1]').click();
assert.ok((await p.locator('.forge-pearl-result-bonus').innerText()).includes('+4%'));
assert.ok((await p.locator('.forge-pearl-result-cost').innerText()).includes('80%'));
assert.ok((await p.locator('.forge-pearl-material-summary').innerText()).includes('5 / 5'));
await p.locator('[data-forge-list]').click();assert.equal(await p.locator('.forge2-fusion-pearl-grid.as-list').count(),1);await p.locator('[data-forge-list]').click();
for(const [width,height] of [[1920,1080],[1672,940],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,740]]){
 await p.setViewportSize({width,height});
 const over=await p.locator('.forge2-operation-content').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(over<=2);
 const action=p.locator('[data-forge-action=fuse]');if(width>=1672){buttonBox=await action.boundingBox();assert.ok(buttonBox.y+buttonBox.height<=height)}
 await action.scrollIntoViewIfNeeded();buttonBox=await action.boundingBox();assert.ok(buttonBox.y>=0&&buttonBox.y+buttonBox.height<=height+1);
 assert.ok(await p.locator('.forge-result-actions .forge2-risk').isVisible());
}
await p.locator('[data-forge-clear]').click();
assert.equal(await snapshot(),before,'fusion previews must not mutate gear, balances or inventory');
console.log('Live base preview, RNG isolation, lateral result, pearl bonus/chance/materials, textured fields and persistent actions: passed');

await p.setViewportSize({width:390,height:844});
await p.evaluate(()=>{
 const q=__forgeQA;
 q.game.equipment.weapon.plus=9;q.ui.tab='upgrade';q.render();
 window.__forgeRandom=Math.random;Math.random=()=>.999;
});
await p.locator('[data-forge-action=upgrade]').click();
await p.locator('[data-confirm-accept]').click();
const failure=p.locator('.forge-presentation.is-failure');
await failure.waitFor();
assert.match(await failure.evaluate(e=>getComputedStyle(e).borderImageSource),/hud-nautical-v2\/rope-frame\.png/);
assert.equal(await failure.locator('.forge-presentation-art').evaluate(e=>getComputedStyle(e,'::after').animationName),'nw-forge-sparks');
assert.match(await failure.innerText(),/preservado em \+9/);
assert.equal(await failure.getByRole('button',{name:'CONTINUAR'}).evaluate(e=>document.activeElement===e),true);
await failure.screenshot({path:path.join(out,'forge-failure-mobile.png')});
await failure.getByRole('button',{name:'CONTINUAR'}).click();
await failure.waitFor({state:'hidden'});
assert.equal(await p.evaluate(()=>__forgeQA.game.equipment.weapon.plus),9);
await p.evaluate(()=>{Math.random=window.__forgeRandom;delete window.__forgeRandom;});
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>{const q=__forgeQA;q.game.equipment.weapon.plus=0;q.render();});
await p.locator('[data-forge-action=upgrade]').click();
await p.locator('[data-confirm-accept]').click();
const success=p.locator('.forge-presentation.is-success');
await success.waitFor();
assert.equal(await success.evaluate(e=>e.getAnimations({subtree:true}).length),0);
await success.getByRole('button',{name:'CONTINUAR'}).click();
await success.waitFor({state:'hidden'});
assert.equal(await p.evaluate(()=>__forgeQA.game.equipment.weapon.plus),1);
await p.emulateMedia({reducedMotion:'no-preference'});

await p.evaluate(()=>{const q=__forgeQA,d=q.defs[q.game.equipment.weapon.def];d.name='Espada Cerimonial das Correntes do Arquipélago de Ventos Ancestrais';q.ui.tab='upgrade';q.render()});
assert.equal(await p.locator('.forge2-operation-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
await p.evaluate(()=>{const q=__forgeQA;q.game.equipment.weapon=q.newItem(q.defs[q.game.equipment.weapon.def],1,false,'common');q.ui.itemId=q.game.equipment.weapon.id;q.ui.tab='imbue';q.render()});
assert.ok((await p.locator('.forge2-sockets').innerText()).includes('Comum não possui sockets'));
assert.ok(await p.locator('[data-forge-action=imbue]').isDisabled());
await p.evaluate(()=>{const q=__forgeQA;q.game.equipment={};q.game.inventory=[];q.ui.itemId=null;q.ui.tab='upgrade';q.render()});
assert.equal(await p.locator('[data-forge-action]').count(),0);
assert.ok((await p.locator('.forge2-operation').innerText()).includes('Selecione um equipamento'));
console.log('Long item name, common without sockets and empty inventory: passed');

await p.locator('#closePanel').click();await p.evaluate(()=>__forgeQA.openPanel('help'));
assert.equal(await p.locator('#panelOverlay.forge-hd-mode').count(),0);
assert.notEqual(await p.locator('.dialog-header small').innerText(),'KAIZOKU IDLE');
assert.deepEqual(errors,[]);
console.log('Pearl sister workspace, read-only navigation, illustration isolation and branding restoration: passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
