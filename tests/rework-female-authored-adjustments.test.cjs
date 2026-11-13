
'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const heads=require('../tools/rework-accessories/head-layer-index.json');
const own=require('../tools/rework-accessories/female-original-face-ownership.json');
const source=require('../tools/rework-base-hd/index.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));

test('female NORTH uses the approved 157 scale without losing its offset and hide-hair rule',async()=>{
 const api=make();await api.ready;
 const p={appearance96:{gender:'feminino',hairStyle:'hair-cropped'},equipment:{head:{def:157}}};
 const o={consumer:'world',direction:'north',action:'idle'};
 const record=api.select(p,o);
 assert.equal(record.femaleNamedHairRecord.gearPolicy,'approved-same-hairstyle-policy');
 const adjustment=record.femaleNamedHairRecord.gearRecord.adjustmentRecord.adjustment;
 assert.equal(adjustment.gearScale,109);
 assert.equal(adjustment.gearY,-0.25);
 assert.equal(adjustment.hideHair,true);
 const base=global.MareReworkBaseHD.create(source);
 const adjusted=global.MareFemaleNamedHairHD.create(heads,own,{baseRegistry:base,makeCanvas:cv.createCanvas});
 const resolve=(index)=>{
  const helper=global.MareFemaleNamedHairHD.create(index,own,{baseRegistry:base,makeCanvas:cv.createCanvas});
  return [helper,helper.resolve(record,{hair:'hair-cropped',head:157})];
 };
 const reference=adjusted.resolve(record,{hair:'hair-cropped',head:157});
 const [unscaled,control]=resolve({...heads,records:heads.records.map(r=>r.body==='female'&&r.item===157&&r.direction==='north'&&r.style==='cropped'?{
  ...r,adjustmentRecord:{...r.adjustmentRecord,adjustment:{...r.adjustmentRecord.adjustment,gearScale:100}}
 }:r)});
 const imgs=new Map(await Promise.all(adjusted.requiredFiles(reference).map(async p=>[p,await load(p)])));
 const a=adjusted.compose(record,reference,imgs),b=unscaled.compose(record,control,imgs);
 const bounds=(image)=>{
  const rgba=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
  let left=image.width,right=0;
  for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>200&&rgba[i+2]>=rgba[i]+10){
   const x=(i/4)%image.width;left=Math.min(left,x);right=Math.max(right,x);
  }
  return [left,right];
 };
 const [left,right]=bounds(a),[unscaledLeft,unscaledRight]=bounds(b);
 assert(right-left>unscaledRight-unscaledLeft,[left,right,unscaledLeft,unscaledRight]);
 assert(await api.prepare(p,o));
 assert(api.draw(cv.createCanvas(512,512).getContext('2d'),p,{...o,x:256,y:448}));
});
