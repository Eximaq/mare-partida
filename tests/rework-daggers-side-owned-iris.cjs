'use strict';
const A=require('../character-appearance'),a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs'),api=make();
const iris=dir=>global.MareReworkModularOutfitsHD.sideIrisSamples(dir).map(([x,y,...rest])=>[x+(dir==='east'?56:72),y+68,...rest]);
const save=(def,eyeColor,mods)=>JSON.parse(JSON.stringify(A.commit({id:'dagger-pilot',classId:'rogue',equipment:{weapon:{def}}},{hairStyle:'original',hairColor:'brown',eyeStyle:'original',skinColor:'light',eyeColor,...mods},()=>true)));
(async()=>{await api.ready;let count=0,selections=0;for(const item of [13,71,72,73,74])for(const direction of ['east','west']){
 const o={direction,action:'attack-daggers',consumer:'world'},points=iris(direction),eyeSamples=new Map(points.map(([x,y,R,G,B,A,rank])=>[y*640+x,{R,G,B,A,rank}]));a.equal(eyeSamples.size,18);
 const r0=api.selectVisual(save(item,'brown'),o);a(r0?.orderedAttack&&!r0.orderedDaggerIris);
 for(const c of ['blue','green','gray','amber','violet']){const p=save(item,c),before=JSON.stringify(p),r=api.selectVisual(p,o);a.equal(r?.orderedDaggerIris,c);
  for(const k of ['states','timeline','pivot','nativeCanvas','approvedAppearance','equipmentContract','visualSampling'])a.deepEqual(r[k],r0[k]);
  a.equal(r.fps,12);a.equal(r.contactTick,4);a.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);
  for(const q of [save(item,c,{skinColor:'ebony'}),{...p,appearance96:{...p.appearance96,hairColor:'unregistered-literal'}},save(item,c,{eyeStyle:'face-focused'}),save(item,c,{hairStyle:'hair-bob'}),{...p,classId:'assassin'},{...p,zoanTransformed:true},{...p,equipment:{weapon:{def:item,variant:'other'}}},{...p,equipment:{...p.equipment,coat:{def:151}}},save(12,c)])a(!api.selectVisual(q,o)?.orderedDaggerIris);
  for(const direction of ['north','south'])a(!api.selectVisual(p,{...o,direction})?.orderedDaggerIris);
  a(!api.selectVisual(p,{...o,action:'walk'})?.orderedDaggerIris);a.equal(JSON.stringify(p),before);selections++;
 }
 const rows=['brown','green','amber'].map(c=>{const p=save(item,c);return [c,p,api.selectVisual(p,o)];});
 const cur=await Promise.all(rows.map(async ([c,p,r])=>({c,p,r,prepared:await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x})})));
 const draw=(q,i)=>{let canvas;a(q.prepared.draw({save(){},restore(){},drawImage(out){canvas=out;}},q.p,{...o,progress:(i+.1)/8}));return Buffer.from(canvas.getContext('2d').getImageData(0,0,640,640).data);};
 try{for(let i=0;i<8;i++){
  const v=draw(cur[0],i);for(const q of cur.slice(1)){const w=draw(q,i),ramp=A.eyes[q.c].ramp;let n=0;for(let j=0;j<v.length;j+=4){
   const s=eyeSamples.get(j>>>2),x=v.readUInt32LE(j),y=w.readUInt32LE(j);a.equal(v[j+3],w[j+3]);if(!s){a.equal(x,y);continue;}
   a.deepEqual([...v.subarray(j,j+4)],[s.R,s.G,s.B,s.A]);const rgb=Buffer.from(ramp[s.rank-1].slice(1),'hex');a.deepEqual(w.subarray(j,j+3),rgb);a.notEqual(x,y);n++;
  }a.equal(n,18);count++;}
  a.deepEqual(draw(cur[0],i),v);
 }}finally{cur.forEach(x=>x.prepared.release());}console.log('PASS',item,direction,16);global.gc?.();
}
a.equal(selections,50);a.equal(count,160);console.log('PASS',selections,'real saved eye selectors;',count,'Canvas against 80 Original phase controls');
})().catch(e=>{console.error(e);process.exitCode=1});
