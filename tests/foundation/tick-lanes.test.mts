import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTickLane} from '../../apps/game-server/src/tick-lane.js';
test('slow solo work never queues overlapping ticks or blocks the independent Party lane',async()=>{
 let release!:()=>void,soloCalls=0,partyCalls=0;
 const solo=createTickLane('solo',async()=>{soloCalls++;await new Promise<void>(r=>release=r);});
 const party=createTickLane('party',async()=>{partyCalls++;});
 solo.tick();await Promise.resolve();solo.tick();party.tick();await party.drain();
 assert.equal(soloCalls,1);assert.equal(partyCalls,1);assert.equal(solo.flush().skipped,1);
 const done=solo.stop();release();await done;solo.tick();assert.equal(soloCalls,1);
});
test('failed ticks are counted without rejecting the timer or suppressing later runs',async()=>{
 let calls=0;const lane=createTickLane('solo',async()=>{calls++;throw Error('private detail');});
 lane.tick();await lane.drain();lane.tick();await lane.drain();
 const report=lane.flush();assert.equal(report.failed,2);assert.equal(report.runs,2);assert.equal(JSON.stringify(report).includes('private detail'),false);await lane.stop();
});

test('scheduled simulation yields after an overrun without wasting another interval or queuing catch-up',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0,calls=0,release!:()=>void;
 const lane=createTickLane('party',async()=>{calls++;if(calls===1)await new Promise<void>(r=>release=r);});
 lane.schedule(250,()=>clock);
 clock=250;t.mock.timers.tick(250);await Promise.resolve();assert.equal(calls,1);
 clock=1050;t.mock.timers.tick(800);assert.equal(calls,1,'only the whole transaction in flight');
 release();await lane.drain();t.mock.timers.tick(0);await Promise.resolve();assert.equal(calls,2,'one new selection after commit, without an extra 250ms gap');
 await lane.drain();t.mock.timers.tick(249);await Promise.resolve();assert.equal(calls,2,'no burst of missed historical ticks');
 await lane.stop();clock+=1000;t.mock.timers.tick(1000);await Promise.resolve();assert.equal(calls,2,'stop cancels future selection');
});
