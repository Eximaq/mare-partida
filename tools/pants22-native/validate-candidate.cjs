'use strict';
// Structural validation is not visual approval. Uses the production compositor.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../..'),folder=path.resolve(process.argv[2]);
require('../rework-accessories/vendor.js');
const index=require('../rework-modular-outfits-hd/index.json'),base=require('../rework-base-hd/index.json'),load=require('../rework-hd-test-loader.cjs').create(root),records=JSON.parse(fs.readFileSync(folder+'/records.json'));
const renderer=require('../../player-rework-modular-outfits-hd.js').create({schema:index.schema,records},{allowCandidates:true});
(async()=>{
 const result=[];
 for(const record of records){
  assert.equal(record.productionEnabled,false);assert.equal(record.adaptation.visualApproved,false);assert.equal(record.item,22);assert.deepEqual(record.equipment,{pants:22});
  const d=record.pack.directions[record.direction],target=[...index.records,...base.records].find(r=>r.id===record.adaptation.targetGeometry),original=target.pack.directions[target.direction];
  assert.deepEqual(record.pack.frame,target.pack.frame);assert.deepEqual(record.pack.pivot,target.pack.pivot);assert.deepEqual(d.clip,original.clip);assert.deepEqual(d.poses,original.poses);
  const garment=d.layers.find(l=>l.id.startsWith('pants22-'));assert(garment);assert.equal(garment.frames.length,d.clip.frames);
  for(const layer of d.layers.filter(l=>l!==garment))assert.deepEqual(layer,original.layers.find(l=>l.id===layer.id),'Base layer changed: '+layer.id);
  const images=new Map();for(const file of renderer.requiredFiles(record)){const sha=path.basename(file,'.png'),local=folder+'/assets/'+sha+'.png';if(fs.existsSync(local)){const bytes=fs.readFileSync(local);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha);images.set(file,await cv.loadImage(bytes));}else images.set(file,await load(file));}
  for(let frame=0;frame<d.clip.frames;frame++){
   const image=images.get('tools/rework-modular-outfits-hd/assets/'+garment.frames[frame]+'.png'),width=record.pack.frame.width*4;assert.equal(image.width,width);assert.equal(image.height,record.pack.frame.height*4);
   const tile=cv.createCanvas(width,image.height);renderer.render(tile.getContext('2d'),record,images,{frame});
   result.push({record:record.id,frame,layer:garment.id,sha:garment.frames[frame],canvas:[width,image.height],status:'decoded-and-composited-not-visual-approval'});
  }
 }
 fs.writeFileSync(folder+'/validation.json',JSON.stringify({productionEnabled:false,frames:result},null,2));console.log(result.length+' frames decoded and composited; base layers, pivots, poses and timing unchanged; visual approval NOT implied');
})().catch(e=>{console.error(e);process.exitCode=1});
