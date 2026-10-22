'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{create}=require('../paper-doll.js');
const folder=path.join(__dirname,'../pixellab-pip-generations/paper-doll-east-fit-20261022');
const read=n=>JSON.parse(fs.readFileSync(path.join(folder,n),'utf8'));
const pack=read('review-pack.json'),manifest=read('manifest.json'),audit=read('fit-audit.json');
assert.deepEqual(pack.coverage['attack-sword'],['south','north','west','east']);
assert(pack.reviewOnly&&!pack.productionEnabled&&!pack.full_character_artwork_approved);
assert(pack.pieces.every(p=>p.approved===false));
assert.equal(pack.reviews.east.artwork_approved,false);
assert.equal(pack.reviews.east.modular_fit_gate_passed,false,'A calibration candidate must not silently gain artistic approval');
assert.deepEqual(manifest.paid_generation_calls,[]);assert.deepEqual(manifest.pending_jobs,[]);
assert.equal(audit.frames.length,8);assert.equal(audit.layers.length,48);
assert(audit.frames.every(f=>f.alpha_unchanged&&f.protected_arm_unchanged&&Object.values(f.changed_pixels).every(n=>n>0)));
assert.equal(new Set(audit.frames.map(f=>f.body_sha256_rgba)).size,8,'Keep eight distinct original body poses');
assert(audit.hand_contact.every(f=>f.distance<=1));
const weapon=pack.pieces.find(p=>p.slot==='weapon').animations['attack-sword'];
assert.deepEqual(weapon.occludedFrames.north,[1,2,3,4,5]);assert.equal(weapon.poseOverrides.east.length,8);
// Schema/approval checks only. Real PNG alpha, dimensions and Canvas composition are tested in Chromium.
const runtime=create({getImage:()=>({complete:true,naturalWidth:672,naturalHeight:336}),validatePixels:()=>null});
runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
for(const direction of pack.bodyCoverage)for(let frameIndex=0;frameIndex<8;frameIndex++){
 const pose={animationId:'attack-sword',direction,frameIndex};
 assert(runtime.resolve(pack.appearance,pose,{allowDraft:true}).valid);
 assert(!runtime.resolve(pack.appearance,pose).valid,'Never render this candidate through the production approval gate');
}
assert(!fs.readFileSync(path.join(__dirname,'../paper-doll-assets.js'),'utf8').includes('paper-doll-east-fit-20261022'));
console.log('East fitting:32 review poses, eight distinct bodies, protected anatomy, per-pose grip and production/artistic gates preserved.');
