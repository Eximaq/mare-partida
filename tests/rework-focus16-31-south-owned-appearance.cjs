'use strict';
const assert=require('node:assert/strict');
const A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make();
const IDX=require('../tools/rework-weapon-layers-hd/index.json'),loader=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').join(__dirname,'..'));
const save=(opts={},def=31)=>JSON.parse(JSON.stringify(A.commit({id:'focus-side',classId:'strategist',equipment:{weapon:{def}}},{...opts},()=>true)));
(async()=>{await api.ready;
 const native=global.MareReworkWeaponNativeHD.create(IDX,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas});
 const arms=global.MareReworkModularOutfitsHD,wm='tools/rework-modular-outfits-hd/assets/';
 const materials={
 south:[0,0,'dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5'],
 east:[-8,4,'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a'],
 west:[8,4,'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1']};
 const buf=t=>Buffer.from(t.getContext('2d').getImageData(0,0,640,640).data);
 let checked=0;
 for(const item of [31,16])for(const direction of ['south']){
  const south=direction==='south',frames=8,o={direction,action:'attack-focus',consumer:'world'};
  const rows=[save({hairColor:'brown',eyeColor:'brown'},item),save({},item),save({hairColor:'pink',eyeColor:'green'},item)].map(p=>({p,before:JSON.stringify(p),r:api.select(p,o)}));
  assert.equal(rows[1].p.appearance96.skinColor,'light');assert.equal(rows[1].p.appearance96.eyeColor,'blue');assert.equal(rows[1].p.appearance96.hairColor,'black');
  const snapshot=south?IDX.records.find(r=>r.id==='daggers'+item+'-south-native-original-source'):IDX.orderedAttackProfiles.find(r=>r.id==='authored-ordered-'+item+'-'+direction);
  for(const q of rows){
   assert(q.r?.['approvedFocusSouth']);assert.deepEqual(q.r.states,snapshot.states);
   assert.deepEqual(q.r.timeline,snapshot.timeline);assert.deepEqual(q.r.pivot,[80,128]);assert.equal(q.r.fps,12);
   if(!south)assert.equal(q.r.contactTick,4);
  }
  const look=rows[1].p;
  for(const q of [save({skinColor:'ebony'},item),save({hairStyle:'hair-bob'},item),save({eyeStyle:'face-focused'},item),{...look,classId:'sword'},{...look,equipment:{weapon:{def:item,variant:'unreviewed'}}},{...look,equipment:{weapon:{def:item},coat:{def:151}}}]) assert(!api.select(q,o)?.approvedFocusSouth);
  for(const dir of ['north','east','west'])assert(!api.select(look,{...o,direction:dir})?.approvedFocusSouth);
  assert(!api.select(look,{...o,action:'walk'})?.approvedFocusSouth);
  if(item===31)assert(api.select({...look,classId:'healer'},o)?.approvedFocusSouth);
  const [,,hash]=materials[direction],m=cv.createCanvas(640,640);m.getContext('2d').drawImage(await loader(wm+hash+'.png'),0,0);
  const mask=buf(m);
  const ir=arms.southIrisSamples();
  const original=south?native.resolve({item,body:'male',direction,action:o.action}):rows[0].r;
  const imgs=new Map(await Promise.all(native.requiredFiles(original).map(async f=>[f,await loader(f)])));
  for(const q of rows)q.cfg=await api.prepareConfiguration([{player:q.p,source:q.r,options:o}],{resolve:x=>x});
  const draw=(q,i)=>{let c;assert(q.cfg.draw({save(){},restore(){},drawImage(v){c=v;}},q.p,{...o,progress:(i+.1)/frames}));return buf(c);};
  try{for(let i=0;i<frames;i++){
   const c=cv.createCanvas(1,1),meta=native.render(c.getContext('2d'),original,imgs,{frame:i});assert.equal(meta.state,String(i));assert.deepEqual(meta.pivot,{x:320,y:512});
   const a=draw(rows[0],i);assert.deepEqual(a,buf(c));
   const dy=0,allowed=new Map();
   for(let p=0;p<640*640;p++)if(mask[p*4])allowed.set(p+dy*640,['hair',mask[p*4]]);
   assert.equal(allowed.size,4090);
   for(const [x,y,R,G,B,alpha,rank]of ir){const k=y*640+x;assert(!allowed.has(k));assert.deepEqual([...a.subarray(k*4,k*4+4)],[R,G,B,alpha]);allowed.set(k,['eye',rank]);}

   for(const q of rows.slice(1)){
    const b=draw(q,i),hair=A.hairs[q.p.appearance96.hairColor].ramp.map(x=>parseInt(x.slice(1),16)),eye=A.eyes[q.p.appearance96.eyeColor].ramp.map(x=>parseInt(x.slice(1),16));
    for(let p=0;p<640*640;p++){
     const k=p*4,v=allowed.get(p);if(!v){assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));continue;}
     const n=(v[0]==='hair'?hair:eye)[v[1]-1];assert.equal(b.readUInt32LE(k),((a[k+3]<<24)|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0);
    }checked++;
   }
  }}finally{for(const q of rows){q.cfg.release();assert.equal(JSON.stringify(q.p),q.before);}}
  console.log('PASS',item,direction,frames,'original +',2*frames,'saved palette comparisons');global.gc?.();
 }
 assert.equal(checked,32);
})().catch(e=>{console.error(e);process.exitCode=1});
