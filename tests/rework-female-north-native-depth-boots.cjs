'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(path.join(R,f));
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),
 bootIndex=r('tools/rework-modular-outfits-hd/index.json'),load=r('tools/rework-hd-test-loader.cjs').create(R);
const catalog=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')}).items;
const pose={consumer:'world',direction:'north',action:'walk'}, boots=[134,155,162,169].filter(n=>!process.env.BOOT||+process.env.BOOT===n),P='tools/rework-modular-outfits-hd/assets/';
const actor=(weapon,boot,skinColor)=>A.commit({classId:weapon==null?'brawler':catalog[weapon].type,equipment:{weapon:weapon==null?null:{def:weapon},boots:boot==null?null:{def:boot}}},{gender:'feminino',skinColor,...(skinColor==='ebony'?{hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}:{})},()=>true);
const makeC=(w=512)=>cv.createCanvas(w,w),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function prove(weapon,tones){
 const api=make();await api.ready;
 let ticks=0;
 for(const skin of tones)for(const boot of boots){
  const q=actor(weapon,boot,skin),p=actor(weapon,null,skin),save=JSON.stringify(q),source=api.selectVisual(q,pose);
  assert(source?.northLayers?.lower?.nativeDepthBootOnly,'certified independent North boot source missing '+[weapon,boot,skin]);
  assert.equal(source.slotRoutes.boots.item,boot);assert.deepEqual(source.omitted,[]);
  assert.equal(source.slotRoutes.weapon?.item,weapon??undefined);
  assert.equal(source.northLayers.lower.cloth,null);
  const g=source.northLayers.lower.gear,s=source.northLayers.spec,pad=source.northLayers.body.paddingPhysical||0,W=512+2*pad;
  const donor=bootIndex.records.find(x=>x.id===`frozen-v47-female-151-boot${boot}-north-walk`);
  assert.deepEqual(g,donor.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+boot+'-')));
  // The old unarmed pose may take its own 8-frame route. Pin the same authored
  // North correction/clock in the no-boot witness rather than comparing poses.
  const clean={...source,id:source.id+':without-boots-witness',northLayers:{...source.northLayers,lower:null}};
  const nakedSource={...clean,id:clean.id+':no-gear-witness',northLayers:{...clean.northLayers,body:{...clean.northLayers.body,states:clean.northLayers.body.states.map(st=>({...st,parts:[]}))}}};
  const proofTicks=[...new Set(s.frameToPhase)].map(n=>s.frameToPhase.indexOf(n));
  // Read and release each bundle before preparing another (large PNG layers).
  async function record(player,source){
   const bundle=await api.prepareConfiguration([{player,options:pose,source}],{resolve:x=>x}),r=new Map();
   try{for(const frame of proofTicks){
    let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},player,{...pose,progress:(frame+.125)/40}));
    r.set(frame,px(c));
   }}finally{bundle.release();global.gc?.();}
   return r;
  }
  const off=await record(p,clean),ov=await record(q,source);
  const naked=weapon==null?off:await record(p,nakedSource);
  let crossed=0,protectedGear=0,blended=0;
  for(const t of proofTicks){
   const before=off.get(t),withoutGear=naked.get(t),after=ov.get(t),
    a=makeC(W),ac=a.getContext('2d'),m=makeC(W),mc=m.getContext('2d'),orig=makeC(W),oc=orig.getContext('2d');
   const im=oc.createImageData(W,W);im.data.set(withoutGear);oc.putImageData(im,0,0);
   let sizes=0;
   for(const l of g)if(l.depth===-1){const f=await load(P+l.frames[t]+'.png');ac.drawImage(f,pad,pad);mc.drawImage(f,pad,pad);}
   ac.drawImage(orig,0,0);
   for(const l of g)if(l.depth===45){const f=await load(P+l.frames[t]+'.png');ac.drawImage(f,pad,pad);mc.drawImage(f,pad,pad);}
   const expected=px(a),mask=px(m),projected=makeC(W),gc=projected.getContext('2d');gc.imageSmoothingEnabled=false;
   const phase=s.phaseMap[s.frameToPhase[t]],parts=source.northLayers.body.states[phase].parts;
   for(const part of parts){
    gc.save();gc.translate(pad,pad);gc.transform(...part.matrix);
    if(part.sourceClip){gc.beginPath();gc.rect(...part.sourceClip);gc.clip();}
    gc.drawImage(await load(part.url),0,0);gc.restore();
   }
   const gear=px(projected);ac.drawImage(projected,0,0);oc.drawImage(projected,0,0);
   const withGear=px(a),noBootGear=px(orig);let overlap=0,checked=0;
   for(let i=0;i<before.length;i+=4){
    const same=before.readUInt32LE(i)===after.readUInt32LE(i),owns=mask[i+3]>0;
    if(!owns)assert(same,'outside signed shoe alpha '+[weapon,boot,t,i/4]);
    if(owns&&!same)sizes++;
    if(owns&&before.readUInt32LE(i)===withoutGear.readUInt32LE(i)){
     const slip=Math.max(...[0,1,2,3].map(k=>Math.abs(expected[i+k]-after[i+k])));
     assert(slip<=1,'shoe raster differs without weapon at '+[weapon,boot,t,i/4,slip]);checked++;
    }
    if(owns&&before.readUInt32LE(i)!==withoutGear.readUInt32LE(i)){
     overlap++;
     if(gear[i+3]===255&&before.readUInt32LE(i)===gear.readUInt32LE(i)){
      assert(same,'opaque weapon should stay above shaft');protectedGear++;
     }
     if(gear[i+3]&&[0,1,2,3].every(k=>Math.abs(before[i+k]-noBootGear[i+k])<=1)){
      assert([0,1,2,3].every(k=>Math.abs(after[i+k]-withGear[i+k])<=1),'source-over of weapon kept above shaft');
      blended++;
     }
    }
   }
   assert(sizes>120&&checked>200);ticks++;crossed+=overlap;
   a.width=m.width=orig.width=projected.width=1;
  }
  off.clear();ov.clear();naked.clear();global.gc?.();
  assert.equal(JSON.stringify(q),save);
  assert(!api.selectVisual({...q,equipment:{...q.equipment,legs:{def:168}}},pose)?.northLayers?.lower?.nativeDepthBootOnly);
  assert(!api.selectVisual({...q,equipment:{...q.equipment,boots:{def:boot,variant:'unverified'}}},pose)?.northLayers?.lower?.nativeDepthBootOnly);
  if(weapon===4&&boot===155)assert(crossed>0&&blended>0,'rifle case must cross boot and preserve natural blend');
  console.log('PASS',weapon,boot,skin,ticks,'weapon/boot overlap',crossed,'opaque weapon witnesses',protectedGear,'same gear blends',blended);
 }
 assert.equal(ticks,12*boots.length*tones.length);
}
if(process.env.NORTH_BOOT_SAMPLE!=null)prove(process.env.NORTH_BOOT_SAMPLE==='bare'?null:Number(process.env.NORTH_BOOT_SAMPLE),[process.env.SKIN||'light']).catch(e=>{console.error(e);process.exitCode=1;});
else for(const SKIN of ['light','ebony'])for(const [NORTH_BOOT_SAMPLE,BOOT] of [['bare','134'],['4','155'],['12','162'],['2','169']]){
 const run=require('node:child_process').spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,SKIN,NORTH_BOOT_SAMPLE,BOOT},stdio:'inherit'});
 assert.equal(run.status,0,run.error?.message||SKIN+'/'+NORTH_BOOT_SAMPLE);
}
