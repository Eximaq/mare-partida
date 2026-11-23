'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT||path.resolve(__dirname,'..');
const world=require(path.join(root,'paper-doll-96-lobby.js')),catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const look=require(path.join(root,'character-appearance.js'));

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

test('boots 8/9 and gloves 25/26 preserve the original outfit and also draw from their own world layers',async()=>{
 const checked=new Set(),native=make();
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
   const unique=[body,slot,equipment[slot],action,direction].join('/');
   if(checked.has(unique))continue;
   checked.add(unique);
   const isolated=look.commit({classId:'brawler',equipment:{[slot]:{def:equipment[slot]}}},
    {gender:body==='female'?'feminino':'masculino',skinColor:'light',hairColor:'black',eyeColor:'blue'},()=>true);
   const options={consumer:'world',action,direction};
   const owned=world.selectWorldHDOnly(native,catalog,isolated,options);
   assert.deepEqual(owned.omitted||[],[],label);
   assert.deepEqual(Object.keys(owned.slotRoutes),[slot],label);
   assert.equal(owned.slotRoutes[slot].item,equipment[slot],label);
   assert.equal(owned.slotRoutes[slot].quality,'hd',label);
   const naked={...isolated,equipment:{}},base=world.selectWorldHDOnly(native,catalog,naked,options);
   const bundle=async(p,r)=>native.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   const a=await bundle(isolated,owned),b=await bundle(naked,base);
   try{
    const phases=owned.timeline?.length||owned.pack?.directions?.[direction]?.clip.frames||a.coverage[0].frames;
    assert(Number.isInteger(phases)&&phases>0,label);
    const raster=(bundle,p,time)=>{
     let c;assert(bundle.draw({save(){},restore(){},drawImage(frame){c=frame;}},p,{...options,progress:time}),label);
     return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
    };
    let visible=0;
    for(let f=0;f<phases;f++){
     const t=(f+.25)/phases;if(!raster(a,isolated,t).equals(raster(b,naked,t)))visible++;
    }
    assert(visible>0,label+' isolated garment must be visible during the cycle');
   }finally{a.release();b.release();}
  }
 }
});
