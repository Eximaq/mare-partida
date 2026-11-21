'use strict';
const a=require('assert/strict'),{make,cv}=require('./rework-integration-support.cjs'),C=require('../character-appearance.js'),L=require('../tools/rework-hd-test-loader.cjs').create(require('path').dirname(__dirname));
const stock='535b5dc885463b8106314a3bfcc7e0ad3d0a7da8321113a54994d86ee18e4893',trim='9d725aecbfbe25f33180ad56b27ddca50d7ac1ae83b540510d3aaa6cd6fa0b83',mh='38ec923a4995564450832aa2fcbde8d29c4f945764165994fa44caf27dd3b7d8';
const save=(tone,cls='healer')=>JSON.parse(JSON.stringify(C.commit({classId:cls,equipment:{weapon:{def:128}}},{gender:'masculino',skinColor:tone},()=>true)));
async function pixels(api,q,o,r,progress){const b=await api.prepareConfiguration([{player:q,options:o,source:r}],{resolve:x=>x});try{let c;a(b.draw({save(){},restore(){},drawImage(v){c=v;}},q,{...o,progress}));return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);}finally{b.release();}}
(async()=>{const api=make();await api.ready;
 const im=await L('tools/rework-weapon-layers-hd/assets/'+mh+'.png'),c=cv.createCanvas(640,640).getContext('2d');c.drawImage(im,0,0);const m=c.getImageData(0,0,640,640).data;
 a.equal(m.reduce((n,x,i)=>n+(i%4===0&&x>0),0),505);
 const bare=await Promise.all([stock,trim].map(async x=>{const i=await L('tools/rework-weapon-layers-hd/assets/'+x+'.png'),g=cv.createCanvas(640,640).getContext('2d');g.drawImage(i,0,0);return Buffer.from(g.getImageData(0,0,640,640).data);}));
 let removed=0;for(let i=0;i<bare[0].length;i+=4)if(bare[0].readUInt32LE(i)!==bare[1].readUInt32LE(i)){a.equal(m[i],0);a(bare[0][i+3]>0);a.equal(bare[1][i+3],0);removed++;}
 a.equal(removed,25);
 let tested=0;
 for(const direction of ['north','south','east','west'])for(const tone of Object.keys(C.skins)){
  const o={direction,action:'idle',consumer:'world'},wo={...o,action:'walk'},q=save(tone),r=api.selectVisual(q,o),w=api.selectVisual(q,wo);
  a(r?.baculo128IdleSavedPalette&&!r.baculo128WalkSavedPalette);a(w?.baculo128WalkSavedPalette&&!w.baculo128IdleSavedPalette);
  a.deepEqual(r.base.pack.directions[direction].clip,{frames:1,fps:1,loop:false});
  const expect=direction==='north'?trim:stock;
  a.equal(r.plan.parts.length,1);a.equal(w.plan.parts[0].source.sha256,trim);a.equal(r.plan.parts[0].source.sha256,expect);
  a.deepEqual(r.plan.parts[0].skinMaterial,{sourceSHA256:expect,url:'assets/'+mh+'.png'});
  const p=w.plan.parts[0],ref={...w,id:w.id+':test-idle-source',plan:{...w.plan,parts:[{...p,source:{...p.source,url:'assets/'+expect+'.png',sha256:expect},skinMaterial:{...p.skinMaterial,sourceSHA256:expect}}]}};
  const got=await pixels(api,q,o,r,.7);a(got.equals(await pixels(api,q,wo,ref,0)));
  const literal=save(tone);Object.assign(literal.appearance96,{skinColor:'original',hairColor:'original',eyeColor:'original'});
  a.equal(api.selectVisual(literal,o)?.plan?.parts[0]?.source?.sha256,stock);
  for(const x of [[save(tone,'strategist'),o],[q,{...o,consumer:'portrait'}],[q,{...o,weaponless:true}],[{...q,equipment:{...q.equipment,head:{def:19}}},o]])a(!api.selectVisual(...x)?.baculo128IdleSavedPalette);
  tested++;
 }
 a.equal(tested,32);console.log('PASS 32 Healer idle/paired walking-F0 controls and exact own source, 505 masks, literal controls and 128 negatives');
})().catch(e=>{console.error(e);process.exitCode=1;});
