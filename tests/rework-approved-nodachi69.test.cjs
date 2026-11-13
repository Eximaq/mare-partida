'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const pose={action:'attack-sword',direction:'north'};
const items=[69];

test('Nodachi 69 NORTH V6 recomposes the original silhouette and hand while preserving saved colors',async()=>{
 const api=make();
 await api.ready;
 const weapon=global.MareReworkWeaponNativeHD.create({schema:'native-hd-weapon-layers-v1',records:[]},{makeCanvas:cv.createCanvas});
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const prefix='tools/rework-weapon-layers-hd/';
 for(const item of items){
  const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:item}}};
  const original=api.select(p,pose);
  assert.equal(original.id,'nodachi69-north-native-layers');
  assert.equal(original.sourceArchiveSHA256,'b949edc84eb9f898d4dddcfc45db759fab04b99ed9d70d462b7b774207fba428');
  assert.equal(original.fps,12);
  assert.equal(original.timeline.length,8);
  const saved={...p,appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-calm',eyeColor:'green'}};
  const current=api.select(saved,pose);
  assert.equal(current?.id,original.id+'-appearance-bob:eyes:face-calm:green');
  assert(current.basePack&&current.hairSeparated);
  assert.notEqual(api.select({...saved,equipment:{...saved.equipment,coat:{def:151}}},pose)?.id,current.id);
  const images=new Map();
  for(const file of new Set([...weapon.requiredFiles(original),...weapon.requiredFiles(current)]))images.set(file,await load(file));
  for(const s of original.states){
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d'),c=cv.createCanvas(640,640).getContext('2d'),recomposed=cv.createCanvas(640,640).getContext('2d');
   weapon.render(a,original,images,{state:s.state});
   weapon.render(c,current,images,{state:s.state});
   const source=global.MareReworkOutfitOverlayHD.adaptApprovedNorth(original,{baseIndex:require('../tools/rework-base-hd/index.json'),appearance:{hair:'original'}});
   for(const file of weapon.requiredFiles(source))if(!images.has(file))images.set(file,await load(file));
   weapon.render(recomposed,source,images,{state:s.state,appearance:{}});
   b.drawImage(await load(prefix+s.approved.url),0,0);
   const reference=Buffer.from(b.getImageData(0,0,640,640).data);
   assert(Buffer.from(recomposed.getImageData(0,0,640,640).data).equals(reference),'Recomposed V6 state '+s.state);
   assert(Buffer.from(a.getImageData(0,0,640,640).data).equals(reference),item+'/'+s.state+' differs from approved pixels');
   assert(!Buffer.from(c.getImageData(0,0,640,640).data).equals(reference),item+'/'+s.state+' discarded personalization');
  }
 }
});
