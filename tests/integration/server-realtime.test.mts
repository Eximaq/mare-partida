import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';
import pg from 'pg';
import * as http from '../../apps/game-server/src/http.js';
import {authDatabase} from './auth-support.mjs';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
const {createSession}=createRequire(import.meta.url)('../../apps/account-client/game-session.js');

test('realtime movement uses the authenticated server and preserves durable replay and revocation', {timeout:30000},async()=>{
 assert.equal(typeof (http as any).attachRealtime,'function','HTTP server must expose authenticated realtime transport');
 await authDatabase(async({service,vault,pool,provider})=>{
  const login=await service.login('realtime-a@example.invalid','fixture');
  const other=await service.login('realtime-b@example.invalid','fixture');
  const c=await service.createCharacter(login.token,{name:'Realtime',classId:'sword',factionId:'pirate'});
  const lease=await service.acquireControl(login.token,c.id);
  const command=async(action:any,payload={})=>service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await service.characterState(login.token,c.id)).version,control:lease,action,payload} as any);
  for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
  const server=http.createHttpServer({isReady:async()=>true});
  const transport=(http as any).attachRealtime(server,{service,vault,origin:'https://localhost:9443'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`ws://127.0.0.1:${(server.address() as any).port}/v1/realtime`;
  const clients:WebSocket[]=[];
  const connect=async(token=login.token,origin='https://localhost:9443')=>{
   const ws=new WebSocket(url,'mare.realtime.v1',{headers:{origin,cookie:`__Host-mare_session=${token}`}});clients.push(ws);
   const messages:any[]=[];ws.on('message',data=>messages.push(JSON.parse(data.toString())));ws.on('error',()=>{});
   await once(ws,'open');
   return {ws,messages,send:(value:unknown)=>ws.send(JSON.stringify(value))};
  };
  const until=async<T,>(fn:()=>T)=>{const end=Date.now()+5000;let value:T;while(!(value=fn())){if(Date.now()>end)throw Error('realtime condition timed out');await sleep(10);}return value;};
  try{
   for(const [path,origin,cookie,expected] of [
    ['/v1/realtime','https://attacker.invalid',login.token,403],
    ['/v1/realtime?token=forbidden','https://localhost:9443',login.token,404],
    ['/v1/realtime','https://localhost:9443','',401],
   ] as const){
    const bad=new WebSocket(url.replace('/v1/realtime',path),'mare.realtime.v1',{headers:{origin,...(cookie?{cookie:`__Host-mare_session=${cookie}`}:{})}});clients.push(bad);bad.on('error',()=>{});
    const [,response]=await once(bad,'unexpected-response');assert.equal(response.statusCode,expected);response.resume();bad.terminate();
   }
   const wrong=await connect(other.token);wrong.send({type:'subscribe',characterId:c.id,csrfToken:vault.csrf(other.token)});
   await until(()=>wrong.ws.readyState===WebSocket.CLOSED);assert.equal(wrong.messages.some(m=>m.type==='frame'),false);
   const badCsrf=await connect();badCsrf.send({type:'subscribe',characterId:c.id,csrfToken:'invalid'});
   await until(()=>badCsrf.ws.readyState===WebSocket.CLOSED);assert.equal(badCsrf.messages.some(m=>m.type==='frame'),false);
   for(const payload of [Buffer.from('binary'),'{invalid',JSON.stringify({type:'subscribe',characterId:c.id,csrfToken:vault.csrf(login.token),ownerId:c.id}),'x'.repeat(9000)]){
    const malformed=await connect();const closed=once(malformed.ws,'close');malformed.ws.send(payload);await closed;
    assert.equal(malformed.messages.some(m=>m.type==='frame'),false);
   }
   const a=await connect();a.send({type:'subscribe',characterId:c.id,csrfToken:vault.csrf(login.token)});
   const first=await until(()=>a.messages.find(m=>m.type==='frame'));
   assert.equal(first.frame.characterId,c.id);assert.equal(first.frame.fullState,undefined);
   const query=pg.Client.prototype.query;let expiryInjected=false;
   pg.Client.prototype.query=function(this:pg.Client,...args:any[]){
    const result=(query as any).apply(this,args),sql=typeof args[0]==='string'?args[0]:args[0].text;
    if(!expiryInjected&&sql.includes('p.character_id AS "characterId"')){expiryInjected=true;return Promise.resolve(result).then(async result=>{
      await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second' WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)",[c.id]);return result;
    });}return result;
   } as any;
   try{await until(()=>expiryInjected&&provider.refreshes===1&&a.messages.filter(m=>m.type==='frame').length>=2);assert.equal(a.ws.readyState,WebSocket.OPEN,'provider expiry at the frame boundary is revalidated, not a BFF logout');}
   finally{pg.Client.prototype.query=query;}
   const before=await service.characterState(login.token,c.id);
   const input={requestId:randomUUID(),expectedVersion:before.version,control:{epoch:lease.epoch,token:lease.token},action:'world.move',payload:{x:first.frame.world.position.x,y:first.frame.world.position.y+16}};
   const originalFrame=service.onlineFrame.bind(service);let entered!:()=>void,release!:()=>void,block=true;
   const waiting=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);
   service.onlineFrame=async(...args:Parameters<typeof originalFrame>)=>{if(block){block=false;entered();await gate;}return originalFrame(...args);};
   let ack:any;
   try{
    await waiting;a.send({type:'command',seq:1,command:input});
    ack=await Promise.race([until(()=>a.messages.find(m=>m.type==='ack'&&m.seq===1)),sleep(500).then(()=>null)]);
    assert.ok(ack,'a slow presentation must not queue a movement behind it');
   }finally{release();service.onlineFrame=originalFrame;}
   assert.equal(ack.result.requestId,input.requestId);
   a.send({type:'command',seq:2,command:input});
   const replay=await until(()=>a.messages.find(m=>m.type==='ack'&&m.seq===2));assert.deepEqual(replay.result,ack.result);
   const state=await service.characterState(login.token,c.id);assert.equal(state.version,before.version+1);assert.equal(state.gold,before.gold);assert.equal(state.experience,before.experience);
   assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_commands WHERE character_id=$1 AND request_id=$2',[c.id,input.requestId])).rows[0].n,1);
   const updated=await until(()=>a.messages.find(m=>m.type==='frame'&&m.frame.version===state.version));assert.equal(updated.frame.fullState,undefined,'movement stream stays compact after changing state version');
   const pingAt=performance.now();a.send({type:'ping',seq:3});await until(()=>a.messages.find(m=>m.type==='pong'&&m.seq===3));assert.ok(performance.now()-pingAt<1000);
   await service.acquireControl(login.token,c.id,lease.epoch);
   a.send({type:'command',seq:4,command:{...input,requestId:randomUUID(),expectedVersion:state.version}});
   const fenced=await until(()=>a.messages.find(m=>m.type==='error'&&m.seq===4));assert.equal(fenced.error,'control_conflict');
   assert.equal((await service.characterState(login.token,c.id)).version,state.version);
   await service.logout(login.token,'all');await until(()=>a.ws.readyState===WebSocket.CLOSED);
  }finally{for(const ws of clients)ws.terminate();await transport.close();await new Promise<void>(r=>server.close(()=>r()));}
 },undefined,true);
});

test('real game client receives compact movement without polling and falls back safely after socket loss',{timeout:30000},async()=>authDatabase(async({service,vault,pool})=>{
 const login=await service.login('realtime-client@example.invalid','fixture');
 await service.createCharacter(login.token,{name:'SocketClient',classId:'sword',factionId:'pirate'});
 const server=http.createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:86400})});
 const attach=(http as any).attachRealtime;
 const transport=typeof attach==='function'?attach(server,{service,vault,origin:'https://localhost:9443'}):null;
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`,storage=new Map(),paths:string[]=[],sockets:WebSocket[]=[];
 let dropAck=false,delayAck=false,expireRead=false,frameVersion=-1;
 const client=createSession({storage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},socketFactory:()=>{
  const ws=new WebSocket(base.replace('http:','ws:')+'/v1/realtime','mare.realtime.v1',{headers:{origin:'https://localhost:9443',cookie:`__Host-mare_session=${login.token}`}});
  const emit=ws.emit.bind(ws);
  ws.emit=((event:string,...args:any[])=>{if(event==='message'&&JSON.parse(args[0].toString()).type==='frame')frameVersion=JSON.parse(args[0].toString()).frame.version;if(event==='message'&&JSON.parse(args[0].toString()).type==='ack'){
    if(dropAck){dropAck=false;ws.terminate();return true;}
    if(delayAck){delayAck=false;setTimeout(()=>emit(event,...args),180);return true;}
  }return emit(event,...args);}) as typeof ws.emit;
  sockets.push(ws);return ws;
 },fetch:async(path:string,o:any={})=>{paths.push(path);const response=await fetch(base+path,{...o,headers:{...o.headers,origin:'https://localhost:9443',cookie:`__Host-mare_session=${login.token}`}});
  if(expireRead&&path.endsWith('/online-state')){expireRead=false;await response.arrayBuffer();await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");return Response.json({error:'unauthorized'},{status:401});}return response;}});
 const until=async(fn:()=>unknown)=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)assert.fail('realtime client did not become ready');await sleep(10);}};
 try{
  await client.load();const lease=await client.acquire();await client.command('items.initialize');await client.command('world.initialize');await client.command('battle.start');
  await until(()=>client.realtime?.connected);
  expireRead=true;await client.read(true);assert.ok(client.data&&client.available,'revalidate a provider boundary before discarding a still valid BFF session');
  const before=structuredClone(client.data.online),reads=paths.filter(p=>p.endsWith('/online-state')).length;
  const posts=paths.filter(p=>p.endsWith('/commands')).length;
  delayAck=true; // a newer authoritative frame can arrive before the ACK is handled
  const receipt=await client.command('world.move',{x:before.world.position.x,y:before.world.position.y+16});
  assert.equal(paths.filter(p=>p.endsWith('/commands')).length,posts,'movement goes through the socket');
  await sleep(450);
  assert.equal(paths.filter(p=>p.endsWith('/online-state')).length,reads,'compact pushes do not rebuild full progress per movement');
  assert.equal(client.data.online.state.gold,before.state.gold);
  assert.equal((await service.characterState(login.token,client.data.character.id)).version,receipt.state.version);
  assert.ok(client.realtime.intervalMs<400,'active snapshots must not wait for the old 750 ms timer');
  assert.ok(client.realtime.rttMs>=0);
  // An independent committed update must not make the next movement use the
  // old full/economic snapshot after its newer compact version has arrived.
  const advanced=await service.command(login.token,client.data.character.id,{requestId:randomUUID(),expectedVersion:receipt.state.version,action:'world.stop',payload:{},control:lease});
  await until(()=>frameVersion===advanced.state.version);
  assert.equal(client.data.online.state.version,before.state.version,'compact frames do not relabel economic data');
  const resumed=await client.command('world.move',{x:before.world.position.x,y:before.world.position.y+16});
  assert.equal(resumed.state.version,advanced.state.version+1,'movement uses the latest committed compact version');
  assert.equal(paths.filter(p=>p.endsWith('/online-state')).length,reads,'newer compact versions need no full-state read for movement');
  assert.equal(client.data.online.state.version,before.state.version,'movement must not relabel the economic snapshot');
  // Drop an ACK after COMMIT. HTTP retry must reuse the same durable command.
  dropAck=true;
  const stopped=await client.command('world.stop');
  assert.equal(client.data.online.world.path.length,0);
  assert.equal(paths.filter(p=>p.endsWith('/commands')).length,posts+1,'HTTP remains the authenticated fallback');
  assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_commands WHERE character_id=$1 AND request_id=$2',[client.data.character.id,stopped.requestId])).rows[0].n,1);
  assert.equal(stopped.state.version,resumed.state.version+1,'lost committed ACK must not apply movement twice');
  const row=(await pool.query('SELECT gold::text FROM mare_game.character_progression WHERE character_id=$1',[client.data.character.id])).rows[0];assert.equal(row.gold,before.state.gold);
 }finally{client.disconnectRealtime?.();for(const ws of sockets)ws.terminate();await transport?.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
},undefined,true));
