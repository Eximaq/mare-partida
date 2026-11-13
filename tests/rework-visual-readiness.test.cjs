'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const directions=['south','north','east','west'];
const look={gender:'masculino',hairStyle:'original',skinColor:'original',eyeStyle:'original',hairColor:'original'};
const player={appearance96:look,equipment:{}};

test('prepare and retain every requested native frame independently of the preview cache',async()=>{
 const native=make();
 await native.ready;
 assert.equal(typeof native.prepareConfiguration,'function','native renderer needs an owned configuration bundle');
 const poses=directions.flatMap(direction=>['idle','walk','attack-unarmed'].map(action=>({direction,action})));
 const bundle=await native.prepareConfiguration(poses.map(options=>({player,options})));
 const ctx=cv.createCanvas(160,160).getContext('2d');
 for(const direction of directions)await native.prepareClip({...player,appearance96:{...look,gender:'feminino'}},{action:'walk',direction});
 for(const options of poses){
  const source=native.select(player,options),count=source.pack.directions[source.direction].clip.frames;
  for(let frame=0;frame<count;frame++){
   assert(bundle.draw(ctx,player,{...options,x:80,y:130,progress:(frame+.25)/count}));
   assert.equal(native.snapshot().last.frame,frame);
   assert.equal(native.snapshot().last.source,source.id);
  }
 }
 bundle.release();
 assert.equal(bundle.draw(ctx,player,poses[0]),false);
});

test('rifle115 SOUTH idle and attack share an ID but retain different timelines',async()=>{
 const native=make(),player={appearance96:{gender:'masculino',hairStyle:'hair-spiky',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'light'},equipment:{coat:{def:151},head:{def:157},weapon:{def:115}}};
 const options=['idle','attack'].map(action=>({action,direction:'south'}));
 const bundle=await native.prepareConfiguration(options.map(options=>({player,options})));
 assert.deepEqual(bundle.coverage.map(clip=>[clip.source,clip.frames]),[['rifle115-v5-south-native-layers',1],['rifle115-v5-south-native-layers',5]]);
 const ctx=cv.createCanvas(160,160).getContext('2d');
 assert(bundle.draw(ctx,player,{...options[1],progress:.45,x:80,y:130}));
 assert.equal(native.snapshot().last.frame,4);
 bundle.release();
});
