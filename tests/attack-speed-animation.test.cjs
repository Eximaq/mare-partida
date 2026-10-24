'use strict';
const assert=require('node:assert/strict'),A=require('../combat-animation.js');
assert.equal(A.attackDuration(1),1);assert.equal(A.attackDuration(2),.5);assert.equal(A.attackDuration(100),.15);
for(const frames of [2,3,4,5,9])for(const speed of [.5,1,2,100]){
 let hits=0;const c=A.create({attack:{frames,fps:12,impact_frame:Math.min(frames-1,Math.ceil(frames*.5))}});
 c.play('attack',{attackSpeed:speed,onImpact:()=>hits++});let p=c.snapshot();
 const duration=Math.max(.15,1/speed),ratio=Math.min(frames-1,Math.ceil(frames*.5))/frames;
 assert.equal(p.duration,duration);assert.equal(p.frameDuration,duration/frames);assert.equal(p.currentFrame,0);
 c.step(duration*ratio-1e-7);assert.equal(hits,0);c.step(1e-7);assert.equal(hits,1);assert.equal(c.snapshot().currentFrame,Math.min(frames-1,Math.ceil(frames*.5)));
 c.step(duration*2);assert.equal(hits,1);assert.equal(c.snapshot().locked,false);assert.equal(c.snapshot().elapsed,0);
}
let hits=0;const c=A.create({attack:{frames:5,fps:12},death:{frames:4,fps:8}});
c.play('attack',{attackSpeed:1,hitFrameRatio:.6,onImpact:()=>hits++});c.step(.25);c.setAttackSpeed(2);assert.equal(c.snapshot().progress,.25);assert.equal(c.snapshot().duration,.5);c.step(.174999);assert.equal(hits,0);c.step(.000002);assert.equal(hits,1);c.setAttackSpeed(.5);c.step(10);assert.equal(hits,1);
c.play('attack',{attackDuration:.001,onImpact:()=>hits++});assert.equal(c.snapshot().duration,.15);c.play('death');c.step(10);assert.equal(hits,1);
const directional=A.create({attack:{frames:8,fps:12,impact_frame:3,direction_frames:{north:4},direction_impact_frames:{north:2}}});directional.play('attack',{direction:'back',attackSpeed:2});assert.equal(directional.snapshot().frames,4);assert.equal(directional.snapshot().hitFrameRatio,.5);assert.equal(directional.snapshot().frameDuration,.125);
console.log('Attack scaling: proportional frames, 150ms cap, exact single impact, long delta, retiming and death cancellation passed');
