// Private fixture only. Uses real PostgreSQL, AuthService and WebSocket transport.
// Virtual trusted-proxy addresses model distinct clients without relaxing live IP limits.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import WebSocket from 'ws';
import pg from 'pg';
import {authDatabase} from '../../tests/integration/auth-support.mjs';
import {createHttpServer,attachRealtime} from '../../apps/game-server/src/http.js';
const count=Number(process.env.LOBBY_QA_PLAYERS||48),seconds=Number(process.env.LOBBY_QA_SECONDS||120);
assert([16,24,48].includes(count)&&seconds>=30&&seconds<=600);
const nav=createRequire(import.meta.url)('../../world-catalog.cjs').load().navigation('lobby');
const stats=(a:number[])=>{const s=a.slice().sort((x,y)=>x-y);return {n:s.length,p50:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0,max:s.at(-1)??0};};
await authDatabase(async f=>{
 const actors:any[]=[];
 for(let i=0;i<count;i++){
  const login=await f.service.login(`load-${i}@example.invalid`,'fixture'),c=await f.service.createCharacter(login.token,{name:'Carga '+i,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
  let state=await f.service.characterState(login.token,c.id);
  for(const action of ['items.initialize','world.initialize','battle.start'])state=(await f.service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:state.version,control:lease,action,payload:{}} as any)).state;
  actors.push({login,c,lease,version:state.version,frames:0,seq:0,last:0,pending:0,errors:0,gaps:[]});
 }
 const server=createHttpServer({isReady:async()=>true}),transport=attachRealtime(server,{service:f.service,vault:f.vault,origin:'https://localhost:9443',trustedProxyIp:'127.0.0.1'});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`ws://127.0.0.1:${(server.address() as any).port}/v1/realtime`,loop=monitorEventLoopDelay({resolution:10}),acks:number[]=[],pings:number[]=[];
 const renewals=new Set<Promise<unknown>>();
 const queryTimings=new Map<string,number[]>(),poolWait:number[]=[];
 const query=pg.Client.prototype.query,connect=pg.Pool.prototype.connect;
 pg.Client.prototype.query=function(this:any,...args:any[]){const start=performance.now(),r=(query as any).apply(this,args);if(!measuring||!r?.then)return r;const label=String(typeof args[0]==='string'?args[0]:args[0].text).replace(/\s+/g,' ').replace(/'[^']*'/g,"'?'").slice(0,180);return r.finally(()=>{const values=queryTimings.get(label)||[];values.push(performance.now()-start);queryTimings.set(label,values);});} as any;
 pg.Pool.prototype.connect=function(this:any,...args:any[]){const start=performance.now();if(typeof args[0]==='function'){const callback=args[0];args[0]=(...values:any[])=>{if(measuring)poolWait.push(performance.now()-start);callback(...values);};return (connect as any).apply(this,args);}return (connect as any).apply(this,args).then((c:any)=>{if(measuring)poolWait.push(performance.now()-start);return c;});} as any;
 let unexpectedClose=0,slotsWhilePending=0,rosterFailures=0,measuring=false;
 const heartbeat=setInterval(()=>{for(const a of actors)if(a.ws?.readyState===WebSocket.OPEN&&!a.pingAt){a.pingAt=performance.now();a.ws.send(JSON.stringify({type:'ping',seq:++a.seq}));}},1000);
 try{
  for(const [i,a] of actors.entries()){
   const ws=new WebSocket(url,'mare.realtime.v1',{headers:{Origin:'https://localhost:9443',Cookie:`__Host-mare_session=${a.login.token}`,'X-Mare-Client-IP':`10.77.0.${1+Math.floor(i/6)}`}});a.ws=ws;
   ws.on('error',()=>{a.errors++;});ws.on('close',()=>{if(measuring)unexpectedClose++;});
   ws.on('message',raw=>{const m=JSON.parse(raw.toString()),now=performance.now();
    if(m.type==='frame'){a.version=Math.max(a.version,m.frame.version??0);if(measuring){if(a.last)a.gaps.push(now-a.last);a.frames++;if((m.frame.fullState?.lobby??m.frame.lobby)?.players.length!==Math.min(count-1,23))rosterFailures++;}a.last=now;}
    if(m.type==='ack'){if(a.pending){acks.push(now-a.pending);a.pending=0;}a.version=Math.max(a.version,m.result?.state?.version??m.receipt?.state?.version??0);}
    if(m.type==='error'){a.errors++;a.pending=0;}
    if(m.type==='pong'&&a.pingAt){if(measuring)pings.push(now-a.pingAt);a.pingAt=0;}
   });await once(ws,'open');ws.send(JSON.stringify({type:'subscribe',characterId:a.c.id,csrfToken:f.vault.csrf(a.login.token)}));
  }
  await sleep(2000);for(const a of actors){assert(a.last,'subscriber must receive frames');assert.equal(a.ws.readyState,WebSocket.OPEN);}
  loop.enable();loop.reset();for(const a of actors)a.last=0;measuring=true;
  for(let tick=0;tick<seconds;tick++){
   const start=performance.now();
   for(const [i,a] of actors.entries())if(tick%40===i%40){const r=f.service.renewControl(a.login.token,a.c.id,a.lease).catch(()=>{a.errors++;}).finally(()=>renewals.delete(r));renewals.add(r);}
   for(const [i,a] of actors.entries()){
    // Eight simultaneous walkers change direction every second, the rest observe.
    if(i<8){if(a.pending){slotsWhilePending++;continue;}const spawn=nav.map.spawn,p=nav.nearest({x:spawn.x+(tick%2?32:-32),y:spawn.y+((i%3)-1)*16});
     a.pending=performance.now();a.ws.send(JSON.stringify({type:'command',seq:++a.seq,command:{requestId:randomUUID(),expectedVersion:a.version,control:{epoch:a.lease.epoch,token:a.lease.token},action:'world.move',payload:p}}));}
   }
   await sleep(Math.max(0,1000-(performance.now()-start)));
  }
  measuring=false;loop.disable();
  const queryProfile=[...queryTimings].map(([sql,v])=>({sql,totalMs:v.reduce((a,b)=>a+b,0),...stats(v)})).sort((a,b)=>b.totalMs-a.totalMs).slice(0,15);
  const result={poolWaitMs:stats(poolWait),queryProfile,players:count,channelCapacity:24,seconds,walkers:8,frameIntervalMs:stats(actors.flatMap(a=>a.gaps)),pingMs:stats(pings),commandMs:stats(acks),eventLoopP95Ms:loop.percentile(95)/1e6,errors:actors.reduce((n,a)=>n+a.errors,0),unexpectedClose,slotsWhilePending,rosterFailures,framesPerClient:actors.map(a=>a.frames),transport:transport.report(),generator:'same machine, private loopback, independent virtual proxy IPs',provider:'fixture, no emails'};
  if(process.env.LOBBY_QA_OUTPUT)await writeFile(process.env.LOBBY_QA_OUTPUT,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  assert.equal(result.errors+unexpectedClose+slotsWhilePending+rosterFailures,0);
  assert(acks.length>seconds*7,'movement receipts must be delivered');
  assert(result.frameIntervalMs.p95<250,'local frame interval p95 must stay below 250 ms');
 }finally{measuring=false;pg.Client.prototype.query=query;pg.Pool.prototype.connect=connect;clearInterval(heartbeat);loop.disable();await Promise.all(renewals);for(const a of actors)a.ws?.terminate();await transport.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
},undefined,true);
