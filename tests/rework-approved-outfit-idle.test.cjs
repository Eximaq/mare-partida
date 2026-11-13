'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const directions=['south','north','east','west'];
const historical=[
 ['male',7,'static-corrected-v2'],['male',137,'static-corrected-v1'],['male',144,'static-corrected-v2'],
 ...[158,165,172,179].map(id=>['male',id,'static-four-views-v1']),
 ...[151,158,165,172,179].map(id=>['female',id,'static-south-neck-only-v1'])
];
test('approved outfit idle keeps its exact identity and every authored phase',async()=>{
 const hd=make();await hd.ready;
 for(const [body,torso,staticVersion] of historical){
  const appearance96={gender:body,hairStyle:body==='male'?'original':'hair-cropped',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'};
  const equipment={coat:{def:torso}},player={appearance96,equipment};
  for(const direction of directions){
   const animated=body==='female'&&(direction==='south'&&torso!==165||direction==='north'&&torso===151);
   const expected='approved-'+body+'-'+torso+'-'+(animated?'idle-'+direction+'-v1':staticVersion)+'-'+direction;
   const options={action:'idle',direction,consumer:'world'};
   const record=hd.select(player,options);
   assert.equal(record?.id,expected);
   assert.deepEqual(record.pack.pivot,{x:64,y:112});
   const {clip,layers}=record.pack.directions[direction];
   assert.deepEqual(clip,{frames:animated?8:1,fps:animated?4:1,loop:true});
   if(animated){
    const [a0,a1,a2,a3]=[0,2,3,4].map(i=>layers[0].frames[i]);
    assert.equal(new Set([a0,a1,a2,a3]).size,4);
    assert.deepEqual(layers[0].frames,[a0,a0,a1,a2,a3,a2,a1,a0]);
   }
   assert.notEqual(hd.select({...player,appearance96:{...appearance96,skinColor:'dark'}},options)?.id,expected);
   assert.notEqual(hd.select({...player,equipment:{...equipment,boots:{def:9}}},options)?.id,expected);
   assert(await hd.prepareClip(player,options));
   const ctx=cv.createCanvas(512,512).getContext('2d');
   for(let frame=0;frame<clip.frames;frame++)
    assert(hd.draw(ctx,player,{...options,time:(frame+.1)/clip.fps,x:256,y:448}));
  }
 }
});
