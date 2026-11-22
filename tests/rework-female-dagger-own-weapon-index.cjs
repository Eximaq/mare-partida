'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {make}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js'),
 W=get('paper-doll-96-lobby.js'),cats=get('tools/paper-doll-96-v3/weapons.json'),records=get('tools/rework-weapon-layers-hd/index.json').femaleRegistrations;
const own=global.MareReworkModularOutfitsHD,seen=[];
global.MareReworkModularOutfitsHD={...own,createOwnLayerIndex(rows){
 const index=own.createOwnLayerIndex(rows);
 if(!rows.some(r=>r.slot==='weapon'&&r.body==='female'&&r.action==='attack-daggers'))return index;
 return {...index,resolve(key){seen.push(key);return index.resolve(key);}};
}};
const api=make(),opts={action:'attack-daggers',consumer:'world'};
const world=(actor,options)=>W.selectWorldHD(api,cats,actor,options);
(async()=>{
 await api.ready;let checked=0,compound=0;const keys=new Set(),arts=new Set();
 for(const item of [12,13,71,72,73,74])for(const direction of ['north','south','east','west']){
  const o={...opts,direction},archive=records.find(r=>r.item===item&&r.direction===direction&&r.action===o.action),key={slot:'weapon',item,body:'female',action:o.action,direction};
  assert(archive);
  for(const appearance of [{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'}]){
   const actor=equipment=>({classId:'rogue',appearance96:A.normalize({gender:'feminino',...appearance}),equipment:{weapon:{def:item},...equipment}});
   const naked=actor({});seen.length=0;
   const bare=world(naked,o),source=bare?.ownWeaponSource;
   assert(source,'separated weapon should use its common own key for '+[item,direction,appearance.skinColor]);
   assert.deepEqual(seen[0],key);
   assert.deepEqual(bare.states,archive.states,'actual mount, clip, and operations must remain byte-exact');
   assert.deepEqual(bare.pack.directions[direction].clip,archive.baseRecord.pack.directions[direction].clip);
   assert.deepEqual(bare.states.map(s=>s.parts.length),direction==='north'?[2,2,2,2,0,2,2,2]:Array(8).fill(2));
   keys.add(source);arts.add(bare.states[0].parts[0].sha256);
   const extras=[{legs:{def:22}}];
   if(direction==='north'||direction==='south')extras.push({legs:{def:22},boots:{def:9}});
   if(direction==='east'||direction==='west')extras.push({legs:{def:22},gloves:{def:25}});
   for(const e of extras){
    const p=actor(e),snap=JSON.stringify(p),r=world(p,o);
    if(Object.hasOwn(e,'boots')||Object.hasOwn(e,'gloves')){
     const slot=e.boots?'boots':'gloves';
     if(r?.slotRoutes?.[slot]?.quality!=='hd')continue; // no new phys. certification
     compound++;
    }
    assert(r&&r.ownWeaponSource===source,JSON.stringify([p.equipment,o,r?.id]));
    assert.deepEqual(r.states,bare.states);assert.deepEqual(r.colorAppearance,bare.colorAppearance);
    assert.equal(r.slotRoutes.weapon.item,item);assert.equal(r.slotRoutes.legs.item,22);
    assert.deepEqual(r.omitted,[]);assert.equal(JSON.stringify(p),snap);
   }
   assert(!world({...naked,classId:'sword'},o)?.ownWeaponSource);
   assert(!world(naked,{...o,weaponless:true})?.ownWeaponSource);
   checked++;
  }
 }
 assert.equal(keys.size,24);assert.equal(arts.size,6);assert(compound>0);
 console.log('PASS isolated dual-dagger atlas,',keys.size,'own keys,',checked,'saved-look probes and',compound,'compound HD routes');
})().catch(e=>{console.error(e);process.exitCode=1});
