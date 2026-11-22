'use strict';
const root=require("node:path").resolve(__dirname,".."),a=require('node:assert/strict'),{make}=require(root+'/tests/rework-integration-support.cjs'),
 A=require(root+'/character-appearance.js'),api=make(),o={direction:'south',action:'idle',consumer:'world'};
(async()=>{await api.ready;const rows=[];
 for(const [role,def] of [['sword',68],['gunner',114]])for(const skinColor of ['light','ebony']){
  const p=A.commit({classId:role,equipment:{weapon:{def},boots:{def:148}}},
   {gender:'feminino',skinColor,hairStyle:skinColor==='ebony'?'hair-cropped':'original',hairColor:skinColor==='ebony'?'blue':'black'},()=>true);
  const r=api.selectVisual(p,o);
  a.equal(r?.ownLayerSources?.boots,JSON.stringify(['boots',148,'female','idle','south']));
  a.equal(r.slotRoutes.boots.item,148);a.equal(r.slotRoutes.weapon.item,def);
  a.equal(r.pack.directions.south.clip.frames,1);
  a.notEqual(api.selectVisual(p,{...o,action:'attack-firearm'})?.ownLayerSources?.boots,r.ownLayerSources.boots);
  rows.push([def,skinColor,r.slotRoutes.boots.source,r.ownLayerSources.boots]);
 }
 a.equal(new Set(rows.map(r=>r[2])).size,1);console.log(rows);
})().catch(e=>{console.error(e);process.exitCode=1});
