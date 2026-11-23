'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const mod=file=>require(path.join(root,file)),vendor=mod('tools/rework-accessories/vendor.js');
const {cv}=require('./rework-integration-support.cjs'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const index=mod('tools/rework-weapon-layers-hd/index.json'),prefix='tools/rework-weapon-layers-hd/';
const image=url=>load(prefix+url),create=()=>cv.createCanvas(640,640);
function read(c){return c.getContext('2d').getImageData(0,0,640,640).data;}
async function source(layer){
 const c=create();c.getContext('2d').drawImage(await image(layer.url),0,0);const data=read(c);c.width=1;return data;
}
(async()=>{
 let checked=0;
 for(const weapon of [17,122])for(const direction of ['east','west']){
  const rig=index.records.find(r=>r.body==='male'&&r.item===weapon&&r.direction===direction).basePack;
  const ordered=index.orderedAttackProfiles.find(r=>r.id==='authored-orb-'+weapon+'-'+direction);
  const d=rig.pack.directions[direction],map=new Map();
  for(const [k,v] of Object.entries(rig.images))map.set(k,await image(v));
  const dy=[0,-1,0,0,1,1,1,1];
  const poses=d.poses.map((p,i)=>({...p,NECK:{...p.NECK,y:p.NECK.y+dy[i]/4},NOSE:{...p.NOSE,y:p.NOSE.y+dy[i]/4}}));
  for(let frame=0;frame<8;frame++){
   const draw=layers=>{
    const c=create();vendor.compositor.render(c.getContext('2d'),{...rig.pack,directions:{[direction]:{...d,layers,poses}}},map,{direction,frame,density:4});
    const out=read(c);c.width=1;return out;
   };
   const ref=draw(d.layers),hair=draw(d.layers.filter(l=>l.slot==='hair'));
   const [back,gear,hand]=ordered.states[frame].layers;
   const body=await source(back),metal=await source(gear),restore=await source(hand.mask);
   let samples=0;
   for(let i=0;i<hair.length;i+=4)if(hair[i+3]){
    assert.equal(metal[i+3],0,'ring overlaps hair');assert.equal(restore[i],0,'hand overlaps hair');
    for(let k=0;k<4;k++)assert.equal(body[i+k],ref[i+k],[weapon,direction,frame,i,k].join('/'));
    samples++;
   }
   assert.equal(samples,4994);checked++;
  }
 }
 assert.equal(checked,32);console.log(checked,'ordered body/gear phases, 4994 verified hair pixels each');
})().catch(e=>{console.error(e);process.exitCode=1;});
