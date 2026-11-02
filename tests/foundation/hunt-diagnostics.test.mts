import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {createFrameMeter,stepMonsterVisual}=createRequire(import.meta.url)('../../apps/account-client/game-ui.js');
test('FPS uses rendered frames, reports stalls and resets across visibility changes',()=>{
 const meter=createFrameMeter();meter.frame(0);for(let t=20;t<=1000;t+=20)meter.frame(t);
 assert.equal(meter.sample().fps,50);assert.equal(meter.sample().maxFrameMs,20);
 meter.frame(1400);assert.equal(meter.sample().maxFrameMs,400);
 meter.reset();assert.equal(meter.sample().fps,null);meter.frame(9000);meter.frame(9020);assert.equal(meter.sample().maxFrameMs,20);
});
test('monster walking/facing follows drawn displacement, not a stale server animation flag',()=>{
 const m={x:0,y:0,moving:0,emberFacing:'south',emberElapsed:10,attackAnim:0,hit:0};
 stepMonsterVisual(m,{x:2,y:0},.02);assert.equal(m.moving,1);assert.equal(m.emberFacing,'east');assert.equal(m.emberElapsed,10.02);
 m.moving=1;stepMonsterVisual(m,{x:2,y:0},.02);assert.equal(m.moving,0);
 m.attackAnim=.5;m.emberFacing='north';stepMonsterVisual(m,{x:1,y:0},.02);assert.equal(m.emberFacing,'north','attack facing stays authoritative');
});
