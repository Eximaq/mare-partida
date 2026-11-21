'use strict';
const a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),load=require('../tools/rework-hd-test-loader.cjs').create(p.resolve(__dirname,'..')),api=make();
const save=(tone,cl='healer',extra={})=>JSON.parse(JSON.stringify(A.commit({id:'w32-exact-tone',classId:cl,equipment:{weapon:{def:32},...extra}},{skinColor:tone},()=>true)));
const px=i=>{const c=cv.createCanvas(640,640),x=c.getContext('2d');x.drawImage(i,0,0);return Buffer.from(x.getImageData(0,0,640,640).data);};
(async()=>{await api.ready;let n=0;
for(const d of ['east','west']){
 const o={direction:d,action:'attack-focus',consumer:'world'},ref=api.selectVisual(save('light'),o);a(ref?.relic32SideBlue&&!ref.w32SideSavedPalette);
 const light=[],iris=global.MareReworkModularOutfitsHD.sideIrisSamples(d);a.equal(iris.length,18);
 const pure=await Promise.all(ref.states.map(async s=>{
  a.equal(s.layers.length,1);const g=px(await load('tools/rework-weapon-layers-hd/'+s.layers[0].url)),keep=[];
  for(let j=0;j<g.length;j+=4)if(g[j+3]===255)keep.push([j,g.readUInt32LE(j)]);
  a(keep.length>40);return keep;
 }));
 for(const tone of ['light',...Object.keys(A.skins).filter(t=>t!=='light')]){
  const q=save(tone),memo=JSON.stringify(q),r=api.selectVisual(q,o);a(r?.relic32SideBlue);a.equal(!!r.w32SideSavedPalette,tone!=='light');
  a.deepEqual(r.basePack,ref.basePack);a.deepEqual(r.states,ref.states);a.deepEqual(r.timeline,ref.timeline);a.equal(r.contactTick,4);a.equal(r.fps,12);
  const h=await api.prepareConfiguration([{player:q,source:r,options:o}],{resolve:v=>v}),frames=new Set();
  for(let f=0;f<8;f++){
   let c;a(h.draw({save(){},restore(){},drawImage(i){c=i;}},q,{...o,progress:(f+.2)/8}));
   const b=Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
   for(const [j,v] of pure[f])a.equal(b.readUInt32LE(j),v);
   for(const [x,y,_,_2,_3,aa,rank]of iris){const j=((y+64)*640+x+64)*4;a.equal(b.subarray(j,j+3).toString('hex'),A.eyes.blue.ramp[rank-1].slice(1));a.equal(b[j+3],aa);}
   if(tone==='light')light[f]=b;else {let diff=0;for(let j=3;j<b.length;j+=4){a.equal(b[j],light[f][j]);if(b.readUInt32LE(j-3)!==light[f].readUInt32LE(j-3))diff++;}a(diff>5000);}
   frames.add(crypto.createHash('sha256').update(b).digest('hex'));n++;
  }
  a.equal(frames.size,8);a.equal(JSON.stringify(q),memo);h.release();global.gc?.();console.log(d,tone,'PASS own alpha, gear, blue iris');
 }
 for(const z of [save('ebony','strategist'),save('ebony','healer',{coat:{def:151}}),save('ebony','healer',{weapon:{def:32,variant:'x'}})])a(!api.selectVisual(z,o)?.w32SideSavedPalette);
 for(const z of [{consumer:'portrait'},{direction:'north'},{direction:'south'},{action:'walk'},{weaponless:true}])a(!api.selectVisual(save('ebony'),{...o,...z})?.w32SideSavedPalette);
}
a.equal(n,128);console.log('PASS',n);
})().catch(e=>{console.error(e);process.exitCode=1;});
