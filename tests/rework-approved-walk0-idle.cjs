'use strict';
const p=require('node:path'),a=require('node:assert/strict'),R=p.dirname(__dirname),{make}=require(R+'/tests/rework-integration-support.cjs'),S=require(R+'/character-appearance.js'),api=make();

const own=q=>['stockW118NorthWalkSavedPalette','stockFinalTechWalkSavedPalette','stockTechWalkSavedPalette','stockWalkingCuffSavedPalette','stockNorth110WalkSavedPalette'].some(k=>q?.[k]);
const save=(item,t)=>JSON.parse(JSON.stringify(S.commit({classId:[2,110].includes(item)?'brawler':item===128?'healer':'cyborg',equipment:{weapon:{def:item}}},{gender:'masculino',skinColor:t},()=>true)));
const lit=p=>({...p,appearance96:{...p.appearance96,skinColor:'original',eyeColor:'original',hairColor:'original'}});
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function render(q,o,r){const h=await api.prepareConfiguration([{player:q,options:o,source:r}],{resolve:x=>x});try{let c;a(h.draw({save(){},restore(){},drawImage(x){c=x}},q,{...o,progress:0}));return pixels(c);}finally{h.release();}}
(async()=>{
 await api.ready;let count=0,negatives=0;
 for(const [item,d] of [[110,'north'],[110,'east'],[110,'west'],[2,'east'],[2,'west'],[117,'north'],[119,'north'],[119,'east'],[119,'west'],[120,'north'],[120,'east'],[120,'west'],[118,'north']]){
 for(const tone of Object.keys(S.skins)){const dirs={direction:d,consumer:'world'},i={...dirs,action:'idle'},w={...dirs,action:'walk'},q=save(item,tone),idle=api.selectVisual(lit(q),i),walk=api.selectVisual(q,w);
 a(idle&&walk);const saved=api.selectVisual(q,i);a(own(saved),item+' '+d+' '+tone);a.deepEqual(saved.plan.parts,walk.plan.parts);a.equal(saved.base.pack.directions[d].clip.frames,1);a.equal(saved.action,'idle');
 a.deepEqual(saved.base.pack.directions[d].poses[0],walk.base.pack.directions[d].poses[0]);
 const ri=await render(q,i,saved);
 const rw=await render(q,w,walk);
 if(tone==='ebony'){
  for(const x of [
   [{...q,classId:'strategist'},i],[q,{...i,consumer:'portrait'}],[q,{...i,weaponless:true}],
   [{...q,equipment:{...q.equipment,head:{def:19}}},i],[{...q,equipment:{...q.equipment,coat:{def:151}}},i],
   [{...q,equipment:{weapon:{def:item,variant:'other'}}},i],[{...q,appearance96:{...q.appearance96,hairStyle:'afro'}},i],
   [{...q,appearance96:{...q.appearance96,skinColor:'original',eyeColor:'original',hairColor:'original'}},i]
  ]){a(!own(api.selectVisual(...x)),item+' '+d);negatives++;}
 }
 let n=0;for(let j=0;j<ri.length;j+=4)if(ri.readUInt32LE(j)!==rw.readUInt32LE(j))n++;
 a.equal(n,0);count++;}
 }
 a.equal(count,104);a.equal(negatives,104);console.log('PASS 104 persisted idle RGBA equals own signed walking F0; 104 negative eligibility cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
