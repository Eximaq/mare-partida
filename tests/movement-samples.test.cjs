const test=require('node:test'),assert=require('node:assert/strict');
const {movementSteps}=require('./helpers/movement-samples.cjs');
const {createWorldPresentation}=require('../apps/account-client/game-ui.js');
test('a busy earlier RAF callback does not manufacture a remote speed spike',()=>{
 const pose=createWorldPresentation({walk:true});
 pose.update({mapId:'lobby',position:{x:0,y:0},path:[{x:1000,y:0}],speed:180,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:00:10Z'},0);
 // RAF timestamps are assigned before callbacks run. A preceding heavy callback
 // can delay a diagnostic sample by 90ms without changing its RAF timestamp.
 const frames=[[0,0],[16.7,106.7],[116.7,116.7],[133.4,133.4]].map(([t,observedAt])=>({t,observedAt,heroSampledAt:observedAt,x:0,y:0,cx:0,cy:0,peer:pose.sample(observedAt)}));
 const steps=movementSteps(frames,true);
 assert.ok(steps.length>0);assert.ok(Math.max(...steps.map(s=>s.speed))<.181);
});
test('real snapshot-sized displacement still fails the unchanged one pixel/ms limit',()=>{
 const frames=[{t:0,observedAt:100,heroSampledAt:95,x:0,y:0,cx:0,cy:0,peer:{x:0,y:0}},{t:16.7,observedAt:116.7,heroSampledAt:111.7,x:40,y:0,cx:40,cy:0,peer:{x:40,y:0}}];
 for(const remote of [true,false])assert.ok(movementSteps(frames,remote)[0].speed>1);
});
test('own pose uses its render sample time rather than diagnostic polling time',()=>{
 const frames=[{t:0,observedAt:100,heroSampledAt:90,x:0,y:0,cx:0,cy:0},{t:16.7,observedAt:116.7,heroSampledAt:90,x:0,y:0,cx:0,cy:0},{t:33.4,observedAt:133.4,heroSampledAt:123.4,x:6.012,y:0,cx:6.012,cy:0}];
 const steps=movementSteps(frames,false);assert.equal(steps.length,1);assert.ok(Math.abs(steps[0].speed-.18)<1e-9);
});
