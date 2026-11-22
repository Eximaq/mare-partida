'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const root=p.resolve(process.argv[2]||p.join(__dirname,'../dist')),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const overrides=process.env.KAIZOKU_WORLD_TEST_SOURCE;
const run=f=>{
 const name=p.basename(f),copy=overrides&&/^(?:player-rework-(?:native-hd|sword0-checkpoint|modular-outfits-hd)|paper-doll-96-lobby)\.js$/.test(name)
  ?p.join(overrides,name):f;
 return vm.runInThisContext(fs.readFileSync(copy,'utf8'),{filename:f});
};
global.window=global;
global.ImageData=cv.ImageData;
global.OffscreenCanvas=function(w,h){return cv.createCanvas(w,h);};
global.fetch=async u=>{
 const file=pathFor(u);
 if(!fs.existsSync(file))return {ok:false,status:404};
 return {ok:true,json:async()=>JSON.parse(fs.readFileSync(file)),arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(file)).buffer};
};
global.document={createElement(tag){
 if(tag==='canvas')return cv.createCanvas(1,1);
 if(tag==='script')return {};
 throw Error(tag);
},head:{append(s){try{run(pathFor(s.src));s.onload();}catch(e){console.error(e);s.onerror();}}}};
global.Image=class LocalImage extends cv.Image{
 set src(u){if(String(u).startsWith('blob:'))this.blobURL=u;else super.src=fs.readFileSync(pathFor(u));}
 async decode(){if(this.blobURL){const blob=require('node:buffer').resolveObjectURL(this.blobURL);super.src=Buffer.from(await blob.arrayBuffer());}return super.decode();}
};
// Load the same item catalog and systems that the game's index supplies before
// preparing its first World request; the renderer must use exact ItemDef types.
for(const [globalName,file] of [
 ['MareItemCatalog','item-catalog'],['MareForge','forge-system'],['MarePrison','prison-system'],
 ['MareHaki','haki-system'],['MareAkuma','akuma-system'],['MareHakiProgression','haki-progression'],['MareBossDungeons','boss-dungeon-system']
])global[globalName]=require('../'+file+'.js');
const scripts=[...fs.readFileSync(p.join(root,'index.html'),'utf8').matchAll(/<script[^>]* src="([^"]+)"/g)].map(x=>x[1]).filter(f=>/^(?:player-rework-|paper-doll-96-lobby|character-appearance|headgear-visibility|native-head-compat|tools\/rework-accessories\/vendor)/.test(f));
for(const s of scripts)run(pathFor(s));

(async()=>{
 const c=MarePaperDoll96Lobby.create({baseURL:uri});
 await c.ready;assert.equal(c.snapshot().state,'ready');
 const appearance96=MareCharacterAppearance.normalize({gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm',skinColor:'ebony'});
 const options=(action,direction)=>({action,direction,x:200,y:230,consumer:'world'});
 const actor=(classId,equipment)=>({classId,appearance96,equipment:{weapon:null,coat:null,legs:null,boots:null,gloves:null,head:null,...equipment}});
 const probe=async (pl,o,expected)=>{
  const saved=JSON.stringify(pl);
  c.requestWorldVisual(pl,o);
  const deadline=Date.now()+30000;
  while(c.worldVisual()?.state==='loading'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));
  assert(c.worldReady(pl),JSON.stringify(c.worldVisual()));
  const hit=c.worldVisual().coverage[0];if(process.env.WORLD_TEST_TRACE)console.log(JSON.stringify({weapon:pl.equipment.weapon?.def,hit}));assert.equal(hit.action,o.action);assert.equal(hit.direction,o.direction);
  assert.deepEqual(hit.omitted??[],[]);
  if(expected) expected(hit);
  const frames=[];
  for(let i=0;i<40;i++){
   const cvx=cv.createCanvas(400,360),ctx=cvx.getContext('2d');
   assert(c.drawWorldVisual(ctx,{...o,progress:(i+.25)/40},pl));
   const rgba=Buffer.from(ctx.getImageData(0,0,400,360).data);
   assert(rgba.some(v=>v!==0));frames.push(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));cvx.width=1;
  }
  assert.equal(JSON.stringify(pl),saved);
  c.clearWorldVisual();global.gc?.();
  return frames;
 };
 async function proveNewIndependentSlots(){
  const gait=(role,def,extra)=>({...actor(role,{weapon:{def},...extra}),
   appearance96:MareCharacterAppearance.normalize({gender:'feminino',skinColor:'light',hairStyle:'original',eyeColor:'blue',hairColor:'black'})});
  for(const test of [
   {role:'brawler',def:112,action:'walk',dir:'north',base:{coat:{def:6}},slot:'legs',item:140,kept:'coat'},
   {role:'cyborg',def:14,action:'idle',dir:'north',base:{},slot:'gloves',item:25},
   {role:'cyborg',def:14,action:'walk',dir:'north',base:{},slot:'gloves',item:25},
   {role:'gunner',def:4,action:'walk',dir:'south',base:{},slot:'boots',item:9},
   {role:'gunner',def:4,action:'walk',dir:'north',base:{},slot:'boots',item:155},
   {role:'cyborg',def:119,action:'walk',dir:'south',base:{},slot:'boots',item:176},
   {role:'gunner',def:5,action:'walk',dir:'east',base:{},slot:'boots',item:148},
   {role:'gunner',def:5,action:'walk',dir:'east',base:{},slot:'boots',item:162},
   {role:'sword',def:0,action:'walk',dir:'west',base:{},slot:'boots',item:8},
   {role:'sword',def:69,action:'idle',dir:'north',base:{},slot:'boots',item:8},
   {role:'sword',def:69,action:'idle',dir:'south',base:{},slot:'boots',item:148},
   {role:'sword',def:68,action:'idle',dir:'south',base:{},slot:'boots',item:148},
   {role:'gunner',def:114,action:'idle',dir:'north',base:{},slot:'boots',item:148},
   {role:'gunner',def:114,action:'idle',dir:'south',base:{},slot:'boots',item:9},
   {role:'brawler',def:3,action:'idle',dir:'north',base:{},slot:'boots',item:176},
   {role:'rogue',def:13,action:'idle',dir:'south',base:{},slot:'boots',item:141},
  ]){
   const o=options(test.action,test.dir),solo=gait(test.role,test.def,test.base);
   const dressed=gait(test.role,test.def,{...test.base,[test.slot]:{def:test.item}});
   const before=await probe(solo,o),after=await probe(dressed,o,hit=>{
    assert.equal(hit.slotRoutes.weapon.item,test.def);assert.equal(hit.slotRoutes[test.slot].item,test.item);
    if(test.kept)assert.equal(hit.slotRoutes[test.kept].item,test.base[test.kept].def);
   });
   assert.notDeepEqual(after,before);assert.deepEqual(await probe(solo,o),before);
  }
  console.log('PASS World female South boots, North pose gloves, coat and independent pants; equip/remove exact.');
 }
 if(process.env.KAIZOKU_WORLD_BRAWLER_OWN==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'light',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(def,coat)=>({...actor('brawler',{weapon:{def},coat:coat?{def:coat}:null}),appearance96});
  const check=hit=>{assert.equal(hit.frames,8);assert(!hit.source.startsWith('native96/'));};
  for(const direction of ['east','west']){
   const o={...options('attack-unarmed',direction),time:0};
   await probe(kit(110),o,check);
   const on=await probe(kit(111,151),o,check);
   assert.notDeepEqual(await probe(kit(111),o,check),on);
   assert.deepEqual(await probe(kit(111,151),{...o,action:'attack'},check),on);
  }
  console.log('PASS actual World own brawler weapons, mirrored West W110 and stable coat toggling');
  return;
 }
 if(process.env.KAIZOKU_WORLD_FEMALE_HEAD_EXTRA==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'});
  const kit=(role,def,item)=>({...actor(role,{weapon:{def},head:item?{def:item}:null}),appearance96});
  const check=hit=>assert(!hit.source.startsWith('native96/'),'must use the prepared HD source');
  for(const direction of ['east','west']){
   const o={...options('idle',direction),time:0};
   for(const [role,def] of [['rogue',12],['healer',125]]){
    const dressed=kit(role,def,129),base=kit(role,def);
    const before=await probe(dressed,o,check);
    assert.notDeepEqual(await probe(base,o,check),before);
    assert.deepEqual(await probe(dressed,o,check),before);
   }
  }
  console.log('PASS actual World same own H129 on genuine directions, head with two weapons and exact restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_CYBORG_OWN==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(legs)=>({...actor('cyborg',{weapon:{def:118},legs:legs?{def:legs}:null}),appearance96});
  for(const direction of ['east','west']){
   const o={...options('attack-unarmed',direction),time:0};
   const check=hit=>{assert.equal(hit.frames,8);assert.match(hit.source,/:own-p22:/);};
   const old=await probe(kit(22),o,check);
   assert.notDeepEqual(await probe(kit(undefined),o),old);
   assert.deepEqual(await probe(kit(22),o,check),old);
  }
  console.log('PASS actual World W118 native attack with independent pants removal/restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_FOCUS_OWN==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(coat)=>({...actor('healer',{weapon:{def:32},coat:coat?{def:coat}:null}),appearance96});
  for(const direction of ['east','west']){
   const o={...options('attack-focus',direction),time:0};
   const check=hit=>{assert.equal(hit.frames,8);assert.match(hit.source,/:saved-own-side/);};
   const a=await probe(kit(151),o,check);
   assert.notDeepEqual(await probe(kit(undefined),o,check),a);
   assert.deepEqual(await probe(kit(151),{...o,action:'attack'},check),a);
  }
  console.log('PASS actual World Relicario on both sides, own attack and coat removal/restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_BOOT_SIBLINGS==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  for(const [role,def,direction,action,boots,slot,item] of [
   ['brawler',2,'north','idle',8,'gloves',25],
   ['rogue',73,'north','attack-daggers',176,'legs',22],
   ['rogue',12,'south','attack-daggers',169,'legs',22]]){
   const o={...options(action,direction),time:0};
   const kit=(b,s)=>({...actor(role,{weapon:{def},boots:b?{def:b}:null,[slot]:s?{def:s}:null}),appearance96});
   const check=(b,s)=>hit=>{
    assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.boots?.item,b);assert.equal(hit.slotRoutes[slot]?.item,s);
   };
   const a=await probe(kit(boots,item),o,check(boots,item));
   assert.notDeepEqual(await probe(kit(boots),o,check(boots,undefined)),a);
   assert.notDeepEqual(await probe(kit(undefined,item),o,check(undefined,item)),a);
   assert.deepEqual(await probe(kit(boots,item),o,check(boots,item)),a);
  }
  console.log('PASS World boots rendered with independently equipped gloves and pants; exact removal/restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_DAGGER_SIDE_BOOTS==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'});
  const kit=(def,boots,gloves,legs)=>({...actor('rogue',{weapon:{def},boots:boots?{def:boots}:null,gloves:gloves?{def:gloves}:null,legs:legs?{def:legs}:null}),appearance96});
  for(const direction of ['east','west']){
   const o=options('attack-daggers',direction);
   const check=(def,boots,gloves,legs)=>hit=>{
    assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.boots?.item,boots);
    assert.equal(hit.slotRoutes.gloves?.item,gloves);assert.equal(hit.slotRoutes.legs?.item,legs);
   };
   const a=await probe(kit(12,8,159,22),o,check(12,8,159,22));
   assert.notDeepEqual(await probe(kit(74,8,159,22),{...o,action:'attack'},check(74,8,159,22)),a);
   for(const [b,g,l] of [[undefined,159,22],[8,undefined,22],[8,159,undefined]])
    assert.notDeepEqual(await probe(kit(12,b,g,l),o,check(12,b,g,l)),a);
   assert.deepEqual(await probe(kit(12,8,159,22),{...o,action:'skill'},check(12,8,159,22)),a);
  }
  console.log('PASS World original and reflected side boots coexist with independently equipped pants and gloves, weapon and removal restore exactly');
  return;
 }
 if(process.env.KAIZOKU_WORLD_DAGGER_GLOVE_SIBLINGS==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'});
  const kit=(def,g,l)=>({...actor('rogue',{weapon:{def},gloves:g?{def:g}:null,legs:l?{def:l}:null}),appearance96});
  for(const direction of ['east','west']){
   const o=options('attack-daggers',direction);
   const check=(def,g,l)=>hit=>{
    assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.gloves?.item,g);assert.equal(hit.slotRoutes.legs?.item,l);
   };
   const a=await probe(kit(72,131,22),o,check(72,131,22));
   assert.notDeepEqual(await probe(kit(74,131,22),{...o,action:'attack'},check(74,131,22)),a);
   assert.notDeepEqual(await probe(kit(72,131),o,check(72,131,undefined)),a);
   assert.notDeepEqual(await probe(kit(72,undefined,22),o,check(72,undefined,22)),a);
   assert.deepEqual(await probe(kit(72,131,22),{...o,action:'skill'},check(72,131,22)),a);
  }
  console.log('PASS World dagger glove and pants remain independent across both facings, swapping weapon and exact removal/restore');
  return;
 }
 if(process.env.KAIZOKU_WORLD_DAGGER_GLOVES==='1'){
  const selectLook=(skinColor,hairColor,hairStyle)=>MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairStyle,hairColor,eyeColor:'blue'});
  const kit=(def,g,appearance96)=>({...actor('rogue',{weapon:{def},gloves:g?{def:g}:null}),appearance96});
  for(const direction of ['east','west']){
   const o=options('attack-daggers',direction),first=kit(72,131,selectLook('light','black','original')),other=kit(74,131,selectLook('ebony','blue','hair-bob'));
   const check=w=>hit=>{assert.equal(hit.slotRoutes.weapon.item,w);assert.equal(hit.slotRoutes.gloves.item,131);assert.equal(hit.frames,8);};
   const a=await probe(first,o,check(72));
   assert.notDeepEqual(await probe(other,{...o,action:'attack'},check(74)),a);
   assert.notDeepEqual(await probe(kit(72,null,first.appearance96),o),a);
   assert.deepEqual(await probe(first,{...o,action:'skill'},check(72)),a);
  }
  console.log('PASS World own glove East/mirrored West after changing weapon and saved hair, exact restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_DAGGER_BOOTS==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(def,b)=>({...actor('rogue',{weapon:{def},boots:b?{def:b}:null}),appearance96});
  for(const [direction,def,boots] of [['north',73,176],['south',13,8],['north',74,176],['south',71,8]]){
   const native=options('attack-daggers',direction),base=kit(def),dressed=kit(def,boots);
   const a=await probe(base,native);
   const check=hit=>{assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.boots.item,boots);};
   const b=await probe(dressed,native,check);
   assert.notDeepEqual(a,b);assert.deepEqual(await probe(dressed,{...native,action:'attack'},check),b);
   assert.deepEqual(await probe(base,native),a);
  }
  console.log('PASS World new signed dagger boots and restoration in both directions');
  return;
 }
 if(process.env.KAIZOKU_WORLD_MALE_COAT_DEPTH==='1'){
  const o={...options('idle','north'),time:0},appearance96=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'light',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(role,def,c)=>({...actor(role,{weapon:{def},coat:c?{def:c}:null}),appearance96});
  for(const [role,def] of [['brawler',111],['healer',125]]){
   const base=kit(role,def),coat=kit(role,def,6),before=await probe(base,o),withCoat=await probe(coat,o,hit=>{
    assert.equal(hit.frames,1);assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.coat.item,6);
   });
   assert.notDeepEqual(withCoat,before);
   assert.deepEqual(await probe(base,o),before);
  }
  console.log('PASS World new male coat order and exact restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_ADDITIONAL_SLOTS==='1'){await proveNewIndependentSlots();return;}
 if(process.env.KAIZOKU_WORLD_SWORD_SIDE_P22==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(def,legs)=>({...actor('sword',{weapon:{def},legs:legs?{def:legs}:null}),appearance96});
  for(const direction of ['east','west']){
   const o=options('attack-sword',direction);
   const check=def=>hit=>{assert.equal(hit.frames,8);assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.legs.item,22);};
   const a=await probe(kit(0,22),o,check(0));
   assert.notDeepEqual(await probe(kit(69,22),{...o,action:'attack'},check(69)),a);
   assert.notDeepEqual(await probe(kit(0),o),a);
   assert.deepEqual(await probe(kit(0,22),{...o,action:'skill'},check(0)),a);
  }
  console.log('PASS World lateral own P22 with native cloth preservation, weapon swaps and exact restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_SWORD_FULL_LOWER==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(def,glove,b,legs)=>({...actor('sword',{weapon:{def},boots:b?{def:b}:null,gloves:glove?{def:glove}:null,legs:legs?{def:legs}:null}),appearance96});
  const native=options('attack-sword','north'),first=kit(68,131,148,22),second=kit(69,131,148,22);
  const check=(w,g,b,l)=>hit=>{
    assert.equal(hit.frames,8);assert.equal(hit.slotRoutes.weapon.item,w);
    assert.equal(hit.slotRoutes.gloves?.item,g);assert.equal(hit.slotRoutes.boots?.item,b);assert.equal(hit.slotRoutes.legs?.item,l);
  };
  const a=await probe(first,native,check(68,131,148,22));
  assert.notDeepEqual(await probe(second,{...native,action:'attack'},check(69,131,148,22)),a);
  assert.notDeepEqual(await probe(kit(68,131,148,undefined),native,check(68,131,148,undefined)),a);
  assert.notDeepEqual(await probe(kit(68,131,undefined,22),native,check(68,131,undefined,22)),a);
  assert.notDeepEqual(await probe(kit(68,undefined,148,22),native,check(68,undefined,148,22)),a);
  assert.deepEqual(await probe(first,{...native,action:'skill'},check(68,131,148,22)),a);
  console.log('PASS World exact A→B→A with independent gloves, boots and pants; every removal retained other slots');
  return;
 }
 if(process.env.KAIZOKU_WORLD_SWORD_GLOVE_BOOTS==='1'){
  const appearance96=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const kit=(def,glove,b)=>({...actor('sword',{weapon:{def},boots:b?{def:b}:null,gloves:glove?{def:glove}:null}),appearance96});
  for(const direction of ['north','south']){
   const bare=options('attack-sword',direction),first=kit(68,131,148),second=kit(69,180,148);
   const check=(w,g,b)=>hit=>{
    assert.equal(hit.frames,8);assert.equal(hit.slotRoutes.weapon.item,w);
    assert.equal(hit.slotRoutes.gloves?.item,g);assert.equal(hit.slotRoutes.boots?.item,b);
   };
   const a=await probe(first,bare,check(68,131,148));
   assert.notDeepEqual(await probe(second,{...bare,action:'attack'},check(69,180,148)),a);
   assert.notDeepEqual(await probe(kit(68,undefined,148),bare,check(68,undefined,148)),a);
   assert.notDeepEqual(await probe(kit(68,131,undefined),bare,check(68,131,undefined)),a);
   assert.deepEqual(await probe(first,{...bare,action:'skill'},check(68,131,148)),a);
  }
  console.log('PASS World glove and boot preserved through weapon/equipment swap and restoration');
  return;
 }
 if(process.env.KAIZOKU_WORLD_SWORD_BOOTS==='1'){
  const skin=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'original',hairColor:'black',eyeColor:'blue'});
  const p={...actor('sword',{weapon:{def:68},boots:{def:148}}),appearance96:skin};
  for(const direction of ['north','south']){
   const first={...p,equipment:{...p.equipment,weapon:{def:68}}},other={...p,equipment:{...p.equipment,weapon:{def:69}}};
   const check=(x,o)=>probe(x,o,r=>{
    assert.equal(r.frames,8);assert.equal(r.slotRoutes.boots.item,148);assert.equal(r.slotRoutes.weapon.item,x.equipment.weapon.def);
   });
   const f=await check(first,options('attack-sword',direction)),g=await check(other,options('attack',direction));
   assert.notDeepEqual(f,g);
   assert.deepEqual(await check(first,options('skill',direction)),f);
  }
  console.log('PASS World A→B→A sword swap with the same independently selected B148 on both directions');
  return;
 }

 const walk=options('walk','south'),noBoot=actor('cyborg',{weapon:{def:119}}),withBoot=actor('cyborg',{weapon:{def:119},boots:{def:183}});
 const A=await probe(noBoot,walk,hit=>assert.equal(hit.frames,8));
 const B=await probe(withBoot,walk,hit=>{assert.equal(hit.frames,40);assert.equal(hit.slotRoutes?.boots?.item,183);assert.equal(hit.slotRoutes?.weapon?.item,119);});
 assert.notDeepEqual(B,A);assert.deepEqual(await probe(noBoot,walk),A);
 const attack=options('attack','east'),bare=actor('sword',{weapon:{def:1}}),dressed=actor('sword',{weapon:{def:1},legs:{def:154}});
 const X=await probe(bare,attack),Y=await probe(dressed,attack,hit=>{
  assert(hit.source.includes('154'),JSON.stringify(hit));
  assert.equal(hit.frames,8);
 });
 assert.notDeepEqual(X,Y);
 assert.deepEqual(await probe(dressed,options('attack-sword','east')),Y);
 assert.deepEqual(await probe(bare,attack),X);
 for(const [role,weapon,boot,ownAction] of [['rogue',73,148,'attack-daggers'],['sword',1,134,'attack-sword']]){
  const pl=actor(role,{weapon:{def:weapon}}), dressed=actor(role,{weapon:{def:weapon},boots:{def:boot}});
  const generic=options('attack','north'),before=await probe(pl,generic);
  const verify=hit=>{assert.equal(hit.frames,8);assert.equal(hit.slotRoutes?.boots?.item,boot);assert.equal(hit.slotRoutes?.weapon?.item,weapon);};
  const on=await probe(dressed,generic,verify);
  assert.notDeepEqual(on,before);
  assert.deepEqual(await probe(dressed,options(ownAction,'north'),verify),on);
  assert.deepEqual(await probe(pl,generic),before);
 }
 const signedAppearance=JSON.parse(fs.readFileSync(p.join(root,'tools/rework-sword0-checkpoint/sword-catalog.json'))).appearance96;
 for(const skinColor of ['light','ebony']){
  const save=(boots,gloves=null)=>({...actor('sword',{weapon:{def:1},legs:{def:22},boots:boots==null?null:{def:boots},gloves:gloves==null?null:{def:gloves}}),
   appearance96:MareCharacterAppearance.normalize({...signedAppearance,skinColor})});
  const o=options('attack','north'),panted=await probe(save(null),o);
  const pair=(boot)=>hit=>{assert.equal(hit.frames,8);assert.equal(hit.slotRoutes?.weapon?.item,1);
   assert.equal(hit.slotRoutes?.legs?.item,22);assert.equal(hit.slotRoutes?.boots?.item,boot);};
  const first=await probe(save(9),o,pair(9)),next=await probe(save(148),o,pair(148));
  assert.notDeepEqual(first,next);assert.notDeepEqual(panted,next);
  assert.deepEqual(await probe(save(148),options('attack-sword','north'),pair(148)),next);
  assert.deepEqual(await probe(save(null),o),panted);
  const mixed=await probe(save(8,26),o,hit=>{pair(8)(hit);assert.equal(hit.slotRoutes.gloves.item,26);});
  const gloveSwap=await probe(save(8,145),o,hit=>{pair(8)(hit);assert.equal(hit.slotRoutes.gloves.item,145);});
  assert.notDeepEqual(mixed,gloveSwap);
  assert.deepEqual(await probe(save(8,26),options('attack-sword','north'),hit=>pair(8)(hit)),mixed);
 }
 for(const def of [68,69]){
  const save=boots=>({...actor('sword',{weapon:{def},boots:boots?{def:boots}:null}),
   appearance96:MareCharacterAppearance.normalize({...signedAppearance,skinColor:'ebony'})});
  const o=options('attack','north'),clean=await probe(save(null),o);
  const own=hit=>{assert.equal(hit.slotRoutes?.weapon?.item,def);assert.equal(hit.slotRoutes?.boots?.item,8);assert.equal(hit.frames,8);};
  const armored=await probe(save(8),o,own);
  assert.notDeepEqual(armored,clean);
  assert.deepEqual(await probe(save(8),options('attack-sword','north'),own),armored);
  assert.deepEqual(await probe(save(null),o),clean);
 }
 const swapPose=options('attack','north'),sameOutfit=def=>({...actor('sword',{
  weapon:{def},boots:{def:8},legs:{def:22}
 }),appearance96:MareCharacterAppearance.normalize({...signedAppearance,skinColor:'ebony'})});
 const attest=def=>hit=>{
  assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.boots.item,8);
  assert.equal(hit.slotRoutes.legs.item,22);assert.equal(hit.frames,8);
 };
 // Same HD pose and outfit, only the weapon is elected again.
 const firstSword=await probe(sameOutfit(68),swapPose,attest(68)),secondSword=await probe(sameOutfit(69),swapPose,attest(69));
 assert.notDeepEqual(firstSword,secondSword);
 assert.deepEqual(await probe(sameOutfit(68),swapPose,attest(68)),firstSword);
 const handPose=options('idle','north'),maleHand=(def,gloves)=>({
  ...actor('sword',{weapon:{def},gloves:gloves?{def:gloves}:null}),
  appearance96:MareCharacterAppearance.normalize({gender:'masculino',skinColor:'light',hairStyle:'original',eyeColor:'blue',hairColor:'black'})
 });
 for(const def of [0,67]){
  const hand=await probe(maleHand(def,null),handPose),cuffed=await probe(maleHand(def,26),handPose,hit=>{
   assert.equal(hit.slotRoutes.weapon.item,def);assert.equal(hit.slotRoutes.gloves.item,26);
  });
  assert.notDeepEqual(hand,cuffed);assert.deepEqual(await probe(maleHand(def,null),handPose),hand);
 }
 const gait=(role,def,pants)=>({
  ...actor(role,{weapon:{def},legs:pants?{def:pants}:null}),
  appearance96:MareCharacterAppearance.normalize({gender:'feminino',skinColor:'light',hairStyle:'original',eyeColor:'blue',hairColor:'black'})
 });
 const east=options('walk','east');
 for(const [role,def] of [['gunner',116],['brawler',112]]){
  const bare=await probe(gait(role,def,null),east);
  const owned=await probe(gait(role,def,140),east,hit=>{
   assert.equal(hit.slotRoutes.legs.item,140);assert.equal(hit.slotRoutes.weapon.item,def);
  });
  assert.notDeepEqual(owned,bare);assert.deepEqual(await probe(gait(role,def,null),east),bare);
 }
 const rest=options('idle','south'),restPants=actor('brawler',{legs:{def:182}});
 const restBase=await probe(restPants,rest),restBoth=await probe(actor('brawler',{legs:{def:182},boots:{def:148}}),rest,hit=>{
  assert.equal(hit.slotRoutes.legs.item,182);assert.equal(hit.slotRoutes.boots.item,148);
 });
 assert.notDeepEqual(restBase,restBoth);assert.deepEqual(await probe(restPants,rest),restBase);
 await proveNewIndependentSlots();
 console.log('PASS local Pages build World: independent weapon, pants and boots; real equip/unequip; generic attack equals approved attack.');
})().catch(e=>{console.error(e);process.exitCode=1;});
