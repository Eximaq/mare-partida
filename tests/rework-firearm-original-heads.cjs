'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const load=k=>require(path.join(root,k)),world=load('paper-doll-96-lobby.js'),catalog=load('tools/paper-doll-96-v3/weapons.json');
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const bank=load('tools/rework-combat-wardrobe/index.json'),image=require('../tools/rework-hd-test-loader.cjs').create(root);
const canvas=()=>cv.createCanvas(640,640),rgba=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);

(async()=>{
 const api=make();await api.ready;const result=[];let cases=0;
 for(const record of Object.values(bank.firearmHeads)){
  const direction=record.source.split('-').find(k=>['north','east','west','south'].includes(k)),weapon=record.source.startsWith('rifle')?116:114;
  const o={consumer:'world',action:'attack-firearm',direction},look=load('character-appearance.js').commit({classId:'gunner',equipment:{}},{
   gender:'masculino',skinColor:direction==='north'?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  const kit=weapon===116?{weapon,legs:168,boots:148}:direction==='south'?{weapon,legs:168,boots:148,gloves:25}:{weapon,legs:21,boots:9,gloves:25};
  function select(eq){
   const p={...look,equipment:Object.fromEntries(Object.entries(eq).map(([k,def])=>[k,{def}]))},r=world.selectWorldHDOnly(api,catalog,p,o);
   assert.equal(r?.direction,direction);assert.equal(r.action,o.action);assert.deepEqual(r.omitted||[],[],JSON.stringify([eq,r.omitted]));for(const [k,id] of Object.entries(eq))assert.equal(r.slotRoutes[k]?.item,id);
   return {p,r};
  }
  async function ready(eq){
   const {p,r}=select(eq),cfg=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert.deepEqual(cfg.coverage[0].omitted,[]);return {r,p,draw(f){const tick=r.timeline.indexOf(r.states[f].state);let c;
    assert(cfg.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(tick+.1)/r.timeline.length}));return rgba(c);},free:()=>cfg.release()};
  }
  for(const head of gear[4]){const {r}=select({...kit,head});assert.equal(r.slotRoutes.head.quality,'hd');cases++;}
  const bare=await ready(kit);const shots=record.states.map((_,f)=>bare.draw(f));
  for(const head of (direction==='north'?gear[4]:[18,19])){
   const full=await ready({...kit,head});for(const [f,phase] of record.states.entries()){
    const a=full.draw(f),b=shots[f],guard=new Uint8Array(a.length);for(const [j,n] of phase.guard)guard.fill(1,j,j+n);let changed=0;
    for(let i=0;i<a.length;i++)if(a[i]!==b[i]){assert(i<640*300&&!guard[i],JSON.stringify([weapon,direction,head,f,i%640,Math.floor(i/640)]));changed++;}
    assert(changed>90);result.push({weapon,direction,head,frame:f,changed});
   }
   full.free();
  }
  bare.free();console.log(record.source,result.length);global.gc?.();
 }
 assert.equal(cases,50);assert.equal(result.length,138);
 if(process.env.HD_HEAD_EVIDENCE)fs.writeFileSync(process.env.HD_HEAD_EVIDENCE,JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
