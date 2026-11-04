import type {simulationBudget} from './simulation-budget.js';

/** Overlap independent transactions' I/O within the worker's existing pool.
 * Admission uses the same soft time budget; an admitted transaction always
 * commits or rolls back in full. Never release the lane before both settle.
 */
export async function simulationBatch<T>(candidates:readonly T[],budget:ReturnType<typeof simulationBudget>,concurrency:number,run:(candidate:T)=>Promise<void>){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>2)throw Error('Invalid simulation concurrency');
 let cursor=0;
 const consume=async()=>{
  while(cursor<candidates.length&&!budget.exhausted()){
   const candidate=candidates[cursor++]!;
   await run(candidate);
  }
 };
 const results=await Promise.allSettled(Array.from({length:Math.min(concurrency,candidates.length)},consume));
 const failed=results.find(r=>r.status==='rejected');
 if(failed?.status==='rejected')throw failed.reason;
}
