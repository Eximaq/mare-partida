'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),o={direction:'south',consumer:'world'};
const raw={gender:'masculino',skinColor:'original',hairColor:'original',hairStyle:'original',eyeColor:'original',eyeStyle:'original'};
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const take=(prepared,player,opt,i,frames)=>{
 let c;a(prepared.draw({save(){},restore(){},drawImage(x){c=x;}},player,{...opt,progress:(i+.25)/frames}));
 return rgba(c);
};
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:x=>x});
const profile={...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'green'};
const player=(look,coat,boot)=>({classId:'fighter',appearance96:look,equipment:{
 coat:{def:coat},legs:{def:133},...(boot?{boots:{def:boot}}:{})}});
(async()=>{
 await api.ready;
 let count=0,rendered=0;
 for(const action of ['idle','walk'])for(const boot of [null,9,148])for(const coat of [151,6,7,130,137,144,158,165,172,179]){
  const opt={...o,action},orig=player(raw,coat,boot),chosen=player(profile,coat,boot);
  const r=api.selectVisual(orig,opt),q=api.selectVisual(chosen,opt);
  a(q?.strictSouthAppearance,JSON.stringify({action,boot,coat,id:q?.id}));
  a.deepEqual(q.pack,r.pack);a.deepEqual(q.equipment,r.equipment);
  a.equal(q.colorAppearance.skin,'ebony');a.equal(q.colorAppearance.hairColor,'silver');a.equal(q.colorAppearance.eyeColor,'green');
  a.equal(q.strictSouthAppearance.repairs.length,[137,144].includes(coat)?2:0);
  count++;
  if(process.env.SELECT_ONLY||process.env.SMOKE&&![151,137,144].includes(coat))continue;
  const save=JSON.stringify(chosen),d=r.pack.directions.south;
  const materials=new Set([...Object.keys(q.paletteSourceMasks),q.strictSouthAppearance.face,...q.strictSouthAppearance.repairs]);
  const shape={...r.pack,directions:{south:{...d,layers:d.layers.filter(l=>(l.frames||[l.source]).some(h=>materials.has(h)))}}};
  const mask={...r,id:r.id+':material-proof-mask',pack:shape};
  const original=await prep(orig,r,opt),custom=await prep(chosen,q,opt),bound=await prep(orig,mask,opt);
  try{
   for(let i=0;i<d.clip.frames;i++){
    const before=take(original,orig,opt,i,d.clip.frames),after=take(custom,chosen,opt,i,d.clip.frames),zone=take(bound,orig,opt,i,d.clip.frames);
    let changed=0,eyes=0;
    for(let z=0;z<after.length;z+=4){
     a.equal(before[z+3],after[z+3],`alpha ${action}/${boot}/${coat}/${i}/${z}`);
     if(before.readUInt32LE(z)===after.readUInt32LE(z))continue;
     a(zone[z+3],`unowned material ${action}/${boot}/${coat}/${i}/${z}`);
     const x=z/4%640,y=Math.floor(z/4/640);
     if(y>=200&&y<217&&x>=302&&x<=340)eyes++;
     changed++;
    }
    a(changed>2500);a(eyes>14,`unseen strict iris: ${eyes}`);
    a.deepEqual(take(original,orig,opt,i,d.clip.frames),before);
    rendered++;
   }
  }finally{original.release();custom.release();bound.release();}
  a.equal(JSON.stringify(chosen),save);global.gc?.();
 }
 console.log({count,rendered});
})().catch(e=>{console.error(e);process.exitCode=1;});
