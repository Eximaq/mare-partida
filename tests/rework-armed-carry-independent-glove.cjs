'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path'),{make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
test('signed North carry projects G25/G26 without changing the Compass or saved look',async()=>{
 const api=make(),A=MareCharacterAppearance,V=ReworkAccessoryVendor.compositor;await api.ready;let count=0;
 const maskCache=new Map();
 const capture=async(p,o)=>{let c;a(await api.prepare(p,o),JSON.stringify(api.snapshot()));a(api.draw({save(){},restore(){},drawImage(x){c=x;}},p,o));return new Uint32Array(c.getContext('2d').getImageData(0,0,512,512).data.buffer);};
 for(const [hairStyle,hairColor,tones] of [['original','black',Object.keys(A.skins)],['hair-cropped','blue',['light','copper']]])
 for(const skinColor of tones)for(const d of [25,26])for(const action of ['idle','walk']){
  let p;A.commit({classId:'strategist',equipment:{weapon:{def:16},gloves:{def:d,potential:null},head:null,coat:null,boots:null}},{...A.defaults,skinColor,hairStyle,hairColor},s=>{p=JSON.parse(JSON.stringify(s));return true;});
  const o={action,direction:'north',consumer:'world',x:256,y:405},off={...p,equipment:{weapon:{def:16}}},before=JSON.stringify(p);
  const newR=api.selectVisual(p,o),old=api.selectVisual(off,o),q=newR?.independentCarryGlove,D=old.pack.directions.north;
  a(q);a.deepEqual(q.base,old);a.deepEqual(newR.plan,old.plan);a.deepEqual(newR.colorAppearance,old.colorAppearance);
  a.equal(newR.slotRoutes.gloves.quality,'hd');a.equal(newR.slotRoutes.weapon.quality,'hd');a.deepEqual(newR.omitted,[]);
  for(let i=0;i<D.clip.frames;i++){
   const pose={...o,progress:(i+.125)/D.clip.frames},x=await capture(off,pose),y=await capture(p,pose),key=[d,action,i].join('/');
   if(!maskCache.has(key)){
    const C=cv.createCanvas(512,512),ctx=C.getContext('2d'),imgs=new Map(await Promise.all(q.gloves.map(async l=>[l.source,await load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png')])));
    V.render(ctx,{...old.pack,directions:{north:{...D,layers:q.gloves}}},imgs,{direction:'north',frame:i,density:4});
    const glove=new Uint32Array(ctx.getImageData(0,0,512,512).data.buffer);ctx.clearRect(0,0,512,512);
    const part=old.plan.parts[0],{a,b}=part.binding,p=D.poses[i],t=V.rigid(part.sourceBone[b],part.sourceBone[a],p[b],p[a]),off=part.calibrationOffsetPhysical;
    ctx.imageSmoothingEnabled=false;ctx.setTransform(t[0],t[1],t[2],t[3],4*t[4]+off[0],4*t[5]+off[1]);ctx.drawImage(await load('tools/rework-weapon-layers-hd/'+part.source.url),0,0);
    const gear=new Uint32Array(ctx.getImageData(0,0,512,512).data.buffer);maskCache.set(key,{glove,gear});
   }
   const {glove,gear}=maskCache.get(key);let changed=0,weapon=0,left=0,right=0;
   for(let j=0;j<x.length;j++){
    if(gear[j]>>>24){a.equal(glove[j]>>>24,0);a.equal(x[j],y[j]);weapon++;}
    if(x[j]!==y[j]){a(glove[j]>>>24,'glove-exterior delta');changed++;if(j%512<256)left++;else right++;}
   }
   a(changed>100&&weapon>100&&left>10&&right>10);
   a.deepEqual(x,await capture(off,pose));count++;
  }
  a.equal(JSON.stringify(p),before);
  for(const op of [{...o,direction:'south'},{...o,action:'attack-focus'},{...o,weaponless:true}])
   a(!api.selectVisual(p,op)?.independentCarryGlove);
 }
 a.equal(count,340);
});
