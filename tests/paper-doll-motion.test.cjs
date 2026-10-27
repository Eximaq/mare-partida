'use strict';
const assert=require('node:assert/strict'),R=require('../paper-doll-review.js');
const hero={x:0,y:0};assert.equal(R.walkPose(hero,10,false).moving,false);
hero.x=20;const a=R.walkPose(hero,10.1,true);assert.equal(a.time,.25);assert(a.moving);
assert.deepEqual(R.walkPose(hero,10.1,true),a,'drawing twice cannot advance gait');
hero.y=20;assert.equal(R.walkPose(hero,10.2,true).time,.5,'turn without resetting phase');
assert(!R.walkPose(hero,10.3,true).moving,'held key against a wall cannot walk in place');
assert.equal(R.walkPose(hero,100,false).time,.5,'pause does not advance gait');
hero.x+=20;assert.equal(R.walkPose(hero,100.1,true).time,.75,'resume from the actual previous step');
hero.x+=20;assert.equal(R.walkPose(hero,100.2,true).time,0,'continuous wrap after one measured stride');
hero.x+=1000;assert(!R.walkPose(hero,100.3,true).moving,'teleport is not locomotion');
for(const ratio of [.25,.5,.7]){
 assert.equal(R.shotProgress(0,ratio),0);assert.equal(R.shotProgress(ratio,ratio),3/8);assert.equal(R.shotProgress(1,ratio),1);
 const frames=new Set();let last=-1;
 for(let i=0;i<=1000;i++){const p=R.shotProgress(i/1000,ratio);assert(p>=last);last=p;frames.add(Math.min(7,Math.floor(p*8+1e-9)));}
 assert.deepEqual([...frames],[0,1,2,3,4,5,6,7],'all original frames remain in order');
}
console.log('Motion: distance-driven continuous gait, stops/turns/walls/teleports and release-aligned ordered frames passed.');
