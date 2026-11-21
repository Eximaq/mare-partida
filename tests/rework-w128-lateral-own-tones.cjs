'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const i=require(R+'/tools/rework-weapon-layers-hd/index.json'),u='tools/rework-weapon-layers-hd/assets/';
const save=(s,extra={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'save-w128-side',classId:'healer',equipment:{weapon:{def:128}},...extra},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:s,...look},()=>true)));
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const loadPixels=async (h,mirror=false,y=0)=>{const x=cv.createCanvas(640,640),c=x.getContext('2d');if(mirror){c.translate(640,0);c.scale(-1,1);}c.drawImage(await load(u+h+'.png'),0,y);const b=pix(x);x.width=1;return b};
(async()=>{await api.ready;let checked=0,metal=0;
for(const d of ['east','west']){
 const o={direction:d,action:'attack',consumer:'world'},prior=i.records.find(r=>r.id===`staff128-${d}-native-original-source`),mirror=d==='west',original=[],coverage=[];
 for(let f=0;f<8;f++){
  const y=[0,-1,0,0,1,1,1,1][f],stock=await loadPixels(prior.states[f].approved.sha256);
  const gear=await loadPixels('535b5dc885463b8106314a3bfcc7e0ad3d0a7da8321113a54994d86ee18e4893',mirror,y),mask=await loadPixels('38ec923a4995564450832aa2fcbde8d29c4f945764165994fa44caf27dd3b7d8',mirror,y),want=[];
  for(let j=0;j<gear.length;j+=4)if(gear[j+3]>0&&!mask[j]&&gear.readUInt32LE(j)===stock.readUInt32LE(j))want.push(j);
  assert(want.length>1500);
  coverage.push(want);original.push(stock);
 }
 for(const s of Object.keys(A.skins)){
  const p=save(s),r=api.selectVisual(p,o);assert(r?.w128OwnLateralPalette,d+'/'+s);
  assert(r.atomic!==false&&!r.separableAttack);assert.equal(r.fps,12);assert.deepEqual(r.timeline,prior.timeline);assert.deepEqual(r.pivot,prior.pivot);
  assert(await api.prepareClip(p,o));let changed=0;
  for(let f=0;f<8;f++){
   let c;assert(api.draw({save(){},restore(){},drawImage(q){c=q}},p,{...o,progress:(f+.1)/8}),JSON.stringify(api.snapshot()));
   assert.equal(c.width,640);assert.equal(c.height,640);
   const a=pix(c),b=original[f],v=r.states[f];
   assert.equal(v.approved.sha256,prior.states[f].approved.sha256);
   assert.equal(v.layers.length,1);assert.equal(v.layers[0].mirrorX,mirror);
   const check=await loadPixels(v.layers[0].sha256,mirror);assert(a.equals(check));
   for(let k=0;k<a.length;k+=4){assert.equal(a[k+3],b[k+3]);if(a.readUInt32LE(k)!==b.readUInt32LE(k))changed++;}
   for(const k of coverage[f]){assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));metal++;}
   checked++;
  }
  assert(changed>1000);
  for(const q of [save(s,{classId:'strategist'}),save(s,{equipment:{weapon:{def:128},coat:{def:151}}}),save(s,{equipment:{weapon:{def:128,variant:'special'}}}),save(s,{}, {hairColor:'brown'})])assert(!api.selectVisual(q,o)?.w128OwnLateralPalette);
  for(const k of [{direction:'north'},{direction:'south'},{consumer:'portrait'},{action:'walk'},{weaponless:true}])assert(!api.selectVisual(p,{...o,...k})?.w128OwnLateralPalette);
  console.log(d,s,'PASS 8 actual World');global.gc?.();
 }
}
assert.equal(checked,128);assert(metal>200000);console.log('PASS',checked,'own hardware witness',metal,'whole alpha identical');
})().catch(e=>{console.error(e);process.exitCode=1});
