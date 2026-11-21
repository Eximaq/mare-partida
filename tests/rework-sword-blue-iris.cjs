'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require('./rework-integration-support.cjs'),loader=require('../tools/rework-hd-test-loader.cjs').create(root);
require('../player-rework-sword0-checkpoint.js');
const cp=require(p.join(dist,material)),api=make({baseURL:'https://fixture.test/',
 fetchJSON:async f=>f===material?cp:JSON.parse(fs.readFileSync(p.join(root,f))),makeCanvas:cv.createCanvas,
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)
});
const dirs=['south','north','east','west'],ids=[0,1,67,68,69,70];
const profile=look=>global.MareCharacterAppearance.normalize({...cp.appearance96,...look});
const avatar=(weapon,look,boots)=>({classId:'sword',appearance96:profile(look),equipment:{weapon:{def:weapon},coat:{def:151},...(boots?{boots:{def:boots}}:{})}});
const stage=async (player,options,source)=>api.prepareConfiguration([{player,options,source}],{resolve:q=>q});
const dest=cv.createCanvas(480,480),destCtx=dest.getContext('2d');
function pixels(bundle,p,o,k){
 let target;destCtx.drawImage=(src)=>{target=src;};a(bundle.draw(destCtx,p,{...o,x:230,y:350,progress:(k+.25)/8}));
 return {width:target.width,rgba:Buffer.from(target.getContext('2d').getImageData(0,0,target.width,target.height).data)};
}
const V=global.ReworkAccessoryVendor.compositor,clipW=640;
async function maskFor(r){
 const name=r.material.registeredBlueIris;
 const im=await loader('tools/rework-base-hd/assets/'+name+'.png'),c=cv.createCanvas(clipW,clipW),cx=c.getContext('2d');
 cx.drawImage(im,0,0);
 const old=cx.getImageData(0,0,clipW,clipW),oldp=old.data;
 const cm=global.MareAppearance96.materialMask(oldp,'iris');
 const d=cx.createImageData(clipW,clipW);
 for(let i=0;i<cm.length;i++){
  const p=i*4;if(!cm[i]||!(oldp[p]>oldp[p+1]+10&&oldp[p+1]>oldp[p+2]))continue;
  d.data[p]=255;d.data[p+3]=255;
 }
 cx.putImageData(d,0,0);
 return c;
}
function project(c,r,frame){
 const d=r.pack.directions[r.direction],neck=d.layers.find(l=>l.slot==='headBase'),layer={...neck,source:'mask',frames:undefined};
 const pack={...r.pack,directions:{[r.direction]:{...d,layers:[layer]}}};
 const dest=cv.createCanvas(clipW,clipW),ctx=dest.getContext('2d');
 V.render(ctx,pack,new Map([['mask',c]]),{direction:r.direction,density:4,frame});
 const v=ctx.getImageData(0,0,clipW,clipW).data;dest.width=1;return v;
}
async function bootsMask(gear,frame){
 const c=cv.createCanvas(clipW,clipW),cx=c.getContext('2d');
 const layers=gear.pack.directions[gear.direction].layers.filter(l=>l.id.startsWith('boot9-'));
 a(layers.length===2||layers.length===4);a(layers.every(l=>l.binding.kind==='fixed'));
 for(const l of layers)cx.drawImage(await cv.loadImage(p.join(dist,'tools/rework-sword0-checkpoint/assets',(l.frames?.[frame]||l.source)+'.png')),0,0);
 const data=Buffer.from(cx.getImageData(0,0,clipW,clipW).data);c.width=1;return data;
}
(async()=>{
 await api.ready;let select=0,proof=0,unequip=0;
 const all=global.MareCharacterAppearance,target=new Set(all.eyes.blue.ramp.map(c=>parseInt(c.slice(1),16)));
 for(const dir of dirs){
  const o={direction:dir,consumer:'world',action:'attack-sword'};
  for(const id of ids)for(const skinColor of Object.keys(all.skins))for(const hairColor of Object.keys(all.hairs)){
   const look={eyeColor:'blue',skinColor,hairColor};
   const got=api.selectVisual(avatar(id,look,9),o),bare=api.selectVisual(avatar(id,look),o);
   a.equal(got?.slotRoutes.boots?.item,9);a(got.material.registeredBlueIris);a.equal(got.material.eyeColor,'blue');
   a.equal(got.material.hairColor,hairColor);a.equal(got.material.skinColor,skinColor);
   a.deepEqual(got.material,bare.material);a.deepEqual(got.states,bare.states);select++;
  }
  const test={eyeColor:'blue',hairColor:'silver',skinColor:'ebony'},av=avatar(0,test),base={...av,appearance96:{...av.appearance96,eyeColor:'original'}};
  const r=api.selectVisual(av,o),q=api.selectVisual(base,o);
  a(!q?.material?.registeredBlueIris);a.deepEqual(r.states,q.states);a.deepEqual(r.pack,q.pack);
  const skin=await maskFor(r),blue=await stage(av,o,r),old=await stage(base,o,q);
  const dressed=avatar(0,test,9),patched=api.selectVisual(dressed,o),boots=await stage(dressed,o,patched);
  try{for(let i=0;i<8;i++){
   const a1=pixels(blue,av,o,i),a2=pixels(old,base,o,i),m=project(skin,r,i),padding=(a1.width-clipW)/2;
   let total=0,inRamp=0;
   for(let u=0;u<a1.rgba.length;u+=4){
    if(a1.rgba.readUInt32LE(u)===a2.rgba.readUInt32LE(u))continue;
    const n=u>>2,x=n%a1.width-padding,y=Math.floor(n/a1.width)-padding;
    a(x>=0&&x<clipW&&y>=0&&y<clipW&&m[(y*clipW+x)*4+3],`changed pixel outside exact iris authority ${dir}/${i}/${x},${y}`);
    a.equal(a1.rgba[u+3],a2.rgba[u+3]);total++;
    const c=(a1.rgba[u]<<16)|(a1.rgba[u+1]<<8)|a1.rgba[u+2];if(target.has(c))inRamp++;
   }
   if(dir==='north')a.equal(total,0);else a(total>0&&inRamp>0);
   proof++;
   const equipped=pixels(boots,dressed,o,i),mBoots=await bootsMask(patched,i);let changed=0;
   for(let u=0;u<a1.rgba.length;u+=4){
    if(a1.rgba.readUInt32LE(u)===equipped.rgba.readUInt32LE(u))continue;
    const n=u>>2,x=n%a1.width-padding,y=Math.floor(n/a1.width)-padding;
    a(x>=0&&x<clipW&&y>=0&&y<clipW&&mBoots[(y*clipW+x)*4+3],`blue eyes/body changed on B9 unequip ${dir}/${i}`);changed++;
   }
   a(changed>0);unequip++;
  }}finally{old.release();blue.release();boots.release();skin.width=1;}
  console.log(dir,{select,proof,unequip});global.gc?.();
 }
 a.equal(select,1920);a.equal(proof,32);a.equal(unequip,32);console.log({select,proof,unequip});
})().catch(e=>{console.error(e);process.exitCode=1;});
