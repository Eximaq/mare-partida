'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{create}=require('../paper-doll.js');
const dir=path.resolve(__dirname,'../pixellab-pip-generations/paper-doll-exact-retouch-20261022');const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));const pack=read('review-pack.json'),manifest=read('manifest.json'),audit=read('retouch-audit.json');
assert.deepEqual(pack.coverage['attack-sword'],['south','north','west']);assert.equal(pack.bodyCoverage.length,4);assert.equal(pack.productionEnabled,false);assert(pack.pieces.every(p=>p.approved===false));
assert.equal(manifest.reported_paid_generations,5);assert(manifest.reported_paid_generations<=manifest.paid_generation_ceiling);assert.deepEqual(manifest.pending_jobs,[]);assert.equal(manifest.workbench_calls.length,4);
for(const d of ['north','east']){assert.equal(audit[d].frames.length,8);assert(audit[d].frames.every(f=>f.outside_declared_regions_unchanged));assert.equal(new Set(audit[d].frames.map(f=>f.ground_line)).size,1);}
assert.equal(audit.north.frames.reduce((sum,f)=>sum+f.changed_pixels,0),394);assert.equal(audit.east.frames.reduce((sum,f)=>sum+f.changed_pixels,0),40);
const weapon=pack.pieces.find(p=>p.slot==='weapon');assert.deepEqual(weapon.animations['attack-sword'].occludedFrames.north,[1,2,3,4,5]);assert.equal(weapon.animations['attack-sword'].directionOverrides.north.offsetY,-1);
assert.equal(read('east/flash-audit.json').outside_mask_difference_count,0);assert.equal(read('east/flash-audit.json').modular_fit_gate_passed,false);
// Metadata check only: companion Chromium decodes actual pixels, including truly empty weapon cells.
const runtime=create({getImage:()=>({complete:true,naturalWidth:672,naturalHeight:252}),validatePixels:()=>null});runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
for(const direction of ['south','north','west','east'])for(let frameIndex=0;frameIndex<8;frameIndex++){
 const pose={animationId:'attack-sword',direction,frameIndex};assert.equal(runtime.resolve(pack.appearance,pose,{allowDraft:true}).valid,direction!=='east');assert.equal(runtime.resolve(pack.appearance,pose).valid,false);
}
console.log('Exact retouch:three draft directions, four inspected bodies, real north occlusion, scoped394/40 net pixel repairs, five paid generations and failed east outfit blocked.');
