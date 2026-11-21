'use strict';
const a=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const idx=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..')),api=make();
const zip=require('../docs/native-hd/editable-male-equipment/sources/cetros-pele-aprovada.json'),o={direction:'south',action:'attack-focus',consumer:'world'};
const canonical=w=>w<=124?'strategist':'healer';
const save=(tone,w,cl=canonical(w),e={})=>JSON.parse(JSON.stringify(A.commit({id:'staff-tester',classId:cl,equipment:{weapon:{def:w},...e}},{skinColor:tone},()=>true)));
const canvas=im=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(im,0,0);return c;};
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const digest=p=>crypto.createHash('sha256').update(p).digest('hex');
(async()=>{await api.ready;let n=0;
for(let w=123;w<=127;w++){
 const base=idx.records.find(r=>r.id===`staff${w}-south-native-original-source`);
 const own=zip.recordBindings.find(r=>r.id===base.id);
 const ctl=api.selectVisual(save('light',w),o);a.equal(ctl?.ownStaffFamilySouth,'light');
 const seed=await Promise.all(base.states.map(async (st,i)=>{
  const [body,rank]=await Promise.all([st.layers[0].url,ctl.states[i].staffSouthRanks].map(l=>load('tools/rework-weapon-layers-hd/'+l)));
  const s=bytes(canvas(body)),m=bytes(canvas(rank));
  let bodySites=0,iris=0;
  for(let j=0;j<m.length;j+=4){a(m[j]<=15);if(m[j]>=11)iris++;if(m[j]>0&&m[j]<6)bodySites++;}
  a.equal(iris,45);a(bodySites>=own.states[i].selectedPixels);
  a.equal(st.approved.sha256,own.states[i].sourceSHA256);
  return {s,m};
 }));
 for(const tone of Object.keys(A.skins)){
  const p=save(tone,w),before=JSON.stringify(p),r=api.selectVisual(p,o);
  a.equal(r?.ownStaffFamilySouth,tone);a.equal(r.fps,12);a.deepEqual(r.pivot,[80,128]);a.deepEqual(r.timeline,base.timeline);
  const lut=[...A.skins[tone].ramp,...A.hairs.black.ramp,...A.eyes.blue.ramp].map(t=>Buffer.from(t.slice(1),'hex'));
  const h=await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x});
  const frames=new Set();
  for(let i=0;i<8;i++){
   a.deepEqual(r.states[i].layers,base.states[i].layers);
   let im;a(h.draw({save(){},restore(){},drawImage(canvas){im=canvas}},p,{...o,progress:(i+.1)/8}));
   const pix=bytes(im),{s,m}=seed[i];const c=cv.createCanvas(640,640),ctx=c.getContext('2d'),back=ctx.createImageData(640,640);
   back.data.set(s);
   for(let j=0;j<m.length;j+=4)if(m[j])back.data.set(lut[m[j]-1],j);
   ctx.putImageData(back,0,0);
   a.equal(digest(pix),digest(bytes(c)));
   let protectedOpaque=0;
   for(let j=0;j<pix.length;j+=4){
    a.equal(pix[j+3],s[j+3]);
    if(!m[j]&&s[j+3]===255){a.equal(pix.readUInt32LE(j),s.readUInt32LE(j)); protectedOpaque++;}
   }
   a(protectedOpaque>1000);
   frames.add(digest(pix));n++;
  }
  a.equal(frames.size,8);a.equal(JSON.stringify(p),before);h.release();global.gc?.();console.log(w,canonical(w),tone,'8 own exact saved World frames');
 }
 for(const p of [save('ebony',w,''),save('ebony',w,canonical(w)==='healer'?'strategist':'healer'),
  save('ebony',w,canonical(w),{coat:{def:151}}),save('ebony',w,canonical(w),{weapon:{def:w,variant:'other'}})])
   a(!api.selectVisual(p,o)?.ownStaffFamilySouth);
 for(const opts of [{direction:'north'},{direction:'east'},{consumer:'portrait'},{weaponless:true},{variant:'other'},{action:'walk'}])
   a(!api.selectVisual(save('ebony',w),{...o,...opts})?.ownStaffFamilySouth);
}
a.equal(n,320);console.log('PASS',n);
})().catch(e=>{console.error(e);process.exitCode=1;});
