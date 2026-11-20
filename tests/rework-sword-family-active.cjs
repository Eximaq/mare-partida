'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require('./rework-integration-support.cjs'),loader=require('../tools/rework-hd-test-loader.cjs').create(root);
require('../player-rework-sword0-checkpoint.js');
const checkpoint=require(p.join(dist,material));
const api=make({
 baseURL:'https://fixture.test/',
 fetchJSON:async f=>f===material?checkpoint:JSON.parse(fs.readFileSync(p.join(root,f))),
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)
});
const directions=['south','north','east','west'];
const ids=process.argv[2]?process.argv[2].split(',').map(Number):[1,67,68,69,70];
const eq=(weapon,other={})=>({weapon:{def:weapon},...other});
const summarize=r=>({states:r.states,rig:r.pack.directions[r.direction].clip,pivot:r.pack.pivot,density:r.pack.density});
async function stage(player,options,source){return api.prepareConfiguration([{player,options,source}],{resolve:p=>p});}
function capture(bundle,player,options,frame){
 const tile=cv.createCanvas(768,768),ctx=tile.getContext('2d'),original=ctx.drawImage.bind(ctx);
 let image;ctx.drawImage=(c,...args)=>{image=c;original(c,...args);};
 a(bundle.draw(ctx,player,{...options,x:384,y:530,progress:(frame+.2)/8}));
 a(image?.width&&image.height);
 const data=Buffer.from(image.getContext('2d').getImageData(0,0,image.width,image.height).data);
 tile.width=tile.height=1;
 return data;
}
(async()=>{
 await api.ready;
 const appearance96=global.MareCharacterAppearance.normalize(checkpoint.appearance96);
 let selected=0,rendered=0;
 for(const id of ids)for(const direction of directions){
  const o={action:'attack-sword',direction,consumer:'world'};
  const bare={classId:'sword',appearance96,equipment:eq(id)},b=api.selectVisual(bare,o);
  a.equal(b?.item,id,'the previous single-sword registration is unchanged');
  const dressed={...bare,equipment:eq(id,{coat:{def:151}})},c=api.selectVisual(dressed,o);
  a.equal(c?.item,id,`missing family registration: ${id}/${direction}`);
  a.deepEqual(summarize(c),summarize(b),'Peitoral 151 must not replace timing, pivot, or the sword');
  a.deepEqual(c.material,b.material,'Peitoral 151 must not replace the appearance');
  const variants=[{legs:{def:22}},{boots:{def:9}},{gloves:{def:26}},{legs:{def:22},boots:{def:9}}];
  for(const extra of variants){
   const actor={...dressed,equipment:{...dressed.equipment,...extra}},saved=JSON.stringify(actor);
   const r=api.selectVisual(actor,o);
   a.equal(r?.item,id,`missing independent slot: ${id}/${direction}/${JSON.stringify(extra)}`);
   a.deepEqual(summarize(r),summarize(c));a.deepEqual(r.material,c.material);
   for(const [slot,v] of Object.entries(extra))a.equal(r.slotRoutes?.[slot]?.item,v.def);
   a.equal(JSON.stringify(actor),saved);selected++;
  }
  for(const denied of [{legs:{def:21},boots:{def:9}},{gloves:{def:25}},{head:{def:9999}}]){
   a(!api.selectVisual({...dressed,equipment:{...dressed.equipment,...denied}},o)?.checkpointSources?.length);
  }
  const actor={...dressed,equipment:{...dressed.equipment,legs:{def:22},boots:{def:9}}},r=api.selectVisual(actor,o);
  const n=await stage(actor,o,r),k=await stage(dressed,o,c);
  try{
   for(let f=0;f<8;f++){
    const original=capture(k,dressed,o,f),out=capture(n,actor,o,f);
    a.equal(original.length,out.length);a(!out.equals(original),'gear change must be visible');
    rendered++;
   }
  }finally{n.release();k.release();}
 }
 a.equal(selected,ids.length*4*4);a.equal(rendered,ids.length*4*8);
 console.log({weaponIds:ids,selected,rendered,preservedOriginStates:true,preservedAppearance:true});
})().catch(e=>{console.error(e);process.exitCode=1;});
