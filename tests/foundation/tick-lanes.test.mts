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
