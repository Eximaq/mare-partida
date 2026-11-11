// Isolated reproduction of a slow Dawn path observed in the capacity fixture.
// No database, Auth, load generation, map mutation or gameplay rule changes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Session} from 'node:inspector';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const world=require('../../world-catalog.cjs').load(),nav=world.navigation('dawn');
const from={x:2137.7381123218383,y:1057.5929338939222};
const to={x:2304.423881155701,y:1851.783344798676};
assert(process.argv.slice(2).every(v=>v==='--profile'),'Only --profile is supported');
let session;
const post=(name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(e,r)=>e?reject(e):resolve(r)));
try {
 if(process.argv.includes('--profile')){
  session=new Session();session.connect();await post('Profiler.enable');
  await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 }
 const cpu=process.threadCpuUsage(),start=performance.now(),path=nav.path(from,to),elapsedMs=performance.now()-start;
 const used=process.threadCpuUsage(cpu);
 let profiling;
 if(session){
  const {profile}=await post('Profiler.stop');
  const dir=new URL('../../infra/local/capacity/',import.meta.url);await mkdir(dir,{recursive:true});
  const output=new URL(`navigation-${Date.now()}.cpuprofile`,dir);
  await writeFile(output,JSON.stringify(profile),{flag:'wx'});
  const samples=profile.samples.length;
  profiling={samples,output:fileURLToPath(output),functions:profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,10).map(n=>({name:n.callFrame.functionName,file:n.callFrame.url.split('/').at(-1),line:n.callFrame.lineNumber+1,selfPercent:100*n.hitCount/samples}))};
 }
 const nearest=nav.nearest(to);
 console.log(JSON.stringify({map:'dawn',from,to,elapsedMs,threadCpuMs:(used.user+used.system)/1000,points:path.length,startWalkable:nav.walkable(from.x,from.y),directPath:!!nearest&&nav.clear(from,nearest),profiling}));
}finally{session?.disconnect();}
