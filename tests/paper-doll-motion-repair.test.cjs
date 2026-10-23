'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../pixellab-pip-generations/paper-doll-bento-repair-20261022');
const previous=path.resolve(dir,'../paper-doll-bento-directions-20261021');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const pack=read('review-pack.json'),manifest=read('manifest.json');
assert.equal(manifest.charged_generations,6);assert.equal(manifest.calls.length,2);assert.deepEqual(manifest.pending_jobs,[]);assert(manifest.charged_generations<=manifest.generation_ceiling);
assert.deepEqual(pack.coverage['attack-sword'],['south','west']);assert(pack.pieces.every(piece=>piece.approved===false));assert.equal(pack.productionEnabled,false);
for(const direction of ['north','east']){
 const call=read(direction+'/manifest.json'),request=read(direction+'/request.json'),review=read(direction+'/review.json');
 assert.equal(call.status,'completed');assert.equal(call.reported_usage.generations,3);assert.equal(request.view,'low top-down');assert.equal(request.keypoints.length,8);
 assert.equal(review.body_motion_gate_passed,false);assert.equal(review.modular_fit_gate_passed,false);
 for(const ankle of ['LEFT LEG','RIGHT LEG'])assert.equal(new Set(request.keypoints.map(pose=>pose.find(j=>j.label===ankle).y)).size,1);
}
const n=read('north/request.json');for(const pose of [n.first_frame_keypoints,...n.keypoints])for(const label of ['LEFT ARM','RIGHT ARM','LEFT ELBOW','RIGHT ELBOW']){
 const joint=pose.find(j=>j.label===label),torso=pose.find(j=>j.label==='NECK');assert(joint.depth<torso.depth&&joint.z_index<torso.z_index);
}
for(const slot of ['body','pants','boots','outfit','hair','weapon'])assert(fs.readFileSync(path.join(dir,slot+'-attack.png')).equals(fs.readFileSync(path.join(previous,slot+'-attack.png'))));
assert.equal(read('east/flash-edit-not-executed.json').status,'not_executed');
assert.equal(read('repairs.blueprint.json').filter(step=>step['MCP animate_with_skeleton_v3']).length,2);
console.log('Motion repair: corrected inputs, six charged generations, inherited art unchanged, both rejected bodies blocked, conditional edit skipped.');
