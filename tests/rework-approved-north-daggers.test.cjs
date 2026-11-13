'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const pose={action:'attack-daggers',direction:'north'};
const items=[12,13,71,72,73,74];

test('six approved NORTH daggers preserve the authored rear occlusion and saved colors',async()=>{
 const api=make();
 await api.ready;
 const weapon=global.MareReworkWeaponNativeHD.create({schema:'native-hd-weapon-layers-v1',records:[]},{makeCanvas:cv.createCanvas});
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const prefix='tools/rework-weapon-layers-hd/';
 for(const item of items){
  const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:item}}};
  const original=api.select(p,pose);
  assert.equal(original.id,'daggers'+item+'-north-native-original-source');
  assert.equal(original.sourceArchiveSHA256,'80abf4150a510cb254ed2da3a9890ffed8065e5ab3824e17e91d24a123a08655');
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
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d'),c=cv.createCanvas(640,640).getContext('2d');
   weapon.render(a,original,images,{state:s.state});
   weapon.render(c,current,images,{state:s.state});
   b.drawImage(await load(prefix+s.approved.url),0,0);
   const reference=Buffer.from(b.getImageData(0,0,640,640).data);
   assert(Buffer.from(a.getImageData(0,0,640,640).data).equals(reference),item+'/'+s.state+' differs from approved pixels');
   assert(!Buffer.from(c.getImageData(0,0,640,640).data).equals(reference),item+'/'+s.state+' discarded personalization');
  }
 }
});
