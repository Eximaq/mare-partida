import {Worker,type WorkerOptions} from 'node:worker_threads';
type Counts={solo:number;party:number};
export function simulationSettings(env:NodeJS.ProcessEnv):Counts{
 const read=(key:string,fallback:number,max:number)=>{const raw=env[key]??String(fallback);if(!/^\d+$/.test(raw))throw Error('Invalid simulation configuration');const n=Number(raw);if(n<1||n>max)throw Error('Invalid simulation configuration');return n;};
 return {solo:read('SIMULATION_SOLO_WORKERS',2,6),party:read('SIMULATION_PARTY_WORKERS',1,2)};
}
export function createSimulationPool(options:{databaseUrl:string;counts:Counts;workerUrl?:URL;restartDelayMs?:number;now?:()=>number;spawn?:(url:URL,options:WorkerOptions)=>Worker}){
 const counts=simulationSettings({SIMULATION_SOLO_WORKERS:String(options.counts.solo),SIMULATION_PARTY_WORKERS:String(options.counts.party)});
 const now=options.now??Date.now;
 const slots=Object.entries(counts).flatMap(([kind,count])=>Array.from({length:count},(_,index)=>({kind,index,count,worker:null as Worker|null,ready:false,terminating:false,timer:undefined as NodeJS.Timeout|undefined,attempt:0,launched:0,lastSeen:0,metrics:null as Record<string,number>|null})));
 let started=false,stopped=false,restarts=0,exits=0,stopping:Promise<void>|undefined,watchdog:NodeJS.Timeout|undefined;
 const healthy=()=>started&&!stopped&&slots.every(s=>s.ready&&now()-s.lastSeen<5000);
 function launch(slot:typeof slots[number]){
  if(stopped)return;slot.ready=false;slot.terminating=false;slot.launched=now();
  let worker:Worker;try{worker=(options.spawn??((url,config)=>new Worker(url,config)))(options.workerUrl??new URL('./simulation-worker.js',import.meta.url),{
   workerData:{databaseUrl:options.databaseUrl,kind:slot.kind,index:slot.index,count:slot.count},
   execArgv:[],env:{NODE_ENV:process.env.NODE_ENV??'development',...(process.env.SystemRoot?{SystemRoot:process.env.SystemRoot}:{}),...(process.env.TEMP?{TEMP:process.env.TEMP}:{})},resourceLimits:{maxOldGenerationSizeMb:256,stackSizeMb:4},
  });slot.worker=worker;}catch{retry(slot);return;}
  worker.on('message',(message:unknown)=>{
   if(stopped||slot.worker!==worker||!message||typeof message!=='object')return;
   const m=message as Record<string,unknown>;if(m.type==='ready'){slot.ready=true;slot.lastSeen=now();}if(m.type==='heartbeat')slot.lastSeen=now();
   if(m.type==='metrics'&&m.value&&typeof m.value==='object'){
    const value=m.value as Record<string,unknown>,clean:Record<string,number>={};
    for(const k of ['runs','failed','skipped','meanMs','maxMs'])if(typeof value[k]==='number'&&Number.isFinite(value[k])&&value[k]>=0)clean[k]=value[k];
    slot.metrics=clean;
   }
  });
  worker.on('error',()=>{slot.ready=false;});
  worker.once('exit',()=>{if(slot.worker!==worker)return;slot.worker=null;slot.ready=false;if(!stopped){exits++;retry(slot);}});
 }
 function retry(slot:typeof slots[number]){
  if(stopped)return;restarts++;if(now()-slot.launched>30000)slot.attempt=0;
  const wait=Math.min(30000,(options.restartDelayMs??250)*2**Math.min(slot.attempt++,7));
  slot.timer=setTimeout(()=>{slot.timer=undefined;launch(slot);},wait);
 }
 async function stop(){
  if(stopping)return stopping;stopped=true;
  clearInterval(watchdog);
  stopping=(async()=>{for(const s of slots)clearTimeout(s.timer);
   await Promise.all(slots.map(async slot=>{const w=slot.worker;if(!w||w.threadId===-1)return;
    await new Promise<void>(resolve=>{const timeout=setTimeout(()=>{void w.terminate().then(()=>resolve());},8000);w.once('exit',()=>{clearTimeout(timeout);resolve();});w.postMessage('stop');});
   }));})();return stopping;
 }
 return {healthy,stop,async start(){
  if(started||stopped)throw Error('Simulation pool already started');started=true;for(const slot of slots)launch(slot);
  watchdog=setInterval(()=>{for(const slot of slots)if(slot.ready&&!slot.terminating&&now()-slot.lastSeen>=10000){slot.ready=false;slot.terminating=true;void slot.worker?.terminate().catch(()=>{});}},500);
  const until=now()+30000;while(!healthy()){if(stopped||now()>=until){await stop();throw Error('Simulation workers unavailable');}await new Promise(r=>setTimeout(r,20));}
 },report(){return {event:'simulation_pool',workers:slots.length,ready:slots.filter(s=>s.ready&&now()-s.lastSeen<5000).length,restarts,unexpectedExits:exits,lanes:slots.map(s=>({lane:s.kind,partition:s.index,...s.metrics}))};}};
}
