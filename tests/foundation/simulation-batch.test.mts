import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulationBatch} from '../../apps/game-server/src/simulation-batch.js';
import {simulationBudget} from '../../apps/game-server/src/simulation-budget.js';
const gate=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
test('batch bounds active transactions, consumes candidates once, and drains before rejection',async()=>{
 const release=gate(),entered=gate(),failure=Error('connection unavailable'),seen:number[]=[];
 let active=0,peak=0,settled=false;
 const batch=simulationBatch([0,1,2,3],simulationBudget(),2,async n=>{
  seen.push(n);active++;peak=Math.max(peak,active);
  try{if(n===0)throw failure;if(n===1){entered.resolve();await release.promise;}}finally{active--;}
 });
 const observed=batch.then(()=>{settled=true;},e=>{settled=true;assert.equal(e,failure);});
 await entered.promise;await new Promise(r=>setImmediate(r));
 assert.equal(settled,false,'failure must not release the lane while another transaction is open');
 release.resolve();await observed;
 assert.equal(active,0);assert.ok(peak<=2);assert.equal(new Set(seen).size,seen.length);
});
test('expired batch stops dispatch, but drains both transactions already started',async()=>{
 const release=gate(),entered=gate(),budget=simulationBudget(1),seen:number[]=[];
 const batch=simulationBatch([0,1,2,3],budget,2,async n=>{
  seen.push(n);if(seen.length===2)entered.resolve();await release.promise;budget.commit();
 });
 await entered.promise;await new Promise(r=>setTimeout(r,15));release.resolve();await batch;
 assert.deepEqual(seen,[0,1]);
});
test('invalid concurrency cannot dispatch work',async()=>{
 for(const value of [0,3,NaN,1.5])await assert.rejects(simulationBatch([1],simulationBudget(),value,async()=>{assert.fail('must validate first');}));
});
