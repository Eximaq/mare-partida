'use strict';
// This fixture seeds an isolated backpack and observes the actual game canvas.
// Character creation, gear swaps, helmet visibility and movement use the UI.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const url=process.env.MARE_TEST_URL;
const out=process.env.MARE_EVIDENCE_DIR;
if(!url||!out)throw Error('Set MARE_TEST_URL and MARE_EVIDENCE_DIR');
const marker='  window.__mareDiagnostics=';
const hook=`
let hdQA=null;
const hdDraw=lobby96.draw.bind(lobby96);
lobby96.draw=function(ctx,p,o){
 const drawn=hdDraw(ctx,p,o);
 if(o.consumer==='world'&&ctx.canvas.id==='worldCanvas'){
  hdQA={at:performance.now(),drawn,action:o.action,direction:o.direction,scene:o.scene,
   visual:lobby96.worldVisual(),last:lobby96.snapshot().nativeHD?.last};
 }
 return drawn;
};
window.__hdSlotQA={
 seedDaggers(){
  game.classId='rogue';
  game.inventory=[newItem(itemDefs[12],1,false)];
  game.equipment={};game.level=100;
  saveGame();renderPanel();updateUI();
 },
 seed(){
  game.classId='sword';game.level=100;
  game.appearance96=MareCharacterAppearance.normalize({...game.appearance96,gender:'masculino',
   skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'});
  game.equipment={};
  game.inventory=[0,6,9,18,21,25,26,148].map(id=>newItem(itemDefs[id],1,false));
  autoPlay=false;autoSkills=false;
  saveGame();renderPanel();updateUI();
 },
 lane(direction){
  const [dx,dy]={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[direction].map(v=>v*180);
  const nav=navigator();
  for(let y=180;y<nav.map.height-180;y+=20)for(let x=180;x<nav.map.width-180;x+=20){
   if(!nav.clear({x,y},{x:x+dx,y:y+dy}))continue;
   Object.assign(world.hero,{x,y});camera.update(world.hero,activeMap(),0,true);return;
  }
  throw Error('No clear lane in '+direction);
 },
 async target(){
  if(scene!=='hunt')enterHunt();
  autoPlay=false;autoSkills=false;keys.clear();
  const deadline=performance.now()+30000;
  while(mapArtState()!=='ready'){
   if(performance.now()>deadline)throw Error('Map did not become ready');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  world.spawnClock=1e9;world.target=null;world.mobs=[];
  this.lane('south');
  const {x,y}=world.hero,reach=Math.min(42,Math.max(8,getDerived().range-4));
  const target={...monsterTypes.cesar,id:'independent-hd-qa',type:'cesar',area:game.area,
   district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,
   defense:0,magicDefense:0,x,y:y+reach,anchorX:x,anchorY:y+reach,
   attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0};
  world.mobs=[target];game.hp=getDerived().maxHP;
  return camera.worldToScreen(target.x,target.y);
 },
 read(){return {draw:hdQA,appearance:game?.appearance96,available:game?.inventory,
  equipment:Object.fromEntries(Object.entries(game?.equipment||{}).filter(([,v])=>v!=null).map(([s,v])=>[s,v.def??v])),
  hideHead:game&&MareHeadgear.hidden(game)};}
};
`;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors=[],trace=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js*',async route=>{
  const response=await route.fetch(),source=await response.text();
  assert(source.includes(marker));await route.fulfill({response,body:source.replace(marker,hook+marker)});
 });
 const menu=()=>page.locator('#mainMenu [data-panel="inventory"]').click();
 const close=()=>page.locator('[data-close-panel]').click();
 async function put(def){
  await menu();
  const item=await page.evaluate(id=>__hdSlotQA.read().available.find(x=>x.def===id)?.id,def);
  assert.ok(item,'fixture backpack has '+def);
  await page.locator('[data-item="'+item+'"]').click();
  await page.locator('[data-equip="'+item+'"]').click();
  const confirm=page.locator('[data-confirm-accept]');
  if(await confirm.isVisible())await confirm.click();
  await page.waitForFunction(id=>Object.values(__hdSlotQA.read().equipment).includes(id),def);
  await close();
 }
 async function draw(label,action,direction,expected,save=false,timeout=25000){
  const value=await page.waitForFunction(({action,direction,expected})=>{
   const r=window.__hdSlotQA?.read(),d=r?.draw,c=d?.visual?.coverage?.[0];
   if(!d?.drawn||d.action!==action||!d.visual.firstDrawAt||!c||c.direction!==direction||
      Object.entries(expected).some(([slot,id])=>r.equipment[slot]!==id||c.slotRoutes?.[slot]?.item!==id||
       c.slotRoutes[slot].quality!=='hd'))return false;
   return {equipment:r.equipment,appearance:r.appearance,draw:d,hideHead:r.hideHead};
  },{action,direction,expected},{timeout}).then(h=>h.jsonValue());
  trace.push({label,...value});
  if(save)await page.screenshot({path:path.join(out,label+'.png')});
  return value;
 }
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#characterName').fill('Camadas QA');
  await page.locator('#nextToClass').click();
  await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();
  await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__hdSlotQA.read().appearance);
  await page.evaluate(()=>__hdSlotQA.seed());
  await draw('porto-sem-equipamento','idle','south',{});

  for(const [key,direction] of [['d','east'],['a','west'],['w','north'],['s','south']]){
   await walk(key,direction,{},'tecla-'+key);
  }

  for(const def of [0,25,9,21,6])await put(def);
  const kit={weapon:0,gloves:25,boots:9,legs:21,coat:6};
  const first=await draw('porto-conjunto-hd','idle','south',kit,true);
  assert.deepEqual(first.draw.visual.coverage[0].omitted,[]);
  await walk('s','south',kit,'caminhada-hd',true);

  await put(26);
  const swap=await draw('troca-luva','idle','south',{...kit,gloves:26},true);
  for(const slot of ['weapon','boots','legs','coat'])
   assert.equal(swap.draw.visual.coverage[0].slotRoutes[slot].source,first.draw.visual.coverage[0].slotRoutes[slot].source);
  await put(25);
  const returned=await draw('luva-restaurada','idle','south',kit);
  assert.deepEqual(returned.draw.visual.coverage[0].slotRoutes,first.draw.visual.coverage[0].slotRoutes);

  await put(148);
  const tall=await draw('bota-148-recuperada','idle','south',{...kit,boots:148},true);
  assert.equal(tall.draw.visual.coverage[0].slotResolution.boots.layers.length,6);
  await walk('s','south',{...kit,boots:148},'bota-148-em-movimento',true);
  await put(9);
  await draw('bota-anterior-restaurada','idle','south',kit);

  await put(18);
  const worn=await draw('capacete-visivel','idle','south',{...kit,head:18},true);
  await menu();
  await page.locator('[data-headgear-visibility]').click();
  await close();
  const hidden=await draw('capacete-oculto','idle','south',kit,true);
  assert.equal(hidden.equipment.head,18);assert(hidden.hideHead);
  assert(!hidden.draw.visual.coverage[0].slotRoutes.head);
  assert.equal(worn.appearance.skinColor,hidden.appearance.skinColor);

  await page.reload({waitUntil:'domcontentloaded',timeout:90000});
  const reload=await draw('sessao-recarregada','idle','south',kit);
  assert.deepEqual(reload.equipment,hidden.equipment);
  assert.deepEqual(reload.appearance,hidden.appearance);
  assert(reload.hideHead);
  for(const slot of ['coat','legs','boots','gloves','head']){
   await menu();
   await page.locator('[data-inv-slot="'+slot+'"]').click();
   await page.locator('[data-unequip="'+slot+'"]').click();
   await close();
  }
  await observeAttack('attack-sword','ataque-real-espada');
  await page.evaluate(()=>__hdSlotQA.seedDaggers());
  await put(12);
  await observeAttack('attack-daggers','ataque-real-adagas-bruma');
  assert.deepEqual(errors,[]);
  console.log('Character creation, 4 keyboard directions, equipment, A-B-A, helmet visibility, reload and both attacks passed.');
 }finally{
  const state=await page.evaluate(()=>window.__hdSlotQA?.read()).catch(()=>null);
  await fs.writeFile(path.join(out,'navegador.json'),JSON.stringify({url,trace,errors,state},null,2));
  await page.screenshot({path:path.join(out,'ultimo-estado.png')}).catch(()=>{});
  await context.close();await browser.close();
 }
 async function observeAttack(resolvedAction,label){
  const point=await page.evaluate(()=>__hdSlotQA.target()),canvas=page.locator('#worldCanvas');
  const bounds=await canvas.boundingBox(),size=await canvas.evaluate(c=>({width:c.width,height:c.height}));
  await draw(label+'-mapa','idle','south',{});
  const position={x:point.x*bounds.width/size.width,y:point.y*bounds.height/size.height};
  let attack;
  for(let n=0;n<25&&!attack;n++){
   await canvas.click({position});
   attack=await page.waitForFunction(action=>{
    const row=__hdSlotQA.read().draw;
    return row?.drawn&&row.scene==='hunt'&&row.visual.coverage[0]?.resolvedAction===action&&
     row.last?.state==='rendered'&&row.last.direction==='south'?row:false;
   },resolvedAction,{timeout:650}).then(h=>h.jsonValue()).catch(()=>null);
  }
  assert(attack,JSON.stringify((await page.evaluate(()=>__hdSlotQA.read())).draw?.visual));
  trace.push({label,draw:attack});
 }
 async function walk(key,direction,kit,label,save=false){
  let failure;
  for(let n=0;n<3;n++){
   await page.evaluate(dir=>__hdSlotQA.lane(dir),direction);
   await page.keyboard.down(key);
   try{return await draw(label,'walk',direction,kit,save,8000);}
   catch(e){failure=e;}finally{await page.keyboard.up(key);}
  }
  throw failure;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
