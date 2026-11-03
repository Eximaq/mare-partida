import {test} from 'node:test';import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createSimulationPool,simulationSettings} from '../../apps/game-server/src/simulation-pool.js';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('worker counts and connection budgets are bounded and invalid settings fail closed',()=>{
 assert.deepEqual(simulationSettings({}),{solo:2,party:1});assert.deepEqual(simulationSettings({SIMULATION_SOLO_WORKERS:'4',SIMULATION_PARTY_WORKERS:'2'}),{solo:4,party:2});
 for(const value of ['0','9','-1','1.5','garbage'])assert.throws(()=>simulationSettings({SIMULATION_SOLO_WORKERS:value}));
});
test('CPU work is isolated; crash restarts a bounded slot and shutdown leaves no orphan',async()=>{
 const owned:Worker[]=[];const pool=createSimulationPool({databaseUrl:'fixture-only',counts:{solo:1,party:1},workerUrl:new URL('../fixtures/simulation-worker.mjs',import.meta.url),restartDelayMs:50,spawn:(url,options)=>{const w=new Worker(url,options);owned.push(w);return w;}});
 try{await pool.start();assert.equal(pool.healthy(),true);const t=performance.now();await delay(40);assert.ok(performance.now()-t<200,'busy simulation must not block main timer');
 await owned[0]!.terminate();await delay(350);assert.equal(owned.length,3);assert.equal(pool.healthy(),true);assert.equal(pool.report().restarts,1);
 }finally{await pool.stop();}assert.ok(owned.every(w=>w.threadId===-1));await delay(100);assert.equal(owned.length,3,'stop must not restart children');
});

test('a stalled worker heartbeat makes readiness fail closed',async()=>{
 let clock=0;const pool=createSimulationPool({databaseUrl:'fixture-only',counts:{solo:1,party:1},workerUrl:new URL('../fixtures/simulation-worker.mjs',import.meta.url),now:()=>clock});
 try{await pool.start();assert.equal(pool.healthy(),true);clock=6000;assert.equal(pool.healthy(),false);}finally{await pool.stop();}
});

test('a wedged worker is replaced and the watchdog stops with the pool',async()=>{
 let clock=0;const owned:Worker[]=[];const pool=createSimulationPool({databaseUrl:'fixture-only',counts:{solo:1,party:1},workerUrl:new URL('../fixtures/simulation-worker.mjs',import.meta.url),restartDelayMs:20,now:()=>clock,spawn:(u,o)=>{const w=new Worker(u,o);owned.push(w);return w;}});
 try{await pool.start();clock=11000;for(let i=0;i<30&&!pool.healthy();i++)await delay(50);assert.equal(pool.healthy(),true);assert.ok(owned.length>2);assert.ok(pool.report().restarts>=1);}finally{await pool.stop();}assert.ok(owned.every(w=>w.threadId===-1));
});
