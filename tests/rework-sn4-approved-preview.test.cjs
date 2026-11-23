'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs');
const proof=require('./fixtures/sn4-preview-proof.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const {read,referenceApi}=require('./rework-south-neck-reference.cjs');
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
