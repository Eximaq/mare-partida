import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {setTimeout as sleep} from 'node:timers/promises';
import type {AddressInfo} from 'node:net';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {authDatabase} from './auth-support.mjs';
const require=createRequire(import.meta.url),{createSession}=require('../../apps/account-client/game-session.js');

// Real loopback HTTP/PostgreSQL, fictional identities. No clocks or receipt
// timestamps are changed: this must cross the old 180/minute barrier in real time.
test('two players sustain movement and target selection for 70 seconds behind one IP', {timeout:120000},async()=>authDatabase(async({service,vault,pool,provider})=>{
 assert.equal(provider.tokenLifetimeMs,900000,'use the approved development policy, not the short expiry fixture');
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const statuses:number[]=[],clients:any[]=[];
 try{
  for(const [i,map] of ['lobby','dawn'].entries()){
   const login=await service.login(`sustained-${i}@example.invalid`,'fixture');
   await service.createCharacter(login.token,{name:'Paced'+i,classId:'sword',factionId:'pirate'});
   let sessionCookie=login.token;
   const storage=new Map(),client=createSession({storage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},fetch:async(path:string,o:any={})=>{
    const response=await fetch(base+path,{...o,headers:{...o.headers,origin:'https://localhost:9443',cookie:`__Host-mare_session=${sessionCookie}`}});
    // Honor response cookies just as the browser does; never log their values.
    for(const line of response.headers.getSetCookie()){const value=/^__Host-mare_session=([^;]*)/.exec(line)?.[1];if(value!==undefined)sessionCookie=value;}
    statuses.push(response.status);return response;
   }});
   await client.load();await client.acquire();await client.command('items.initialize');await client.command('world.initialize');await client.command('battle.start');
   if(map==='dawn')await client.command('world.travel',{islandId:'dawn'});
   clients.push({client,map,initial:structuredClone(client.data.online.world.position)});
  }
  const started=performance.now();
  const results=await Promise.all(clients.map(async({client,map,initial})=>{
   let next=performance.now(),renewAt=next+5000,readAt=next+750,moves=0,targets=0;const times:number[]=[];
   while(performance.now()-started<70000){
    await sleep(Math.max(0,next-performance.now()));const at=performance.now();
    if(at>=renewAt){await client.renew();renewAt=performance.now()+5000;}
    if(at>=readAt){await client.readFrame();readAt=performance.now()+750;}
    const action=moves%24===23?'battle.target':moves%8===7?'world.stop':'world.move';
    const target=client.data.online.battle?.mobs.find((m:any)=>m.alive&&!m.returning);
    const payload=action==='world.move'?{x:initial.x,y:initial.y+(moves%2?16:0)}:action==='battle.target'?{targetId:target?.id??null}:{};
    await client.command(action,payload);times.push(performance.now()-at);if(action==='battle.target')targets++;moves++;
    // No catch-up burst after a delayed response.
    next=Math.max(next+125,performance.now());
   }
   await client.command('world.stop');await client.read(true);times.sort((a,b)=>a-b);
   assert.ok(moves-targets>180,'must exceed the old minute quota with successful real commands');assert.ok(targets>5,'target selection interleaved with movement');
   assert.equal(client.data.online.world.path.length,0);assert.equal(client.data.online.world.mapId,map);
   const persisted=(await pool.query('SELECT state_version FROM mare_game.characters WHERE id=$1',[client.data.character.id])).rows[0].state_version;
   assert.equal(Number(persisted),client.data.online.state.version);
   return {map,commands:moves+1,movement:moves-targets+1,targets,p95Ms:times[Math.ceil(times.length*.95)-1],maxMs:times.at(-1)};
  }));
  assert.ok(performance.now()-started>=70000);assert.ok(statuses.every(s=>s>=200&&s<300),'no HTTP errors, including no false rate limiting');
  console.log(JSON.stringify({sustainedSeconds:70,players:2,sharedIp:true,httpErrors:0,results}));
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
},undefined,true));
