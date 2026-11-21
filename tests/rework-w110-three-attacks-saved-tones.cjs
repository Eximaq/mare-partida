'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const i=require(R+'/tools/rework-weapon-layers-hd/index.json');
const save=(s,extra={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'held-tool-test',classId:'brawler',equipment:{weapon:{def:110}},...extra},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:s,...look},()=>true)));
const u='tools/rework-weapon-layers-hd/';
const px=(c,n)=>Buffer.from(c.getContext('2d').getImageData(0,0,n,n).data);
function apply(c,im,mirror){
 const x=c.getContext('2d');x.save();x.imageSmoothingEnabled=false;if(mirror){x.translate(c.width,0);x.scale(-1,1);}x.drawImage(im,0,0);x.restore();
}
(async()=>{await api.ready;let checked=0,gearPoints=0,alphaMax=0;
for(const d of ['north','east','west']){
 const opt={direction:d,action:'attack',consumer:'world'},R=i.records.find(x=>x.id===`gauntlet110-${d}-native-original-source`),north=d==='north',side=d==='west',n=R.nativeCanvas[0];
 const witnesses=[];
 for(let f=0;f<8;f++){
  const judge=api.selectVisual(save('light'),opt);assert(judge?.w110OwnDirectionalAttack,`missing real W110 ${d}`);
  const c=cv.createCanvas(n,n),old=await load(u+R.states[f].approved.url),gear=await load(u+judge.states[f].layers[1].url);
  apply(c,old,false);const neutral=px(c,n);c.getContext('2d').clearRect(0,0,n,n);apply(c,gear,side);const g=px(c,n);c.width=1;
  witnesses.push([neutral,g]);
 }
 for(const sk of Object.keys(A.skins)){
  const p=save(sk),q=api.selectVisual(p,opt);assert(q?.w110OwnDirectionalAttack);assert.equal(q.fps,12);assert.deepEqual(q.timeline,R.timeline);assert.deepEqual(q.pivot,R.pivot);assert.deepEqual(q.nativeCanvas,R.nativeCanvas);
  assert(await api.prepareClip(p,opt));
  for(let f=0;f<8;f++){
   let c; assert(api.draw({save(){},restore(){},drawImage(q){c=q}},p,{...opt,progress:(f+.1)/8}),JSON.stringify(api.snapshot()));
   const actual=px(c,n),v=q.states[f],nb=v.layers[0],ng=v.layers[1],quiet=cv.createCanvas(n,n);
   assert.equal(c.width,n);assert.equal(c.height,n);assert.equal(v.approved.sha256,R.states[f].approved.sha256);
   assert.equal(nb.mirrorX,side);assert.equal(ng.mirrorX,side);
   apply(quiet,await load(u+nb.url),side);apply(quiet,await load(u+ng.url),side);
   assert(actual.equals(px(quiet,n)),`own original gear/pose order ${d}/${sk}/${f}`);quiet.width=1;
   const [old,g]=witnesses[f];
   for(let p=0;p<actual.length;p+=4){
    alphaMax=Math.max(alphaMax,Math.abs(actual[p+3]-old[p+3]));
    if(g[p+3]===255){assert.equal(actual.readUInt32LE(p),old.readUInt32LE(p));gearPoints++;}
   }
   checked++;
  }
  assert(!api.selectVisual(save(sk,{classId:'cyborg'}),opt)?.w110OwnDirectionalAttack);
  assert(!api.selectVisual(save(sk,{equipment:{weapon:{def:110},coat:{def:179}}}),opt)?.w110OwnDirectionalAttack);
  assert(!api.selectVisual(save(sk,{equipment:{weapon:{def:110,appearanceVariant:'unreviewed'}}}),opt)?.w110OwnDirectionalAttack);
  assert(!api.selectVisual(save(sk,{}, {hairColor:'brown'}),opt)?.w110OwnDirectionalAttack);
  for(const x of [{direction:'south'},{weaponless:true},{consumer:'portrait'},{action:'walk'}])assert(!api.selectVisual(p,{...opt,...x})?.w110OwnDirectionalAttack);
  console.log(d,sk,'PASS 8 actual World');global.gc?.();
 }
}
assert.equal(checked,192);assert.equal(alphaMax,0);assert(gearPoints>0);
console.log('PASS',checked,'whole alpha max',alphaMax,'opaque gear',gearPoints);
})().catch(e=>{console.error(e);process.exitCode=1});
