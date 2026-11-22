
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const p={appearance96:{gender:'masculino',skinColor:'dark',hairStyle:'hair-bob',eyeColor:'green',hairColor:'pink'},equipment:{weapon:{def:17}}};
const fixtures=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json');
const bases=require('../tools/rework-base-hd/index.json');
const files=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
const drawOptions={consumer:'world',direction:'south'};
test('17 SOUTH carry preserves the rim and core while the receiving actor owns the hand',async()=>{
 const api=make();await api.ready;
 const carry=global.MareReworkWeaponCarryHD.create(bases,fixtures,{makeCanvas:cv.createCanvas});
 const selection=api.select(p,{...drawOptions,action:'walk'});
 assert.match(selection.id,/^carry17-male-walk-south-r7/);
 assert.equal(selection.colorAppearance.skin,'dark');
 const part=selection.plan.parts[0];
 const original=fixtures.records.find(r=>r.item===17&&r.direction==='south').parts[0];
 assert.equal(part.skinMaterial,undefined);assert.equal(part.hideHandBeyondWrist,undefined);
 assert.equal(part.source.sha256,'85afee2afc3551dba4ddebfa1ec6f724b72723f9073d02ae1aa1eabb16f99682');
 const prefix='tools/rework-weapon-layers-hd/';
 const painted=async source=>{
  const im=await files(prefix+source.url);assert.deepEqual([im.width,im.height],[640,640]);
  const ctx=cv.createCanvas(640,640).getContext('2d');ctx.drawImage(im,0,0);
  return (x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
 };
 const old=await painted(original.source),own=await painted(part.source);
 assert(old(383,342)[3]>0);assert.equal(own(383,342)[3],0,'donor palm removed');
 for(const [x,y] of [[380,351],[383,357]])assert.deepEqual(own(x,y),old(x,y),'rim and gem retain their pixels');
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

});
test('17 NORTH and lateral grips keep their independent native materials',async()=>{
 const carry=global.MareReworkWeaponCarryHD.create(bases,fixtures,{makeCanvas:cv.createCanvas});
 for(const direction of ['north','east','west']){
  const r=carry.resolve({item:17,body:'male',action:'walk',direction,appearance:{skin:'dark'}});
  assert(r,direction);
  const images=new Map(await Promise.all(carry.requiredFiles(r).map(async f=>[f,await files(f)])));
  for(let frame=0;frame<r.base.pack.directions[direction].clip.frames;frame++){
   const a=cv.createCanvas(512,512).getContext('2d'),b=cv.createCanvas(512,512).getContext('2d');
   carry.render(a,r,images,{frame,appearance:{skin:'dark'}});
   carry.render(b,r,images,{frame,appearance:{}});
   const aa=a.getImageData(0,0,512,512).data,bb=b.getImageData(0,0,512,512).data;
   let blue=0,changed=0,maxOrbDelta=0;
   for(let i=0;i<aa.length;i+=4){
    assert.equal(aa[i+3],bb[i+3]);
    if(bb[i+3]===255&&bb[i+2]>=125&&bb[i+2]>bb[i]&&bb[i+1]>bb[i]+35){
     for(let channel=0;channel<3;channel++)maxOrbDelta=Math.max(maxOrbDelta,Math.abs(aa[i+channel]-bb[i+channel]));
     blue++;
    }
    if(aa[i]!==bb[i])changed++;
   }
   assert(maxOrbDelta<=(direction==='north'?1:2),direction+'/'+frame+' orb channel rounding');
   assert(blue>35&&changed>300,direction+'/'+frame);
  }
 }
 const altered=structuredClone(fixtures);
 altered.records.find(r=>r.item===17&&r.direction==='east').parts[0].skinMaterial.sourceSHA256='0'.repeat(64);
 const mismatched=global.MareReworkWeaponCarryHD.create(bases,altered,{makeCanvas:cv.createCanvas});
 assert.equal(mismatched.resolve({item:17,body:'male',action:'idle',direction:'east',appearance:{skin:'dark'}}),null);
});
