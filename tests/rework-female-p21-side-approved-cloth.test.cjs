'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const R=process.env.P21_TEST_ROOT||path.resolve(__dirname,'..');
const {make,cv}=require(R+'/tests/rework-integration-support.cjs');
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R);

test('World female P21 lateral gait keeps the exact approved independent cloth under the profile rig',async()=>{
 const world=make();await world.ready;
 const index=JSON.parse(fs.readFileSync(R+'/tools/rework-modular-outfits-hd/index.json'));
 const look={gender:'female',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
 const alternate={...look,hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber',skinColor:'olive'};
 const actor={appearance96:look,equipment:{legs:{def:21}}};
 const ctx=cv.createCanvas(512,512).getContext('2d');
 async function pixels(file){
  ctx.clearRect(0,0,512,512);
  ctx.drawImage(await load(file),0,0);
  return Buffer.from(ctx.getImageData(0,0,512,512).data);
 }
 for(const direction of ['east','west']){
  const o={consumer:'world',action:'walk',direction};
  const r=world.select(actor,o);
  assert.equal(r?.profileLayers?.pants,21);
  const {clock,poses}=r.profileLayers.spec.directions[direction];
  const approved=index.independentPants.records.find(a=>a.equipment.pants===21&&a.direction===direction);
  const clip=approved.pack.directions[direction].clip;
  assert.deepEqual(r.pack.directions[direction].clip,clip);
  assert.deepEqual(r.pack.pivot,approved.pack.pivot);
  const cloth=approved.pack.directions[direction].layers.find(l=>l.id==='approved-cloth');
  assert.equal(clock.length,40);
  const seen=new Set();
  for(const [tick,phase] of clock.entries()){
   const file='tools/rework-modular-outfits-hd/assets/'+cloth.frames[tick]+'.png';
   const current=poses[phase].cloth,key=JSON.stringify([file,current]);
   if(seen.has(key))continue;
   seen.add(key);
   assert((await pixels(file)).equals(await pixels(current)),direction+' tick '+tick);
  }
  assert.equal(new Set(clock).size,12);
  for(const appearance96 of [look,alternate])for(const def of [null,0,5,17]){
   const p={appearance96,equipment:{legs:{def:21},...(def===null?{}:{weapon:{def}})}};
   const equipped=world.select(p,o);
   assert.equal(equipped?.profileLayers?.pants,21, JSON.stringify([direction,appearance96,def,equipped?.id]));
   assert.equal(equipped.profileLayers.body.item,def);
   assert.equal(equipped.profileLayers.spec,r.profileLayers.spec);
   const unequipped=world.select({...p,equipment:def===null?{}:{weapon:{def}}},o);
   assert.notEqual(unequipped?.profileLayers?.pants,21);
  }
 }
 ctx.canvas.width=1;
});
