// Local fixture only. This runner cannot target an external API or hosted Auth.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {authDatabase} from '../../tests/integration/auth-support.mjs';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
import {createTickLane} from '../../apps/game-server/src/tick-lane.js';
import {createSimulationPool,simulationSettings} from '../../apps/game-server/src/simulation-pool.js';
import {AuthService as CompiledAuthService} from '../../apps/game-server/dist/auth/service.js';
const readInt=(key:string,fallback:number,min:number,max:number)=>{const n=Number(process.env[key]??fallback);assert.ok(Number.isInteger(n)&&n>=min&&n<=max,key);return n;};
const threaded=process.env.MARE_LOAD_SIMULATION==='workers';
const clients=readInt('MARE_LOAD_CLIENTS',12,1,3000),seconds=readInt('MARE_LOAD_SECONDS',20,10,600),mode=process.env.MARE_LOAD_MODE??'mixed';
assert.ok(['full','mixed','party'].includes(mode));assert.ok(!process.env.MARE_LOAD_TARGET,'External targets are not supported');
assert.ok(mode!=='party'||clients%4===0,'Party load requires complete four-member rooms');
const sleep=(n:number)=>new Promise(r=>setTimeout(r,Math.max(0,n)));
const percentile=(list:number[],p:number)=>list.length?[...list].sort((a,b)=>a-b)[Math.ceil(list.length*p)-1]!:0;
await authDatabase(async f=>{
 const users:any[]=[];
 for(let i=0;i<clients;i++){
  const s=await f.service.login(`load-${i}@example.invalid`,'fixture'),c=await f.service.createCharacter(s.token,{name:`Load ${i}`,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
  const command=async(action:any,payload:any={})=>{const state=await f.service.characterState(s.token,c.id);return f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:state.version,control:lease,action,payload});};
  for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
  if(mode!=='party'){await command('world.travel',{islandId:'dawn'});await command('battle.auto',{enabled:true});}
  users.push({s,c,lease,command,reading:false,renewing:false,nextRenew:0,lastFull:-Infinity});
 }
 if(mode==='party')for(let start=0;start<users.length;start+=4){
  const group=users.slice(start,start+4),a=group[0];await a.command('party.create');
  for(const u of group.slice(1)){await a.command('party.invite',{name:u.c.name});const invite=(await f.service.onlineState(u.s.token,u.c.id)).party.invites.find((x:any)=>x.status==='pending');await u.command('party.respond',{inviteId:invite.id,accept:true});}
  await a.command('party.prepare',{kind:'hunt',destination:'dawn'});const nonce=(await f.service.onlineState(a.s.token,a.c.id)).party.group.preparation.nonce;
  for(const u of group)await u.command('party.ready',{nonce,ready:true});await a.command('party.start',{nonce});for(const u of group)await u.command('battle.auto',{enabled:true});
 }
 // Freeze only the disposable fixture's simulation schedule while isolates warm.
 // Otherwise a ready shard can cancel auto due to the setup gap before its peers
 // report ready, making a purported combat benchmark silently measure idle actors.
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()+interval '1 hour'");
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()+interval '1 hour'");
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600,trustedProxyIp:'127.0.0.1'}),server=createHttpServer({isReady:async()=>true,handle:handler});
 const solo=createTickLane('solo',()=>tickWorldBattles(f.pool)),party=createTickLane('party',()=>tickPartyBattles(f.pool));
 const counts=threaded?simulationSettings(process.env):{solo:1,party:1};
 const fixture=(globalThis as any).capacityFixture;
 const controlled=await fixture?.prepare(f.pool);
 if(process.env.MARE_LOAD_EXPECTED_HASH){assert.ok(controlled,'Expected hash requires controlled fixture');assert.equal(controlled.initialStateHash,process.env.MARE_LOAD_EXPECTED_HASH,'Controlled initial state changed');}
 const partitionLoad=fixture?fixture.partitions():(await f.pool.query(`
  SELECT 'solo' lane,mod(hashtextextended(character_id::text,34001)&2147483647,$1::bigint)::int shard,count(*)::int total
  FROM mare_game.character_battles WHERE NOT (simulation ? 'partyInstanceId') GROUP BY shard
  UNION ALL
  SELECT 'party',mod(hashtextextended(id::text,34001)&2147483647,$2::bigint)::int,count(*)::int
  FROM mare_game.party_instances WHERE ended_at IS NULL GROUP BY 2
  ORDER BY lane,shard`,[counts.solo,counts.party])).rows;
 assert.equal(partitionLoad.reduce((sum,row)=>sum+row.total,0),mode==='party'?clients/4:clients,'unexpected fixture partition membership');
 const workers=threaded?createSimulationPool({databaseUrl:f.pool.options.connectionString!,counts,workerUrl:fixture?.workerUrl??new URL('../../apps/game-server/dist/simulation-worker.js',import.meta.url),...(fixture?{spawn:(url:URL,options:any)=>{const worker=new Worker(url,fixture.workerOptions(options));worker.on('message',fixture.workerEvent);return worker;}}:{})}):undefined;
 let timer:NodeJS.Timeout|undefined;
 const delay=monitorEventLoopDelay({resolution:20}),flights=new Set<Promise<void>>();
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{
 await workers?.start();
 const headers=(u:any,i:number)=>({cookie:`__Host-mare_session=${u.s.token}`,'x-mare-client-ip':`10.${Math.floor(i/65000)}.${Math.floor(i/250)%250}.${i%250+1}`});
 const renew=async(u:any,i:number)=>{
  const auth=headers(u,i),signal=AbortSignal.timeout(6000);
  const csrf=await fetch(base+'/v1/auth/csrf',{headers:auth,signal});
  assert.equal(csrf.status,200,'fixture CSRF');
  const {csrfToken}=await csrf.json();
  const response=await fetch(`${base}/v1/characters/${u.c.id}/control/renew`,{
   method:'POST',headers:{...auth,origin:'https://localhost:9443','x-csrf-token':csrfToken,'content-type':'application/json'},
   body:JSON.stringify({epoch:u.lease.epoch,token:u.lease.token}),signal
  });
  await response.text();return response.status;
 };
 // Bring each synthetic browser online before the timed window. This uses
 // the public application routes, including provider refresh and Party presence.
 for(const [i,u] of users.entries()){
  assert.equal(await renew(u,i),200,'fixture control renewal before measurement');
  const response=await fetch(`${base}/v1/characters/${u.c.id}/frame`,{headers:headers(u,i),signal:AbortSignal.timeout(6000)});
  assert.equal(response.status,200,'fixture initial frame');assert.equal((await response.json()).battle.auto,true,'fixture starts with auto active');
 }
 await f.pool.query('UPDATE mare_game.character_battles SET tick_at=clock_timestamp()');
 await f.pool.query('UPDATE mare_game.party_instances SET tick_at=clock_timestamp()');
 timer=setInterval(()=>{if(!workers){solo.tick();party.tick();}},250);delay.enable();
 const times:number[]=[],bytes:number[]=[],app:number[]=[],ages:number[]=[],statuses:Record<string,number>={};let dropped=0,inflight=0,requests=0,maxPoolWait=0,stop=false;
 const startedAt=new Date().toISOString(),cpu=process.cpuUsage(),start=performance.now(),end=start+seconds*1000,next=users.map((_,i)=>start+i*750/clients);
 const requestFailures={timeout:0,network:0,invalidResponse:0};
 for(const [i,u] of users.entries())u.nextRenew=start+30000+i*750/clients;
 let schedulerMissed=0,readBusy=0,queueFull=0,renewals=0,renewalFailures=0;
 const transitions:any[]=[],windows:any[]=[];let windowAt=start,windowRequests=0,windowDrops=0,windowPeak=0,windowTimes:number[]=[];
  while(performance.now()<end&&!stop){
   if(workers&&!workers.healthy()){stop=true;break;}
   const now=performance.now();maxPoolWait=Math.max(maxPoolWait,f.pool.waitingCount);
   windowPeak=Math.max(windowPeak,f.pool.waitingCount);
   if(now-windowAt>=10000){
    windows.push({second:Math.round((now-start)/1000),requests:requests-windowRequests,dropped:dropped-windowDrops,poolWaitPeak:windowPeak,httpP95Ms:Math.round(percentile(windowTimes,.95))});
    if(process.env.MARE_LOAD_PROGRESS==='1')console.log(JSON.stringify({event:'capacity_window',...windows.at(-1),interrupted:transitions.length}));
    windowAt=now;windowRequests=requests;windowDrops=dropped;windowPeak=0;windowTimes=[];
   }
   for(let i=0;i<users.length;i++){
    const u=users[i];
    if(now>=u.nextRenew&&!u.renewing){
     u.nextRenew+=30000;u.renewing=true;
     const flight=renew(u,i).then(status=>{renewals++;if(status!==200)renewalFailures++;},()=>{renewalFailures++;}).finally(()=>{u.renewing=false;});
     flights.add(flight);void flight.finally(()=>flights.delete(flight));
    }
    if(now<next[i]!)continue;
    const missed=Math.floor((now-next[i]!)/750);schedulerMissed+=missed;dropped+=missed;next[i]!+=(missed+1)*750;
    if(u.reading){readBusy++;dropped++;continue;}
    if(inflight>=96){queueFull++;dropped++;continue;}
    const full=mode==='full'||now-u.lastFull>=3000,path=full?'online-state':'frame';
    if(full)u.lastFull=now;
    u.reading=true;inflight++;requests++;
    const flight=(async()=>{const t=performance.now(),signal=AbortSignal.timeout(6000);let received=false;try{
     const r=await fetch(`${base}/v1/characters/${u.c.id}/${path}`,{headers:headers(u,i),signal}),body=await r.text();
     received=true;statuses[r.status]=(statuses[r.status]??0)+1;times.push(performance.now()-t);bytes.push(Buffer.byteLength(body));const ms=Number(r.headers.get('server-timing')?.match(/dur=([\d.]+)/)?.[1]);if(Number.isFinite(ms))app.push(ms);
     windowTimes.push(times.at(-1)!);
     if(r.ok){
      const value=JSON.parse(body);assert.equal(value.characterId??value.state.characterId,u.c.id);
      if(Number.isFinite(value.simulationAgeMs))ages.push(value.simulationAgeMs);
      if(value.battle?.auto===false&&!u.stopped){
       u.stopped=true;transitions.push({actor:i+1,room:mode==='party'?Math.floor(i/4)+1:null,atMs:Math.round(performance.now()-start),alive:value.battle.hp>0,poolWait:f.pool.waitingCount,httpInFlight:inflight});
      }
     }else if(r.status>=500)stop=true;
    }catch(error){const kind=received?'invalidResponse':signal.aborted&&signal.reason?.name==='TimeoutError'?'timeout':'network';requestFailures[kind]++;statuses[kind]=(statuses[kind]??0)+1;stop=true;}finally{u.reading=false;inflight--;}})();flights.add(flight);void flight.finally(()=>flights.delete(flight));
   }
   await sleep(10);
  }
  const plannedPolls=Math.ceil(seconds*1000*clients/750);
  const duePolls=stop?Math.ceil(Math.min(seconds*1000,performance.now()-start)*clients/750):plannedPolls;
  const unissued=Math.max(0,duePolls-requests-dropped),aborted=plannedPolls-duePolls;
  schedulerMissed+=unissued;dropped+=unissued+aborted;
  await Promise.all(flights);
  windows.push({second:Math.round((performance.now()-start)/1000),requests:requests-windowRequests,dropped:dropped-windowDrops,poolWaitPeak:windowPeak,httpP95Ms:Math.round(percentile(windowTimes,.95))});
  const workerStatus=workers?.report();clearInterval(timer);await Promise.all([solo.stop(),party.stop(),workers?.stop()]);
  const elapsed=performance.now()-start,cpuUsed=process.cpuUsage(cpu);
  const bad=(await f.pool.query('SELECT count(*)::int n FROM mare_game.character_progression WHERE gold<0 OR experience<0')).rows[0].n;assert.equal(bad,0);
  const activity=(await f.pool.query(`SELECT count(*)::int total,
   count(*) FILTER(WHERE simulation->>'auto'='true')::int auto,
   count(*) FILTER(WHERE (simulation->>'hp')::float8<=0)::int dead,
   count(*) FILTER(WHERE (simulation->>'hp')::float8>0 AND simulation->>'auto'='false')::int "stoppedAlive",
   (SELECT count(*)::int FROM mare_game.character_commands WHERE result->>'action'='battle.reward') rewards
   FROM mare_game.character_battles`)).rows[0];
  for(const key of ['total','auto','dead','stoppedAlive','rewards'])assert.ok(Number.isSafeInteger(activity[key]),'Invalid fixture activity metric');
  const report={
   runtime:{node:process.version,apiPoolMax:f.pool.options.max,
    api:f.service instanceof CompiledAuthService?'compiled':'source',
    developmentLoader:process.execArgv.some(v=>/tsx|--(?:import|loader)/.test(v))},
   activity,simulation:threaded?'workers':'inline',workerStatus,fixtureIntegrity:fixture?.integrity(),profile:mode,clients,
   parties:mode==='party'?clients/4:0,partitionLoad,controlled,providerFixtureLifetimeMs:f.provider.tokenLifetimeMs,
   startedAt,endedAt:new Date().toISOString(),processId:process.pid,
   durationSeconds:Math.round(elapsed/1000),requests,statuses,dropped,requestFailures,
   readSlots:{planned:plannedPolls,issued:requests,blockedByPrevious:readBusy,missedByScheduler:schedulerMissed,rejectedByCapacity:queueFull,unattemptedAfterAbort:aborted},
   dropReasons:{schedulerMissed,readBusy,queueFull,aborted},renewals,renewalFailures,transitions,windows,
   throughput:Math.round(requests*1000/elapsed),
   httpMs:{p50:Math.round(percentile(times,.5)),p95:Math.round(percentile(times,.95)),
    p99:Math.round(percentile(times,.99)),max:Math.round(Math.max(0,...times))},
   appP95Ms:Math.round(percentile(app,.95)),
   meanBytes:Math.round(bytes.reduce((n,b)=>n+b,0)/(bytes.length||1)),
   simulationAgeP95Ms:Math.round(percentile(ages,.95)),
   eventLoopP99Ms:Math.round(delay.percentile(99)/1e6),
   cpuCorePercent:Math.round((cpuUsed.user+cpuUsed.system)/elapsed/10),
   rssMiB:Math.round(process.memoryUsage().rss/1048576),maxPoolWait,
   solo:solo.flush(),party:party.flush(),invariants:{nonnegativeProgress:bad===0},
   passed:!stop&&(!fixture||fixture.integrity().valid)&&activity.auto===clients&&transitions.length===0&&renewalFailures===0&&
    (!workerStatus||workerStatus.restarts===0)&&dropped===0&&Object.keys(statuses).every(k=>k==='200')&&
    percentile(times,.95)<500&&percentile(ages,.95)<1000,
  };
  if(process.env.MARE_LOAD_REPORT){
   assert.match(process.env.MARE_LOAD_REPORT,/^(tmp|infra[\/]local)[\/][\w\/.-]+\.json$/);
   await writeFile(process.env.MARE_LOAD_REPORT,JSON.stringify(report,null,2));
  }
  console.log(JSON.stringify(report));
  if(!report.passed)process.exitCode=2;
 }finally{clearInterval(timer);await Promise.all(flights);await Promise.all([solo.stop(),party.stop(),workers?.stop()]);delay.disable();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
},undefined,true);
