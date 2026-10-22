'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{create}=require('../paper-doll.js');
const folder=path.resolve(__dirname,'../pixellab-pip-generations/paper-doll-bento-directions-20261021');
const read=name=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
const pack=read('review-pack.json'),manifest=read('manifest.json'),audit=read('assembly-audit.json');
assert.deepEqual(pack.coverage['attack-sword'],['south','west']);assert.equal(pack.productionEnabled,false);
assert.equal(manifest.charged_generations,9);assert(manifest.charged_generations<=manifest.generation_ceiling);assert.deepEqual(manifest.pending_jobs,[]);
assert.equal(pack.reviews.north.body_motion_gate_passed,false);assert.equal(pack.reviews.east.modular_fit_gate_passed,false);
assert(audit.body_records.west.every(r=>r.ground_line===65&&r.body_padding[1]===9));
// This suite checks metadata/gates. Companion Chromium tests decode the real PNG pixels.
const r=create({getImage:()=>({complete:true,naturalWidth:672,naturalHeight:168}),validatePixels:()=>null});r.registerRig(pack.rig);pack.pieces.forEach(p=>r.registerPiece(p));
for(const direction of ['south','west','north','east'])for(let i=0;i<8;i++){
 const pose={animationId:'attack-sword',direction,frameIndex:i};
 const draft=r.resolve(pack.appearance,pose,{allowDraft:true});assert.equal(draft.valid,['south','west'].includes(direction));
 if(!draft.valid)assert(draft.missing.every(m=>m.code==='missing-direction'));
 assert.equal(r.resolve(pack.appearance,pose).valid,false,'Unapproved candidates must stay unavailable to production');
}
for(const d of ['north','west','east']){
 const request=read(d+'/request.json');assert.equal(request.direction,d);assert.equal(request.keypoints.length,8);
 const labels=new Set(request.first_frame_keypoints.map(p=>p.label));assert.equal(labels.size,18);
 for(const pose of request.keypoints){assert.equal(pose.length,18);assert.deepEqual(new Set(pose.map(p=>p.label)),labels);assert(pose.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));}
 assert.equal(read(d+'/manifest.json').reported_usage.generations,3);
}
assert.deepEqual(read('east/controls.json').inferred_occluded_pose_indices,[5]);
console.log('Directional doll: south/west draft only, atomic north/east fallback, fixed west ground, production blocked,18 joints x24 real outputs and9 charged generations passed.');
