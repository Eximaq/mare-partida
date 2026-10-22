'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create}=require('../paper-doll.js');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const transfer='pixellab-pip-generations/paper-doll-bento-motion-20261021/';
const skeleton='pixellab-pip-generations/paper-doll-bento-skeleton-20261021/';
const pack=read(transfer+'review-pack.json'),review=read(transfer+'review.json');
assert.equal(review.status,'rejected');assert.equal(review.production_enabled,false);
assert(pack.pieces.every(p=>p.available===false&&p.approved===false));
const runtime=create({getImage:()=>({complete:true,naturalWidth:672,naturalHeight:84})});
runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
assert.equal(runtime.resolve(pack.appearance,{animationId:'attack-sword',direction:'south',frameIndex:2},{allowDraft:true}).valid,false,'A clothed composition must not override anatomy rejection');
const args=read(skeleton+'request.json'),controls=read(skeleton+'joint-controls.json');
const labels=new Set(controls.labels);assert.equal(labels.size,18);assert.equal(args.keypoints.length,8);
for(const pose of [args.first_frame_keypoints,...args.keypoints]){
 assert.equal(pose.length,18);assert.deepEqual(new Set(pose.map(p=>p.label)),labels);
 assert(pose.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&Number.isInteger(p.z_index)));
}
const raisedWrist=args.keypoints[2].find(p=>p.label==='RIGHT ARM');
assert(raisedWrist.y>.3,'Frame2 wrist must stay beside the torso, not follow the raised blade tip');
assert.equal(args.direction,'south');assert.equal(args.no_background,true);
assert.equal(controls.first_frame_echo_expected,false);assert.equal(controls.impact_frame,3);
assert.equal(read(transfer+'manifest.json').reported_usage.generations,10);
for(const folder of [transfer,skeleton]){
 const manifest=read(folder+'manifest.json');assert.equal(manifest.production_enabled,false);
 assert(!JSON.stringify(manifest).includes('generations_remaining'));
}
console.log('Motion study: rejected anatomy stays unavailable,18-joint controls x8 frames are valid, hands are not blade tips, production disabled and usage scoped to calls.');
