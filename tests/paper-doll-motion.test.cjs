'use strict';
const assert=require('node:assert/strict'),R=require('../paper-doll-review.js');
const hero={x:0,y:0};assert.equal(R.stepWalk(hero,10,false).moving,false);
hero.x=20;const a=R.stepWalk(hero,10.1,true);assert.equal(a.time,.25);assert(a.moving);
assert.deepEqual(R.stepWalk(hero,10.1,true),a,'drawing twice cannot advance gait');
hero.y=20;assert.equal(R.stepWalk(hero,10.2,true).time,.5,'turn without resetting phase');
assert(!R.stepWalk(hero,10.3,true).moving,'held key against a wall cannot walk in place');
assert.equal(R.stepWalk(hero,100,false).time,.5,'pause does not advance gait');
hero.x+=20;assert.equal(R.stepWalk(hero,100.1,true).time,.75,'resume from the actual previous step');
hero.x+=20;assert.equal(R.stepWalk(hero,100.2,true).time,0,'continuous wrap after one measured stride');
hero.x+=1000;assert(!R.stepWalk(hero,100.3,true).moving,'teleport is not locomotion');
for(const ratio of [.25,.5,.7]){
 assert.equal(R.shotProgress(0,ratio),0);assert.equal(R.shotProgress(ratio,ratio),3/8);assert.equal(R.shotProgress(1,ratio),1);
 const frames=new Set();let last=-1;
 for(let i=0;i<=1000;i++){const p=R.shotProgress(i/1000,ratio);assert(p>=last);last=p;frames.add(Math.min(7,Math.floor(p*8+1e-9)));}
 assert.deepEqual([...frames],[0,1,2,3,4,5,6,7],'all original frames remain in order');
}
console.log('Motion: distance-driven continuous gait, stops/turns/walls/teleports and release-aligned ordered frames passed.');

const test=require('node:test');
test('drawing alone cannot advance physical gait',()=>{
 const actor={x:0,y:0};R.walkPose(actor,0,false);actor.x=40;
 assert.equal(R.walkPose(actor,1,true).time,0,'render must consume the last simulation state');
});
test('a square path counts each physical segment even without intermediate renders',()=>{
 const actor={x:0,y:0};R.stepWalk?.(actor,0,false);
 for(const [i,p]of [[10,0],[10,10],[0,10],[0,0]].entries()){Object.assign(actor,{x:p[0],y:p[1]});R.stepWalk?.(actor,(i+1)/60,true);}
 assert.equal(R.walkPose(actor,1,true).time,.5,'40 real pixels must advance half of the existing 80px cycle');
});

test('physical path is independent of drawing at 30, 60 or 120 FPS',()=>{
 for(const fps of [30,60,120]){
  const a={x:0,y:0};R.stepWalk(a,0,false);
  for(let i=1;i<=120;i++){a.x=i/3;R.stepWalk(a,i/120,true);if(i%(120/fps)===0){R.walkPose(a);R.walkPose(a);}}
  assert(Math.abs(R.walkPose(a).phase-.5)<1e-12);assert(Math.abs(R.walkPose(a).distance-40)<1e-10);
 }
});
test('extreme clocks, reversed time and teleports never invent walked distance',()=>{
 const a={x:0,y:0};R.stepWalk(a,1e300,false);a.x=20;R.stepWalk(a,1e300,true,{from:{x:0,y:0},dt:.1});assert.equal(R.walkPose(a).phase,.25);
 R.stepWalk(a,NaN,true);R.stepWalk(a,Infinity,true);assert.equal(R.walkPose(a).phase,.25);
 a.x=30;R.stepWalk(a,-1,true);assert.equal(R.walkPose(a).phase,.25);
 a.x=999;R.stepWalk(a,0,true);assert.equal(R.walkPose(a).distance,20);
});
test('variable physical delta records actual speed and preserves phase at a map boundary',()=>{
 const a={x:0,y:0};R.stepWalk(a,0,false,{context:'dawn'});a.x=10;R.stepWalk(a,.1,true,{dt:.1,context:'dawn'});assert.equal(R.walkPose(a).speed,100);
 a.x=20;R.stepWalk(a,.15,true,{dt:.05,context:'dawn'});assert.equal(R.walkPose(a).speed,200);assert.equal(R.walkPose(a).phase,.25);
 a.x=40;R.stepWalk(a,.2,true,{dt:.05,context:'conchas'});assert.equal(R.walkPose(a).distance,20);assert(!R.walkPose(a).moving);
});
const A=require('../combat-animation.js');
test('real attack clocks commit once at all render cadences, spikes and speed changes',()=>{
 for(const dt of [1/30,1/60,1/120,.22])for(const speed of [.5,1,8]){
  let hits=0;const c=A.create({attack:{frames:4,fps:8,impact_frame:2,loop:false}});c.play('attack',{attackSpeed:speed,onImpact:()=>hits++});
  let stepped=0;while(c.locked()&&stepped++<1000){c.step(dt,{inCombat:true});}assert.equal(hits,1);assert(!c.locked());c.step(3);assert.equal(hits,1);
  c.play('attack',{attackSpeed:speed,onImpact:()=>hits++});c.reset();c.step(3);assert.equal(hits,1,'cancelled attacks never commit later');
 }
 let hits=0;const c=A.create({attack:{frames:4,fps:8,impact_frame:2,loop:false}});c.play('attack',{attackSpeed:1,onImpact:()=>hits++});c.step(.2);c.setAttackSpeed(8);assert.equal(c.snapshot().progress,.2);c.step(.045);assert.equal(hits,1);c.setAttackSpeed(.5);c.step(3);assert.equal(hits,1);
});
