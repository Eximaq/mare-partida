
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const p={appearance96:{gender:'masculino',skinColor:'dark',hairStyle:'hair-bob',eyeColor:'green',hairColor:'pink'},equipment:{weapon:{def:17}}};
const fixtures=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json');
const bases=require('../tools/rework-base-hd/index.json');
const files=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
const drawOptions={consumer:'world',direction:'south'};
test('17 SOUTH carry keeps the same source while recoloring only the marked hand',async()=>{
 const api=make();await api.ready;
 const carry=global.MareReworkWeaponCarryHD.create(bases,fixtures,{makeCanvas:cv.createCanvas});
 const selection=api.select(p,{...drawOptions,action:'walk'});
 assert.match(selection.id,/^carry17-male-walk-south-r7/);
 assert.equal(selection.colorAppearance.skin,'dark');
 const part=selection.plan.parts[0];
 assert.equal(part.source.sha256,part.skinMaterial.sourceSHA256);
 const prefix='tools/rework-weapon-layers-hd/';
 const source=await files(prefix+part.source.url),mask=await files(prefix+part.skinMaterial.url);
 const maskCtx=cv.createCanvas(640,640).getContext('2d');maskCtx.drawImage(mask,0,0);
 assert.equal(maskCtx.getImageData(383,342,1,1).data[0],255,'source hand');
 assert.equal(maskCtx.getImageData(380,351,1,1).data[0],0,'gold rim');
 assert.equal(maskCtx.getImageData(383,357,1,1).data[0],0,'orb core');
 assert.deepEqual([source.width,source.height],[640,640]);
 const images=new Map(await Promise.all(carry.requiredFiles(selection).map(async f=>[f,await files(f)])));
 for(const action of ['walk','idle']){
  const r=api.select(p,{...drawOptions,action});
  assert.match(r.id,/^carry17-/);
  for(const f of carry.requiredFiles(r))if(!images.has(f))images.set(f,await files(f));
  for(let frame=0;frame<r.base.pack.directions.south.clip.frames;frame++){
   const a=cv.createCanvas(512,512).getContext('2d'),b=cv.createCanvas(512,512).getContext('2d');
   carry.render(a,r,images,{frame,appearance:{skin:'dark'}});
   carry.render(b,r,images,{frame,appearance:{}});
   const aa=a.getImageData(0,0,512,512).data,bb=b.getImageData(0,0,512,512).data;
   let blue=0,changed=0;
   for(let i=0;i<aa.length;i+=4){
    assert.equal(aa[i+3],bb[i+3],action+'/'+frame+' alpha '+i);
    if(bb[i+3]===255&&bb[i+2]>=125&&bb[i+2]>bb[i]&&bb[i+1]>bb[i]+35){
     assert.deepEqual(aa.slice(i,i+4),bb.slice(i,i+4));
     blue++;
    }
    if(aa[i]!==bb[i])changed++;
   }
   assert(blue>35&&changed>300,action+'/'+frame);
  }
 }
 assert.equal(carry.resolve({item:17,body:'male',action:'idle',direction:'north',appearance:{skin:'dark'}}),null);
});
