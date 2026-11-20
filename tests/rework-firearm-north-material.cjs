'use strict';
const a=require('node:assert/strict'),p=require('node:path');
const root=p.resolve(__dirname,'..'),{make,cv}=require('./rework-integration-support.cjs');
const loader=require('../tools/rework-hd-test-loader.cjs').create(root);
const prefix='tools/rework-firearm113-coat/',cache=new Map();
const load=f=>{if(!cache.has(f))cache.set(f,f.startsWith(prefix)?cv.loadImage(p.join(root,'dist',f)):loader(f));return cache.get(f);};
const api=make({loadImage:load}),opt={action:'attack-firearm',direction:'north',consumer:'world'};
const raw={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original',eyeStyle:'original'};
const avatar=(item,look,coat)=>({classId:'gunner',appearance96:look,equipment:{weapon:{def:item},...(coat?{coat:{def:151}}:{})}});
const stage=(player,source)=>api.prepareConfiguration([{player,options:opt,source}],{resolve:q=>q});
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const take=(q,player,i)=>{let c;a(q.draw({save(){},restore(){},drawImage(x){c=x;}},player,{...opt,progress:(i+.2)/8}));return rgba(c);};
const pathFor=h=>prefix+'assets/'+h+'.png';
const cvMask=cv.createCanvas(640,640),cx=cvMask.getContext('2d');
async function mask(paths){
 cx.clearRect(0,0,640,640);for(const f of paths)cx.drawImage(await load(f),0,0);return rgba(cvMask);
}
function requireOnly(before,after,mask,min){
 let n=0;
 for(let i=0;i<before.length;i+=4)if(before.readUInt32LE(i)!==after.readUInt32LE(i)){
  n++;a(mask[i+3],'changed pixel outside assigned layer');
 }
 a(n>=min);return n;
}
(async()=>{
 await api.ready;const normalize=o=>global.MareCharacterAppearance.normalize({gender:'feminino',...o});
 let rendered=0;
 for(const item of [113,114])for(const look of [raw,normalize({}),normalize({skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber'})]){
  const p0=avatar(item,look,false),p1=avatar(item,look,true),before=JSON.stringify(p1),r0=api.selectVisual(p0,opt),r1=api.selectVisual(p1,opt),isRaw=look===raw;
  a(r0);if(item===114)a.equal(r1,null);else{
   a.equal(r1?.northFirearmCoatSources?.length,18);
   a.deepEqual(r1.states,r0.states);a.deepEqual(r1.material,r0.material);
   const x=r0.pack.directions.north,y=r1.pack.directions.north;
   a.deepEqual(y.clip,x.clip);a.deepEqual(y.poses,x.poses);a.deepEqual(y.layers.slice(0,x.layers.length),x.layers);
  }
  const maskless={...r0,id:r0.id+':maskless-proof',northFirearmVisibleSkin:undefined};
  const original=await stage(p0,maskless),skin=await stage(p0,r0),coat=r1&&await stage(p1,r1);
  try{for(let i=0;i<8;i++){
   const b=take(original,p0,i),s=take(skin,p0,i);
   const body=r0.pack.directions.north.layers.find(l=>l.id==='body-clothed');
   if(isRaw)a.deepEqual(b,s);else{
    const h=r0.northFirearmVisibleSkin?.[body.frames[i]];
    a(h);requireOnly(b,s,await mask([pathFor(h)]),4000);
   }
   if(coat){
    const layers=r1.pack.directions.north.layers.slice(r0.pack.directions.north.layers.length);
    requireOnly(s,take(coat,p1,i),await mask(layers.map(l=>pathFor(l.frames[i]))),1);
   }
   rendered++;
  }}finally{original.release();skin.release();coat?.release();}
  a.equal(JSON.stringify(p1),before);
 }
 a.equal(rendered,48);console.log({rendered,weaponStatesUnchanged:true,guardedPistolCoat:true});
})().catch(e=>{console.error(e);process.exitCode=1;});
