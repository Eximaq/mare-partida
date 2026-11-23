'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs');
const proof=require('./fixtures/sn4-preview-proof.json'),skin=require('../player-rework-skin-hd.js');
const sha=b=>createHash('sha256').update(b).digest('hex'),prefix='tools/rework-base-hd/assets/';
function read(image){
 const c=cv.createCanvas(512,512),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
 const out=ctx.getImageData(0,0,512,512);c.width=1;return out;
}
// Project the original attack into walking coordinates. Only the opaque
// samples shared by the signed neck and the walk-head difference belong
// to the saved skin. Hair, eyes and clothing are composed afterwards.
function referenceWalkHead(images,neck,r){
 assert.equal(neck.source,'961e610a5767deace01e30068b84874cda5a3701aaf2b2aaceff40314d02af7c');
 const own=r.ownership,source=read(images.get(prefix+neck.source+'.png')).data;
 const walk=read(images.get(prefix+own.walkHead+'.png')),w=walk.data;
 const composite=cv.createCanvas(640,640),ctx=composite.getContext('2d');
 for(const l of [...own.attackLayers].sort((a,b)=>a.depth-b.depth))ctx.drawImage(images.get(prefix+l.source+'.png'),0,0);
 const attack=ctx.getImageData(64,64,512,512).data;composite.width=1;
 const api=global.MareAppearance96,tinted=api.recolor(source,skin.mask(source,512,'anatomy'),api.skins[r.skinColor].ramp);
 const [x0,y0,x1,y1]=own.walkDifferenceBounds;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const k=(y*512+x)*4;
  if(source[k+3]===255&&[0,1,2,3].every(j=>w[k+j]===source[k+j])&&
     [0,1,2,3].some(j=>w[k+j]!==attack[k+j]))w.set(tinted.subarray(k,k+4),k);
 }
 const tile=cv.createCanvas(512,512);tile.getContext('2d').putImageData(walk,0,0);return tile;
}
async function referenceApi(useSavedSkin){
 const real=global.MareFemaleNamedHairHD;
 global.MareFemaleNamedHairHD={create(...args){
  const registry=real.create(...args),primed=new Set();
  function head(base,r,images){
   const d=base.pack.directions.south,neck=d?.layers.find(l=>l.id==='chest-neck-rigid');
   if(!neck||primed.has(r.id))return registry.compose(base,r,images);
   // Compose the historical head in isolation, then draw the original body
   // with its full neck and arm planes. Each reference renderer has its own cache.
   const pack={...base.pack,directions:{...base.pack.directions,south:{...d,layers:d.layers.filter(l=>l!==neck)}}};
   if(useSavedSkin){images=new Map(images);images.set(prefix+r.ownership.walkHead+'.png',referenceWalkHead(images,neck,r));}
   const tile=registry.compose({...base,pack},r,images);primed.add(r.id);return tile;
  }
  return {...registry,compose:head,render(ctx,base,r,imgs,opts){head(base,r,imgs);return registry.render(ctx,base,r,imgs,opts);}};
 }};
 try{const api=make();await api.ready;return api;}finally{global.MareFemaleNamedHairHD=real;}
}
async function frame(api,actor){
 const o={action:'walk',direction:'south'},r=api.select(actor,o);
 const bundle=await api.prepareConfiguration([{player:actor,options:o}]);
 try{
  const tick=r.authoredPantsLayer.spec.frameToPhase.indexOf(proof.phase);assert(tick>=0);
  const c=cv.createCanvas(512,512),ctx=c.getContext('2d');ctx.scale(374/105,374/105);
  assert(bundle.draw(ctx,actor,{...o,progress:(tick+.01)/40,x:256*105/374,y:448*105/374}));
  const pixels=Buffer.from(ctx.getImageData(0,0,512,512).data);c.width=1;return pixels;
 }finally{bundle.release();}
}
test('four technical previews retain their signed pixels and the saved neck palette under hair and fabric',async()=>{
 const file=fs.readFileSync(path.join(__dirname,'fixtures',proof.file));assert.equal(sha(file),proof.sha256);
 const zip=await require('../player-rework-zip.js').loadArchive(file,proof.sha256);
 const current=make();await current.ready;const historical=await referenceApi(false),corrected=await referenceApi(true);
 for(const [id,ref] of Object.entries(proof.references)){
  const bytes=Buffer.from(await zip.read(ref.member));assert.equal(sha(bytes),ref.sha256);
  const signed=Buffer.from(read(await cv.loadImage(bytes)).data);
  const actor={classId:'sword',appearance96:{...proof.appearance},equipment:{legs:{def:Number(id)},coat:{def:151},boots:{def:155},gloves:{def:152}}};
  assert((await frame(historical,actor)).equals(signed),'original technical preview '+id);
  const expected=await frame(corrected,actor),actual=await frame(current,actor);
  assert(!expected.equals(signed),'visible saved neck '+id);
  assert(actual.equals(expected),'current full frame '+id);
 }
});
