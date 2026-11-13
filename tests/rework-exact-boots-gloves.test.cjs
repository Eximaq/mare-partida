'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const sets=[
 {
  "body": "male",
  "equipment": {
   "torso": 151,
   "pants": 133,
   "gloves": 152,
   "boots": 9
  }
 },
 {
  "body": "male",
  "equipment": {
   "pants": 133,
   "boots": 9
  }
 },
 {
  "body": "male",
  "equipment": {
   "pants": 133,
   "boots": 9,
   "torso": 151
  }
 },
 {
  "body": "male",
  "equipment": {
   "torso": 151,
   "pants": 133,
   "gloves": 152,
   "boots": 8
  }
 },
 {
  "body": "female",
  "equipment": {
   "torso": 151,
   "boots": 8
  }
 },
 {
  "body": "female",
  "equipment": {
   "torso": 151,
   "boots": 9
  }
 },
 {
  "body": "male",
  "equipment": {
   "torso": 151,
   "pants": 133,
   "gloves": 25,
   "boots": 155
  }
 },
 {
  "body": "male",
  "equipment": {
   "torso": 151,
   "pants": 133,
   "gloves": 26,
   "boots": 155
  }
 },
 {
  "body": "female",
  "equipment": {
   "torso": 151,
   "pants": 154,
   "gloves": 25,
   "boots": 155
  }
 },
 {
  "body": "female",
  "equipment": {
   "torso": 151,
   "pants": 154,
   "gloves": 26,
   "boots": 155
  }
 }
];

test('boots 8/9 and gloves 25/26 resolve only with compatible authored equipment',async()=>{
 const native=make();
 await native.ready;
 for(const {body,equipment} of sets){
  const appearance96={gender:body,hairStyle:'original',skinColor:'original',hairColor:'original',eyeStyle:'original'};
  const player={appearance96,equipment};
  for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east','west']){
   const pose={action,direction,progress:.45,x:140,y:210};
   const source=native.select(player,pose);
   const label=JSON.stringify({body,equipment,action,direction});
   assert.equal(source?.hdKind,'outfit',label);
   assert.deepEqual(source.equipment,equipment,label);
   assert(await native.prepareStablePose(player,pose),label);
   assert(native.draw(cv.createCanvas(280,240).getContext('2d'),player,pose),label);
   const slot=[8,9].includes(equipment.boots)?'boots':'gloves';
   assert.equal(native.select({appearance96,equipment:{[slot]:equipment[slot]}},pose),null,label+' isolated');
  }
 }
});
