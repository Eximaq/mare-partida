'use strict';
const a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(__dirname,'..'),{cv,make}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),V=global.ReworkAccessoryVendor.compositor,
 B=require('../tools/rework-base-hd/index.json'),P=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json'),C=global.MareReworkWeaponCarryHD.create(B,P,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(R),prefix='tools/rework-weapon-layers-hd/';
const cv512=()=>cv.createCanvas(512,512),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(tone,equipment={weapon:{def:124}},classId='strategist',look={})=>JSON.parse(JSON.stringify(A.commit({id:'staff-124-cardinal',classId,equipment},{skinColor:tone,...look},()=>true)));
const draw=(player,opts,f,n)=>{let c;a(api.draw({save(){},restore(){},drawImage(i){c=i;}},player,{...opts,progress:(f+.25)/n,x:256,y:448}));a.equal(c.width,512);return px(c);};
(async()=>{await api.ready; let total=0,min=Infinity,max=0;
 for(const direction of ['north','south'])for(const tone of Object.keys(A.skins)){
  const actor=save(tone),opts={direction,action:'walk',consumer:'world'},idle={...opts,action:'idle'},s=api.selectVisual(actor,opts),j=api.selectVisual(actor,idle);
  a(s?.verifiedStaff124Cardinal);a(j?.verifiedStaff124Cardinal);a(!s.verifiedStaff124Carry);
  const bare=save(tone,{});a(await api.prepareClip(actor,opts));a(await api.prepareClip(actor,idle));a(await api.prepareClip(bare,opts));a(await api.prepareClip(bare,idle));
  const oldPlan=P.records.find(r=>r.item===124&&r.direction===direction),{staff124NativeContact,...part}=s.plan.parts[0];a.deepEqual([part],oldPlan.parts);
  const [gear,grip]=await Promise.all([staff124NativeContact.gear,staff124NativeContact.grip].map(k=>load(prefix+k)));
  let first;
  for(const o of [opts,idle]){
   const r=api.selectVisual(actor,o),old=C.resolve({item:124,body:'male',direction,action:o.action});a(old&&!old.verifiedStaff124Cardinal);a.deepEqual(r.plan,s.plan);a.deepEqual(r.base.pack,old.base.pack);
   const n=o.action==='idle'?1:16,d=r.base.pack.directions[direction],hand=d.layers.find(l=>l.id==='handRight');
   a.equal(d.clip.frames,n);a.equal(d.clip.fps,n);
   const map=new Map(await Promise.all(C.requiredFiles(old).map(async q=>[q,await load(q)])));map.set(prefix+part.source.url,gear);
   const skin=await load('tools/rework-base-hd/assets/'+hand.source+'.png');
   const frames=[];
   for(let f=0;f<n;f++){
    const full=draw(actor,o,f,n),body=draw(bare,o,f,n),uv=cv512(),rc=cv512();
    C.render(rc.getContext('2d'),{...old,colorAppearance:r.colorAppearance,relicEyes:r.relicEyes},map,{frame:f});
    const withShaft=px(rc),pose=d.poses[f],{a:A,b:B}=part.binding,m=V.rigid(part.sourceBone[B],part.sourceBone[A],pose[B],pose[A]);
    const project=t=>{const c=uv.getContext('2d');c.clearRect(0,0,512,512);c.save();c.imageSmoothingEnabled=false;c.transform(...m.slice(0,4),m[4]*4+(part.calibrationOffsetPhysical?.[0]??0),m[5]*4+(part.calibrationOffsetPhysical?.[1]??0));if(part.mirrorSource){c.translate(640,0);c.scale(-1,1);}c.drawImage(t,0,0);c.restore();return px(uv);};
    const g=project(gear),k=project(grip),x=uv.getContext('2d');V.render(x,{...r.base.pack,directions:{[direction]:{...d,layers:[hand]}}},new Map([[hand.source,skin]]),{direction,frame:f,density:4});const h=px(uv);
    let edited=0,opaqueContact=0;
    for(let i=3;i<full.length;i+=4){
     a(full[i]>=body[i]&&full[i]<=withShaft[i],'native alpha gap or added exterior '+[tone,direction,f,i]);
     if(full.readUInt32LE(i-3)!==withShaft.readUInt32LE(i-3)){
      a(g[i]&&k[i]&&h[i]&&body[i],'changed outside own gear/contact/target hand '+[tone,direction,f,i]);edited++;if(g[i]===255)opaqueContact++;
     }
    }
    a(edited>200&&edited<250);a(opaqueContact<=2);min=Math.min(min,edited);max=Math.max(max,edited);
    const sig=hash(full);frames.push(sig);if(o.action==='walk'&&f===0)first=sig;if(o.action==='idle')a.equal(sig,first);uv.width=rc.width=1;total++;
   }
   a.equal(new Set(frames).size,n);
  }
  delete actor.equipment.weapon;a(!api.selectVisual(actor,opts)?.verifiedStaff124Cardinal);actor.equipment.weapon={def:124};a.equal(hash(draw(actor,opts,0,16)),first);
  for(const z of [save(tone,{weapon:{def:123}}),save(tone,{weapon:{def:124},coat:{def:151}}),save(tone,{weapon:{def:124,variant:'other'}}),save(tone,{weapon:{def:124}},'healer'),save(tone,undefined,'strategist',{eyeColor:'brown'})])a(!api.selectVisual(z,opts)?.verifiedStaff124Cardinal);
  for(const z of [{direction:'west'},{direction:'east'},{consumer:'portrait'},{weaponless:true},{action:'attack-focus'}])a(!api.selectVisual(actor,{...opts,...z})?.verifiedStaff124Cardinal);
  console.log(direction,tone,'17 exact native grip/shaft and full actor bounds');global.gc?.();
 }
 a.equal(total,272);console.log('PASS',total,'edits per frame',min,max);
})().catch(e=>{console.error(e);process.exitCode=1;});
