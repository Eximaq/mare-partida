'use strict';
const a=require('node:assert/strict'),path=require('node:path'),A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make(),IDX=require('../tools/rework-weapon-layers-hd/index.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.join(__dirname,'..'));
const o={direction:'south',action:'attack-daggers',consumer:'world'};
const save=(hairColor,eyeColor,mods={},def=13)=>JSON.parse(JSON.stringify(A.commit({id:'pilot',classId:'rogue',equipment:{weapon:{def}}},{hairStyle:'original',hairColor,eyeStyle:'original',skinColor:'light',eyeColor,...mods},()=>true)));
const loc=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const sPath=loc('4d7b8fa3090367f80f4ded64a1bbc2c0759f3a1d2402ec9e8be112333c0297a7'),mPath=loc('dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5');
const ctx=()=>cv.createCanvas(640,640).getContext('2d'),bytes=c=>Buffer.from(c.getImageData(0,0,640,640).data);
(async()=>{
 await api.ready;const base=api.selectVisual(save('brown','brown'),o);a.equal(base?.id,'daggers13-south-native-original-source:owned-south-dagger-iris:brown');
 const mask=ctx(),hair=ctx();mask.drawImage(await load(mPath),0,0);hair.drawImage(await load(sPath),0,0);
 const raw=bytes(hair),own=bytes(mask),points=global.MareReworkModularOutfitsHD.southIrisSamples(),eyes=new Map(points.map(([x,y,...p])=>[y*640+x,p]));
 let mc=0;for(let p=0;p<own.length;p+=4)if(own[p]){a(own[p]>=1&&own[p]<=5);a.equal(own[p+3],255);a.equal(raw[p+3],255);a(!eyes.has(p>>>2));mc++;}a.equal(mc,4090);a.equal(eyes.size,45);
 const native=global.MareReworkWeaponNativeHD.create(IDX,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas}),legacy=native.resolve({item:13,body:'male',direction:'south',action:'attack-daggers'});
 let n=0;for(const hc of Object.keys(A.hairs))for(const ec of Object.keys(A.eyes)){
  const p=save(hc,ec),str=JSON.stringify(p),r=api.selectVisual(p,o);a(r?.approvedDagger13South);a.equal(r.orderedDaggerHair,hc==='brown'?undefined:hc);a.equal(r.dagger13SouthIris,ec==='brown'?undefined:ec);a.deepEqual(r.states,base.states);a.deepEqual(r.timeline,['0','1','2','3','4','5','6','7','8']);a.deepEqual(r.pivot,[80,128]);a.equal(r.fps,12);a.equal(JSON.stringify(p),str);
  const f=native.requiredFiles(r);a.equal(f.length,hc==='brown'?9:11);if(hc!=='brown')for(const p of [sPath,mPath])a(f.includes(p));n++;
 }a.equal(n,60);
 const p=save('silver','amber');for(const q of [save('silver','amber',{skinColor:'ebony'}),save('silver','amber',{hairStyle:'hair-bob'}),save('silver','amber',{eyeStyle:'face-focused'}),{...p,classId:'sword'},{...p,zoanTransformed:true},{...p,equipment:{weapon:{def:13,variant:'other'}}},{...p,equipment:{...p.equipment,pants:{def:133}}},...[71,72,73,74].map(i=>save('silver','amber',{},i))])a(!api.selectVisual(q,o)?.approvedDagger13South);
 for(const direction of ['north','east','west'])a(!api.selectVisual(p,{...o,direction})?.approvedDagger13South);a(!api.selectVisual(p,{...o,action:'walk'})?.approvedDagger13South);
 const rows=[];for(const [h,e] of [['brown','brown'],['silver','brown'],['pink','amber']]){const p=save(h,e),r=api.selectVisual(p,o);rows.push({h,e,p,r,b:await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x})});}
 const draw=(q,i)=>{let c;a(q.b.draw({save(){},restore(){},drawImage(out){c=out;}},q.p,{...o,progress:(i+.1)/9}));return bytes(c.getContext('2d'));};
 try{
 const files=native.requiredFiles(rows[2].r),ims=new Map(await Promise.all(files.map(async f=>[f,await load(f)])));
 let z=0;for(let i=0;i<9;i++){
  const original=draw(rows[0],i),src=ctx();native.render(src,legacy,ims,{frame:i});a.deepEqual(original,bytes(src));
  for(const q of rows.slice(1)){
   const pixels=draw(q,i),hr=A.hairs[q.h].ramp,er=A.eyes[q.e].ramp;let h=0,e=0;
   for(let p=0;p<original.length;p+=4){const slot=eyes.get(p>>>2);a.equal(pixels[p+3],original[p+3]);
    if(own[p]){a.deepEqual(original.subarray(p,p+4),raw.subarray(p,p+4));a.deepEqual(pixels.subarray(p,p+3),Buffer.from(hr[own[p]-1].slice(1),'hex'));a.notEqual(pixels.readUInt32LE(p),original.readUInt32LE(p));h++;}
    else if(slot&&q.e!=='brown'){const [R,G,B,alpha,rank]=slot;a.deepEqual([...original.subarray(p,p+4)],[R,G,B,alpha]);a.deepEqual(pixels.subarray(p,p+3),Buffer.from(er[rank-1].slice(1),'hex'));a.notEqual(pixels.readUInt32LE(p),original.readUInt32LE(p));e++;}
    else a.equal(pixels.readUInt32LE(p),original.readUInt32LE(p));
   }a.equal(h,4090);a.equal(e,q.e==='brown'?0:45);z++;
  }a.deepEqual(draw(rows[0],i),original);
 }
 const scratches=[points.at(-1).slice(0,2)];for(let p=own.length-4;p>=0;p-=4)if(own[p]){scratches.push([(p>>>2)%640,(p>>>2)/640|0]);break;}
 for(const [x,y] of scratches){const src=ctx(),out=ctx();src.drawImage(ims.get(files[0]),0,0);src.fillStyle='#decafe';src.fillRect(x,y,1,1);const invalid=new Map(ims);invalid.set(files[0],src.canvas);a.throws(()=>native.render(out,rows[2].r,invalid,{frame:0}),/no longer matches/);a.deepEqual(bytes(out),bytes(src));}
 a.equal(z,18);console.log('South13 hair PASS',n,'normalized saves, 18 Canvas contrasts 4090 hair +/- 45 iris, 9 exact legacy and atomic corruption proof');
 }finally{rows.forEach(q=>q.b.release());}
})().catch(e=>{console.error(e);process.exitCode=1});
