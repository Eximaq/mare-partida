'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const path=require('node:path');
const ids=[113,116],coats=[151,158,165,172,179];
const attack={action:'attack-firearm',direction:'south'};
const player=(weapon,coat)=>({appearance96:{gender:'masculino',skinColor:'light',eyeStyle:'original',eyeColor:'blue',hairStyle:'hair-spiky',hairColor:'black'},
 equipment:{weapon:{def:weapon},coat:{def:coat},head:{def:157}}});

test('exact SOUTH rifle sources keep each of the ten approved equipment identities and all five poses',async()=>{
 const api=make();await api.ready;
 const index=require('../tools/rework-weapon-layers-hd/index.json');
 const weapon=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 for(const item of ids)for(const coat of coats){
  const id='rifle'+item+'-south-m'+coat+'-head157-approved';
  const p=player(item,coat),r=api.select(p,attack);
  assert.equal(r?.id,id);
  assert.deepEqual(r.equipmentContract,{weapon:item,coat,head:157});
  assert.equal(r.fps,24);
  assert.equal(r.timeline.length,43);
  assert.deepEqual(r.states.map(s=>s.state),['0','1','2','4','R']);
  assert.notEqual(api.select(p,{...attack,action:'walk'})?.id,id);
  assert.notEqual(api.select({...p,preferences:{hideHeadgear:true}},attack)?.id,id);
  assert.notEqual(api.select({...p,equipment:{...p.equipment,legs:{def:133}}},attack)?.id,id);
  assert.notEqual(api.select({...p,appearance96:{...p.appearance96,skinColor:'dark'}},attack)?.id,id);
  const imgs=new Map();
  for(const f of weapon.requiredFiles(r))imgs.set(f,await load(f));
  for(const s of r.states){
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');
   weapon.render(a,r,imgs,{state:s.state});
   b.drawImage(await load('tools/rework-weapon-layers-hd/'+s.approved.url),0,0);
   assert(Buffer.from(a.getImageData(0,0,640,640).data).equals(Buffer.from(b.getImageData(0,0,640,640).data)),id+'/'+s.state);
  }
 }
});
test('new closed rifle compositions reject a mismatched approved frame hash',()=>{
 const index=structuredClone(require('../tools/rework-weapon-layers-hd/index.json'));
 const p=player(113,165);
 index.records.find(r=>r.id==='rifle113-south-m165-head157-approved').states[0].approved.sha256='0'.repeat(64);
 const weapon=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const selection=weapon.resolve({item:113,body:'male',appearance:p.appearance96,equipment:p.equipment,...attack});
 assert.equal(selection,null);
});
