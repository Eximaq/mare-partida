'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const adapter=require('../player-rework-sword0-checkpoint.js');
const checkpoint=require(p.join(dist,material));
const makeApi=(catalog)=>make({baseURL:'https://fixture.test/',fetchJSON:async f=>f===material?catalog:JSON.parse(fs.readFileSync(p.join(root,f))),
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)});
const api=makeApi(checkpoint);
const directions=['south','north','east','west'], ids=(process.env.WEAPONS??'0,1,67,68,69,70').split(',').map(Number), gloves=[145,166,173];
const eq=(id,glove)=>({weapon:{def:id},coat:{def:151},...(glove!=null?{gloves:{def:glove}}:{})});
const hashOf=(l,f)=>l.frames?.[f]||l.source;
const alphaCanvas=cv.createCanvas(640,640),scratch=cv.createCanvas(768,768),sx=scratch.getContext('2d');
const origDraw=sx.drawImage.bind(sx);
let observed;
sx.drawImage=(image,...args)=>{observed=image;origDraw(image,...args);};
async function stage(player,options,source){return api.prepareConfiguration([{player,options,source}],{resolve:p=>p});}
function capture(pose,player,o,frame){
 observed=null;sx.clearRect(0,0,768,768);
 a(pose.draw(sx,player,{...o,x:384,y:530,progress:(frame+.2)/8}));
 a(observed?.width&&observed?.height);return {w:observed.width,h:observed.height,px:Buffer.from(observed.getContext('2d').getImageData(0,0,observed.width,observed.height).data)};
}
async function mask(direction,b,r,i){
 const x=alphaCanvas.getContext('2d');x.clearRect(0,0,640,640);
 const is=l=>/^(?:left|right)-hand(?:-foreground)?$/.test(l.id);
 for(const l of b.pack.directions[direction].layers.filter(is))x.drawImage(await loader('tools/'+(b.outfitSources?.includes(hashOf(l,i))?'rework-modular-outfits-hd':'rework-base-hd')+'/assets/'+hashOf(l,i)+'.png'),0,0);
 for(const l of r.pack.directions[direction].layers.filter(is))x.drawImage(await cv.loadImage(p.join(dist,'tools/rework-sword0-checkpoint/assets',hashOf(l,i)+'.png')),0,0);
 return x.getImageData(0,0,640,640).data;
}
function sameOutside(before,after,mask,pad,id){
 a.equal(before.w,after.w);a.equal(before.h,after.h);let changed=0;
 for(let i=0;i<before.px.length;i+=4){
  if(before.px.readUInt32LE(i)===after.px.readUInt32LE(i))continue;
  const index=i>>2,X=index%after.w-pad,Y=Math.floor(index/after.w)-pad;
  a(X>=0&&X<640&&Y>=0&&Y<640&&mask[(Y*640+X)*4+3],id+' changed pixel outside exact glove/bare-hand alpha: '+[X,Y]);changed++;
 }
 a(changed>0,id+' hidden glove change');
}
(async()=>{
 await api.ready;
 const normalized=global.MareCharacterAppearance.normalize({...checkpoint.appearance96,...(process.env.SKIN?{skinColor:process.env.SKIN}:{})}), raw=checkpoint.appearance96;
 const altered=structuredClone(checkpoint);
 const target=altered.records.find(r=>r.item===145&&r.slot==='gloves'&&r.direction==='south');
 target.layers[0].frames[0]=altered.records.find(r=>r.item===26&&r.slot==='gloves'&&r.direction==='south').layers[0].frames[0];
 const invalid=makeApi(altered);await invalid.ready;
 const bad={classId:'sword',appearance96:normalized,equipment:eq(0,145)};
 a(!invalid.selectVisual(bad,{action:'attack-sword',direction:'south'})?.checkpointSources?.length,'exact variant identity must reject altered row');
 let rendered=0,selected=0;
 for(const id of ids)for(const direction of directions){
  const o={action:'attack-sword',direction,consumer:'world'};
  const actor=(appearance96,g)=>({classId:'sword',appearance96,equipment:eq(id,g)});
  const bare=actor(normalized),b=api.selectVisual(bare,o);
  a.equal(b?.item,id);
  const bareFrames=new Map(),qb=await stage(bare,o,b);
  const phases=process.env.ALL_PHASES==='1'||id===0?[0,1,2,3,4,5,6,7]:[0,4];
  try{for(const f of phases)bareFrames.set(f,capture(qb,bare,o,f));}finally{qb.release();}
  for(const g of gloves){
   const req=actor(normalized,g),r=api.selectVisual(req,o),historical=api.selectVisual(actor(raw,g),o);
   a.equal(r?.slotRoutes?.gloves?.item,g,JSON.stringify([id,direction,g]));
   a.deepEqual(r.material,b.material);a.deepEqual(r.states,b.states);
   const exact=checkpoint.records.find(v=>v.item===g&&v.slot==='gloves'&&v.direction===direction).layers;
   a.deepEqual(r.pack.directions[direction].layers.filter(l=>exact.some(owner=>owner.id===l.id)),exact);
   a.deepEqual(historical.pack.directions[direction].layers,r.pack.directions[direction].layers);
   a(!r.skinRepairLayers?.some(name=>exact.some(l=>l.id===name)));
   selected++;
   const q=await stage(req,o,r);
   try{for(const f of phases){
    const out=capture(q,req,o,f),old=bareFrames.get(f);
    sameOutside(old,out,await mask(direction,b,r,f),(out.w-640)/2,[id,g,direction,f].join('/'));rendered++;
   }}finally{q.release();}
   if(global.gc)global.gc();
  }
  a(!api.selectVisual(actor(normalized,180),o)?.checkpointSources?.length,'G180 outside this certificate');
  console.log(id,direction,'preserved material, states, exact glove ownership, pixels',phases.length*gloves.length);
 }
 a.equal(selected,ids.length*12);
 console.log({selected,rendered});
})().catch(e=>{console.error(e);process.exitCode=1;});
