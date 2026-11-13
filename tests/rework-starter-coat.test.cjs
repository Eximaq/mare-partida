'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const base=require('../tools/rework-base-hd/index.json');
const outfits=require('../tools/rework-modular-outfits-hd/index.json');
const plan=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json');
const carry=require('../player-rework-weapon-carry-hd.js').create(base,plan,{vendor:{compositor:{}}});
const {adaptIsolatedCoat,adaptPants22}=require('../player-rework-outfit-carry-overlay-hd.js');

test('male starter keeps authored body, weapon, pivots and timing when applying coat 6',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0}});
  const dressed=adaptIsolatedCoat(source,outfits,{coat:6});
  assert(dressed,direction+'/'+action);
  assert.equal(dressed.outfitOverlay.sourceRecord,'male-torso6-'+direction+'-frozen-'+action+'-native');
  assert.equal(dressed.plan,source.plan);
  assert.deepEqual(dressed.base.pack.pivot,source.base.pack.pivot);
  const authored=source.base.pack.directions[direction],resolved=dressed.base.pack.directions[direction];
  assert.deepEqual(resolved.clip,authored.clip);
  assert.deepEqual(resolved.poses,authored.poses);
  assert.deepEqual(resolved.layers.slice(0,authored.layers.length),authored.layers);
  assert.deepEqual(dressed.preMirroredLayers,direction==='west'?resolved.layers.slice(authored.layers.length).map(layer=>layer.id):[]);
 }
});

test('coat 6 is rejected when its authored body or frame contract differs',()=>{
 const source=carry.resolve({item:0,body:'male',action:'walk',direction:'east',equipment:{weapon:0}});
 const changed=structuredClone(source);
 changed.base.pack.directions.east.poses[0].HIP.x++;
 assert.equal(adaptIsolatedCoat(changed,outfits,{coat:6}),null);
 assert.equal(adaptIsolatedCoat(source,outfits,{coat:9999}),null);
 assert.equal(adaptIsolatedCoat({...source,base:{...source.base,body:'female'}},outfits,{coat:6}),null);
});

test('pants 22 uses its own authored leg layer alongside weapon and coat',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0},appearance:{hairStyle:'hair-bob'}});
  const coat=adaptIsolatedCoat(source,outfits,{coat:6});
  const pants=adaptPants22(coat,outfits);
  assert(pants,direction+'/'+action);
  assert.equal(pants.outfitOverlay.sourceRecord,'male-pants22-'+action+'-'+direction);
  assert(pants.id.endsWith('-coat6-native-pants22-native'));
  assert.deepEqual(pants.base.pack.directions[direction].poses,source.base.pack.directions[direction].poses);
  assert.equal(pants.plan,source.plan);
 }
});

test('female equipment resolves authored coat walk and matching punch without treating the sword as a punch',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs');
 const api=make();
 await api.ready;
 const appearance96={gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-calm',eyeColor:'green'};
 for(const direction of ['south','north','east','west']){
  const look=weapon=>({appearance96,equipment:{weapon:{def:weapon},coat:{def:6}}});
  const walk=api.select(look(0),{action:'walk',direction});
  assert(walk?.outfitSourceId?.startsWith('female-torso6-'),direction);
  assert.equal(walk.material.hairColor,'pink');
  assert.equal(walk.material.skinColor,'dark');
  const punch=api.select(look(2),{action:'attack-unarmed',direction});
  assert(punch?.outfitSourceId?.startsWith('female-torso6-'),direction);
  const options={action:'attack-unarmed',direction,x:100,y:140};
  const prepared=await api.prepareConfiguration([{player:look(2),options}]);
  try{
   const ctx=cv.createCanvas(200,200).getContext('2d');
   assert.equal(prepared.coverage[0].frames,8);
   assert(prepared.draw(ctx,look(2),options));
  }finally{prepared.release();}
  assert.equal(api.select(look(0),{action:'attack-sword',direction}),null);
 }
});

test('male starter sword uses isolated blade sources with the selected coat and hair',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs');
 const api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-calm',eyeColor:'green'},equipment:{weapon:{def:0},coat:{def:6}}};
 const canvas=cv.createCanvas(200,200),ctx=canvas.getContext('2d');
 for(const direction of ['east','west','north']){
  const options={action:'attack-sword',direction,consumer:'world',x:100,y:140};
  const record=api.select(player,options);
  assert.match(record.id,/sword0-.*-(?:native-attachment|historical-attack)-coat6-adapted-bob/);
  assert.equal(record.adaptedCoat,'male-torso6-'+direction+'-frozen-attack-native-candidate');
  const prepared=await api.prepareConfiguration([{player,options}]);
  try{
   assert.equal(prepared.coverage[0].frames,record.timeline.length);
   assert(prepared.draw(ctx,player,options));
   assert(ctx.getImageData(0,0,200,200).data.some((value,i)=>i%4===3&&value));
  }finally{prepared.release();}
 }
});
