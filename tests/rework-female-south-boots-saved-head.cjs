'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {make,cv}=require(root+'/tests/rework-integration-support.cjs'),A=require(root+'/character-appearance');
const load=require(root+'/tools/rework-hd-test-loader.cjs').create(root);
const o={action:'idle',direction:'south',consumer:'world',x:256,y:405,progress:0,weaponless:false};
require('node:test')('female South idle boots retain the saved hairstyle and every pixel outside their own pass',async()=>{
 const api=make();await api.ready;let proven=0;
 const render=async p=>{
  const b=await api.prepareConfiguration([{player:p,options:o}]);let im;assert(b.draw({save(){},restore(){},drawImage(v){im=v;}},p,o));
  assert(im.width===512&&im.height===512);const px=Buffer.from(im.getContext('2d').getImageData(0,0,512,512).data);b.release();return px;
 };
 for(const hairStyle of ['hair-spiky','hair-wavy','hair-cropped','hair-bob'])for(const skinColor of Object.keys(A.skins)){
  const off=A.commit({classId:'brawler',equipment:{coat:{def:151}}},{gender:'feminino',hairStyle,skinColor,hairColor:'blue',eyeStyle:'original',eyeColor:'blue'},()=>true);
  const baseline=api.selectVisual(off,o);assert.equal(baseline.femaleNamedHairRecord.style,hairStyle.slice(5));
  const fixed=await render(off);
  for(const id of [176,183]){
   const on={...off,equipment:{...off.equipment,boots:{def:id}}},copy=JSON.stringify(on),s=api.selectVisual(on,o);
   assert.equal(s?.slotRoutes.boots.item,id);assert.deepEqual(s.omitted,[]);assert.deepEqual(s.colorAppearance,baseline.colorAppearance);assert.equal(s.femaleNamedHairRecord.id,baseline.femaleNamedHairRecord.id);
   const pack=s.pack.directions.south,origin=baseline.pack.directions.south,layers=pack.layers.slice(origin.layers.length);
   assert.deepEqual(pack.layers.slice(0,-4),origin.layers);assert.deepEqual(pack.rest,origin.rest);assert.deepEqual(pack.poses,origin.poses);assert.deepEqual(pack.clip,origin.clip);
   const canvas=cv.createCanvas(512,512),cx=canvas.getContext('2d');
   for(const l of layers)cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png'),0,0);
   const mask=cx.getImageData(0,0,512,512).data,actual=await render(on);let n=0;
   for(let j=0;j<actual.length;j+=4)if(actual.readUInt32LE(j)!==fixed.readUInt32LE(j)){assert(mask[j+3]>0, 'change away from boot');n++;}
   assert(n>100);assert.equal(JSON.stringify(on),copy);assert.deepEqual(await render(off),fixed);
   if(hairStyle==='hair-spiky'&&skinColor==='copper'){
    assert(await api.prepare(on,o));const portrait=cv.createCanvas(420,480),a=api.drawFittedAvatar(portrait.getContext('2d'),on,{zoom:3});assert.equal(a?.source,s.id);assert.deepEqual(a.omitted,[]);
   }
   proven++;
  }
 }
 assert.equal(proven,64);console.log('PASS female South, two boots with four hairstyles, eight saved tones, 64 fit/unfit proofs');
});
