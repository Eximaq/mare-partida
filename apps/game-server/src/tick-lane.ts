/** Independent, bounded single-flight lane. No catch-up queue after overload. */
export function createTickLane(name:'solo'|'party',work:()=>Promise<unknown>){
 let stopped=false,flight:Promise<void>|undefined,runs=0,failed=0,skipped=0,total=0,max=0;
 return {tick(){
  if(stopped)return;if(flight){skipped++;return;}
  const start=performance.now();runs++;
  flight=Promise.resolve().then(work).then(()=>{},()=>{failed++;}).finally(()=>{const ms=performance.now()-start;total+=ms;max=Math.max(max,ms);flight=undefined;});
 },drain:()=>flight??Promise.resolve(),stop(){stopped=true;return flight??Promise.resolve();},flush(){
  const result={event:'simulation_window',lane:name,runs,failed,skipped,meanMs:runs?Math.round(total/runs):0,maxMs:Math.round(max),busy:!!flight};runs=failed=skipped=total=max=0;return result;
 }};
}
