'use strict';
const a=require('node:assert/strict'),p=require('node:path'),A=require('../character-appearance'),I=require('../tools/rework-weapon-layers-hd/index.json'),{make,cv}=require('./rework-integration-support.cjs'),load=require('../tools/rework-hd-test-loader.cjs').create(p.resolve(__dirname,'..')),api=make();
const O={direction:'north',action:'attack-unarmed',consumer:'world'},save=(skin,cls='cyborg',equipment={weapon:{def:117}},extras={})=>JSON.parse(JSON.stringify(A.commit({classId:cls,equipment},{skinColor:skin,...extras},()=>true)));
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{await api.ready;
 const native=global.MareReworkWeaponNativeHD.create(I,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas}),r=I.records.find(x=>x.id==='arm117-north-native-layers');
 const support=[17,0,54,24,13,64,0,17], images=new Map(await Promise.all(native.requiredFiles(r).map(async f=>[f,await load(f)])));
 const render=(s,f)=>{const c=cv.createCanvas(640,640),meta=native.render(c.getContext('2d'),s,images,{frame:f});a.equal(meta.state,String(f));a.deepEqual(meta.pivot,{x:320,y:512});const bytes=pix(c);c.width=1;return bytes;};
 const originals=Array.from({length:8},(_,f)=>render(r,f)), canv=cv.createCanvas(640,640),cx=canv.getContext('2d');
 const mattes=r.states.map(s=>{cx.clearRect(0,0,640,640);cx.drawImage(images.get('tools/rework-weapon-layers-hd/'+s.layers[0].mask.url),0,0);return pix(canv);});
 let samples=0;
 for(const tone of Object.keys(A.skins)){
  const actor=save(tone),snapshot=JSON.stringify(actor),v=api.selectVisual(actor,O);a(v?.arm117NorthOwnMaterial);a.equal(api.selectVisual(actor,{...O,action:'attack'})?.id,v.id);
  for(const k of ['basePack','states','nativeCanvas','pivot','fps','timeline','sourceArchiveSHA256'])a.deepEqual(v[k],r[k]);
  for(const [who,o] of [[save(tone,'strategist'),O],[save(tone,'cyborg',{weapon:{def:117,variant:'other'}}),O],[save(tone,'cyborg',{weapon:{def:117},coat:{def:151}}),O],[save(tone,'cyborg',{weapon:{def:118}}),O],[save(tone,'cyborg',undefined,{gender:'feminino'}),O],[save(tone,'cyborg',undefined,{hairColor:'brown'}),O],[actor,{...O,consumer:'portrait'}],[actor,{...O,weaponless:true}],[actor,{...O,action:'attack-tech'}],[actor,{...O,action:'walk'}],[actor,{...O,direction:'south'}],[actor,{...O,direction:'east'}],[actor,{...O,direction:'west'}]])a(!api.selectVisual(who,o)?.arm117NorthOwnMaterial);
  const k=await api.prepareConfiguration([{player:actor,source:v,options:O}],{resolve:x=>x}); let arm=0,body=0,metal=0;
  try{for(let f=0;f<8;f++){
   const orig=originals[f],before=render({...r,colorAppearance:v.colorAppearance},f),mask=mattes[f];
   let out;a(k.draw({save(){},restore(){},drawImage(i){out=i;}},actor,{...O,progress:(f+.2)/8}));const drawn=pix(out);
   a.deepEqual(drawn,render(v,f));let count=0;
   for(let i=0;i<drawn.length;i+=4){
    a.equal(drawn[i+3],orig[i+3]);
    const u=drawn.readUInt32LE(i),b=before.readUInt32LE(i),n=orig.readUInt32LE(i);
    if(u!==b){a(mask[i]);a.equal(b,n);count++;}
    else if(mask[i]){a.equal(u,n);metal++;}
    else if(u!==n)body++;
   }
   a.equal(count,support[f]);arm+=count;samples++;
  }}finally{k.release();}
  a.equal(arm,189);a(body>85000);a(metal>5700);a.equal(JSON.stringify(actor),snapshot);
  console.log(tone,'8 states @12',JSON.stringify({arm,body,unchangedRestore:metal}));
  global.gc?.();
 }
 a.equal(samples,64);console.log('PASS',samples);
})().catch(e=>{console.error(e);process.exitCode=1});
