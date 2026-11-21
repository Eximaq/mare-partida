'use strict';
const a=require('node:assert/strict'),p=require('node:path'),R=p.resolve(__dirname,'..'),{cv,make}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),C=global.MareReworkWeaponCarryHD.create(require('../tools/rework-base-hd/index.json'),require('../tools/rework-weapon-layers-hd/carry-binding-plan.json'),{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(R);
const o={direction:'east',action:'walk',consumer:'world'},bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
const draw=(x,f)=>{let c;a(api.draw({save(){},restore(){},drawImage(s){c=s;}},x,{...o,progress:(f+.25)/16}));return bytes(c);};
(async()=>{await api.ready;for(const tone of ['light','ebony']){
 const x=A.commit({id:'staff123-east-reference',classId:'strategist',equipment:{weapon:{def:123}}},{skinColor:tone},()=>true),
  y={...x,equipment:{}},r=api.selectVisual(x,o),s=C.resolve({item:123,body:'male',action:'walk',direction:'east'});
 a(r?.verifiedStaff123Carry);a(s&&!s.verifiedStaff123Carry);a.equal(s.plan.parts[0].source.sha256,'df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90');
 a.deepEqual(s.base.pack,r.base.pack);const stock={...s,colorAppearance:r.colorAppearance};const m=new Map(await Promise.all(C.requiredFiles(stock).map(async u=>[u,await load(u)])));
 a(await api.prepareClip(x,o));a(await api.prepareClip(y,o));
 const results=[];
 for(let f=0;f<16;f++){
  const got=draw(x,f),bare=draw(y,f),z=cv.createCanvas(512,512);C.render(z.getContext('2d'),stock,m,{frame:f});const original=bytes(z);z.width=1;
  let vacated=0;for(let k=3;k<got.length;k+=4){a(got[k]<=original[k]);if(original[k]&&!got[k]){vacated++;a.equal(bare[k],0,'correction removed native-body alpha at '+[tone,f,(k-3)/4]);}}
  if([5,7].includes(f))a.equal(vacated,f===5?27:12);
  results.push(vacated);
 }
 console.log(tone,'16 East frames: exposed stock alpha is already zero on bare native actor; F5/F7',results[5],results[7]);
}
})().catch(e=>{console.error(e);process.exitCode=1;});
