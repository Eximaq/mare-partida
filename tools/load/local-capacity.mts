// Local fixture only. This runner cannot target an external API or hosted Auth.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {authDatabase} from '../../tests/integration/auth-support.mjs';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
import {createTickLane} from '../../apps/game-server/src/tick-lane.js';
const readInt=(key:string,fallback:number,min:number,max:number)=>{const n=Number(process.env[key]??fallback);assert.ok(Number.isInteger(n)&&n>=min&&n<=max,key);return n;};
const clients=readInt('MARE_LOAD_CLIENTS',12,1,3000),seconds=readInt('MARE_LOAD_SECONDS',20,10,600),mode=process.env.MARE_LOAD_MODE??'mixed';
assert.ok(['full','mixed','party'].includes(mode));assert.ok(!process.env.MARE_LOAD_TARGET,'External targets are not supported');
const sleep=(n:number)=>new Promise(r=>setTimeout(r,Math.max(0,n)));
const percentile=(list:number[],p:number)=>list.length?[...list].sort((a,b)=>a-b)[Math.ceil(list.length*p)-1]!:0;
await authDatabase(async f=>{
 const users:any[]=[];
 for(let i=0;i<clients;i++){
  const s=await f.service.login(`load-${i}@example.invalid`,'fixture'),c=await f.service.createCharacter(s.token,{name:`Load ${i}`,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
  const command=async(action:any,payload:any={})=>{const state=await f.service.characterState(s.token,c.id);return f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:state.version,control:lease,action,payload});};
  for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
  if(mode!=='party'){await command('world.travel',{islandId:'dawn'});await command('battle.auto',{enabled:true});}
  users.push({s,c,lease,command});
 }
 if(mode==='party')for(let start=0;start+1<users.length;start+=4){
  const group=users.slice(start,start+4),a=group[0];await a.command('party.create');
  for(const u of group.slice(1)){await a.command('party.invite',{name:u.c.name});const invite=(await f.service.onlineState(u.s.token,u.c.id)).party.invites.find((x:any)=>x.status==='pending');await u.command('party.respond',{inviteId:invite.id,accept:true});}
  await a.command('party.prepare',{kind:'hunt',destination:'dawn'});const nonce=(await f.service.onlineState(a.s.token,a.c.id)).party.group.preparation.nonce;
  for(const u of group)await u.command('party.ready',{nonce,ready:true});await a.command('party.start',{nonce});for(const u of group)await u.command('battle.auto',{enabled:true});
 }
 // Initial setup is excluded from measurement. Refresh fixture leases without provider network.
 await f.pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()+interval '20 minutes',idle_expires_at=clock_timestamp()+interval '20 minutes'");
 await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()+interval '20 minutes'");
 await f.pool.query('UPDATE mare_game.character_battles SET tick_at=clock_timestamp()');
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600,trustedProxyIp:'127.0.0.1'}),server=createHttpServer({isReady:async()=>true,handle:handler});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const solo=createTickLane('solo',()=>tickWorldBattles(f.pool)),party=createTickLane('party',()=>tickPartyBattles(f.pool));
 const timer=setInterval(()=>{solo.tick();party.tick();},250),delay=monitorEventLoopDelay({resolution:20});delay.enable();
 const times:number[]=[],bytes:number[]=[],app:number[]=[],ages:number[]=[],statuses:Record<string,number>={};let dropped=0,inflight=0,requests=0,maxPoolWait=0,stop=false;const flights=new Set<Promise<void>>();
 const cpu=process.cpuUsage(),start=performance.now(),end=start+seconds*1000,next=users.map((_,i)=>start+i*750/clients),rounds=users.map(()=>0);
 try{
  while(performance.now()<end&&!stop){
   const now=performance.now();maxPoolWait=Math.max(maxPoolWait,f.pool.waitingCount);
   for(let i=0;i<users.length;i++)if(now>=next[i]!){
    next[i]!+=750;if(now-next[i]!>750){dropped+=Math.floor((now-next[i]!)/750);next[i]=now+750;}
    if(inflight>=96){dropped++;continue;}
    const u=users[i],full=mode==='full'||rounds[i]!++%4===0,path=full?'online-state':'frame';inflight++;requests++;
    const flight=(async()=>{const t=performance.now();try{
     const r=await fetch(`${base}/v1/characters/${u.c.id}/${path}`,{headers:{cookie:`__Host-mare_session=${u.s.token}`,'x-mare-client-ip':`10.${Math.floor(i/65000)}.${Math.floor(i/250)%250}.${i%250+1}`},signal:AbortSignal.timeout(6000)}),body=await r.text();
     statuses[r.status]=(statuses[r.status]??0)+1;times.push(performance.now()-t);bytes.push(Buffer.byteLength(body));const ms=Number(r.headers.get('server-timing')?.match(/dur=([\d.]+)/)?.[1]);if(Number.isFinite(ms))app.push(ms);
     if(r.ok){const value=JSON.parse(body);assert.equal(value.characterId??value.state.characterId,u.c.id);if(value.simulationAgeMs!==null&&Number.isFinite(value.simulationAgeMs))ages.push(value.simulationAgeMs);}else if(r.status>=500)stop=true;
    }catch{statuses.network=(statuses.network??0)+1;stop=true;}finally{inflight--;}})();flights.add(flight);void flight.finally(()=>flights.delete(flight));
   }
   await sleep(10);
  }
  await Promise.all(flights);clearInterval(timer);await Promise.all([solo.stop(),party.stop()]);
  const elapsed=performance.now()-start,cpuUsed=process.cpuUsage(cpu);
  const bad=(await f.pool.query('SELECT count(*)::int n FROM mare_game.character_progression WHERE gold<0 OR experience<0')).rows[0].n;assert.equal(bad,0);
  const report={profile:mode,clients,durationSeconds:Math.round(elapsed/1000),requests,statuses,dropped,throughput:Math.round(requests*1000/elapsed),httpMs:{p50:Math.round(percentile(times,.5)),p95:Math.round(percentile(times,.95)),p99:Math.round(percentile(times,.99)),max:Math.round(Math.max(0,...times))},appP95Ms:Math.round(percentile(app,.95)),meanBytes:Math.round(bytes.reduce((n,b)=>n+b,0)/(bytes.length||1)),simulationAgeP95Ms:Math.round(percentile(ages,.95)),eventLoopP99Ms:Math.round(delay.percentile(99)/1e6),cpuCorePercent:Math.round((cpuUsed.user+cpuUsed.system)/elapsed/10),rssMiB:Math.round(process.memoryUsage().rss/1048576),maxPoolWait,solo:solo.flush(),party:party.flush(),invariants:{nonnegativeProgress:bad===0},passed:!stop&&dropped===0&&Object.keys(statuses).every(k=>k==='200')&&percentile(times,.95)<500&&percentile(ages,.95)<1000};
  if(process.env.MARE_LOAD_REPORT){assert.match(process.env.MARE_LOAD_REPORT,/^(tmp|infra[\\/]local)[\\/][\w\\/.-]+\.json$/);await writeFile(process.env.MARE_LOAD_REPORT,JSON.stringify(report,null,2));}console.log(JSON.stringify(report));
  if(!report.passed)process.exitCode=2;
 }finally{clearInterval(timer);await Promise.all(flights);await Promise.all([solo.stop(),party.stop()]);delay.disable();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
