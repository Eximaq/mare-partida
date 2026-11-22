'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {make}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js'),
 archives=get('tools/rework-weapon-layers-hd/index.json');
const shared=global.MareReworkModularOutfitsHD,queries=[];
global.MareReworkModularOutfitsHD={...shared,createOwnLayerIndex(rows){
 const index=shared.createOwnLayerIndex(rows);
 if(!rows.some(r=>r.slot==='weapon'&&r.direction==='north'&&r.action==='attack-firearm'))return index;
 return {...index,resolve(query){queries.push(query);return index.resolve(query);}};
}};
const api=make(),options={direction:'north',action:'attack-firearm',consumer:'world'};
const weapons=[4,5,113,115,116];
(async()=>{
 await api.ready;const sources=new Set();
 for(const item of weapons)for(const skinColor of Object.keys(A.skins)){
  const gear=(extra)=>({classId:'gunner',appearance96:A.normalize({gender:'masculino',skinColor}),
   equipment:{weapon:{def:item},...extra}});
  const solo=gear({}),worn=gear({legs:{def:21}}),snap=JSON.stringify(worn);
  queries.length=0;const bare=api.selectVisual(solo,options),armored=api.selectVisual(worn,options);
  assert(bare?.ownWeaponSource,'selected rifle must actually use indexed isolated weapon');
  assert.equal(armored?.ownWeaponSource,bare.ownWeaponSource);
  assert.deepEqual(Object.keys(queries[0]).sort(),['action','body','direction','item','slot']);
  assert.deepEqual(queries[0],{slot:'weapon',item,body:'male',action:'attack-firearm',direction:'north'});
  const approval=archives.records.find(r=>r.id===bare.id);
  assert(approval);for(let f=0;f<3;f++){
   assert.deepEqual(bare.states[f].layers[1],approval.states[f].layers[1]);
   assert.deepEqual(bare.states[f].layers[1],armored.states[f].layers[1]);
  }
  assert.deepEqual(bare.timeline,armored.timeline);assert.equal(bare.timeline.length,48);
  assert.equal(bare.fps,24);assert.deepEqual(bare.colorAppearance,armored.colorAppearance);
  assert.equal(bare.colorAppearance.skin,skinColor);
  for(const action of ['attack','skill'])assert.equal(api.selectVisual(worn,{...options,action})?.ownWeaponSource,bare.ownWeaponSource);
  assert.equal(api.selectVisual({...worn,classId:'sword'},options)?.ownWeaponSource,undefined);
  assert.equal(api.selectVisual(worn,{...options,weaponless:true})?.ownWeaponSource,undefined);
  assert.equal(api.selectVisual(gear({weapon:{def:114}}),options)?.ownWeaponSource,undefined,'atomic pistol is not a separated rifle');
  assert.equal(JSON.stringify(worn),snap);sources.add(bare.ownWeaponSource);
 }
 assert.equal(sources.size,weapons.length);
 console.log('PASS 5 isolated rifle animation sources, 40 saved profiles, unchanged asset and clock through P21 swap');
})().catch(e=>{console.error(e);process.exitCode=1});
