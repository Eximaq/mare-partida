'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const idx=require(R+'/tools/rework-weapon-layers-hd/index.json'),own=idx.separableAttackRigs.find(x=>x.rig==='male-authored-gauntlet112-eight');
const save=(s,extra={})=>JSON.parse(JSON.stringify(A.commit({id:'held-tool-test',classId:'brawler',equipment:{weapon:{def:112}},...extra},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:s},()=>true)));
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{await api.ready;let checked=0;
for(const direction of ['east','west']){
 const o={direction,action:'attack',consumer:'world'},d=own.directions[direction],frames=[],ref=save('light');
 assert(await api.prepareClip(ref,o)); const prior=api.selectVisual(ref,o);
 const get=(p,n)=>{let c;assert(api.draw({save(){},restore(){},drawImage(q){c=q}},p,{...o,progress:(n+.1)/8}),JSON.stringify(api.snapshot()));assert.equal(c.width,640);return pix(c)};
 for(let n=0;n<8;n++){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-weapon-layers-hd/'+d.weapons[112][n].url),0,0);frames.push([get(ref,n),pix(c)]);c.width=1;}
 const eye=global.MareReworkModularOutfitsHD.sideIrisSamples(direction);assert.equal(eye.length,18);
 for(const s of Object.keys(A.skins)){
  const p=save(s),r=api.selectVisual(p,o); assert(r,s); assert.equal(p.appearance96.skinColor,s);
  assert(r.ownedGauntletSide);assert.equal(r.w112SidesPalette,s==='light'?undefined:s);
  assert.equal(r.fps,12);assert.deepEqual(r.timeline,own.timeline);assert.deepEqual(r.pivot,[80,128]);
  assert.deepEqual(r.states,prior.states);
  assert(await api.prepareClip(p,o));
  let changed=0,metal=0;
  for(let n=0;n<8;n++){const [b,g]=frames[n],a=get(p,n);
   for(let k=0;k<a.length;k+=4){assert.equal(a[k+3],b[k+3]);if(g[k+3]===255){assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));metal++;}else if(a.readUInt32LE(k)!==b.readUInt32LE(k))changed++;}
   for(const [x,y] of eye){const k=((y+66)*640+x+64)*4;assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));}
   checked++;
  }
  assert(metal>100);
  assert(s==='light'?changed===0:changed>1000);
  for(const q of [save(s,{classId:'cyborg'}),save(s,{equipment:{weapon:{def:112},coat:{def:151}}}),save(s,{equipment:{weapon:{def:112,variant:'special'}}}),save(s,{equipment:{weapon:{def:111}}})])assert(!api.selectVisual(q,o)?.w112SidesPalette);
  console.log(direction,s,8,changed,metal);global.gc?.();
 }
}
assert.equal(checked,128);console.log('PASS',checked);
})().catch(e=>{console.error(e);process.exitCode=1});
