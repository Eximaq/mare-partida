'use strict';
const assert=require('node:assert/strict'),p=require('node:path'),A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make();
const V=global.ReworkAccessoryVendor,idx=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname));
const record=idx.records.find(r=>r.id==='gauntlet112-south-native-layers'),d=record.basePack.pack.directions.south;
const makeCanvas=cv.createCanvas,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),canvas=()=>makeCanvas(640,640),opt={action:'attack-unarmed',direction:'south',consumer:'world'};
const player=(skin='light',rest={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'w112',classId:'brawler',equipment:{weapon:{def:112}},...rest},{skinColor:skin,...look},()=>true)));
const native=global.MareReworkWeaponNativeHD.create(idx,{vendor:V,makeCanvas});
const base=global.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor:V,prefix:''});
const pathDraw=(c,pts)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();};
(async()=>{await api.ready;
const raw=player();const own=api.select(raw,opt);
assert(own?.gauntlet112SouthOwnAttack);assert.deepEqual(own.timeline,record.timeline);assert.deepEqual(own.pivot,[80,128]);assert.equal(own.fps,12);assert.equal(own.basePack.pack.directions.south.clip.contactFrame,4);
const legacy={...raw,appearance96:{...raw.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
assert.equal(api.select(legacy,opt).id,record.id);
for(const q of [player('light',{classId:'cyborg'}),player('light',{equipment:{weapon:{def:112,variant:'unreviewed'}}}),player('light',{equipment:{weapon:{def:112},gloves:26}}),player('light',{equipment:{weapon:{def:112},coat:151}}),player('light',{equipment:{weapon:{def:118}}}),player('light',{}, {hairStyle:'hair-bob'}),player('light',{}, {eyeColor:'gray'})])
 assert(!api.select(q,opt)?.gauntlet112SouthOwnAttack);
for(const o of [{action:'walk'},{weaponless:true},{consumer:'portrait'},{direction:'east'},{direction:'north'}])assert(!api.select(raw,{...opt,...o})?.gauntlet112SouthOwnAttack);
const prefix='tools/rework-weapon-layers-hd/',files=new Map(await Promise.all(native.requiredFiles(own).map(async f=>[f,await load(f)])));
const face=d.layers.find(l=>l.slot==='face'),MP=global.MareReworkModularOutfitsHD,ir=MP.southIrisSamples();
assert.equal(ir.length,45);
const absolute=(x)=>prefix+record.basePack.images[x];
const irPaint=(src,old)=>{const c=canvas(),x=c.getContext('2d');x.drawImage(src,0,0);const y=x.getImageData(0,0,640,640);for(const [a,b,R,G,B,alpha,i]of ir){const j=(b*640+a)*4,h=parseInt(A.eyes.blue.ramp[i-1].slice(1),16);assert.equal(y.data[j+3],alpha);y.data.set([h>>>16,(h>>>8)&255,h&255],j);}x.putImageData(y,0,0);return c;};
let report={};
for(const tone of process.env.SHORT_TEST?['light','ebony']:Object.keys(A.skins)){
 const actor=player(tone),old=JSON.stringify(actor),r=api.select(actor,opt);assert(r?.gauntlet112SouthOwnAttack);
 const ready=await api.prepareConfiguration([{player:actor,source:r,options:opt}],{resolve:v=>v});
 try{const phases=[];
 for(let i=0;i<8;i++){
  let w;assert(ready.draw({save(){},restore(){},drawImage(y){w=y}},actor,{...opt,progress:(i+.25)/8}));const sampled=pix(w);
  const q=r.states[i].layers[0],origLayer=record.states[i].layers[0],gear=q.ownGauntlet112Gear.map(g=>files.get(prefix+g.url)),mask=files.get(prefix+q.mask.url);
  const frameSources=d.layers.map(l=>l.frames?.[i]||l.source),assets=new Map(frameSources.map(h=>[h,files.get(absolute(h))]));
  const stock=canvas(),b=canvas(),ref=canvas(),flat=canvas(),tc=flat.getContext('2d'),maskC=canvas(),ng=canvas(),gout=canvas();
  native.render(stock.getContext('2d'),record,files,{frame:i});
  V.compositor.render(ref.getContext('2d'),record.basePack.pack,assets,{direction:'south',frame:i,density:4});
  ng.getContext('2d').drawImage(ref,0,0);
  for(const g of gear){ng.getContext('2d').drawImage(g,0,0);gout.getContext('2d').drawImage(g,0,0);}
  base.render(b.getContext('2d'),{id:'fixture-render',pack:record.basePack.pack,direction:'south',sourceRefs:frameSources},assets,{frame:i,appearance:r.colorAppearance,makeCanvas,afterMaterialSource:(k,im,old)=>k===face.source?irPaint(im,old):im});
  tc.drawImage(b,0,0);for(const g of gear)tc.drawImage(g,0,0);
  maskC.getContext('2d').drawImage(mask,0,0);
  const original=pix(stock),skin=pix(b),composed=pix(flat),matte=pix(maskC),oldBlend=pix(ng),gearOnly=pix(gout);let n=0,skinN=0,opaque=0;
  for(let j=0;j<matte.length;j+=4){const allowed=matte[j]!==0;a: {
    assert.equal(sampled[j+3],original[j+3]);
    if(!allowed){assert.equal(sampled.readUInt32LE(j),skin.readUInt32LE(j));continue;}
    n++;skinN+=+(sampled.readUInt32LE(j)!==original.readUInt32LE(j));
    const alpha=original[j+3];assert.equal(oldBlend[j+3],alpha);
    for(let k=0;k<3;k++){
     assert(Math.abs(Math.round(oldBlend[j+k]*alpha/255)-Math.round(original[j+k]*alpha/255))<=1);
     assert.equal(sampled[j+k],Math.max(0,Math.min(255,original[j+k]+composed[j+k]-oldBlend[j+k])));
    }
    if(gearOnly[j+3]===255){assert.equal(sampled.readUInt32LE(j),original.readUInt32LE(j));opaque++;}
   }}
  assert(n===q.ownGauntlet112Count&&skinN>0&&opaque>50);assert.equal(q.sha256,origLayer.sha256);
  for(const [x,y,R,G,B,av,t]of ir){const c=parseInt(A.eyes.blue.ramp[t-1].slice(1),16),j=(y*640+x)*4;assert.deepEqual([...sampled.subarray(j,j+4)],[c>>>16,(c>>>8)&255,c&255,av]);}
  phases.push([n,skinN,opaque]);
 }
 report[tone]=phases;assert.equal(JSON.stringify(actor),old);
 }finally{ready.release();}global.gc?.();
}
console.log('PASS W112 SOUTH saved frames, full ordered RGBA + exact iris/clock/skin/alpha',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
