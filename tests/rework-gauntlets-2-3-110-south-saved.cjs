'use strict';
const assert=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs');
const A=require('../character-appearance.js'),idx=require('../tools/rework-weapon-layers-hd/index.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname)),api=make();
const opt={direction:'south',action:'attack-unarmed',consumer:'world'};
const save=(item,look={},extras={})=>JSON.parse(JSON.stringify(A.commit({id:'south-gauntlet',classId:'brawler',equipment:{weapon:{def:item}},...extras},
 {skinColor:'light',hairColor:'black',eyeColor:'blue',...look},()=>true)));
const raster=async f=>{const c=cv.createCanvas(640,640).getContext('2d');c.drawImage(await load(f),0,0);return Buffer.from(c.getImageData(0,0,640,640).data);};
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const hh='tools/rework-modular-outfits-hd/assets/',weapon='tools/rework-weapon-layers-hd/';
const h0='4d7b8fa3090367f80f4ded64a1bbc2c0759f3a1d2402ec9e8be112333c0297a7.png',m0='dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5.png';
const write=(b,i,c)=>{const n=parseInt(c.slice(1),16);b.set([n>>>16,(n>>>8)&255,n&255],i);};
(async()=>{await api.ready;const [hair,mask]=await Promise.all([raster(hh+h0),raster(hh+m0)]),eyes=global.MareReworkModularOutfitsHD.southIrisSamples();
 assert.equal(eyes.length,45);const anatomy=idx.orderedAttackProfiles.find(x=>x.id==='authored-ordered-14-south');
 for(const item of [2,3,110]){
  const actor=save(item),snapshot=JSON.stringify(actor),native=api.selectVisual(actor,opt),
   stock=idx.records.find(r=>r.id===`gauntlet${item}-south-native-original-source`);
  assert(native?.gauntletsSouthSavedHead,'signed Light South attack, gauntlet '+item);
  assert.equal(native.fps,12);assert.deepEqual(native.timeline,stock.timeline);assert.deepEqual(native.pivot,[80,128]);assert.deepEqual(native.states,stock.states);
  assert.equal(api.selectVisual(actor,{...opt,action:'attack'})?.id,native.id);
  const literal={...actor,appearance96:{...actor.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
  assert.equal(api.selectVisual(literal,opt).id,stock.id);
  const wrong=[save(item,{skinColor:'ebony'}),save(item,{hairStyle:'hair-bob'}),save(item,{hairColor:'brown'}),save(item,{eyeColor:'gray'}),save(item,{},{classId:'cyborg'}),
   save(item,{},{equipment:{weapon:{def:item,variant:'original',appearanceVariant:'other'}}}),save(item,{},{equipment:{weapon:{def:item},coat:{def:151}}}),save(item,{},{equipment:{weapon:{def:item},head:{def:157}}}),save(112)];
  for(const a of wrong)assert(!api.selectVisual(a,opt)?.gauntletsSouthSavedHead);
  for(const o of [{direction:'north'},{direction:'east'},{direction:'west'},{consumer:'preview'},{weaponless:true},{action:'idle'},{action:'walk'}])
   assert(!api.selectVisual(actor,{...opt,...o})?.gauntletsSouthSavedHead);
  const prepared=await api.prepareConfiguration([{player:actor,source:native,options:opt}],{resolve:x=>x});
  try{for(let f=0;f<12;f++){
   const [old,b]=await Promise.all([raster(weapon+stock.states[f].layers[0].url),raster(weapon+anatomy.states[f].layers[0].url)]);
   const ref=Buffer.from(old);let count=0;
   for(let i=0;i<ref.length;i+=4)if(mask[i]){
    assert.equal(old.readUInt32LE(i),b.readUInt32LE(i));assert.equal(old.readUInt32LE(i),hair.readUInt32LE(i));
    write(ref,i,A.hairs.black.ramp[mask[i]-1]);count++;
   }
   assert.equal(count,4090);
   for(const [x,y,r,g,v,a,t]of eyes){
    const i=(640*y+x)*4;assert.deepEqual([...b.subarray(i,i+4)],[r,g,v,a]);assert.equal(old.readUInt32LE(i),b.readUInt32LE(i));write(ref,i,A.eyes.blue.ramp[t-1]);
   }
   let frame;assert(prepared.draw({save(){},restore(){},drawImage(c){frame=c;}},actor,{...opt,progress:(f+.5)/12,x:320,y:512}));
   assert(pix(frame).equals(ref),'item '+item+' phase '+f+' changes only exact owned hair/iris RGBA');
  }}finally{prepared.release();}
  assert.equal(JSON.stringify(actor),snapshot);global.gc?.();console.log('PASS',item,'12@12, stock skin and hardware and 4,135 signed head pixels');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
