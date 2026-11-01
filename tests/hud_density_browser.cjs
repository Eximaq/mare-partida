'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||path.join(os.tmpdir(),'mare-hud-density');
const before=process.env.MARE_DENSITY_BEFORE==='1',base=process.env.MARE_DENSITY_BASE||'02d409b';
const old=p=>cp.execFileSync('git',['show',base+':'+p],{encoding:'utf8',maxBuffer:12000000});
const panels=[['haki'],['forge'],['inventory'],['character','status'],['character','talents'],['character','achievements'],['character','akuma'],['character','hierarchy'],['contracts'],['map'],['prison'],['myprofile'],['journal'],['settings'],['help'],['shop'],['hunt']];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const source=before?old('game.js'):fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 const hook='  window.__densityQA={get game(){return game},set game(v){game=v},get rt(){return session.haki},get ui(){return forgeUI},hideTips:()=>gameTooltip.hide(),open:openPanel,close:closePanel,render:renderPanel,update:updateUI,save:saveGame,defs:itemDefs,make:newItem,stats:getDerived,travel:worldChange,port:returnLobby};window.__mareDiagnostics=';
 if(before)for(const file of ['ui-screens.css','index.html','haki-ui.js','haki-mastery.css','forge-ui.js'])await p.route('**/'+file+'*',r=>r.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/javascript',body:old(file)}));
 await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook).replaceAll('requestAnimationFrame(frame)','(window.__densityPause?window.__testFrame=frame:requestAnimationFrame(frame))')}));
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__densityQA&&window.__mareDiagnostics().lobby96.state==='ready');
 await p.locator('#characterName').fill('Nauta das Correntes');
 async function capture(file){await p.mouse.move(1,1);await p.evaluate(()=>__densityQA.hideTips());await p.screenshot({path:path.join(out,file)});}
 const records=[],sizes=[[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[360,800],[320,568],[844,390]];
 async function measure(name,selector,width,height){
  const row=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y}});
  assert(row.x>=-1&&row.y>=-1&&row.x+row.width<=width+1&&row.y+row.height<=height+1,JSON.stringify({name,width,height,row}));
  records.push({name,viewport:[width,height],...row});return row;
 }
 for(const step of ['faction','class','appearance']){
  if(step==='class')await p.locator('#nextToClass').click();
  if(step==='appearance'){await p.locator('#nextToAppearance').click();await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));}
  await p.evaluate(()=>document.fonts.ready);
  for(const [w,h] of sizes){await p.setViewportSize({width:w,height:h});await measure('creation-'+step,'.creation-dialog',w,h);const over=await p.locator('.creation-dialog').evaluate(e=>e.scrollWidth-e.clientWidth);assert(over<=2,JSON.stringify({step,w,h,over}));}await p.setViewportSize({width:1920,height:1080});
  if(step==='appearance')fs.writeFileSync(path.join(out,'appearance-layout.json'),JSON.stringify(await p.locator('.studio-look-controls').evaluate(e=>[...e.querySelectorAll('.appearance-field')].map(a=>({html:a.outerHTML.slice(0,280),height:a.getBoundingClientRect().height,css:getComputedStyle(a).gridTemplateRows}))),null,2));await capture('creation-'+step+'.png');
  const next=p.locator(step==='faction'?'#nextToClass':step==='class'?'#nextToAppearance':'#createCharacter');await next.scrollIntoViewIfNeeded();const nextBox=await next.boundingBox();assert(nextBox.y>=0&&nextBox.y+nextBox.height<=1080,'Creation action remains reachable');await p.locator('.creation-dialog').evaluate(e=>e.scrollTop=0);
 }
 await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>window.__densityQA?.game);
 await p.evaluate(()=>{
  window.__densityPause=true;const q=__densityQA,g=q.game;let seed=781,prev=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  g.level=50;g.gold=1000000;g.materials=10000;
  const weapon=q.make(q.defs.find(d=>d.slot==='weapon'&&d.type==='sword'),4,false,'epic');weapon.sockets=['pearl_int_1',null,null];g.equipment.weapon=weapon;
  g.inventory=q.defs.filter(d=>d.slot&&d.type!=='akuma_no_mi'&&!d.kind).slice(0,8).map((d,i)=>q.make(d,i+1,false,'common'));
  for(const pd of q.defs.filter(d=>d.kind==='pearl').slice(0,6))for(let n=0;n<7;n++)g.inventory.push(q.make(pd));
  Math.random=prev;g.has_haki_unlocked=true;g.haki={version:1,unlocked:true,current:75,auto:null,kingReadyAt:0,mastery:MareHakiProgression.empty()};g.haki.mastery.ranks.coating=2;
  for(const b of MareHakiProgression.ids)q.game=MareHakiProgression.addFragments(q.game,b,100,q.defs,d=>q.make(d));q.ui.itemId=weapon.id;q.save();q.update();
 });
 if(process.env.MARE_DENSITY_FIXTURE){const fixture=JSON.parse(fs.readFileSync(process.env.MARE_DENSITY_FIXTURE,'utf8'));await p.evaluate(save=>{__densityQA.game=save;__densityQA.save();__densityQA.update()},fixture);}
 fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify(await p.evaluate(()=>__densityQA.game)));
 const snapshot=()=>p.evaluate(()=>JSON.stringify({attributes:__densityQA.game.attributes,talents:__densityQA.game.talentBuilds,equipment:__densityQA.game.equipment,inventory:__densityQA.game.inventory,gold:__densityQA.game.gold,materials:__densityQA.game.materials,haki:__densityQA.game.haki}));
 const stable=await snapshot();
 for(const [width,height]of sizes){
  await p.setViewportSize({width,height});
  for(const [panel,section]of panels){
   const name=section||panel;await p.mouse.move(1,1);await p.evaluate(([a,b])=>__densityQA.open(a,b),[panel,section]);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(70);
   await measure(name,'#panelOverlay .dialog',width,height);
   const overflow=await p.locator('#dialogBody').evaluate(e=>e.scrollWidth-e.clientWidth);
   assert(overflow<=2,JSON.stringify({name,width,height,overflow}));
   const close=await p.locator('#closePanel:visible,.op-close:visible').first().boundingBox();assert(close&&close.y>=0&&close.x+close.width<=width+1&&close.y+close.height<=height+1,JSON.stringify({name,width,height,close}));
   if(width===1920||(!before&&['haki','forge','status'].includes(name)&&[393,1280].includes(width)))await capture(name+'-'+width+'.png');
  }
 }
 assert.equal(await snapshot(),stable,'Opening, inspecting and resizing cannot mutate progression, gear, balances or Haki');
 if(!before){
  await p.setViewportSize({width:1920,height:1080});await p.evaluate(()=>__densityQA.open('character','talents'));
  const workspace=p.locator('.constellation-workspace'),treePanel=p.locator('.talent-tree-panel');
  const available=await workspace.boundingBox(),expanded=await treePanel.boundingBox();assert(expanded.x+expanded.width>=available.x+available.width-3,'Unselected tree must use the vacant inspector column');
  await p.locator('[data-talent-select]').first().click({modifiers:['Shift']});assert(await p.locator('.talent-inspector').isVisible());
  await p.mouse.move(1,1);await capture('talents-selected-1920.png');assert.equal(await snapshot(),stable);
  await p.evaluate(()=>__densityQA.open('haki'));
  assert.equal(await p.locator('.haki-mastery [data-haki-toggle=armament]').count(),1);assert.equal(await p.locator('.haki-mastery [data-haki-toggle=observation]').count(),1);assert.equal(await p.locator('.haki-mastery [data-haki-cast]').count(),1);assert.equal(await p.locator('.haki-mastery [data-haki-auto]').count(),2);
  assert.equal(await p.locator('.hm-info').count(),0);
  assert.equal(await p.locator('.hm-node').count(),16);
  const branch=await p.locator('.hm-tree>.hm-branch').evaluateAll(es=>es.map(e=>e.className));
  assert(branch[0].includes('hm-armament')&&branch[1].includes('hm-conqueror')&&branch[2].includes('hm-observation'));
  for(const id of ['armament','observation','conqueror']){
   const order=await p.locator('.hm-'+id+' [data-haki-order]').evaluateAll(es=>es.map(e=>+e.dataset.hakiOrder));
   assert.deepEqual(order,[...order].sort((a,b)=>b-a));
  }
  await p.waitForFunction(()=>document.querySelectorAll('.hm-links>path').length===16); // 13 intra-branch + two gate inputs + gate output.
  const controls=await p.locator('.haki-disciplines').boundingBox(),tree=await p.locator('.hm-tree').boundingBox();assert(controls.y+controls.height<=tree.y);
  await p.locator('[data-haki-node=presence]').click();assert(await p.locator('[data-haki-invest=presence]').isDisabled());
  await p.locator('.hm-control-info summary').first().focus();await p.keyboard.press('Enter');assert(await p.locator('.hm-control-info[open]').isVisible());await p.keyboard.press('Enter');
  // Presentation state matrix. No activation is sent by selection or refresh.
  const states=await p.evaluate(()=>{
   const q=__densityQA,g=q.game,original=JSON.stringify(g.haki.mastery),rows=[];
   for(const n of MareHakiProgression.nodes)g.haki.mastery.ranks[n.id]=n.max;
   const refresh=()=>MareHakiUI.refresh(document.querySelector('#dialogBody'),g,q.rt,{inHunt:true,alive:true,defs:q.defs});
   q.open('haki');refresh();rows.push(document.querySelector('[data-haki-learned=armament]').textContent);
   q.rt.active='armament';refresh();rows.push(document.querySelector('.haki-mastery [data-haki-toggle=armament]').textContent);
   q.rt.active=null;g.haki.current=0;refresh();rows.push(document.querySelector('[data-haki-learned=armament]').textContent);
   g.haki.current=100;g.haki.kingReadyAt=Date.now()+8000;refresh();rows.push(document.querySelector('[data-haki-learned=conqueror]').textContent);
   g.haki.kingReadyAt=0;g.haki.current=75;g.haki.mastery=JSON.parse(original);q.rt.active=null;q.open('haki');return rows;
  });
  assert.deepEqual(states,['Inativo','Desativar','Sem Vontade','Em recarga']);
  await p.setViewportSize({width:320,height:568});await p.evaluate(()=>__densityQA.open('haki'));
  await p.locator('.hm-control-info summary').nth(1).click();
  const info=await p.locator('.hm-control-info[open]>div').boundingBox();assert(info.x>=0&&info.x+info.width<=320);
  await p.locator('.hm-control-info[open] summary').click();
  // Five forge modes, with real controls and reachable confirmation.
  await p.setViewportSize({width:1920,height:1080});
  for(const tab of ['upgrade','imbue','fusion','reforge']){
   await p.evaluate(tab=>{__densityQA.ui.tab=tab;__densityQA.open('forge')},tab);
   if(tab==='fusion'){await p.locator('[data-forge-fusion-mode=equipment]').click();await capture('forge-gear.png');await p.locator('[data-forge-fusion-mode=pearls]').click();}
   const button=p.locator('.forge2-operation-content [data-forge-action]').last();assert(await button.count());await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert(box.y+box.height<=1080);
   await p.mouse.move(1,1);await capture('forge-'+(tab==='fusion'?'pearls':tab)+'.png');
  }
  await p.evaluate(()=>{__densityQA.ui.tab='upgrade';__densityQA.open('forge')});
  const gaps=await p.locator('.forge2-preview>div').evaluateAll(es=>es.map(e=>{const a=e.querySelector('.forge-stat-label'),b=e.querySelector('b');return b.getBoundingClientRect().x-a.getBoundingClientRect().right}));
  assert(gaps.every(n=>n<50&&n>=0),JSON.stringify(gaps));
  assert((await p.locator('.forge2-preview').boundingBox()).width<450);
  await p.evaluate(()=>{const q=__densityQA;q.game.name='Nome longo de teste';q.game.gold=999999999;q.game.materials=999999;q.defs[q.game.equipment.weapon.def].name='Espada Cerimonial das Correntes dos Mares Distantes';q.open('forge')});
  assert(await p.locator('.forge2-operation-content').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
  await p.locator('#closePanel').click();await p.evaluate(()=>__densityQA.open('help'));await p.keyboard.press('Escape');assert(await p.locator('#panelOverlay').evaluate(e=>e.classList.contains('hidden')));
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({phase:before?'before':'after',records,errors},null,2));console.log('Density: all 20 views, eight viewports, read-only navigation and controls passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
