'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
test('own carry retains signed weapon and real saved skin when a named male head is equipped',async()=>{
 const api=make();await api.ready;const A=MareCharacterAppearance;
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const head=MareReworkHead.create(require('../tools/rework-accessories/head-layer-index.json'),{appearanceAPI:MareAppearance96,makeCanvas:cv.createCanvas});
 const owned=async(record,pose,frame,last)=>{
  const p=record.pack,d=p.directions[pose.direction],l=d.layers.find(x=>x.slot==='hair'),source=l.frames?.[frame]||l.source;
  const orig=cv.createCanvas(512,512),out=cv.createCanvas(512,512),all=cv.createCanvas(512,512),m=all.getContext('2d'),c=out.getContext('2d');
  const pack={...p,directions:{[pose.direction]:{...d,layers:[l]}}};
  ReworkAccessoryVendor.compositor.render(orig.getContext('2d'),pack,new Map([[source,await load('tools/rework-base-hd/assets/'+source+'.png')]]),{frame,direction:pose.direction,density:4});
  c.save();if(record.base.mirrorX){c.translate(512,0);c.scale(-1,1);}c.drawImage(orig,0,0);c.restore();
  const refs=new Map(await Promise.all(head.requiredFiles(record.headRecord).map(async x=>[x,await load(x)])));
  const n=d.poses[frame].NECK,targetNeck={...n,x:record.base.mirrorX?p.frame.width-n.x:n.x};
  const passes=head.composeNative(record.headRecord,refs,{targetNeck,width:128,height:128,look:record.headLook,hairRamp:MareAppearance96.hairs[record.colorAppearance.hairColor].ramp});
  for(const slot of ['hair','head']){
   const t=cv.createCanvas(512,512),cx=t.getContext('2d'),buf=cx.createImageData(512,512);
   buf.data.set(passes[slot]);cx.putImageData(buf,0,0);c.drawImage(t,0,0);
  }
  const scale=last.physicalScale;m.imageSmoothingEnabled=false;
  m.drawImage(out,pose.x-last.pivot.x*scale,pose.y-last.pivot.y*scale,512*scale,512*scale);
  return m.getImageData(0,0,512,512).data;
 };

 const render=async(p,o)=>{
  assert(await api.prepare(p,o),JSON.stringify({o,p,diag:api.snapshot()}));
  const c=cv.createCanvas(512,512),x=c.getContext('2d');assert(api.draw(x,p,o),JSON.stringify(api.snapshot().last));
  return {data:x.getImageData(0,0,512,512).data,last:api.snapshot().last};
 };
 let seen=0;
 const equipment=id=>({weapon:{def:id},legs:null,coat:null,head:null,boots:null,gloves:null,visual_completo:null});
 const saved=(id,hairStyle,hairColor,skinColor)=>{
  let out;assert(A.commit({classId:id===2?'brawler':'cyborg',equipment:equipment(id)},
   {...A.defaults,hairStyle,hairColor,skinColor},value=>{out=JSON.parse(JSON.stringify(value));return true;}));return out;
 };
 for(const id of [2,14,117])for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
  const pose={consumer:'world',action,direction,weaponless:false,x:256,y:405,time:0};
  for(const skin of Object.keys(A.skins)){
   assert(api.selectVisual(saved(id,'hair-spiky','blue',skin),pose)?.id.includes(':named-carry-head:hair-spiky'),JSON.stringify({id,direction,action,skin}));
  }
  for(const [skinColor,hairStyle,hairColor] of [['light','hair-spiky','blue'],['ebony','hair-cropped','pink']]){
   const control=saved(id,'original','black',skinColor),p=saved(id,hairStyle,hairColor,skinColor),before=JSON.stringify(p);
   const original=api.selectVisual(control,pose),named=api.selectVisual(p,pose);assert(named?.id.endsWith(':named-carry-head:'+hairStyle));
   assert.deepEqual(named.pack,original.pack);assert.deepEqual(named.plan,original.plan);assert.deepEqual(named.base,original.base);
   assert.equal(named.colorAppearance.skin,original.colorAppearance.skin);assert.equal(named.colorAppearance.skin,skinColor);
   assert.equal(named.colorAppearance.hairColor,hairColor);assert.equal(named.headLook.hair,hairStyle);
   const count=named.pack.directions[direction].clip.frames;
   for(const frame of action==='idle'?[0]:[0,Math.floor(count/2),count-1]){
    const o={...pose,progress:(frame+.125)/count},a=await render(control,o),b=await render(p,o);
    assert.equal(a.last.frame,frame);assert.equal(b.last.frame,frame);let changed=0,outside=0;const alpha=await owned(named,o,frame,a.last);
    for(let j=0;j<a.data.length;j+=4){
     if(a.data[j]===b.data[j]&&a.data[j+1]===b.data[j+1]&&a.data[j+2]===b.data[j+2]&&a.data[j+3]===b.data[j+3])continue;
     changed++;if(!alpha[j+3])outside++;
    }
    assert(changed>10&&outside===0,JSON.stringify({id,direction,action,skinColor,frame,outside,changed}));
    assert.equal(JSON.stringify(p),before);seen++;
   }
  }
 }
 assert.equal(seen,96);
});
