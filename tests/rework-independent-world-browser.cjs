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
let raceQA=null;
function raceSample(row){
 if(!raceQA||row.scene!=='hunt')return;
 const m=raceQA,cover=row.visual?.coverage?.[0],pose=basicAttackPose();
 const mob=world.mobs.find(v=>v.id==='independent-hd-qa');
 if(pose?.locked&&session.basicAttack!==m.lastAttack){m.attacks++;m.lastAttack=session.basicAttack;}
 if(mob){if(m.target===mob&&mob.hp<m.hp)m.damage+=m.hp-mob.hp;m.target=mob;m.hp=mob.hp;}
 const sw=m.required;
 if(sw!=null&&row.drawn){
  if(lobby96.snapshot().renderer!=='native-hd')m.legacy++;
  const painted=row.last,shown=row.visual?.displayed;
  if(painted?.slotRoutes?.coat?.item!==sw||!shown||
     shown.exact&&(cover?.slotRoutes?.coat?.item!==sw||painted.source!==cover?.source))m.stale++;
  if(shown?.exact&&cover?.resolvedAction==='attack-focus'&&cover.direction==='north'&&cover.slotRoutes?.coat?.item===sw&&
   painted?.state==='rendered'&&painted.direction==='north'&&painted.action==='attack-focus'&&!cover.omitted?.length){
   const wrongSlot=Object.entries(m.gear).some(([slot,item])=>{
    const held=game.equipment[slot];
    if((held?.def??held)!==item)return true;
    return slot==='head'&&MareHeadgear.hidden(game)?!!painted.slotRoutes[slot]:painted.slotRoutes[slot]?.item!==item;
   });
   if(wrongSlot)m.lostSlots++;
   m.current=painted.slotRoutes.coat.source;
   m.draws++;if(m.lastPaintedAttack!==m.lastAttack&&m.lastAttack){m.drawnAttacks++;m.lastPaintedAttack=m.lastAttack;}
  }
 }
 if(performance.now()-m.scan>75){m.scan=performance.now();if(/preparando.{0,25}anima.{0,35}personagem/i.test(document.body.innerText))m.blocked++;}
}
let hdQA=null,mapCycle=null;
const hdDraw=lobby96.draw.bind(lobby96);
lobby96.draw=function(ctx,p,o){
 const watch=mapCycle&&o.consumer==='world'&&ctx.canvas.id==='worldCanvas'&&o.scene==='hunt';
 let sprite,drawn;
 if(watch){
  const paint=ctx.drawImage;
  ctx.drawImage=function(image,...args){sprite=image;return paint.call(this,image,...args);};
  try{drawn=hdDraw(ctx,p,o);}finally{ctx.drawImage=paint;}
 }else drawn=hdDraw(ctx,p,o);
 if(o.consumer==='world'&&ctx.canvas.id==='worldCanvas'){
  hdQA={at:performance.now(),drawn,action:o.action,direction:o.direction,scene:o.scene,
   visual:lobby96.worldVisual(),last:lobby96.snapshot().nativeHD?.last};
  raceSample(hdQA);
  if(watch&&drawn&&sprite&&hdQA.visual?.displayed?.exact){
   const r=hdQA.last,c=hdQA.visual?.coverage?.[0];
   if(c?.resolvedAction===mapCycle.action&&r?.direction===mapCycle.direction&&r.state==='rendered'&&Number.isInteger(r.frame)&&
    sprite.width===r.width&&sprite.height===r.height&&!mapCycle.frames.has(r.frame)&&
    Object.entries(mapCycle.gear).every(([k,id])=>c.slotRoutes[k]?.item===id)&&!c.omitted.length&&
    (!mapCycle.checkPainted||(r.source===c.source&&Object.entries(mapCycle.gear).every(([k,id])=>r.slotRoutes?.[k]?.item===id)))){
    const tile=document.createElement('canvas');tile.width=tile.height=160;
    const tx=tile.getContext('2d');tx.imageSmoothingEnabled=true;tx.drawImage(sprite,0,0,160,160);
    mapCycle.frames.set(r.frame,tile);
   }
  }
 }
 return drawn;
};
window.__hdSlotQA={
 raceStart(){raceQA={lostSlots:0,attacks:0,damage:0,draws:0,drawnAttacks:0,stale:0,legacy:0,blocked:0,scan:0};},
 raceExpect(id,gear){raceQA.required=id;raceQA.gear={...gear,coat:id};raceQA.draws=0;raceQA.drawnAttacks=0;raceQA.lastPaintedAttack=null;},
 raceRead(){const q=raceQA;return {attacks:q.attacks,damage:q.damage,draws:q.draws,drawnAttacks:q.drawnAttacks,
  stale:q.stale,lostSlots:q.lostSlots,legacy:q.legacy,blocked:q.blocked,current:q.current,actor:game.equipment.coat?.def,
  x:world.hero.x,y:world.hero.y,active:!!basicAttackPose()?.locked||world.hero.attackAnim>0,
  scene,position:world.hero.direction};},
 startCycle(action,direction,gear,checkPainted=false){mapCycle={action,direction,gear,checkPainted,frames:new Map()};},
 cycleFrames(){return [...mapCycle.frames.keys()].sort((a,b)=>a-b);},
 finishCycle(){const sheet=document.createElement('canvas');sheet.width=mapCycle.frames.size*160;sheet.height=160;const ctx=sheet.getContext('2d');for(const [phase,tile] of mapCycle.frames)ctx.drawImage(tile,phase*160,0);mapCycle=null;return sheet.toDataURL('image/png');},
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
  // A clean Pages installation fetches the packaged game before opening creation.
  await page.locator('#characterName').waitFor({state:'visible',timeout:180000});
  await page.locator('#characterName').fill('Camadas QA');
  await page.locator('#characterName').press('Tab');
  await page.locator('#nextToClass').click();
  if(!await page.locator('#nextToAppearance').isVisible())await page.locator('#nextToClass').click();
  await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();
  await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__hdSlotQA.read().appearance);
  if(process.argv.includes('--saved-carry-gait')){
   const expressions=process.argv.includes('--carry-expression');
   const look={gender:'masculino',hairStyle:expressions?'hair-long':'hair-cropped',hairColor:'blue',eyeColor:'green',skinColor:'ebony',eyeStyle:expressions?'face-calm':'original'};
   const cases=expressions?[[110,'brawler','a','west',19],[124,'strategist','s','south',157]]:
    [[0,'sword','d','east',18],[110,'brawler','a','west',19],[119,'cyborg','w','north',129],[124,'strategist','s','south',157]];
   for(const [weapon,role,key,dir,head] of cases){
    const clothes={weapon,coat:137,legs:22,boots:162,gloves:159},worn={...clothes,head};
    await page.evaluate(({role,items,look})=>__hdSlotQA.seedWardrobe(role,items,look),{role,items:Object.values(worn),look});
    for(const id of Object.values(worn))await put(id);
    await page.evaluate(dir=>__hdSlotQA.target(dir),dir);
    const label='porte-'+weapon+'-'+dir;
    const first=await walk(key,dir,worn,label);
    await page.evaluate(({dir,worn})=>__hdSlotQA.startCycle('walk',dir,worn,true),{dir,worn});
    let frames=[];
    for(let attempt=0;attempt<5&&frames.length<16;attempt++){
     await page.evaluate(dir=>__hdSlotQA.lane(dir),dir);
     await page.keyboard.down(key);
     try{await page.waitForFunction(()=>__hdSlotQA.cycleFrames().length===16,null,{timeout:3000}).catch(()=>{});}
     finally{await page.keyboard.up(key);}
     frames=await page.evaluate(()=>__hdSlotQA.cycleFrames());
    }
    assert.deepEqual(frames,Array.from({length:16},(_,i)=>i),label);
    const image=await page.evaluate(()=>__hdSlotQA.finishCycle());
    await fs.writeFile(path.join(out,label+'-ciclo.png'),Buffer.from(image.split(',')[1],'base64'));
    await remove('head');const bare=await walk(key,dir,clothes,label+'-sem-elmo');
    for(const slot of Object.keys(clothes))assert.deepEqual(first.draw.visual.coverage[0].slotRoutes[slot],bare.draw.visual.coverage[0].slotRoutes[slot]);
    await put(head);const back=await walk(key,dir,worn,label+'-elmo-restaurado');
    assert.deepEqual(back.draw.visual.coverage[0].slotRoutes,first.draw.visual.coverage[0].slotRoutes);
    assert.deepEqual(back.appearance,first.appearance);
   }
   assert.deepEqual(errors,[]);return;
  }
  if(process.argv.includes('--profile-blade-head-styles')||process.argv.includes('--blade-outfit-styles')){
   const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'hair-cropped',eyeStyle:'face-calm'};
   const runs=process.argv.includes('--blade-outfit-styles')?[[0,'sword',['east']],[69,'sword',['west']],[73,'rogue',['north']]]:
    [[73,'rogue',['east','west']],[1,'sword',['north']],[67,'sword',['north']]];
   for(const [weapon,role,dirs] of runs){
    const fixed={weapon,coat:165,legs:21,boots:183,gloves:159},worn={...fixed,head:178};
    const action=role==='rogue'?'attack-daggers':'attack-sword';
    await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:Object.values(worn),look});
    for(const item of Object.values(worn))await put(item);
    for(const dir of dirs){
     const label='cabelo-curto-lamina-'+weapon+'-'+dir;
     const first=await observeAttack(action,label+'-elmo',dir,worn);await captureMapCycle(action,worn,label,8,dir);
     await remove('head');const bare=await observeAttack(action,label+'-sem-elmo',dir,fixed);
     for(const slot of Object.keys(fixed))assert.deepEqual(first.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
     await put(178);const restored=await observeAttack(action,label+'-elmo-restaurado',dir,worn);
     assert.deepEqual(restored.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
     const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;for(const [k,v] of Object.entries(look))assert.equal(saved[k],v);
    }
   }
   assert.deepEqual(errors,[]);return;
  }
  if(process.argv.includes('--firearm-eye-expressions')){await require('./rework-firearm-eye-expressions-browser.cjs')({page,put,remove,menu,close,observeAttack,captureMapCycle});assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--firearm-saved-hair')||process.argv.includes('--punch-saved-look')){await require('./rework-male-firearm-named-hair-browser.cjs')({page,put,remove,observeAttack,captureMapCycle,punch:process.argv.includes('--punch-saved-look')});assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--unarmed-saved-hair')){await require('./rework-male-unarmed-named-browser.cjs')({page,out,draw,walk,put,remove,observeAttack,captureMapCycle});assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--focus-saved-hair')||process.argv.includes('--focus-eye-shapes')){await require('./rework-male-focus-saved-hair-browser.cjs')({page,put,remove,observeAttack,captureMapCycle});assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-saved-head-shapes')){
   const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
   for(const [weapon,hairStyle,head] of [[1,'hair-spiky',18],[73,'none',164],[123,'hair-spiky',19]]){
    const {role}=weapons.find(w=>w.id===weapon);
    const action=role==='sword'?'attack-sword':role==='rogue'?'attack-daggers':'attack-focus';
    const gear={weapon,coat:151,legs:168,boots:148,gloves:25};
    const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle,eyeStyle:'face-calm'};
    const label='aparencia-salva-sul-'+weapon;
    await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(gear),head],look});
    for(const id of Object.values(gear))await put(id);
    const read=()=>page.evaluate(()=>__hdSlotQA.read().appearance);
    const saved=await read();for(const [k,v] of Object.entries(look))assert.equal(saved[k],v);
    const bare=await observeAttack(action,label+'-sem-elmo','south',gear);
    const worn={...gear,head};await put(head);
    const fitted=await observeAttack(action,label+'-elmo-'+head,'south',worn);
    for(const k of Object.keys(gear))assert.deepEqual(bare.visual.coverage[0].slotRoutes[k],fitted.visual.coverage[0].slotRoutes[k]);
    await captureMapCycle(action,worn,label,weapon===123?8:9,'south');
    await remove('head');
    const restored=await observeAttack(action,label+'-retirado','south',gear);
    assert.deepEqual(restored.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
    assert.deepEqual(await read(),saved);
   }
   assert.deepEqual(errors,[]);return;
  }
  if(process.argv.includes('--wardrobe-load-race')){await require('./rework-wardrobe-async-browser.cjs')({page,url,out,put});assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--front-punch-trousers')){await observeWeaponGloves('pants');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--front-punch-coats')){await observeWeaponGloves('coat');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--compass-side-wardrobe')||process.argv.includes('--relic-side-wardrobe')){await observeCompassWardrobe(process.argv.includes('--relic-side-wardrobe')?32:16);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-metal-gloves')){await observeWeaponGloves('gauntlet');assert.deepEqual(errors,[]);return;}
  if(['--staff-gloves','--sword-gloves','--orb-gloves','--dagger-gloves'].some(v=>process.argv.includes(v))){await observeWeaponGloves(process.argv.includes('--sword-gloves')?'sword':process.argv.includes('--orb-gloves')?'orb':process.argv.includes('--dagger-gloves')?'daggers':'staff');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--staff-coats')){
   await observeWeaponCoats([123,124],'strategist','attack-focus',true);
   await observeWeaponCoats([31,125,126,127,128],'healer','attack-focus',true);
   assert.deepEqual(errors,[]);return;
  }
  if(process.argv.includes('--orb-coats')){await observeWeaponCoats([17,122],'strategist','attack-focus');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-blade-wardrobe')){await observeBladeCloth('legs',false,true);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-blade-wardrobe')){await observeBladeCloth('legs',true);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--blade-trousers')||process.argv.includes('--blade-sleeves')){await observeBladeCloth(process.argv.includes('--blade-sleeves')?'coat':'legs');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--articulated-boots')){await observeArticulatedBoots();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--sword-coats')){await observeWeaponCoats([0,1,67,68,69,70],'sword','attack-sword');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-staff-grips')){await observeSouthFocusClothes([[123,6,144],[126,130,179],[128,151,137]]);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-staff-wardrobe')){await observeNorthStaffWardrobe();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-staff-clothes')){await observeSouthFocusClothes();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-focus-trousers')||process.argv.includes('--south-focus-boots')){await observeFocusTrousers(process.argv.includes('--south-focus-boots'));assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-forearm-trousers')){await observeSouthForearmTrousers();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-forearm-wardrobe')){await observeSouthPunchHelmets([111,118,119,120]);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--south-punch-helmets')){await observeSouthPunchHelmets();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--articulated-helmets')){await observeArticulatedHelmets();assert.deepEqual(errors,[]);return;}
  const daggerGearArg=process.argv.find(v=>/^--dagger-(boots|heads)=/.test(v));
  if(daggerGearArg){const [mode,direction]=daggerGearArg.split('=');await observeDaggerEquipment(direction,mode.endsWith('heads')?'head':'boots');assert.deepEqual(errors,[]);return;}
  const sideFist=process.argv.find(v=>v==='--lateral-gauntlet-wardrobe'||/^--lateral-gauntlet=(2|3|110|111|112|118|119)$/.test(v));
  if(process.argv.includes('--north-gauntlet=110')){
   await observeLateralGauntlet(110,['north']);await observeLateralGauntlet(110,['north'],true);
   assert.deepEqual(errors,[]);return;
  }
  if(sideFist){await observeLateralGauntlet(Number(sideFist.split('=')[1]||110));assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-moving-boots')){await observeNorthMovingBoots();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--scepter-profile')){await observeFocusSleeves(true);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--side-focus-sleeves')){await observeFocusSleeves();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--side-staff-trousers')){await observeWeaponGloves('staffPants');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-focus-jackets')){await observeNorthFocusClothing('coat');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-focus-gloves')){await observeNorthFocusClothing('gloves');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-focus-trousers')){await observeNorthFocusClothing('legs');assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-focus-coats')||process.argv.includes('--north-weapon-coats')||process.argv.includes('--north-orb-compass-coats')){await observeNorthFocusCoats(process.argv.includes('--north-weapon-coats'),process.argv.includes('--north-orb-compass-coats'));assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-rifle-clothes')){await observeNorthRifleClothes();assert.deepEqual(errors,[]);return;}
  const southLegs=process.argv.find(v=>/^--south-firearm-legs(?:=(4|5|113|114|115|116))?$/.test(v));
  if(southLegs){await observeSouthFirearmLegs(southLegs.includes('=')?[Number(southLegs.split('=')[1])]:[4,5,113,114,115,116]);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--wardrobe-map-batch')){
   await require('./rework-wardrobe-map-batch.cjs')({page,out,put,observeAttack,captureMapCycle});
   assert.deepEqual(errors,[]);return;
  }
  if(process.argv.includes('--pistol-complete-wardrobe')){await observePistolWardrobe();assert.deepEqual(errors,[]);return;}
  const southFused=process.argv.find(v=>/^--south-fused-firearm(?:=(114|116))?$/.test(v));
  if(southFused){await observeSouthRifleArms(southFused.includes('=')?[Number(southFused.split('=')[1])]:[114,116]);assert.deepEqual(errors,[]);return;}
  const southArms=process.argv.find(v=>/^--south-rifle-arms(?:=(4|5|113|115))?$/.test(v));
  if(southArms){await observeSouthRifleArms(southArms.includes('=')?[Number(southArms.split('=')[1])]:[4,5,113,115]);assert.deepEqual(errors,[]);return;}
  const firearmHead=process.argv.find(v=>/^--original-firearm-head=(114-(north|south|east|west)|116-south)$/.test(v));
  if(firearmHead){const [arm,direction]=firearmHead.split('=')[1].split('-');await observeOriginalFirearmHeads(Number(arm),direction);assert.deepEqual(errors,[]);return;}
  const rifleProfiles=process.argv.find(v=>/^--rifle-profile-clothes(?:=(4|5|113|115|116))?$/.test(v));
  if(rifleProfiles){await observeRifleProfileClothes(rifleProfiles.includes('=')?[Number(rifleProfiles.split('=')[1])]:[4,5,113,115,116]);assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-rifle-helmets')){await observeNorthRifleHelmets();assert.deepEqual(errors,[]);return;}
  if(process.argv.includes('--north-rifle-trousers')){await observeNorthTrousers();assert.deepEqual(errors,[]);return;}
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
  for(const [weapon,role,directions] of [[2,'brawler',['north']],[3,'brawler',['north']],[109,'brawler',['east','west','south']],[112,'brawler',['south']],[15,'cyborg',['east','west','south']],[117,'cyborg',['north','east','west','south']]]){
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
 async function observeBladeCloth(slot,north=false,south=false){
  const coats=slot==='coat',alternatives=coats?[137,6]:[168,22];
  // One real map cycle for each distinct body compositor. The pixel test
  // exercises all ten materials and both directions of these three paths.
  const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  for(const weapon of south?[0,1,69,73]:north?[1,67,69,73]:[0,1,73]){
   const role=weapons.find(w=>w.id===weapon).role;
   const action=role==='sword'?'attack-sword':'attack-daggers',direction=south?'south':north?'north':weapon===1?'west':'east';
   const look={gender:'masculino',skinColor:weapon===1?'light':'ebony',hairColor:'blue',eyeColor:'green'};
   const fixed={weapon,head:19,...(coats?{legs:168}:{coat:151}),boots:148,gloves:152},equipped=Object.values(fixed);
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,look,ids:[...equipped,...alternatives,...(north||south?[137,25]:[])]});
   for(const item of weapon===1?equipped.reverse():equipped)await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,label=(coats?'mangas':'calcas')+'-lamina-'+weapon+'-'+direction;
   const before=await observeAttack(action,label+'-sem-'+slot,direction,fixed);let first;
   for(const [index,item] of [...alternatives,alternatives[0]].entries()){
    await put(item);const kit={...fixed,[slot]:item},state=await observeAttack(action,label+'-'+index,direction,kit);
    const routes=state.visual.coverage[0].slotRoutes;
    for(const slot of Object.keys(fixed))assert.deepEqual(routes[slot],before.visual.coverage[0].slotRoutes[slot]);
    if(index===0){first=routes;await captureMapCycle(action,kit,label,south?9:8,direction);}
    else if(index===2)assert.deepEqual(first,routes);
   }
   if(north||south){
    const gear={...fixed,[slot]:alternatives[0]};
    for(const [target,item] of [['gloves',25],['coat',137],['gloves',fixed.gloves],['coat',fixed.coat]]){
     await put(item);gear[target]=item;
     const changed=await observeAttack(action,label+'-'+target+'-'+item,direction,gear);
     const routes=changed.visual.coverage[0].slotRoutes;
     for(const [k,v] of Object.entries(gear))assert.equal(routes[k].item,v);
     if(gear.gloves===fixed.gloves&&gear.coat===fixed.coat)assert.deepEqual(routes,first);
    }
   }
   await remove(slot);assert.deepEqual((await observeAttack(action,label+'-retirada',direction,fixed)).visual.coverage[0].slotRoutes,before.visual.coverage[0].slotRoutes);
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeArticulatedBoots(){
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  for(const [weapon,role,action] of [[68,'sword','attack-sword'],[4,'gunner','attack-firearm'],[17,'strategist','attack-focus'],[124,'strategist','attack-focus'],[31,'healer','attack-focus']]){
   const clothing={head:19,...(role==='sword'||weapon===17?{coat:151}:{})},kit={weapon,...clothing};
   const items=[...Object.values(kit),8,9,134,141,148,155,162,169,176,183];
   await page.evaluate(({role,items,look})=>__hdSlotQA.seedWardrobe(role,items,look),{role,items,look});
   for(const id of Object.values(kit))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const dir of ['east','west']){
    const baseline=await observeAttack(action,'botas-'+weapon+'-'+dir+'-descalco',dir,kit);
    let first;
    for(const boots of [8,9,134,141,148,155,162,169,176,183,8]){
     await put(boots);
     const result=await observeAttack(action,'botas-'+weapon+'-'+dir+'-'+boots+(first&&boots===8?'-retorno':''),dir,{...kit,boots});
     for(const slot of Object.keys(kit))assert.deepEqual(result.visual.coverage[0].slotRoutes[slot],baseline.visual.coverage[0].slotRoutes[slot]);
     if(!first)first=result.visual.coverage[0].slotRoutes;
     else if(boots===8)assert.deepEqual(result.visual.coverage[0].slotRoutes,first);
    }
    await remove('boots');
    const end=await observeAttack(action,'botas-'+weapon+'-'+dir+'-retiradas',dir,kit);
    assert.deepEqual(end.visual.coverage[0].slotRoutes,baseline.visual.coverage[0].slotRoutes);
   }
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeWeaponCoats(weapons,role,action,withBoots=false){
  for(const weapon of weapons){
   const appearance={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
   const parts={head:19,...(withBoots?{boots:169}:{})};
   await page.evaluate(({weapon,appearance,role,parts})=>__hdSlotQA.seedWardrobe(role,[weapon,...Object.values(parts),151,158,165,179],appearance),{weapon,appearance,role,parts});
   await put(weapon);for(const item of Object.values(parts))await put(item);await put(151);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const direction of ['east','west']){
    const prefix=(role==='sword'?'espada':[17,122].includes(weapon)?'orbe':'cajado')+'-'+weapon+'-'+direction,kit={weapon,...parts,coat:151};
    const start=await observeAttack(action,prefix+'-151',direction,kit);
    for(const coat of [158,165,179,151]){
     await put(coat);
     const next=await observeAttack(action,prefix+'-troca-'+coat,direction,{...kit,coat});
     for(const slot of ['weapon',...Object.keys(parts)])assert.deepEqual(next.visual.coverage[0].slotRoutes[slot],start.visual.coverage[0].slotRoutes[slot]);
     if(coat===151)assert.deepEqual(next.visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
    }
    await remove('coat');
    const after=await observeAttack(action,prefix+'-sem-peitoral',direction,{weapon,...parts});
    assert.equal(after.visual.coverage[0].slotRoutes.coat,undefined);
    await put(151);
   }
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeArticulatedHelmets(){
  for(const [weapon,role,dir] of [[0,'sword','east'],[4,'gunner','west'],[73,'rogue','north']]){
   const appearance={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({role,weapon,appearance})=>__hdSlotQA.seedWardrobe(role,[weapon,19,178],appearance),{role,weapon,appearance});
   await put(weapon);await put(19);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const action={sword:'attack-sword',gunner:'attack-firearm',rogue:'attack-daggers'}[role],prefix='capacete-'+weapon+'-'+dir;
   const full=await observeAttack(action,prefix+'-19',dir,{weapon,head:19});
   await put(178);
   const open=await observeAttack(action,prefix+'-178',dir,{weapon,head:178});
   assert.deepEqual(open.visual.coverage[0].slotRoutes.weapon,full.visual.coverage[0].slotRoutes.weapon);
   await put(19);
   const restored=await observeAttack(action,prefix+'-retorno',dir,{weapon,head:19});
   assert.deepEqual(restored.visual.coverage[0].slotRoutes,full.visual.coverage[0].slotRoutes);
   await remove('head');
   const bare=await observeAttack(action,prefix+'-sem-capacete',dir,{weapon});
   assert.equal(bare.visual.coverage[0].slotRoutes.head,undefined);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeNorthMovingBoots(){
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},ids=[8,9,134,141,148,155,162,169,176,183];
  for(const [role,attack,weapons] of [['sword','attack-sword',[0,1,67,68,70]],['rogue','attack-daggers',[12,13,71,72,73,74]],['strategist','attack-focus',[16,17,121,122]],['healer','attack-focus',[31,32]]]){
   for(const weapon of weapons){
    await page.evaluate(({role,weapon,ids,look})=>__hdSlotQA.seedWardrobe(role,[weapon,19,...ids],look),{role,weapon,ids,look});
    await put(weapon);await put(19);const gear={weapon,head:19},saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
    const shoot=(name,expected)=>observeAttack(attack,'norte-'+weapon+'-'+name,'north',expected);
    const bare=await shoot('sem-bota',gear);let first;
    for(const boots of [...ids,8]){
     await put(boots);const next=await shoot('bota-'+boots+(first&&boots===8?'-retorno':''),{...gear,boots});
     for(const slot of ['weapon','head'])assert.deepEqual(next.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
     if(boots===8){if(first)assert.deepEqual(next.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);else first=next;}
    }
    await remove('boots');const off=await shoot('retirada',gear);assert.deepEqual(off.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
    assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
   }
  }
 }
 async function captureMapCycle(action,gear,label,count,direction='north',checkPainted=false){
  await page.evaluate(({action,direction,gear,checkPainted})=>__hdSlotQA.startCycle(action,direction,gear,checkPainted),{action,direction,gear,checkPainted});
  const canvas=page.locator('#worldCanvas');
  let frames=[];
  for(let attempt=0;attempt<24&&frames.length<count;attempt++){
   const pt=await page.evaluate(dir=>__hdSlotQA.target(dir),direction);
   const box=await canvas.boundingBox(),size=await canvas.evaluate(c=>({w:c.width,h:c.height}));
   await canvas.click({position:{x:pt.x*box.width/size.w,y:pt.y*box.height/size.h}});
   await page.waitForFunction(n=>__hdSlotQA.cycleFrames().length===n,count,{timeout:1250}).catch(()=>{});
   frames=await page.evaluate(()=>__hdSlotQA.cycleFrames());
  }
  assert.deepEqual(frames,Array.from({length:count},(_,i)=>i),label+' visible map frames');
  const data=await page.evaluate(()=>__hdSlotQA.finishCycle());
  await fs.writeFile(path.join(out,label+'-ciclo.png'),Buffer.from(data.split(',')[1],'base64'));
 }
 async function observeDaggerEquipment(direction,slot){
  assert(['east','west'].includes(direction));
  const ids=slot==='head'?[19,18,129,136,143,150,157,164,171,178]:[8,9,134,141,148,155,162,169,176,183];
  const look={gender:'masculino',skinColor:direction==='east'?'ebony':'light',hairColor:'blue',eyeColor:'green'};
  for(const weapon of [12,13,71,72,73,74]){
   const base={weapon,coat:151,...(slot==='head'?{boots:148}:{})};
   await page.evaluate(({base,ids,look})=>__hdSlotQA.seedWardrobe('rogue',[...Object.values(base),...ids],look),{base,ids,look});
   for(const id of (direction==='west'?Object.values(base).reverse():Object.values(base)))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const show=(label,gear)=>observeAttack('attack-daggers','adagas-'+weapon+'-'+direction+'-'+label,direction,gear);
   const initial=await show('sem-'+slot,base);let first;
   for(const id of [...ids,ids[0]]){
    await put(id);const gear={...base,[slot]:id};
    const now=await show(slot+'-'+id+(first&&id===ids[0]?'-retorno':''),gear);
    for(const slot of Object.keys(base))assert.deepEqual(now.visual.coverage[0].slotRoutes[slot],initial.visual.coverage[0].slotRoutes[slot]);
    if(id===ids[0]){
     if(first)assert.deepEqual(now.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
     else {first=now;await captureMapCycle('attack-daggers',gear,'adagas-'+weapon+'-'+direction,8,direction);}
    }
   }
   if(slot==='head'){
    for(const hidden of [true,false]){
     await menu();await page.locator('[data-headgear-visibility]').click();await close();
     const current=await show(hidden?'oculto':'visivel',hidden?base:{...base,head:ids[0]});
     assert.deepEqual(current.visual.coverage[0].slotRoutes,(hidden?initial:first).visual.coverage[0].slotRoutes);
     assert.equal((await page.evaluate(()=>__hdSlotQA.read())).equipment.head,ids[0]);
    }
   }
   await remove(slot);const end=await show(slot+'-retirado',base);
   assert.deepEqual(end.visual.coverage[0].slotRoutes,initial.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeCompassWardrobe(weapon){
  const {gear}=require('../tools/audit-hd-wardrobe-product.cjs');
  const wardrobe={coat:[151,158,165,179],head:gear[4],boots:gear[2],gloves:gear[3]};
  const start={weapon,coat:151,head:19,boots:169,gloves:152};
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role:weapon===32?'healer':'strategist',ids:[weapon,...Object.values(wardrobe).flat()],look});
  for(const id of Object.values(start))await put(id);
  const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  for(const direction of ['east','west']){
   const label=(weapon===32?'reliquia-32-':'bussola-16-')+direction;
   const show=(name,kit)=>observeAttack('attack-focus',label+'-'+name,direction,kit);
   const original=await show('conjunto',start);
   await captureMapCycle('attack-focus',start,label,8,direction);
   for(const [slot,ids] of Object.entries(wardrobe)){
    for(const item of ids.filter(k=>k!==start[slot])){
     await put(item);const step=await show(slot+'-'+item,{...start,[slot]:item});
     for(const other of Object.keys(start).filter(k=>k!==slot))
      assert.deepEqual(step.visual.coverage[0].slotRoutes[other],original.visual.coverage[0].slotRoutes[other]);
    }
    await remove(slot);const rest={...start};delete rest[slot];await show(slot+'-retirado',rest);
    await put(start[slot]);const back=await show(slot+'-restaurado',start);
    assert.deepEqual(back.visual.coverage[0].slotRoutes,original.visual.coverage[0].slotRoutes);
   }
  }
  assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
 }
 async function observeFocusSleeves(scepter=false){
  const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  // Each case samples a distinct contact geometry. The two directions and the six coat IDs are covered.
  for(const [weapon,direction,first,second] of (scepter?[[121,'east',6,151],[121,'west',172,158]]:[[31,'east',6,130],[32,'west',7,144],[17,'east',137,172]])){
   const fixed={weapon,head:19,gloves:159,boots:148,legs:168},role=weapons.find(w=>w.id===weapon).role;
   const look={gender:'masculino',skinColor:weapon===31?'light':'ebony',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(fixed),first,second],look});
   for(const id of Object.values(fixed))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const label='mangas-perfil-'+weapon+'-'+direction,show=(key,gear)=>observeAttack('attack-focus',label+'-'+key,direction,gear);
   const before=await show('sem-casaco',fixed);let signature;
   for(const [step,id] of [first,second,first].entries()){
    await put(id);const gear={...fixed,coat:id},sample=await show('troca-'+step,gear),routes=sample.visual.coverage[0].slotRoutes;
    for(const key of Object.keys(fixed))assert.deepEqual(routes[key],before.visual.coverage[0].slotRoutes[key]);
    if(step===0)signature=routes;if(step===2)assert.deepEqual(routes,signature);
    if(step<2)await captureMapCycle('attack-focus',gear,label+'-'+id,8,direction);
   }
   await remove('coat');assert.deepEqual((await show('retirada',fixed)).visual.coverage[0].slotRoutes,before.visual.coverage[0].slotRoutes);
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeWeaponGloves(kind){
  const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  const staffPants=kind==='staffPants',coat=kind==='coat',pants=kind==='pants'||staffPants,slot=coat?'coat':pants?'legs':'gloves',items=gear[coat?0:pants?1:3],firstItem=coat?151:pants?168:152;
  const front=coat||pants&&!staffPants||kind==='gauntlet',swords=kind==='sword',action=front?'attack-unarmed':swords?'attack-sword':kind==='daggers'?'attack-daggers':'attack-focus',family={sword:'espada',orb:'orbe',staff:'cajado',staffPants:'cajado',daggers:'adaga',gauntlet:'manopla',coat:'punho',pants:'punho'}[kind];
  for(const weapon of staffPants?[31,123,124,125,126,127]:pants?[2,3,14,110]:front?[2,3,14,110,111,118,119,120]:swords?weapons.filter(w=>w.role==='sword').map(w=>w.id):kind==='orb'?[17,122]:kind==='daggers'?weapons.filter(w=>w.role==='rogue').map(w=>w.id):[31,123,124,125,126,127,128]){
   const role=weapons.find(w=>w.id===weapon).role,dark=weapon%2===0;
   const look={gender:'masculino',skinColor:dark?'ebony':'light',hairColor:dark?'blue':'brown',eyeColor:dark?'green':'brown'};
   const fixed={weapon,...(pants?{coat:151,gloves:152}:coat?{gloves:152,...([111,118,119,120].includes(weapon)?{legs:168}:{})}:front?{}:{coat:151}),boots:169,head:19},equipment=Object.values(fixed);
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...equipment,...items],look});
   for(const item of dark?equipment:equipment.reverse())await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   for(const direction of front?['south']:['east','west']){
    const label=(coat?'peitorais-':pants?'calcas-':'luvas-')+family+'-'+weapon+'-'+direction,show=(name,eq)=>observeAttack(action,label+'-'+name,direction,eq);
    const before=await show('sem-'+slot,fixed);let first;
    for(const id of [firstItem,...items.filter(id=>id!==firstItem),firstItem]){
     await put(id);const kit={...fixed,[slot]:id},step=await show(slot+'-'+id+(first&&id===firstItem?'-retorno':''),kit);
     for(const key of Object.keys(fixed))assert.deepEqual(before.visual.coverage[0].slotRoutes[key],step.visual.coverage[0].slotRoutes[key]);
     if(id===firstItem){if(first)assert.deepEqual(step.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
      else{first=step;await captureMapCycle(action,kit,label,front?12:8,direction);}}
    }
    await remove(slot);assert.deepEqual((await show('retirada',fixed)).visual.coverage[0].slotRoutes,before.visual.coverage[0].slotRoutes);
   }
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeSouthFocusClothes(families=[[31,144,137],[17,151,179]]){
  const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  for(const [weapon,coat,other] of families){
   const fixed={weapon,legs:168,head:136,boots:148},role=weapons.find(w=>w.id===weapon).role;
   const look={gender:'masculino',skinColor:weapon===31?'ebony':'light',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(fixed),coat,other,25,159],look});
   for(const id of Object.values(fixed))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,prefix='roupa-gesto-sul-'+weapon;
   await put(coat);await put(25);const firstGear={...fixed,coat,gloves:25},show=(name,eq)=>observeAttack('attack-focus',prefix+'-'+name,'south',eq);
   const first=await show('inicio',firstGear);await captureMapCycle('attack-focus',firstGear,prefix+'-inicio',8,'south');
   await put(159);await put(other);const second=await show('troca',{...fixed,coat:other,gloves:159});
   for(const slot of Object.keys(fixed))assert.deepEqual(first.visual.coverage[0].slotRoutes[slot],second.visual.coverage[0].slotRoutes[slot]);
   await captureMapCycle('attack-focus',{...fixed,coat:other,gloves:159},prefix+'-troca',8,'south');
   await remove('coat');await remove('gloves');await show('retirada',fixed);
   await put(25);await put(coat);assert.deepEqual((await show('retorno',firstGear)).visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeNorthStaffWardrobe(){
  const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  for(const [weapon,coat,next] of [[123,6,172],[126,130,151],[128,179,137]]){
   const fixed={weapon,legs:168,boots:148,head:19},role=weapons.find(w=>w.id===weapon).role;
   const look={gender:'masculino',skinColor:weapon===126?'light':'ebony',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({role,look,ids})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,look,ids:[...Object.values(fixed),coat,next,25,159]});
   for(const id of Object.values(fixed))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const first={...fixed,coat,gloves:25},second={...fixed,coat:next,gloves:159},tag='cajado-norte-'+weapon;
   const show=(eq,name)=>observeAttack('attack-focus',tag+'-'+name,'north',eq);
   await put(coat);await put(25);const a=await show(first,'vestido');
   await captureMapCycle('attack-focus',first,tag+'-vestido',9,'north');
   await put(159);await put(next);const b=await show(second,'troca');
   for(const k of Object.keys(fixed))assert.deepEqual(a.visual.coverage[0].slotRoutes[k],b.visual.coverage[0].slotRoutes[k]);
   await captureMapCycle('attack-focus',second,tag+'-troca',9,'north');
   await remove('coat');await remove('gloves');await show(fixed,'retirada');
   await put(25);await put(coat);assert.deepEqual((await show(first,'retorno')).visual.coverage[0].slotRoutes,a.visual.coverage[0].slotRoutes);
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeFocusTrousers(boots=false){
  const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
  const slot=boots?'boots':'legs',items=gear[boots?2:1],prefix=boots?'foco-sola-':'foco-cintura-';
  for(const weapon of [16,17,31,32,121,122]){
   const role=weapons.find(w=>w.id===weapon).role,dark=weapon%2===0;
   const look={gender:'masculino',skinColor:dark?'ebony':'light',hairColor:dark?'blue':'white',eyeColor:dark?'green':'amber'};
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[weapon,136,...items,...(boots?[168]:[])],look});
   if(dark){await put(weapon);await put(136);}else{await put(136);await put(weapon);}
   if(boots)await put(168);
   const fixed={weapon,head:136,...(boots?{legs:168}:{})},show=(label,eq)=>observeAttack('attack-focus',prefix+weapon+'-'+label,'south',eq);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const start=await show(boots?'sem-botas':'sem-calca',fixed);let first;
   for(const item of [...items,items[0]]){
    await put(item);const kit={...fixed,[slot]:item},step=await show(slot+'-'+item+(first&&item===items[0]?'-retorno':''),kit);
    for(const key of Object.keys(fixed))assert.deepEqual(start.visual.coverage[0].slotRoutes[key],step.visual.coverage[0].slotRoutes[key]);
    if(item===items[0]){if(first)assert.deepEqual(first.visual.coverage[0].slotRoutes,step.visual.coverage[0].slotRoutes);
     else{first=step;await captureMapCycle('attack-focus',kit,prefix+weapon,8,'south');}}
   }
   await remove(slot);assert.deepEqual((await show('retirada',fixed)).visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
   assert.deepEqual(saved,(await page.evaluate(()=>__hdSlotQA.read())).appearance);
  }
 }
 async function observeSouthForearmTrousers(){
  const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs'),pants=gear[1],action='attack-unarmed';
  for(const weapon of [111,118,119,120]){
   const role=weapons.find(w=>w.id===weapon).role,dark=weapon===111||weapon===119;
   const look={gender:'masculino',skinColor:dark?'ebony':'light',hairColor:dark?'blue':'white',eyeColor:dark?'green':'amber'};
   const fixed={weapon,head:136,boots:148};
   await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(fixed),...pants],look});
   for(const item of dark?Object.values(fixed):Object.values(fixed).reverse())await put(item);
   const show=(label,eq)=>observeAttack(action,'cintura-sul-'+weapon+'-'+label,'south',eq);
   const start=await show('inicio',fixed),saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;let first;
   for(const id of [...pants,pants[0]]){
    const kit={...fixed,legs:id};await put(id);const sample=await show('calca-'+id+(first&&id===pants[0]?'-restaurada':''),kit);
    for(const slot of Object.keys(fixed))assert.deepEqual(sample.visual.coverage[0].slotRoutes[slot],start.visual.coverage[0].slotRoutes[slot]);
    if(id===pants[0]){if(first)assert.deepEqual(sample.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
     else{first=sample;await captureMapCycle(action,kit,'cintura-sul-'+weapon,12,'south');}}
   }
   await remove('legs');assert.deepEqual((await show('retirada',fixed)).visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeSouthPunchHelmets(weapons=[2,3,14,110]){
  const ids=[19,18,129,136,143,150,157,164,171,178],shoes=[8,9,134,141,148,155,162,169,176,183],action='attack-unarmed';
  for(const weapon of weapons){
   const role=require('../tools/audit-hd-wardrobe-product.cjs').weapons.find(w=>w.id===weapon).role,look={gender:'masculino',skinColor:weapon===110?'light':'ebony',hairColor:weapon===110?'black':'blue',eyeColor:weapon===110?'blue':'green'};
   await page.evaluate(({role,weapon,ids,shoes,look})=>__hdSlotQA.seedWardrobe(role,[weapon,...ids,...shoes],look),{role,weapon,ids,shoes,look});
   const show=(label,gear)=>observeAttack(action,'punho-sul-'+weapon+'-'+label,'south',gear);
   await put(weapon);const initial=await show('sem-capacete',{weapon});
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;let first;
   for(const id of [...ids,ids[0]]){
    await put(id);const state=await show('cabeca-'+id+(first&&id===ids[0]?'-retorno':''),{weapon,head:id});
    assert.deepEqual(state.visual.coverage[0].slotRoutes.weapon,initial.visual.coverage[0].slotRoutes.weapon);
    if(id===ids[0]){
     if(first)assert.deepEqual(state.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
     else{first=state;await captureMapCycle(action,{weapon,head:id},'punho-sul-'+weapon,12,'south');}
    }
   }
   for(const hide of [true,false]){
    await menu();await page.locator('[data-headgear-visibility]').click();await close();
    const sample=await show(hide?'oculto':'visivel',hide?{weapon}:{weapon,head:19});
    assert.deepEqual(sample.visual.coverage[0].slotRoutes,(hide?initial:first).visual.coverage[0].slotRoutes);
   }
   await put(148);
   const dressed=await show('botas-e-capacete',{weapon,head:19,boots:148});
   await captureMapCycle(action,{weapon,head:19,boots:148},'punho-sul-vestido-'+weapon,12,'south');
   for(const boots of shoes){
    await put(boots);const step=await show('bota-'+boots,{weapon,head:19,boots});
    assert.deepEqual(step.visual.coverage[0].slotRoutes.head,dressed.visual.coverage[0].slotRoutes.head);
   }
   await remove('boots');
   await remove('weapon');await show('sem-arma',{head:19});await put(weapon);
   assert.deepEqual((await show('arma-restaurada',{weapon,head:19})).visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeLateralGauntlet(weapon,directions=['east','west'],alternate=false){
  const initial={weapon,coat:6,legs:22,boots:148,gloves:159,head:157};
  const swaps={coat:179,legs:175,boots:8,gloves:25,head:19};
  for(const direction of directions){
   const dark=direction==='east'||alternate,tag=direction+(alternate?'-segunda-aparencia':'');
   const look=dark?{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'}:
    {gender:'masculino',skinColor:'light',hairColor:'white',eyeColor:'amber'};
   const ids=[...Object.values(initial),...Object.values(swaps)];
   await page.evaluate(({ids,look,role})=>__hdSlotQA.seedWardrobe(role,ids,look),{ids,look,role:weapon===118||weapon===119?'cyborg':'brawler'});
   for(const item of (dark?Object.values(initial):Object.values(initial).reverse()))await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const show=(label,kit)=>observeAttack('attack-unarmed','punho-'+tag+'-'+label,direction,kit);
   const start=await show('inicial',initial);
   await captureMapCycle('attack-unarmed',initial,'punho-'+tag,8,direction);
   for(const [slot,id] of Object.entries(swaps)){
    await put(id);const switched=await show(slot,{...initial,[slot]:id});
    for(const name of Object.keys(initial).filter(k=>k!==slot))
     assert.deepEqual(switched.visual.coverage[0].slotRoutes[name],start.visual.coverage[0].slotRoutes[name]);
    await put(initial[slot]);const back=await show(slot+'-restaurado',initial);
    assert.deepEqual(back.visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
   }
   await remove('weapon');const cloth={...initial};delete cloth.weapon;await show('sem-arma',cloth);
   await put(weapon);const back=await show('arma-restaurada',initial);
   assert.deepEqual(back.visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeNorthFocusClothing(slot){
  const catalog=require('../tools/audit-hd-wardrobe-product.cjs');
  const [index,family,piece]={gloves:[3,'luvas','luva'],legs:[1,'calcas','calca'],coat:[0,'peitorais','peitoral']}[slot];
  const items=catalog.gear[index];
  for(const weapon of [16,17,31,32,121,122]){
   const role=catalog.weapons.find(w=>w.id===weapon).role,gear={weapon,head:19,boots:148,...(slot!=='coat'?{coat:151}:{}),...(slot!=='legs'?{legs:168}:{}),...(slot==='coat'?{gloves:159}:{})};
   const look={gender:'masculino',skinColor:weapon%2?'ebony':'light',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({role,gear,items,look})=>__hdSlotQA.seedWardrobe(role,[...Object.values(gear),...items],look),{role,gear,items,look});
   for(const item of Object.values(gear))await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const label=family+'-foco-norte-'+weapon,show=(name,equipment)=>observeAttack('attack-focus',label+'-'+name,'north',equipment);
   const bare=await show('inicial',gear);let first;
   for(const item of [...items,items[0]]){
    await put(item);const kit={...gear,[slot]:item};
    const now=await show(piece+'-'+item+(first&&item===items[0]?'-retorno':''),kit);
    for(const key of Object.keys(gear))assert.deepEqual(now.visual.coverage[0].slotRoutes[key],bare.visual.coverage[0].slotRoutes[key]);
    if(item===items[0]){
     if(first)assert.deepEqual(now.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
     else{first=now;await captureMapCycle('attack-focus',kit,label,8);}
    }
   }
   await remove(slot);const restored=await show('retirar',gear);assert.deepEqual(restored.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeNorthFocusCoats(articulated,focusOrbs){
  const ids=[151,158,165,179],look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  for(const weapon of focusOrbs?[16,17,31,32,121,122]:articulated?[67,70,110]:[123,124,125,126,127]){
   const sword=weapon===67||weapon===70,role=require('../tools/audit-hd-wardrobe-product.cjs').weapons.find(w=>w.id===weapon).role;
   const attack=sword?'attack-sword':weapon===110?'attack-unarmed':'attack-focus';
   const gear=sword||focusOrbs?{weapon,head:19,boots:148}:{weapon};
   await page.evaluate(({role,gear,ids,look})=>__hdSlotQA.seedWardrobe(role,[...Object.values(gear),...ids],look),{role,gear,ids,look});
   for(const item of Object.values(gear))await put(item);const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const show=(name,equipment)=>observeAttack(attack,(focusOrbs?'foco-':articulated?'arma-':'cajado-')+weapon+'-'+name,'north',equipment);
   const bare=await show('antes',gear);let first;
   for(const coat of [...ids,151]){
    await put(coat);
    const now=await show('peitoral-'+coat+(first&&coat===151?'-retorno':''),{...gear,coat});
    for(const slot of Object.keys(gear))assert.deepEqual(now.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
    if((articulated||focusOrbs)&&coat===151&&!first)await captureMapCycle(attack,{...gear,coat},(focusOrbs?'foco-':'arma-')+weapon,8);
    if(coat===151){if(first)assert.deepEqual(now.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);else first=now;}
   }
   await remove('coat');const restored=await show('depois',gear);
   assert.deepEqual(restored.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeNorthRifleClothes(){
  for(const [k,weapon] of [4,5,113,115,116].entries()){
   const kit={weapon,legs:168,boots:148,head:19,coat:151,gloves:159},look={gender:'masculino',hairColor:'blue',eyeColor:'green',skinColor:k%2?'ebony':'light'};
   await page.evaluate(({kit,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),25,7],look),{kit,look});
   for(const item of Object.values(kit))await put(item);
   const before=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const shot=(tag,gear)=>observeAttack('attack-firearm','rifle-norte-'+weapon+'-'+tag,'north',gear);
   const dressed=await shot('conjunto',kit);
   await captureMapCycle('attack-firearm',kit,'rifle-norte-'+weapon,3);
   await put(7);await put(25);
   const change=await shot('duas-trocas',{...kit,coat:7,gloves:25});
   for(const s of ['weapon','head','legs','boots'])assert.deepEqual(change.visual.coverage[0].slotRoutes[s],dressed.visual.coverage[0].slotRoutes[s]);
   await remove('coat');const {coat,...open}=kit;
   await shot('sem-peitoral',{...open,gloves:25});
   await put(159);await put(151);const restored=await shot('retorno',kit);
   assert.deepEqual(restored.visual.coverage[0].slotRoutes,dressed.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,before);
  }
 }
 async function observeRifleProfileClothes(weapons){
  for(const weapon of weapons)for(const direction of ['east','west']){
   const look={gender:'masculino',skinColor:direction==='east'?'light':'ebony',hairColor:'blue',eyeColor:'green'},kit={weapon,legs:168,boots:148,head:19,coat:130,gloves:159};
   await page.evaluate(({kit,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),25,151,21],look),{kit,look});
   for(const id of Object.values(kit))await put(id);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,label='rifle-perfil-'+weapon+'-'+direction;
   const shoot=(tag,eq)=>observeAttack('attack-firearm',label+'-'+tag,direction,eq);
   const first=await shoot('conjunto',kit);await captureMapCycle('attack-firearm',kit,label,8,direction);
   await put(151);await put(25);await put(21);const changed=await shoot('trocas',{...kit,coat:151,gloves:25,legs:21});
   for(const s of ['head','boots','weapon'])assert.deepEqual(first.visual.coverage[0].slotRoutes[s],changed.visual.coverage[0].slotRoutes[s]);
   await remove('coat');const {coat,...open}=kit;
   await shoot('retirada',{...open,gloves:25,legs:21});
   await put(159);await put(168);await put(130);const after=await shoot('retorno',kit);
   assert.deepEqual(after.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeSouthFirearmLegs(weapons){
  for(const weapon of weapons){
   const kit={weapon,legs:168,boots:176},look={gender:'masculino',skinColor:weapon%2?'light':'ebony',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({kit,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),21,148],look),{kit,look});
   for(const item of Object.values(kit))await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,label='pernas-disparo-sul-'+weapon;
   const shoot=(tag,eq)=>observeAttack('attack-firearm',label+'-'+tag,'south',eq);
   const first=await shoot('equipado',kit);
   await captureMapCycle('attack-firearm',kit,label,weapon===116?5:weapon===5?10:8,'south');
   await put(148);await put(21);await shoot('trocas',{weapon,legs:21,boots:148});
   await remove('boots');const onlyPants=await shoot('sem-bota',{weapon,legs:21});
   assert.equal(onlyPants.visual.coverage[0].slotRoutes.legs.item,21);
   await put(176);await put(168);const last=await shoot('retorno',kit);
   assert.deepEqual(last.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observeSouthRifleArms(weapons){
  for(const weapon of weapons){
   const kit={weapon,coat:130,gloves:159,legs:168,boots:176,head:19},look={gender:'masculino',skinColor:weapon%2?'light':'ebony',hairColor:'blue',eyeColor:'green'};
   await page.evaluate(({kit,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),6,25],look),{kit,look});
   for(const item of Object.values(kit))await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,label='vestuario-disparo-sul-'+weapon;
   const shoot=(tag,eq)=>observeAttack('attack-firearm',label+'-'+tag,'south',eq);
   const first=await shoot('equipado',kit);await captureMapCycle('attack-firearm',kit,label,weapon===5?10:weapon===116?5:8,'south');
   await put(25);await put(6);const swapped=await shoot('trocas',{...kit,coat:6,gloves:25});
   for(const slot of ['legs','boots','weapon','head'])assert.deepEqual(swapped.visual.coverage[0].slotRoutes[slot],first.visual.coverage[0].slotRoutes[slot]);
   await remove('coat');const {coat,...noCoat}=kit;await shoot('sem-peitoral',{...noCoat,gloves:25});
   await put(130);await put(159);const after=await shoot('retorno',kit);
   assert.deepEqual(first.visual.coverage[0].slotRoutes,after.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observePistolWardrobe(){
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  const action='attack-firearm';
  for(const direction of ['north','east','west']){
   const initial={weapon:114,coat:151,head:19,gloves:25,legs:168,boots:148};
   await page.evaluate(({initial,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(initial),137,159,22,176],look),{initial,look});
   const ids=Object.values(initial);if(direction==='west')ids.reverse();
   for(const item of ids)await put(item);
   const name='pistolas114-'+direction,first=await observeAttack(action,name+'-vestido',direction,initial);
   await captureMapCycle(action,initial,name,8,direction);
   let kit={...initial};
   for(const [slot,id] of [['legs',22],['boots',176],['coat',137],['gloves',159]]){
    const prev=await page.evaluate(()=>__hdSlotQA.read());
    await put(id);kit={...kit,[slot]:id};
    const state=await observeAttack(action,name+'-'+slot,direction,kit);
    for(const [s,p] of Object.entries(state.visual.coverage[0].slotRoutes))assert.equal(p.item,kit[s]);
    assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,prev.appearance);
   }
   await remove('boots');delete kit.boots;await observeAttack(action,name+'-sem-botas',direction,kit);
   for(const slot of ['gloves','coat','legs','boots'])await put(initial[slot]);
   const back=await observeAttack(action,name+'-retorno',direction,initial);
   assert.deepEqual(first.visual.coverage[0].slotRoutes,back.visual.coverage[0].slotRoutes);
  }
 }
 async function observeOriginalFirearmHeads(weapon,direction){
  const kit=weapon===116?{weapon,legs:168,boots:148,head:18}:{weapon,legs:21,boots:9,gloves:25,head:18};
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  await page.evaluate(({kit,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),19],look),{kit,look});
  for(const item of Object.values(kit))await put(item);
  const label='cabeca-original-'+weapon+'-'+direction,shoot=(tag,eq)=>observeAttack('attack-firearm',label+'-'+tag,direction,eq);
  const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance,first=await shoot('equipado',kit);
  await captureMapCycle('attack-firearm',kit,label,weapon===116?5:8,direction);
  await put(19);await shoot('outra-cabeca',{...kit,head:19});
  await remove('head');const {head,...open}=kit;await shoot('retirada',open);
  await put(18);const ret=await shoot('retorno',kit);assert.deepEqual(ret.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
  assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
 }
 async function observeNorthRifleHelmets(){
  const heads=[18,19,129,136,143,150,157,164,171,178],look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  for(const weapon of [4,5,113,115,116]){
   const gear={weapon,legs:140,boots:176};
   await page.evaluate(({gear,heads,look})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(gear),...heads],look),{gear,heads,look});
   for(const item of Object.values(gear))await put(item);
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   const shoot=(label,visible)=>observeAttack('attack-firearm','rifle-'+weapon+'-'+label,'north',visible);
   const clean=await shoot('antes-do-chapeu',gear);
   let first;
   for(const head of [...heads,18]){
    await put(head);
    const next=await shoot('cabeca-'+head+(first&&head===18?'-retorno':''),{...gear,head});
    for(const slot of Object.keys(gear))assert.deepEqual(next.visual.coverage[0].slotRoutes[slot],clean.visual.coverage[0].slotRoutes[slot]);
    if(head===18){if(first)assert.deepEqual(next.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);else first=next;}
   }
   for(const hide of [true,false]){
    await menu();await page.locator('[data-headgear-visibility]').click();await close();
    const toggled=await shoot(hide?'oculto':'visivel',hide?gear:{...gear,head:18});
    assert.deepEqual(toggled.visual.coverage[0].slotRoutes,(hide?clean:first).visual.coverage[0].slotRoutes);
    const state=await page.evaluate(()=>__hdSlotQA.read());assert.equal(state.equipment.head,18);assert.equal(state.hideHead,hide);assert.deepEqual(state.appearance,saved);
   }
   await remove('head');const last=await shoot('depois-do-chapeu',gear);
   assert.deepEqual(last.visual.coverage[0].slotRoutes,clean.visual.coverage[0].slotRoutes);
  }
 }
 async function observeNorthTrousers(){
  const ids=[21,22,133,140,147,154,161,168,175,182],shoes=[8,9,134,141,148,155,162,169,176,183],look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  for(const weapon of [4,5,113,115,116]){
   await page.evaluate(({weapon,ids,shoes,look})=>__hdSlotQA.seedWardrobe('gunner',[weapon,...ids,...shoes],look),{weapon,ids,shoes,look});
   await put(weapon);const start=await observeAttack('attack-firearm','rifle-'+weapon+'-sem-calca','north',{weapon});
   const saved=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
   await put(176);let initial;
   for(const legs of [...ids,21]){
    await put(legs);
    const scene=await observeAttack('attack-firearm','rifle-'+weapon+'-calca-'+legs+(initial&&legs===21?'-retorno':''),'north',{weapon,legs,boots:176});
    assert.deepEqual(scene.visual.coverage[0].slotRoutes.weapon,start.visual.coverage[0].slotRoutes.weapon);
    if(legs===21){if(initial)assert.deepEqual(scene.visual.coverage[0].slotRoutes,initial.visual.coverage[0].slotRoutes);else initial=scene;}
   }
   await put(22);let firstBoot;
   for(const boots of [...shoes,8]){
    await put(boots);
    const scene=await observeAttack('attack-firearm','rifle-'+weapon+'-bota-'+boots+(firstBoot&&boots===8?'-retorno':''),'north',{weapon,legs:22,boots});
    if(firstBoot)assert.deepEqual(scene.visual.coverage[0].slotRoutes.legs,firstBoot.visual.coverage[0].slotRoutes.legs);
    if(boots===8){if(firstBoot)assert.deepEqual(scene.visual.coverage[0].slotRoutes,firstBoot.visual.coverage[0].slotRoutes);else firstBoot=scene;}
   }
   await remove('boots');await observeAttack('attack-firearm','rifle-'+weapon+'-apenas-calca','north',{weapon,legs:22});
   await remove('legs');const off=await observeAttack('attack-firearm','rifle-'+weapon+'-calca-retirada','north',{weapon});
   assert.deepEqual(off.visual.coverage[0].slotRoutes,start.visual.coverage[0].slotRoutes);
   assert.deepEqual((await page.evaluate(()=>__hdSlotQA.read())).appearance,saved);
  }
 }
 async function observePistolClothes(){
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'};
  const kit={weapon:114,legs:21,boots:9,gloves:25};
  await page.evaluate(({look,kit})=>__hdSlotQA.seedWardrobe('gunner',[...Object.values(kit),22,151,158,165,179],look),{look,kit});
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
  const north=await observeAttack('attack-firearm','pistolas-114-sem-peitoral-north','north',kit);
  let first;
  for(const coat of [151,158,165,179,151]){
   await put(coat);
   const current=await observeAttack('attack-firearm','pistolas-114-peitoral-'+coat+(first&&coat===151?'-retorno':''),'north',{...kit,coat});
   for(const slot of ['weapon','legs','boots','gloves'])assert.deepEqual(current.visual.coverage[0].slotRoutes[slot],north.visual.coverage[0].slotRoutes[slot]);
   if(coat===151){if(first)assert.deepEqual(current.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);else first=current;}
  }
  await remove('coat');
  const removed=await observeAttack('attack-firearm','pistolas-114-sem-peitoral-retorno','north',kit);
  assert.deepEqual(removed.visual.coverage[0].slotRoutes,north.visual.coverage[0].slotRoutes);
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
 async function observeAttack(resolvedAction,label,direction='south',expected={},save=true){
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
  if(save&&Object.keys(expected).length)await page.screenshot({path:path.join(out,label+'.png')});
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
