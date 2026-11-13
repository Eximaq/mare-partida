const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{createCanvas}=require('@napi-rs/canvas');
const nativeLoad=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
const index=require('./tools/rework-modular-outfits-hd/index.json'),archive=require('./tools/rework-modular-outfits-hd/archives/archive-index.json'),vendor=require('./tools/rework-accessories/vendor.js'),{create}=require('./player-rework-modular-outfits-hd.js'),prefix='tools/rework-modular-outfits-hd/assets/',api=create(index,{vendor,prefix,allowCandidates:true});
const protectedPack=pack=>({...pack,directions:Object.fromEntries(Object.entries(pack.directions).map(([dir,d])=>[dir,{...d,layers:d.layers.filter(l=>!l.id.startsWith('own-female152-')).sort((a,b)=>a.id.localeCompare(b.id))}]))});
(async()=>{
 const records=index.records.filter(r=>r.body==='female'&&['idle','walk'].includes(r.action)&&/^(female_6_|female_outfit151-154-152-155_).*source-pack(?:-idle-frame0)?$/.test(r.id));assert.equal(records.length,16);let frames=0,selectedFrames=0;
 for(const r of records){
  assert.equal(r.candidate,true);assert.equal(r.pack.density,4);assert.equal(r.pack.frame.width,128);
  const selected=api.resolve({body:r.body,direction:r.direction,action:r.action,equipment:r.equipment});assert(selected);
  if(selected.id!==r.id){
   assert.equal(selected.sourceOutfitId,r.id,'revision must name the exact parent');assert.deepEqual(selected.equipment,r.equipment);
   assert.equal(selected.id,'frozen-female-glove152-'+r.direction+'-'+r.action+'-native-layers');assert.equal(selected.frozenFemaleGloveLayers,true);
   assert.equal(selected.frozenGloveSourceRef,{south:'ref-0633',east:'ref-0712',west:'ref-0713',north:'ref-0985'}[r.direction]);
   // SOUTH/NORTH have their own frozen glove revisions. Every non-glove source, pose,
   // depth, pivot and timing must stay identical to the protected parent.
   assert.deepEqual(protectedPack(selected.pack),protectedPack(r.pack));
   if(['east','west'].includes(r.direction)){
    const layers=x=>[...x.pack.directions[r.direction].layers].sort((a,b)=>a.id.localeCompare(b.id));
    assert.deepEqual(layers(selected),layers(r));assert.deepEqual([...selected.sourceRefs].sort(),[...r.sourceRefs].sort());
   }
  }
  assert.equal(api.resolve({body:r.body,direction:r.direction,action:r.action,equipment:{...r.equipment,weapon:109}}),null);
  const images=new Map();for(const s of new Set([...r.sourceRefs,...selected.sourceRefs])){assert.ok(archive.sources[s]);images.set(prefix+s+'.png',await nativeLoad(prefix+s+'.png'));}
  const canvas=createCanvas(512,512);
  for(let f=0;f<r.pack.directions[r.direction].clip.frames;f++){
   api.render(canvas.getContext('2d'),r,images,{frame:f});frames++;
   api.render(canvas.getContext('2d'),selected,images,{frame:f});selectedFrames++;
  }
 }
 assert.equal(frames,328);assert.equal(selectedFrames,328);console.log('16 original female outfits / 328 parent and 328 selected native512 frames; protected body, head, clothing and timeline verified');
})().catch(e=>{console.error(e);process.exit(1)});
