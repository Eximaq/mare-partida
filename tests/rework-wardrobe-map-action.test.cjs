'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'),from=name=>require(path.join(root,name));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs'),{weapons,complete}=require('../tools/audit-hd-wardrobe-product.cjs');
const appearance=from('character-appearance.js'),world=from('paper-doll-96-lobby.js'),catalog=from('tools/paper-doll-96-v3/weapons.json');
const api=make(),clothes=[['coat',144],['legs',168],['boots',148],['gloves',159],['head',157]];
test('42 weapon motions and the seven unarmed classes keep the same outfit through map aliases',async()=>{
 await api.ready;assert(await api.warmSwordCheckpoint());
 const roles=[...new Set(weapons.map(w=>w.role))],cases=[...weapons,...roles.map(role=>({id:null,role}))];
 let n=0;
 for(const w of cases)for(const direction of ['south','north','east','west']){
  const equipment=Object.fromEntries(clothes.map(([k,def])=>[k,{def}]));
  if(w.id!==null)equipment.weapon={def:w.id};
  const p=appearance.commit({classId:w.role,equipment},{gender:'feminino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  const action=w.id===null?'attack-unarmed':api.attackActionFor(w.id),o={action,direction,consumer:'world'};
  const ref=world.selectWorldHDOnly(api,catalog,p,o);assert(complete(ref,clothes,w.id,o));
  for(const alias of ['attack','skill']){
   const r=world.selectWorldHDOnly(api,catalog,p,{...o,action:alias});
   assert(complete(r,clothes,w.id,o));assert.equal(r.id,ref.id);n++;
  }
 }
 assert.equal(n,392);
});
test('actual map action keeps all five clothes on masculine W112 north',async()=>{
 await api.ready;
 const eq=Object.fromEntries([['weapon',112],...clothes].map(([k,def])=>[k,{def}]));
 const p=appearance.commit({classId:'brawler',equipment:eq},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
 for(const action of ['attack','skill']){
  const o={consumer:'world',action,direction:'north'},r=world.selectWorldHDOnly(api,catalog,p,o);
  assert(complete(r,clothes,112,{...o,action:'attack-unarmed'}));
 }
});
