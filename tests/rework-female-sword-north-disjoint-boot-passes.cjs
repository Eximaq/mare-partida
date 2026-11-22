'use strict';
const path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto'),r=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..');
const cv=require(path.join(r,'node_modules/@napi-rs/canvas'));
const load=require(path.join(r,'tools/rework-hd-test-loader.cjs')).create(r);
const rel=process.argv[2]||path.join(r,'dist'),C=require(path.join(rel,'tools/rework-sword0-checkpoint/sword-catalog.json'));
const ids=[0,1,67,68,69,70],bootIds=[8,134,141,155],W=require(path.join(r,'tools/rework-weapon-layers-hd/index.json'));
const rec=id=>W.femaleRegistrations.find(q=>q.item===id&&q.direction==='north'&&q.action==='attack-sword');
const w=640,can=cv.createCanvas(w,w),c=can.getContext('2d'),keep=(layer,q)=>cv.loadImage(path.join(rel,'tools/rework-sword0-checkpoint/assets',layer.frames[q]+'.png'));
const pix=()=>c.getImageData(0,0,w,w).data;
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
(async()=>{const weaponMasks={};
for(const id of ids){
 const r=rec(id);a.equal(r.baseRecord.pack.frame.width*4,w);const masks=[];
 for(const s of r.states){
  c.save();c.clearRect(0,0,w,w);c.imageSmoothingEnabled=false;
  a.equal(s.parts.length,1);const p=s.parts[0];c.transform(...p.matrix);c.drawImage(await load(p.url),0,0);c.restore();
  const rgba=pix(),m=Uint8Array.from({length:w*w},(_,i)=>rgba[4*i+3]);masks.push(m);
 }
 weaponMasks[id]=masks;
}
for(const boot of bootIds){
 const record=C.records.find(q=>q.item===boot&&q.slot==='boots'&&q.direction==='north'), m=Object.fromEntries(ids.map(i=>[i,[]]));
 for(let frame=0;frame<8;frame++){
  c.clearRect(0,0,w,w);for(const l of record.layers)c.drawImage(await keep(l,frame),0,0);const rgb=pix(),own=[];
  for(let i=0;i<w*w;i++)if(rgb[4*i+3])own.push(i);
  for(const id of ids)m[id].push(own.reduce((n,k)=>n+!!weaponMasks[id][frame][k],0));
 }
 for(const id of [0,1,67,70])a(m[id].every(n=>n===0),'blade overlaps a signed boot '+[boot,id]);
 a(m[69].some(n=>n>0),'negative control: W69 must cross each tested North boot');
 console.log(JSON.stringify({boot,hits:m,source:sha(record.layers)}));
}
})().catch(err=>{console.log(err);process.exit(1);});
