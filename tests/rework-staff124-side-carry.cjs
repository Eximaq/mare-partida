'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),crypto=require('node:crypto'),P=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json'),api=make();
const save=(tone,equipment={weapon:{def:124}},classId='strategist',look={})=>JSON.parse(JSON.stringify(A.commit({id:'staff-124-side',classId,equipment},{skinColor:tone,...look},()=>true)));
const capture=(x,o,f,n)=>{let c;a(api.draw({save(){},restore(){},drawImage(q){c=q}},x,{...o,progress:(f+.25)/n,x:256,y:448}));a.equal(c.width,512);a.equal(c.height,512);return crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,512,512).data).digest('hex');};
(async()=>{await api.ready;let total=0;
 for(const direction of ['east','west']){
  const originals=P.records.find(r=>r.item===124&&r.direction===direction),o={direction,consumer:'world',action:'walk'},idle={...o,action:'idle'};
  for(const tone of Object.keys(A.skins)){
   const x=save(tone),w=api.selectVisual(x,o),i=api.selectVisual(x,idle);a(w?.verifiedStaff124Carry);a(i?.verifiedStaff124Carry);
   a.deepEqual(w.plan,i.plan);const {staff124ToneTexture,...part}=w.plan.parts[0];a.deepEqual([part],originals.parts);a.match(staff124ToneTexture,/^assets\/[a-f0-9]{64}\.png$/);
   a.equal(w.base.pack.directions[direction].clip.fps,16);a.equal(w.base.pack.directions[direction].clip.frames,16);a.equal(i.base.pack.directions[direction].clip.frames,1);
   a(await api.prepareClip(x,o));a(await api.prepareClip(x,idle));const draws=Array.from({length:16},(_,f)=>capture(x,o,f,16));a.equal(capture(x,idle,0,1),draws[0]);a.equal(new Set(draws).size,16);total+=17;
   delete x.equipment.weapon;a(!api.selectVisual(x,o)?.verifiedStaff124Carry);a(await api.prepareClip(x,o));a.notEqual(capture(x,o,0,16),draws[0]);
   x.equipment.weapon={def:124};a(await api.prepareClip(x,o));a.equal(capture(x,o,0,16),draws[0]);global.gc?.();
  }
  const x=save('ebony');for(const opts of [{consumer:'portrait'},{weaponless:true},{action:'attack-focus'},{direction:'north'},{direction:'south'}])a(!api.selectVisual(x,{...o,...opts})?.verifiedStaff124Carry);
  for(const actor of [save('ebony',{weapon:{def:123}}),save('ebony',{weapon:{def:124,variant:'other'}}),save('ebony',{weapon:{def:124},coat:{def:151}}),save('ebony',{weapon:{def:124},head:{def:19}}),save('ebony',undefined,'healer'),save('ebony',undefined,'strategist',{hairColor:'brown'})])a(!api.selectVisual(actor,o)?.verifiedStaff124Carry);
  console.log(direction,'136 regular saved World draws; eight tones and idle/walk registration');
 }
 a.equal(total,272); console.log('PASS',total);
})().catch(e=>{console.error(e);process.exitCode=1});
