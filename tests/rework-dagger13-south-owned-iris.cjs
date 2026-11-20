'use strict';
const a=require('node:assert/strict'),path=require('node:path');
const A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make();
const IDX=require('../tools/rework-weapon-layers-hd/index.json');
const save=(eyeColor,mods={},def=13)=>JSON.parse(JSON.stringify(A.commit({id:'dagger-pilot',classId:'rogue',equipment:{weapon:{def}}},{hairStyle:'original',hairColor:'brown',eyeStyle:'original',skinColor:'light',eyeColor,...mods},()=>true)));
const o={direction:'south',action:'attack-daggers',consumer:'world'};
(async()=>{
 await api.ready;
 const ref=api.selectVisual(save('brown'),o);a(ref?.approvedDagger13South);
 const points=global.MareReworkModularOutfitsHD.southIrisSamples(),by=new Map(points.map(([x,y,...p])=>[y*640+x,p]));a.equal(by.size,45);
 const cols=['brown','green','amber','blue','gray','violet'];
 for(const q of cols){const p=save(q),before=JSON.stringify(p),r=api.selectVisual(p,o);a(r?.approvedDagger13South);a.equal(r.dagger13SouthIris,q==='brown'?undefined:q);for(const k of ['timeline','fps','pivot','states','sourceArchiveSHA256'])a.deepEqual(r[k],ref[k]);a.equal(r.fps,12);a.deepEqual(r.timeline,Array.from({length:9},(_,i)=>String(i)));a.equal(JSON.stringify(p),before);}
 const p=save('green');
 for(const q of [save('green',{skinColor:'ebony'}),{...p,appearance96:{...p.appearance96,hairColor:'unregistered-literal'}},save('green',{hairStyle:'hair-bob'}),save('green',{eyeStyle:'face-focused'}),{...p,classId:'sword'},{...p,zoanTransformed:true},{...p,equipment:{weapon:{def:13,variant:'other'}}},{...p,equipment:{...p.equipment,pants:{def:133}}},{...p,equipment:{...p.equipment,coat:{def:151}}},...([12,71,72,73,74].map(i=>save('green',{},i)))])a(!api.selectVisual(q,o)?.approvedDagger13South);
 for(const direction of ['north','east','west'])a(!api.selectVisual(p,{...o,direction})?.approvedDagger13South);a(!api.selectVisual(p,{...o,action:'walk'})?.approvedDagger13South);
 const rows=[];
 for(const c of ['brown','green','amber']){const p=save(c),r=api.selectVisual(p,o);rows.push({c,p,r,b:await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x})});}
 const pixels=ctx=>Buffer.from(ctx.getImageData(0,0,640,640).data);
 const draw=(q,i)=>{let canvas;a(q.b.draw({save(){},restore(){},drawImage(out){canvas=out;}},q.p,{...o,progress:(i+.1)/9}));return pixels(canvas.getContext('2d'));};
 try{
 const native=global.MareReworkWeaponNativeHD.create(IDX,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas}),legacy=native.resolve({item:13,body:'male',direction:'south',action:'attack-daggers'});
 const files=native.requiredFiles(legacy),load=require('../tools/rework-hd-test-loader.cjs').create(path.join(__dirname,'..')),ims=new Map(await Promise.all(files.map(async f=>[f,await load(f)])));
 let ct=0;for(let i=0;i<9;i++){
  const orig=draw(rows[0],i),ctx=cv.createCanvas(1,1).getContext('2d'),meta=native.render(ctx,legacy,ims,{frame:i});a.equal(meta.state,String(i));a.deepEqual(meta.pivot,{x:320,y:512});a.deepEqual(orig,pixels(ctx));
  for(const q of rows.slice(1)){const t=draw(q,i),ramp=A.eyes[q.c].ramp;let count=0;for(let z=0;z<t.length;z+=4){const k=by.get(z>>>2),b=orig.readUInt32LE(z),c=t.readUInt32LE(z);if(!k){a.equal(b,c);continue;}const [R,G,B,Alpha,rank]=k;a.deepEqual([...orig.subarray(z,z+4)],[R,G,B,Alpha]);a.deepEqual(t.subarray(z,z+3),Buffer.from(ramp[rank-1].slice(1),'hex'));a.equal(t[z+3],Alpha);a.notEqual(b,c);count++;}a.equal(count,45);ct++;}
  a.deepEqual(draw(rows[0],i),orig);
 }
 const ctx=cv.createCanvas(640,640).getContext('2d'),[lx,ly]=points.at(-1),bad=cv.createCanvas(640,640).getContext('2d');bad.drawImage(ims.get(files[0]),0,0);bad.fillStyle='#decafe';bad.fillRect(lx,ly,1,1);
 const wrong=new Map(ims);wrong.set(files[0],bad.canvas);a.throws(()=>native.render(ctx,rows[1].r,wrong,{frame:0}),/no longer matches/);a.deepEqual(pixels(ctx),pixels(bad));
 a.equal(ct,18);console.log('South dagger13: 18 owned-iris Canvas phases + 9 exact brown controls; 6 normalized saves; atomic corruption guard');
 }finally{rows.forEach(q=>q.b.release());}
})().catch(e=>{console.error(e);process.exitCode=1});
