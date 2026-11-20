'use strict';
const assert=require('node:assert/strict');
const A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make();
const IDX=require('../tools/rework-weapon-layers-hd/index.json'),loader=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').join(__dirname,'..'));
const save=(opts={},def=12)=>JSON.parse(JSON.stringify(A.commit({id:'dagger12',classId:'rogue',equipment:{weapon:{def}}},{...opts},()=>true)));
(async()=>{await api.ready;
 const native=global.MareReworkWeaponNativeHD.create(IDX,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas});
 const arms=global.MareReworkModularOutfitsHD,wm='tools/rework-modular-outfits-hd/assets/';
 const materials={
 south:[0,0,'dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5'],
 east:[-8,4,'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a'],
 west:[8,4,'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1']};
 const buf=t=>Buffer.from(t.getContext('2d').getImageData(0,0,640,640).data);
 let checked=0;
 for(const direction of ['south','east','west']){
  const south=direction==='south',frames=south?9:8,o={direction,action:'attack-daggers',consumer:'world'};
  const rows=[save({hairColor:'brown',eyeColor:'brown'}),save(),save({hairColor:'pink',eyeColor:'green'})].map(p=>({p,before:JSON.stringify(p),r:api.select(p,o)}));
  assert.equal(rows[1].p.appearance96.skinColor,'light');assert.equal(rows[1].p.appearance96.eyeColor,'blue');assert.equal(rows[1].p.appearance96.hairColor,'black');
  const snapshot=south?IDX.records.find(r=>r.id==='daggers12-south-native-original-source'):IDX.orderedAttackProfiles.find(r=>r.id==='authored-ordered-12-'+direction);
  for(const q of rows){
   assert(q.r?.[south?'approvedDagger13South':'orderedAttack']);assert.deepEqual(q.r.states,snapshot.states);
   assert.deepEqual(q.r.timeline,snapshot.timeline);assert.deepEqual(q.r.pivot,[80,128]);assert.equal(q.r.fps,12);
   if(!south)assert.equal(q.r.contactTick,4);
  }
  const look=rows[1].p;
  for(const q of [save({skinColor:'ebony'}),save({hairStyle:'hair-bob'}),save({eyeStyle:'face-focused'}),{...look,classId:'sword'},{...look,equipment:{weapon:{def:12,variant:'unreviewed'}}},{...look,equipment:{weapon:{def:12},coat:{def:151}}}]) assert(!api.select(q,o)?.[south?'approvedDagger13South':'orderedDaggerIris']);
  if(south)for(const item of [71,72,73,74])assert(!api.select(save({},item),o)?.approvedDagger13South);
  const [dx,dy,hash]=materials[direction],m=cv.createCanvas(640,640);m.getContext('2d').drawImage(await loader(wm+hash+'.png'),0,0);
  const mask=buf(m),allowed=new Map();
  for(let p=0;p<640*640;p++)if(mask[p*4]) allowed.set(p+dx+dy*640,['hair',mask[p*4]]);
  assert.equal(allowed.size,south?4090:4040);
  const ix=south?0:direction==='east'?56:72,iy=south?0:68;
  for(const [x,y,R,G,B,alpha,rank]of(south?arms.southIrisSamples():arms.sideIrisSamples(direction))){const k=(y+iy)*640+x+ix;assert(!allowed.has(k));allowed.set(k,['eye',rank]);}
  const original=south?native.resolve({item:12,body:'male',direction,action:o.action}):rows[0].r;
  const imgs=new Map(await Promise.all(native.requiredFiles(original).map(async f=>[f,await loader(f)])));
  for(const q of rows)q.cfg=await api.prepareConfiguration([{player:q.p,source:q.r,options:o}],{resolve:x=>x});
  const draw=(q,i)=>{let c;assert(q.cfg.draw({save(){},restore(){},drawImage(v){c=v;}},q.p,{...o,progress:(i+.1)/frames}));return buf(c);};
  try{for(let i=0;i<frames;i++){
   const c=cv.createCanvas(1,1),meta=native.render(c.getContext('2d'),original,imgs,{frame:i});assert.equal(meta.state,String(i));assert.deepEqual(meta.pivot,{x:320,y:512});
   const a=draw(rows[0],i);assert.deepEqual(a,buf(c));
   for(const q of rows.slice(1)){
    const b=draw(q,i),hair=A.hairs[q.p.appearance96.hairColor].ramp.map(x=>parseInt(x.slice(1),16)),eye=A.eyes[q.p.appearance96.eyeColor].ramp.map(x=>parseInt(x.slice(1),16));
    for(let p=0;p<640*640;p++){
     const k=p*4,v=allowed.get(p);if(!v){assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));continue;}
     const n=(v[0]==='hair'?hair:eye)[v[1]-1];assert.equal(b.readUInt32LE(k),((a[k+3]<<24)|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0);
    }checked++;
   }
  }}finally{for(const q of rows){q.cfg.release();assert.equal(JSON.stringify(q.p),q.before);}}
  console.log('PASS W12',direction,frames,'original +',2*frames,'saved palette comparisons');global.gc?.();
 }
 assert.equal(checked,50);
})().catch(e=>{console.error(e);process.exitCode=1});
