'use strict';
const a=require('node:assert/strict'),p=require('node:path'),root=p.resolve(process.env.PROOF_STAGE||p.join(__dirname,'..')),
 {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),A=require(p.join(root,'character-appearance.js')),load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root),api=make();
const dirs=process.env.SIDE?[process.env.SIDE]:['east','west'],gearByDir={east:[157,164,178],west:[157,178]};
const weaponIds=process.env.WEAPON?[Number(process.env.WEAPON)]:[12,71,73];
const draw=(b,actor,o,f)=>{let c;a(b.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...o,progress:(f+.25)/8}));return new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);};
const prep=(player,options)=>api.prepareConfiguration([{player,options}]);
(async()=>{await api.ready;let count=0;
for(const direction of dirs)for(const def of weaponIds)for(const look of [0,1]){
 const appearance96=A.normalize({gender:'feminino',...(look?{skinColor:'ebony',hairColor:'blue',hairStyle:'original'}:{})}),o={direction,action:'attack-daggers',consumer:'world'},off={classId:'rogue',appearance96,equipment:{weapon:{def}}},r0=api.selectVisual(off,o);
 a(r0?.femaleDaggerSavedTones);
 const q0=await prep(off,o),stock=Array.from({length:8},(_,f)=>draw(q0,off,o,f));q0.release();
 for(const d of ['south','north'])a(!api.selectVisual({...off,equipment:{...off.equipment,head:{def:157}}},{...o,direction:d})?.slotRoutes?.head);
 for(const def of [13,72,74])a(!api.selectVisual({...off,equipment:{weapon:{def},head:{def:157}}},o)?.slotRoutes?.head);
 const without=await api.prepareConfiguration([{player:off,options:o,source:{...r0,id:r0.id+':no-part-proof',states:r0.states.map(f=>({...f,parts:[]}))}}],{resolve:x=>x}),
  withoutWeapon=Array.from({length:8},(_,f)=>draw(without,off,o,f));without.release();
 const c=cv.createCanvas(640,640),ctx=c.getContext('2d'),art=cv.createCanvas(640,640),ax=art.getContext('2d'),painter=async(part)=>{
  const img=await load(part.url);ax.save();ax.imageSmoothingEnabled=false;ax.transform(...part.matrix);if(part.sourceClip){ax.beginPath();ax.rect(...part.sourceClip);ax.clip();}ax.drawImage(img,0,0);ax.restore();
 };
 const parts=[];for(const s of r0.states){ax.clearRect(0,0,640,640);for(const part of s.parts)await painter(part);parts.push(ax.getImageData(0,0,640,640).data);}
 try{for(const head of [129,136,143,150,157,164,171,178]){
  const on={...off,equipment:{...off.equipment,head:{def:head}}},save=JSON.stringify(on),r=api.selectVisual(on,o);
  if(!gearByDir[direction].includes(head)){a(!r?.slotRoutes?.head,[direction,def,head]);continue;}
  a(r?.slotRoutes?.head?.item===head,JSON.stringify({direction,def,head,look,id:r?.id}));
  a.deepEqual(r.omitted,[]);a.deepEqual(r.states,r0.states);a.deepEqual(r.pack,r0.pack);a.deepEqual(r.colorAppearance,r0.colorAppearance);
  a.equal(r.material.skinColor,r0.material.skinColor);a.equal(r.material.eyeColor,r0.material.eyeColor);a.equal(r.material.style,r0.material.style);a.equal(r.material.hairColor,r0.material.hairColor);
  a.equal(api.selectVisual({...on,preferences:{hideHeadgear:true}},o)?.id,r0.id);
  a(!api.selectVisual({...on,equipment:{...on.equipment,legs:{def:22}}},o)?.slotRoutes?.head);
  a(!api.selectVisual({...on,appearance96:{...on.appearance96,hairStyle:'hair-cropped'}},o)?.slotRoutes?.head);
  a(!api.selectVisual({...on,equipment:{...on.equipment,head:{def:head,variant:'alt'}}},o)?.slotRoutes?.head);
  const authority=r.material.gearRecord,part=authority.layers.find(l=>l.id===authority.headgearPolicy.gearId),g=await load('tools/rework-accessories/assets/'+part.source+'.png');
  const n=r.femaleDaggerSavedTones.standing.pack.directions[direction].rest.NECK,adj=authority.adjustmentRecord.adjustment,prev=authority.headgearPolicy.headAdjustment||{},dx=Math.round((n.x-authority.rest.NECK.x+(adj.gearX||0)+(prev.x||0))*4),dy=Math.round((n.y-authority.rest.NECK.y+(adj.gearY||0)+(prev.y||0))*4);
  const world=await prep(on,o);
  try{for(let f=0;f<8;f++){
   const y=draw(world,on,o,f),x=stock[f],offset=r.femaleDaggerSavedTones.offsets[f];
   ctx.clearRect(0,0,640,640);ctx.drawImage(g,dx+offset[0],dy+offset[1]);const m=ctx.getImageData(0,0,640,640).data;
   let delta=0,conflict=0;
   for(let j=0;j<x.length;j++)if(x[j]!==y[j]){a(m[j*4+3],[direction,def,head,look,f,j,'beyond registered hat']);delta++;if(parts[f][j*4+3]&&x[j]!==withoutWeapon[f][j])conflict++;}
   a(delta>200,'no visible hat');a.equal(conflict,0,[direction,def,head,look,f,'visible dagger changed']);
   count++;
  }}finally{world.release();}
  a.equal(JSON.stringify(on),save);
 }}finally{c.width=art.width=1;}
 global.gc?.();console.log(direction,def,look,count);
}
if(!process.env.SIDE&&!process.env.WEAPON)a.equal(count,240);console.log('PASS actual saved World dagger+hat, '+count+' full native poses, exact authored alpha domain and zero weapon contact changes');
})().catch(e=>{console.error(e);process.exitCode=1});
