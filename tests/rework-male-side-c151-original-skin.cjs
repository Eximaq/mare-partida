'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const p1=(appearance96,boot=155,glove=152)=>({classId:'fighter',appearance96,equipment:{coat:{def:151},legs:{def:133},boots:{def:boot},gloves:{def:glove}}});
const profiles=[{...raw,hairColor:'silver',eyeColor:'original'},{...raw,hairColor:'pink',eyeColor:'amber'},{...raw,eyeColor:'green'}];
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
const take=(q,p,o,i,n)=>{let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...o,progress:(i+.15)/n}));return pixels(c);};
const shape=(r,d,keep,suffix)=>({...r,id:r.id+':'+suffix,strictSideIris:undefined,pack:{...r.pack,directions:{[d]:{...r.pack.directions[d],layers:r.pack.directions[d].layers.filter(keep)}}}});
const memo=new Map(),image=h=>{if(!memo.has(h))memo.set(h,load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));return memo.get(h);};
(async()=>{
 await api.ready;let selected=0,rendered=0,irisWrites=0;
 const eyeSource=require('./fixture-c151-side-eye.json');
 for(const direction of ['east','west'])for(const action of ['idle','walk'])for(const look of profiles){
  const o={direction,action,consumer:'world'},p0=p1(raw),p=p1(look),snap=JSON.stringify(p);
  const r=api.selectVisual(p0,o),s=api.selectVisual(p,o);
  a(s?.strictSideIris,JSON.stringify([{direction,action,look},s?.id]));a.deepEqual(r.pack,s.pack);
  a.deepEqual(r.equipment,s.equipment);
  for(const invalid of [{...look,skinColor:'light'},{...look,skinColor:'ebony'},{...look,hairStyle:'hair-bob'},{...look,eyeStyle:'face-calm'}]){
   a(!api.selectVisual(p1(invalid),o)?.strictSideIris);
  }
  a(!api.selectVisual(p1(look,9),o)?.strictSideIris);
  const dir=r.pack.directions[direction],n=dir.clip.frames,body=dir.layers.find(l=>l.id==='clothed018-visible-background');
  a(dir.layers.filter(l=>l.id==='clothed018-visible-background').length===1);
  a(Object.values(s.paletteSourceMasks).every(x=>Object.keys(x).join()==='hair'));
  selected++;
  if(process.env.SELECT_ONLY)continue;
  const q=await prep(p,s,o),before=await prep(p0,r,o),hairLayer=await prep(p,shape(s,direction,l=>l===body,'isolate-head'),o),
   bBody=await prep(p0,shape(r,direction,l=>l===body,'body-control'),o),
   group=await Promise.all([[p0,r],[p,s]].map(([actor,src])=>prep(actor,shape(src,direction,l=>l!==body,'non-body-control'),o)));
  const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
  try{
   for(let i=0;i<n;i++){
    const x=take(before,p0,o,i,n),y=take(q,p,o,i,n);
    const bodyOrigin=take(bBody,p0,o,i,n),hairColored=take(hairLayer,p,o,i,n);
    a.deepEqual(take(group[0],p0,o,i,n),take(group[1],p,o,i,n),'every non-body raster keeps exact pixels');
    ctx.clearRect(0,0,512,512);ctx.drawImage(await image(s.paletteSourceMasks[body.frames[i]].hair),0,0);const M=pixels(c);
    const ocular=new Map(eyeSource[direction].map(([x,y,tone])=>[(y*512+x)*4,tone]));
    const ramp=global.MareCharacterAppearance.eyes[look.eyeColor]?.ramp;
    let changed=0,iris=0,changedBottom=0;
    for(let j=0;j<x.length;j+=4){
     a.equal(x[j+3],y[j+3]);
     if(x.readUInt32LE(j)===y.readUInt32LE(j))continue;
     if(j>=300*512*4)changedBottom++;
     if(ocular.has(j)){
      a(ramp,'original iris must not change when hair is recolored');
      a.deepEqual(y.subarray(j,j+3),Buffer.from(ramp[ocular.get(j)-1].slice(1),'hex'));
      iris++;
     }else a(M[j]>0,'skin or unowned pixel changed');
     changed++;
    }
    a.equal(changedBottom,0);a.equal(iris,ramp?18:0);
    a(changed>=18);
    for(const [j] of ocular)a.equal(hairColored.readUInt32LE(j),bodyOrigin.readUInt32LE(j),'hair-only pass touches iris');
    irisWrites+=iris;
    rendered++;
   }
  }finally{q.release();before.release();hairLayer.release();bBody.release();for(const x of group)x.release();c.width=c.height=1;}
  a.equal(JSON.stringify(p),snap);global.gc?.();
 }
 a.equal(selected,12);if(!process.env.SELECT_ONLY){a.equal(rendered,102);a.equal(irisWrites,1224);}
 console.log({selected,rendered,irisWrites,skinAndEquipmentExact:true});
})().catch(e=>{console.error(e);process.exitCode=1});
