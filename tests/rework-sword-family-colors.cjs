'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
require('../player-rework-sword0-checkpoint.js');
const cp=require(p.join(dist,material)),api=make({baseURL:'https://fixture.test/',
 fetchJSON:async f=>f===material?cp:JSON.parse(fs.readFileSync(p.join(root,f))),
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)
});
const dirs=['south','north','east','west'],ids=[0,1,67,68,69,70],eyes=['blue','brown','green','gray','amber','violet'];
const profile=look=>global.MareCharacterAppearance.normalize({...cp.appearance96,...look});
const avatar=(weapon,look,boots)=>({classId:'sword',appearance96:profile(look),equipment:{weapon:{def:weapon},coat:{def:151},...(boots?{boots:{def:boots}}:{})}});
const stage=async (player,options,source)=>api.prepareConfiguration([{player,options,source}],{resolve:q=>q});
const dest=cv.createCanvas(480,480),destCtx=dest.getContext('2d');
function pixels(bundle,p,o,k){
 let target;destCtx.drawImage=(src)=>{target=src;};a(bundle.draw(destCtx,p,{...o,x:230,y:350,progress:(k+.25)/8}));
 return Buffer.from(target.getContext('2d').getImageData(0,0,target.width,target.height).data);
}
(async()=>{
 await api.ready;
 let selection=0,rendered=0;
 const all=global.MareCharacterAppearance;
 const profiles=Object.keys(all.skins).flatMap(skinColor=>Object.keys(all.hairs).flatMap(hairColor=>eyes.map(eyeColor=>({skinColor,hairColor,eyeColor}))));
 const selectionsOnly=process.env.SELECT_ONLY==='1';
 const requested=process.env.WEAPONS?.split(',').map(Number)||ids;
 for(const direction of dirs){
  const o={direction,action:'attack-sword',consumer:'world'};
  if(!process.env.RENDER_ONLY){
   for(const weapon of requested)for(const look of profiles){
    const b=avatar(weapon,look,9),source=api.selectVisual(b,o),body=api.selectVisual(avatar(weapon,look),o);
    a(source?.slotRoutes?.boots?.item===9,`missing profile ${weapon}/${direction}/${JSON.stringify(look)}`);
    a.equal(source.material?.skinColor,look.skinColor);
    a.equal(source.material?.hairColor,look.hairColor);
    a.equal(source.material?.eyeColor,look.eyeColor);
    a.deepEqual(source.material,body.material);a.deepEqual(source.states,body.states);
    selection++;
   }
   for(const request of [{hairStyle:'hair-wavy'},{eyeStyle:'face-focused'}]){
    a(!api.selectVisual(avatar(0,request,9),o)?.checkpointSources?.length,JSON.stringify(request));
   }
  }
  if(!selectionsOnly){
   for(const weapon of requested)for(const look of [
    {skinColor:'porcelain',hairColor:'silver',eyeColor:'green'},
    {skinColor:'ebony',hairColor:'auburn',eyeColor:'violet'}
   ]){
    const w=avatar(weapon,look,9),b=avatar(weapon,look),r=api.selectVisual(w,o),z=api.selectVisual(b,o);
    const worn=await stage(w,o,r),bare=await stage(b,o,z);
    try{
     const layers=r.pack.directions[direction].layers.filter(l=>l.id.startsWith('boot9-'));
     const sz=r.pack.frame.width*4+2*(r.paddingPhysical||0),pad=r.paddingPhysical||0;
     const tile=cv.createCanvas(sz,sz),ctx=tile.getContext('2d'),cache=new Map();
     for(const k of weapon===0?[0,1,2,3,4,5,6,7]:[0,4]){
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
      for(let i=0;i<x.length;i+=4)if(x.readUInt32LE(i)!==y.readUInt32LE(i)){a(m[i+3],`non-boot pixel changed ${weapon}/${JSON.stringify(look)}/${direction}/${k}/${i}`);changed++;}
      a(changed>0);rendered++;
     }
     tile.width=tile.height=1;
    }finally{worn.release();bare.release();}
    global.gc?.();
   }
  }
  console.log(direction,{selection,rendered});
 }
 if(!process.env.RENDER_ONLY)a.equal(selection,profiles.length*dirs.length*requested.length);
 console.log({selection,rendered});
})().catch(e=>{console.error(e);process.exitCode=1;});
