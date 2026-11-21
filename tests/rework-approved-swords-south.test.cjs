
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const index=require('../tools/rework-weapon-layers-hd/index.json');
const files=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
const o={consumer:'world',direction:'south',action:'attack-sword'};
test('four approved SOUTH swords keep their authored contact, native padding and save appearance',async()=>{
 const world=make();await world.ready;
 const compositor=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 for(const def of [1,67,68,69]){
  const p={appearance96:{gender:'masculino'},equipment:{weapon:{def}}};
  const r=world.select(p,o);
  assert.match(r.id,/-approved-head-appearance-original$/);
  assert.equal(r.fps,24);
  assert.equal(r.timeline.length,16);
  assert.equal(r.states.length,9);
  const inputs=new Map(await Promise.all(compositor.requiredFiles(r).map(async f=>[f,await files(f)])));
  for(const s of r.states){
   const a=cv.createCanvas(...r.nativeCanvas),b=cv.createCanvas(...r.nativeCanvas);
   const ac=a.getContext('2d'),bc=b.getContext('2d');
   const result=compositor.render(ac,r,inputs,{state:s.state});
   assert.deepEqual(result.pivot,def===69?{x:448,y:640}:{x:320,y:512});
   bc.drawImage(await files('tools/rework-weapon-layers-hd/'+s.approved.url),0,0);
   assert.deepEqual(ac.getImageData(0,0,a.width,a.height).data,bc.getImageData(0,0,b.width,b.height).data,def+'/'+s.state);
  }
  const custom={...p,appearance96:{...p.appearance96,hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeColor:'green'}};
  const picked=world.select(custom,o);
  assert.match(picked.id,/-approved-head-appearance-bob:eyes:original:green$/);
  assert(await world.prepare(custom,o));
  assert(world.draw(cv.createCanvas(900,900).getContext('2d'),custom,{...o,x:450,y:700}));
 }
});
