'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const load=name=>require(path.join(root,name));
global.MareSword0Checkpoint=load('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=load('paper-doll-96-lobby.js'),appearance=load('character-appearance.js'),catalog=load('tools/paper-doll-96-v3/weapons.json');
const out=process.env.WARDROBE_EVIDENCE,role=process.env.WARDROBE_ROLE;
const actions={sword:'attack-sword',rogue:'attack-daggers',gunner:'attack-firearm',brawler:'attack-unarmed',cyborg:'attack-unarmed',healer:'attack-focus',strategist:'attack-focus'};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function inspect(api,w,direction){
 const o={consumer:'world',direction,action:actions[w.role]},runs=[];
 for(const [hairColor,eyeColor] of [['black','blue'],['blue','blue'],['blue','green']]){
  const player=appearance.commit({classId:w.role,equipment:{weapon:{def:w.id}}},
   {gender:'masculino',skinColor:'ebony',hairStyle:'original',eyeStyle:'original',hairColor,eyeColor},()=>true);
  const source=world.selectWorldHDOnly(api,catalog,player,o);
  if(!source||source.appearanceAdapted||source.visualDegraded||source.omitted?.length||
    (source.action!==o.action&&source.resolvedAction!==o.action)||source.direction!==direction)throw Error('receptor '+hairColor+'/'+eyeColor);
  const bundle=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source})});
  try{
   const c=bundle.coverage[0],result=[];
   assert(!c.omitted?.length&&!c.unsupported?.length&&c.frames>0);
   for(let i=0;i<c.frames;i++){
    let frame;
    assert(bundle.draw({save(){},restore(){},drawImage(im){frame=im;}},player,{...o,progress:(i+.25)/c.frames}));
    const data=frame.getContext('2d').getImageData(0,0,frame.width,frame.height).data;
    const alpha=new Uint8Array(data.length/4);
    for(let j=0;j<alpha.length;j++)alpha[j]=data[j*4+3];
    result.push([hash(data),hash(alpha),frame.width,frame.height]);
   }
   runs.push({source:source.id,frames:result});
  }finally{bundle.release();}
 }
 const [stock,hair,eyes]=runs.map(r=>r.frames);
 assert(stock.length===hair.length&&hair.length===eyes.length,'clock');
 let changedHair=0,changedEyes=0;
 for(let i=0;i<stock.length;i++){
  assert.deepEqual(stock[i].slice(1),hair[i].slice(1),'hair changed silhouette at '+i);
  assert.deepEqual(hair[i].slice(1),eyes[i].slice(1),'iris changed silhouette at '+i);
  changedHair+=stock[i][0]!==hair[i][0];changedEyes+=hair[i][0]!==eyes[i][0];
 }
 assert(changedHair>0,'hair color did not change the frame');
 if(direction==='north')assert.equal(changedEyes,0,'back-facing iris modified the frame');
 else assert(changedEyes>0,'iris color did not change the frame');
 return {frames:stock.length,changedHair,changedEyes,sources:runs.map(r=>r.source)};
}
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const group=weapons.filter(w=>!role||w.role===role);assert(group.length);
 const rows=[];
 for(const w of group)for(const direction of ['north','south','east','west']){
  try{rows.push({weapon:w.id,role:w.role,direction,...await inspect(api,w,direction)});}
  catch(e){rows.push({weapon:w.id,role:w.role,direction,failure:e.message});}
  if(out)fs.writeFileSync(out,JSON.stringify(rows));
 }
 assert.equal(rows.length,group.length*4);
 const bad=rows.filter(r=>r.failure);
 console.log(JSON.stringify({tested:rows.length,passed:rows.length-bad.length,failures:bad}));
 if(bad.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
