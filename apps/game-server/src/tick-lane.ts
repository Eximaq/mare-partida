/** Independent, bounded single-flight lane. No catch-up queue after overload. */
export function createTickLane(name:'solo'|'party',work:()=>Promise<unknown>){
 let stopped=false,flight:Promise<void>|undefined,runs=0,failed=0,skipped=0,total=0,max=0,scheduled=false,timer:NodeJS.Timeout|undefined;
 const lane={tick(){
  if(stopped)return;if(flight){skipped++;return;}
  const start=performance.now();runs++;
  flight=Promise.resolve().then(work).then(()=>{},()=>{failed++;}).finally(()=>{const ms=performance.now()-start;total+=ms;max=Math.max(max,ms);flight=undefined;});
 },drain:()=>flight??Promise.resolve(),stop(){stopped=true;clearTimeout(timer);return flight??Promise.resolve();},schedule(intervalMs=250,now:()=>number=()=>performance.now()){
  if(stopped||scheduled||!Number.isInteger(intervalMs)||intervalMs<1||intervalMs>10000)throw Error('Invalid simulation schedule');
  scheduled=true;
  const select=async()=>{
   if(stopped)return;const start=now();lane.tick();await lane.drain();
   // Yield to IPC/heartbeats, then select fresh durable work. Never replay missed
   // intervals; one transaction that overruns must not waste the next whole slot.
   if(!stopped)timer=setTimeout(select,Math.max(0,intervalMs-(now()-start)));
  };
  timer=setTimeout(select,intervalMs);
 },flush(){
  const result={event:'simulation_window',lane:name,runs,failed,skipped,meanMs:runs?Math.round(total/runs):0,maxMs:Math.round(max),busy:!!flight};runs=failed=skipped=total=max=0;return result;
 }};return lane;
}
