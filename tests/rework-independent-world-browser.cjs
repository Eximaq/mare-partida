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
 seedWardrobe(role,items,look={}){
  game.classId=role;game.level=100;game.equipment={};
  game.inventory=items.map(id=>newItem(itemDefs[id],1,false));
  game.appearance96=MareCharacterAppearance.normalize({...game.appearance96,gender:'feminino',
   skinStyle:'natural',skinColor:'ebony',hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'green',...look});
  game.preferences={...game.preferences,hideHeadgear:false};
  saveGame();renderPanel();updateUI();
 },
 seedDaggers(){
  game.classId='rogue';
  game.inventory=[73,159,22,168,148,6].map(id=>newItem(itemDefs[id],1,false));
  game.appearance96=MareCharacterAppearance.normalize({...game.appearance96,gender:'feminino',
   skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'});
  game.equipment={};game.level=100;
  saveGame();renderPanel();updateUI();
 },
 seed(){
  game.classId='sword';game.level=100;
  game.appearance96=MareCharacterAppearance.normalize({...game.appearance96,gender:'masculino',
   skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'});
  game.equipment={};
  game.inventory=[0,6,9,18,21,22,25,26,148].map(id=>newItem(itemDefs[id],1,false));
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
 async target(direction='south'){
  if(scene!=='hunt')enterHunt();
  autoPlay=false;autoSkills=false;keys.clear();
  const deadline=performance.now()+30000;
  while(mapArtState()!=='ready'){
   if(performance.now()>deadline)throw Error('Map did not become ready');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  world.spawnClock=1e9;world.target=null;world.mobs=[];
  this.lane(direction);
  const {x,y}=world.hero,reach=Math.min(42,Math.max(8,getDerived().range-4));
  const [dx,dy]={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[direction];
  const tx=x+dx*reach,ty=y+dy*reach;
  const target={...monsterTypes.cesar,id:'independent-hd-qa',type:'cesar',area:game.area,
   district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,
   defense:0,magicDefense:0,x:tx,y:ty,anchorX:tx,anchorY:ty,
   attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0};
  world.mobs=[target];game.hp=getDerived().maxHP;
  return camera.worldToScreen(target.x,target.y);
 },
 readyMera(){
  game.equipment.akuma_no_mi=newItem(itemDefs.find(d=>d.fruitId==='akuma_mera_mera'));
  syncFruitVfx();
 },
 castMera(){
  game.fruitCooldowns={};game.energy=getDerived().maxEnergy;
  world.target=world.mobs[0];world.hero.direction='front';
  void useFruitSkill(true,'1');
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
 async function remove(slot){
  await menu();
  await page.locator('[data-inv-slot="'+slot+'"]').click();
  await page.locator('[data-unequip="'+slot+'"]').click();
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
  await page.waitForFunction(()=>window.__hdSlotQA);
  await page.locator('#characterName').fill('Camadas QA');
  await page.locator('#characterName').press('Tab');
  await page.locator('#nextToClass').click();
  if(!await page.locator('#nextToAppearance').isVisible())await page.locator('#nextToClass').click();
  await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();
  await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__hdSlotQA.read().appearance);
  if(process.argv.includes('--pistol-clothes')){await observePistolClothes();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--mounted-weapons')){await observeMountedWeapons();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--registered-coats')){await observeRegisteredCoats();assert.deepEqual(errors,[]);return;}
  await page.evaluate(()=>__hdSlotQA.seed());
  await draw('porto-sem-equipamento','idle','south',{});

  for(const [key,direction] of [['d','east'],['a','west'],['w','north'],['s','south']]){
   await walk(key,direction,{},'tecla-'+key);
  }

  for(const def of [0,25,21,6])await put(def);
  const lateralKit={weapon:0,gloves:25,legs:21,coat:6};
  await walk('d','east',lateralKit,'luva25-caminhada-leste',true);
  await walk('a','west',lateralKit,'luva25-caminhada-oeste',true);
  await put(9);
  const kit={weapon:0,gloves:25,boots:9,legs:21,coat:6};
  await walk('s','south',kit,'retorno-sul-equipado');
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
  await put(22);
  await put(26);
  await remove('boots');
  const powerKit={weapon:0,coat:6,legs:22,gloves:26};
  await walk('w','north',powerKit,'caminhada-norte-equipado',true);
  await walk('s','south',powerKit,'caminhada-sul-equipado');
  await observePower(powerKit);
  await page.evaluate(()=>__hdSlotQA.seedDaggers());
  for(const id of [73,159,168,148])await put(id);
  const daggerKit={weapon:73,gloves:159,legs:168,boots:148};
  await observeAttack('attack-daggers','adaga73-calca168-leste','east',daggerKit);
  await observeAttack('attack-daggers','adaga73-calca168-oeste','west',daggerKit);
  await put(22);
  await put(6);
  await observeAttack('attack-daggers','adaga73-peitoral6-leste','east',{...daggerKit,legs:22,coat:6});
  await observeAttack('attack-daggers','adaga73-peitoral6-oeste','west',{...daggerKit,legs:22,coat:6});
  await page.evaluate(()=>__hdSlotQA.seedWardrobe('sword',[1,67,6,151,168,22,25,159,18,157,148,183]));
  const swordKit={weapon:1,coat:151,legs:168,boots:183,gloves:159,head:157};
  for(const id of Object.values(swordKit))await put(id);
  const savedLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  await walk('s','south',swordKit,'armada-antes-de-retirar');
  await remove('weapon');
  const {weapon:held,...clothes}=swordKit;
  const bare=await draw('repouso-desarmada-com-cinco-pecas','idle','south',clothes,true);
  await walk('d','east',clothes,'desarmada-caminha-leste',true);
  await walk('a','west',clothes,'desarmada-caminha-oeste',true);
  assert(!Object.hasOwn(bare.equipment,'weapon'));
  assert.deepEqual(bare.appearance,savedLook);
  await put(held);
  await draw('repouso-arma-restaurada','idle','west',swordKit,true);
  for(const [key,direction] of [['d','east'],['s','south'],['a','west'],['w','north']])
   await walk(key,direction,swordKit,'espada-caminhada-'+direction,true);
  for(const direction of ['east','north','west','south'])
   await observeAttack('attack-sword','espada-conjunto-'+direction,direction,swordKit);
  for(const [slot,id] of [['gloves',25],['head',18],['legs',22],['boots',148],['coat',6],['weapon',67]]){
   await put(id);swordKit[slot]=id;
   await observeAttack('attack-sword','espada-troca-'+slot,'east',swordKit);
  }
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__hdSlotQA?.read().appearance);
  await observeAttack('attack-sword','espada-apos-reconectar','east',swordKit);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,savedLook);
  for(const [role,weapon,action] of [['brawler',110,'attack-unarmed'],['cyborg',14,'attack-unarmed'],['healer',31,'attack-focus']]){
   const kit={coat:130,legs:147,boots:141,gloves:166,head:143,weapon};
   await page.evaluate(({role,kit})=>__hdSlotQA.seedWardrobe(role,Object.values(kit)),{role,kit});
   for(const id of Object.values(kit))await put(id);
   for(const direction of ['east','north','west','south'])await observeAttack(action,role+'-conjunto-'+direction,direction,kit);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,savedLook);
  }
  const maleKit={weapon:1,coat:151,legs:168,boots:134,gloves:25,head:18};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('sword',[...Object.values(kit),148],
   {gender:'masculino'}),maleKit);
  for(const id of Object.values(maleKit))await put(id);
  const maleLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const [key,dir] of [['d','east'],['a','west'],['w','north'],['s','south']])
   await walk(key,dir,maleKit,'masculino-conjunto-'+dir,true);
  await put(148);maleKit.boots=148;await walk('a','west',maleKit,'masculino-troca-bota-oeste',true);
  await put(134);maleKit.boots=134;await walk('a','west',maleKit,'masculino-restaura-bota-oeste',true);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,maleLook);
  const blades={weapon:12,coat:151,legs:168,boots:134,gloves:25,head:18};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('rogue',[...Object.values(kit),26],{gender:'masculino'}),blades);
  for(const id of Object.values(blades))await put(id);
  const bladeLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const [key,dir] of [['d','east'],['a','west']])await walk(key,dir,blades,'adagas-masculinas-'+dir,true);
  await put(26);blades.gloves=26;await walk('a','west',blades,'adagas-troca-luva-oeste',true);
  await put(25);blades.gloves=25;await walk('a','west',blades,'adagas-restaura-luva-oeste',true);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,bladeLook);
  const cuffKit={weapon:2,coat:165,legs:21,boots:141,gloves:159,head:178};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('brawler',Object.values(kit),{gender:'masculino'}),cuffKit);
  for(const id of Object.values(cuffKit))await put(id);
  const cuffLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const [key,dir] of [['d','east'],['a','west'],['s','south'],['w','north']])
   await walk(key,dir,cuffKit,'manoplas-roupas-'+dir,true);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,cuffLook);
  const walkingCuffs={...cuffKit,weapon:109,gloves:25};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('brawler',[...Object.values(kit),159],{
   gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'
  }),walkingCuffs);
  for(const id of Object.values(walkingCuffs))await put(id);
  const savedCuffLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const [key,dir] of [['d','east'],['w','north'],['a','west'],['s','south']])
   await walk(key,dir,walkingCuffs,'manopla109-luva25-'+dir,true);
  await put(159);walkingCuffs.gloves=159;
  await walk('s','south',walkingCuffs,'manopla109-troca-luva',true);
  await put(25);walkingCuffs.gloves=25;
  await walk('s','south',walkingCuffs,'manopla109-restaura-luva',true);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,savedCuffLook);
  const daggerOutfit={weapon:73,coat:172,legs:168,boots:148,gloves:159,head:19};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('rogue',Object.values(kit)),daggerOutfit);
  for(const id of Object.values(daggerOutfit))await put(id);
  const daggerLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const dir of ['north','south','west','east'])await observeAttack('attack-daggers','adagas-traje-completo-'+dir,dir,daggerOutfit);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,daggerLook);
  const rifleKit={weapon:113,coat:151,legs:168,boots:148,gloves:25,head:129};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),26,6,179],{gender:'feminino'}),rifleKit);
  for(const id of Object.values(rifleKit))await put(id);
  const rifleLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  await observeAttack('attack-firearm','fuzil113-feminino-norte','north',rifleKit);
  for(const coat of [6,179,151]){
   await put(coat);rifleKit.coat=coat;
   await observeAttack('attack-firearm','fuzil113-peitoral-'+coat,'north',rifleKit);
  }
  for(const dir of ['south','east','west']){
   await observeAttack('attack-firearm','fuzil113-traje-'+dir,dir,rifleKit);
  }
  await put(26);rifleKit.gloves=26;
  await observeAttack('attack-firearm','fuzil113-troca-luva','north',rifleKit);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,rifleLook);
  const pistol={weapon:114,legs:21,boots:9,gloves:25};
  for(const colored of [false,true]){
   await page.evaluate(({pistol,colored})=>__hdSlotQA.seedWardrobe('gunner',Object.values(pistol),{
    gender:'masculino',hairColor:colored?'blue':'black',eyeColor:colored?'green':'blue'
   }),{pistol,colored});
   for(const id of Object.values(pistol))await put(id);
   const identity=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const dir of (colored?['east','west']:['east','west','south','north'])){
    await observeAttack('attack-firearm','pistola114-'+(colored?'cores-':'')+dir,dir,pistol);
    assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,identity);
   }
  }
  for(const [role,kit,dir] of [['strategist',{weapon:123,coat:6,gloves:25},'south'],['healer',{weapon:126,boots:148},'north']]){
   await page.evaluate(({role,kit})=>__hdSlotQA.seedWardrobe(role,Object.values(kit),
    {gender:'masculino',hairColor:'black',eyeColor:'blue'}),{role,kit});
   for(const id of Object.values(kit))await put(id);
   await observeAttack('attack-focus','cetro'+kit.weapon+'-'+dir,dir,kit);
  }
  const bareKit={coat:144,legs:168,boots:148,gloves:159,head:157};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('brawler',Object.values(kit),{
   gender:'masculino',hairColor:'blue',eyeColor:'green',skinColor:'ebony'
  }),bareKit);
  for(const id of Object.values(bareKit))await put(id);
  const unarmedLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const [key,dir] of [['ArrowDown','south'],['ArrowLeft','west'],['ArrowUp','north'],['ArrowRight','east']]){
   await walk(key,dir,bareKit,'masculino-desarmado-caminha-'+dir);
   await observeAttack('attack-unarmed','soco-desarmado-'+dir,dir,bareKit);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,unarmedLook);
  }
  const armedPunch={...bareKit,weapon:112};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('brawler',[...Object.values(kit),25],{
   gender:'masculino',hairColor:'blue',eyeColor:'green',skinColor:'ebony'
  }),armedPunch);
  for(const id of Object.values(armedPunch))await put(id);
  const armedLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  await observeAttack('attack-unarmed','manopla112-roupas-norte','north',armedPunch);
  await put(25);armedPunch.gloves=25;
  await observeAttack('attack-unarmed','manopla112-troca-luva-norte','north',armedPunch);
  await put(159);armedPunch.gloves=159;
  await observeAttack('attack-unarmed','manopla112-restaura-luva-norte','north',armedPunch);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,armedLook);
  const sideDagger={weapon:73,coat:151};
  await page.evaluate(kit=>__hdSlotQA.seedWardrobe('rogue',[...Object.values(kit),165],{
   gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'
  }),sideDagger);
  await put(sideDagger.weapon);
  const daggerCoatLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const coat of [151,165,151]){
   await put(coat);sideDagger.coat=coat;
   for(const dir of ['east','west'])await observeAttack('attack-daggers','adaga73-masculino-peitoral-'+coat+'-'+dir,dir,sideDagger);
  }
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,daggerCoatLook);
  await observeRegisteredCoats();
  await observeMountedWeapons();
  assert.deepEqual(errors,[]);
  console.log('Character creation, equipped movement, swaps, reload, Mera weapon visibility and armed attacks passed.');
 }finally{
  const state=await page.evaluate(()=>window.__hdSlotQA?.read()).catch(()=>null);
  await fs.writeFile(path.join(out,'navegador.json'),JSON.stringify({url,trace,errors,state},null,2));
  await page.screenshot({path:path.join(out,'ultimo-estado.png')}).catch(()=>{});
  await context.close();await browser.close();
 }
 async function observeMountedWeapons(){
  for(const [weapon,role,directions] of [[109,'brawler',['east','west']],[15,'cyborg',['east','west']],[117,'cyborg',['north']]]){
   const items={weapon,coat:6,legs:22,boots:148,gloves:159,head:18};
   await page.evaluate(({role,items})=>__hdSlotQA.seedWardrobe(role,[...Object.values(items),25],
    {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'}),{role,items});
   for(const id of Object.values(items))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const dir of directions){
    const name='arma-'+weapon+'-'+dir;
    const before=await observeAttack('attack-unarmed',name+'-completo',dir,items);
    await put(25);
    const swapped=await observeAttack('attack-unarmed',name+'-troca-luva',dir,{...items,gloves:25});
    for(const slot of ['weapon','coat','legs','boots','head'])
     assert.deepEqual(swapped.visual.coverage[0].slotRoutes[slot],before.visual.coverage[0].slotRoutes[slot]);
    await put(159);
    const after=await observeAttack('attack-unarmed',name+'-retorno',dir,items);
    assert.deepEqual(after.visual.coverage[0].slotRoutes,before.visual.coverage[0].slotRoutes);
   }
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observePistolClothes(){
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  const kit={weapon:114,legs:21,boots:9,gloves:25};
  await page.evaluate(({look,kit})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),22],look),{look,kit});
  for(const id of Object.values(kit))await put(id);
  const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  const before=await observeAttack('attack-firearm','pistolas-calca21-south','south',kit);
  await put(22);
  const swap=await observeAttack('attack-firearm','pistolas-calca22-south','south',{...kit,legs:22});
  for(const slot of ['weapon','boots','gloves'])assert.deepEqual(swap.visual.coverage[0].slotRoutes[slot],before.visual.coverage[0].slotRoutes[slot]);
  await put(21);
  for(const dir of ['south','north','east','west']){
   const restored=await observeAttack('attack-firearm','pistolas-conjunto-'+dir,dir,kit);
   if(dir==='south')assert.deepEqual(restored.visual.coverage[0].slotRoutes,before.visual.coverage[0].slotRoutes);
  }
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  for(const weapon of [4,5,113,115,116]){
   await page.evaluate(({weapon,look})=>__hdSlotQA.seedWardrobe('gunner',[weapon,21],look),{weapon,look});
   await put(21);await put(weapon);
   await observeAttack('attack-firearm','disparo-'+weapon+'-calca21-north','north',{weapon,legs:21});
  }
 }
 async function observeRegisteredCoats(){
  for(const weapon of [111,112,118]){
   await page.evaluate(w=>__hdSlotQA.seedWardrobe(w===118?'cyborg':'brawler',[w,151,165],{
    gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'
   }),weapon);
   await put(weapon);
   const look=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const coat of [151,165,151]){
    await put(coat);
    for(const dir of ['east','west'])await observeAttack('attack-unarmed','manopla'+weapon+'-peitoral'+coat+'-'+dir,dir,{weapon,coat});
   }
   await remove('coat');
   const bare=await observeAttack('attack-unarmed','manopla'+weapon+'-sem-peitoral','west',{weapon});
   assert.equal(bare.visual.coverage[0].slotRoutes.coat,undefined);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,look);
  }
 }
 async function observePower(kit){
  await page.evaluate(async()=>{__hdSlotQA.readyMera();await __hdSlotQA.target('south');});
  const before=await draw('antes-poder-mera','idle','south',kit);
  let drawn;
  for(let attempt=0;attempt<4&&!drawn;attempt++){
   await page.evaluate(()=>__hdSlotQA.castMera());
   drawn=await page.waitForFunction(kit=>{
    const {draw:r,equipment}=__hdSlotQA.read(),c=r?.visual?.coverage?.[0];
    return r?.drawn&&r.scene==='hunt'&&c?.resolvedAction==='attack-unarmed'&&c.weaponless&&
     !c.slotRoutes?.weapon&&Object.entries(kit).every(([k,id])=>equipment[k]===id&&
     (k==='weapon'||(c.slotRoutes?.[k]?.item===id&&c.slotRoutes[k].quality==='hd')))?r:false;
   },kit,{timeout:4500}).then(h=>h.jsonValue()).catch(()=>null);
  }
  assert(drawn,'Mera hides only the weapon on the rendering path');
  trace.push({label:'mera-sem-arma-com-roupa',draw:drawn});
  await page.screenshot({path:path.join(out,'mera-com-roupa.png')});
  const after=await draw('depois-poder-mera','idle','south',kit);
  assert.deepEqual(after.appearance,before.appearance);
  assert.deepEqual(after.draw.visual.coverage[0].slotRoutes,before.draw.visual.coverage[0].slotRoutes);
 }
 async function observeAttack(resolvedAction,label,direction='south',expected={}){
  const point=await page.evaluate(dir=>__hdSlotQA.target(dir),direction),canvas=page.locator('#worldCanvas');
  const bounds=await canvas.boundingBox(),size=await canvas.evaluate(c=>({width:c.width,height:c.height}));
  await page.waitForFunction(()=>__hdSlotQA.read().draw?.scene==='hunt');
  const position={x:point.x*bounds.width/size.width,y:point.y*bounds.height/size.height};
  let attack;
  for(let n=0;n<25&&!attack;n++){
   await canvas.click({position});
   attack=await page.waitForFunction(({action,direction,expected})=>{
    const {draw:row,equipment}=__hdSlotQA.read(),coverage=row?.visual.coverage[0];
    return row?.drawn&&row.scene==='hunt'&&coverage?.resolvedAction===action&&
     row.last?.state==='rendered'&&row.last.direction===direction&&
     Object.entries(expected).every(([slot,id])=>equipment[slot]===id&&coverage.slotRoutes?.[slot]?.item===id&&
      coverage.slotRoutes[slot].quality==='hd')?row:false;
   },{action:resolvedAction,direction,expected},{timeout:650}).then(h=>h.jsonValue()).catch(()=>null);
  }
  assert(attack,JSON.stringify((await page.evaluate(()=>__hdSlotQA.read())).draw?.visual));
  trace.push({label,draw:attack});
  if(Object.keys(expected).length)await page.screenshot({path:path.join(out,label+'.png')});
  return attack;
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
