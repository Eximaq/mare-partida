'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),api=make();
const actor=(weapon,skin,options={},extra={})=>JSON.parse(JSON.stringify(A.commit({id:'cyborg-real',classId:'healer',equipment:{weapon:{def:weapon},...extra},...options},{skinColor:skin},()=>true)));
const directionList=['north','south','east','west'], px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
(async()=>{await api.ready;let count=0;
 for(const item of [126,127]) for(const direction of directionList){
  for(const tone of Object.keys(A.skins)){
   const q=actor(item,tone),memo=JSON.stringify(q);const w={direction,action:'walk',consumer:'world'},idle={...w,action:'idle'};
   const W=api.selectVisual(q,w),J=api.selectVisual(q,idle);a(W?.verifiedHealerCarry);a(J?.verifiedHealerCarry);a.deepEqual(W.plan,J.plan);
   const c=await api.prepareConfiguration([{player:q,source:W,options:w},{player:q,source:J,options:idle}],{resolve:x=>x});
   function draw(o,f){let out;a(c.draw({save(){},restore(){},drawImage(im){out=im;}},q,{...o,progress:(f+.20)/(o.action==='walk'?16:1)}));a(out?.width===512&&out.height===512);count++;return px(out);}
   a(draw(w,0).equals(draw(idle,0)),'walk F0 is exact idle');
   const fingerprints=new Set();for(let f=1;f<16;f++)fingerprints.add(require('node:crypto').createHash('sha256').update(draw(w,f)).digest('hex'));
   a(fingerprints.size>1);a.equal(JSON.stringify(q),memo);c.release();global.gc?.();
  }
  const w={direction,action:'walk',consumer:'world'};
  for(const n of [actor(125,'ebony'),actor(item,'ebony',{classId:'strategist'}),actor(item,'ebony',{}, {coat:{def:151}}),actor(item,'ebony',{}, {weapon:{def:item,variant:'other'}})])a(!api.selectVisual(n,w)?.verifiedHealerCarry);
  for(const o of [{...w,weaponless:true},{...w,consumer:'portrait'},{...w,action:'attack-focus'}])a(!api.selectVisual(actor(item,'ebony'),o)?.verifiedHealerCarry);
  console.log(item,direction,'PASS 17 ticks each ×8 ordinary saved palettes');
 }a.equal(count,1088);console.log('PASS',count);
})().catch(e=>{console.error(e);process.exitCode=1});
