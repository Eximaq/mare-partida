'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require('./rework-integration-support.cjs'),loader=require('../tools/rework-hd-test-loader.cjs').create(root);
require('../player-rework-sword0-checkpoint.js');
const cp=require(p.join(dist,material)),api=make({baseURL:'https://fixture.test/',
 fetchJSON:async f=>f===material?cp:JSON.parse(fs.readFileSync(p.join(root,f))),
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)
});
const dirs=['south','north','east','west'],ids=[0,1,67,68,69,70];
const colors=['porcelain','light','warm','olive','copper','brown','dark','ebony'];
function avatar(weapon,skinColor,boots){
 return {classId:'sword',appearance96:global.MareCharacterAppearance.normalize({...cp.appearance96,skinColor}),equipment:{weapon:{def:weapon},coat:{def:151},...(boots?{boots:{def:boots}}:{})}};
}
const stage=async (player,options,source)=>api.prepareConfiguration([{player,options,source}],{resolve:q=>q});
function pixels(bundle,p,o,k){
 const dest=cv.createCanvas(480,480),ctx=dest.getContext('2d');let target;
 ctx.drawImage=(src)=>{target=src;};a(bundle.draw(ctx,p,{...o,x:230,y:350,progress:(k+.25)/8}));
 const img=Buffer.from(target.getContext('2d').getImageData(0,0,target.width,target.height).data);
 dest.width=dest.height=1;return img;
}
(async()=>{
 await api.ready;
 let selections=0,frames=0;
 for(const weapon of ids)for(const direction of dirs){
  const o={direction,action:'attack-sword',consumer:'world'};
  for(const skinColor of colors){
   const b=avatar(weapon,skinColor,9),source=api.selectVisual(b,o),body=api.selectVisual(avatar(weapon,skinColor),o);
   a(source?.slotRoutes?.boots?.item===9,`missing saved tone ${weapon}/${direction}/${skinColor}`);
   a.equal(source.material?.skinColor,skinColor);
   a.deepEqual(source.material,body.material);
   a.deepEqual(source.states,body.states);
   selections++;
  }
  // Exact single-sword silhouette and selected skin survive taking boots off.
  for(const skinColor of ['porcelain','ebony']){
   const w=avatar(weapon,skinColor,9),b=avatar(weapon,skinColor),r=api.selectVisual(w,o),z=api.selectVisual(b,o);
   const worn=await stage(w,o,r),bare=await stage(b,o,z);
   try{
    const layers=r.pack.directions[direction].layers.filter(l=>l.id.startsWith('boot9-'));
    a(layers.length===2||layers.length===4);a(layers.every(l=>l.binding.kind==='fixed'));
    const sz=r.pack.frame.width*4+2*(r.paddingPhysical||0),pad=r.paddingPhysical||0;
    const tile=cv.createCanvas(sz,sz),ctx=tile.getContext('2d'),cache=new Map();
    for(let k=0;k<8;k++){
     const x=pixels(worn,w,o,k),y=pixels(bare,b,o,k);
     ctx.clearRect(0,0,sz,sz);
     for(const l of layers){
      const h=l.frames?.[k]||l.source;
      if(!cache.has(h))cache.set(h,await cv.loadImage(p.join(dist,'tools/rework-sword0-checkpoint/assets',h+'.png')));
      ctx.drawImage(cache.get(h),pad,pad);
     }
     const m=ctx.getImageData(0,0,sz,sz).data;
     a.equal(x.length,m.length);a.equal(y.length,m.length);
     let changed=0;
     for(let i=0;i<x.length;i+=4)if(x.readUInt32LE(i)!==y.readUInt32LE(i)){a(m[i+3],`non-boot pixel changed ${weapon}/${skinColor}/${direction}/${k}/${i}`);changed++;}
     a(changed>0);frames++;
    }
    tile.width=tile.height=1;
   }finally{worn.release();bare.release();}
  }
 }
 a.equal(selections,192);a.equal(frames,384);console.log({selections,frames});
})().catch(e=>{console.error(e);process.exitCode=1;});
