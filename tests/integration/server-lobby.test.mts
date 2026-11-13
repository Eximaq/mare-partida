import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {characterCommandSchema} from '@mare/shared';
import {readLobby} from '../../apps/game-server/src/characters/lobby.js';
import type {PoolClient} from 'pg';
import pg from 'pg';
import {authDatabase} from './auth-support.mjs';
async function actor(f:any,name:string){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),doit=async(action:string,payload:any={})=>f.service.command(login.token,c.id,characterCommandSchema.parse({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}}));
 await doit('items.initialize');await doit('world.initialize');await doit('battle.start');return{login,c,lease,read,doit};
}
test('legacy character without profile remains mutually visible with the same default appearance and no save writes',async()=>authDatabase(async f=>{
 const a=await actor(f,'Alfa'),b=await actor(f,'Beta'),c=await actor(f,'Amigo');
 await f.pool.query('DELETE FROM mare_game.character_profile WHERE character_id=$1',[b.c.id]);
 const before=(await b.read());
 for(const viewer of [a,b,c]){
  const peers=(await viewer.read()).lobby.players;
  assert.deepEqual(peers.map((p:any)=>p.id).sort(),[a,b,c].filter(p=>p!==viewer).map(p=>p.c.id).sort());
  if(viewer!==b)assert.deepEqual(peers.find((p:any)=>p.id===b.c.id).appearance96,before.profile.appearance);
 }
 assert.deepEqual((await b.read()).state,before.state);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.character_profile WHERE character_id=$1',[b.c.id])).rows[0].n,0);
}));
test('automatic channels admit 48 concurrent characters with symmetric bounded rosters, stable slots and safe switching',async()=>authDatabase(async f=>{
 const first=await actor(f,'Primeiro');
 assert.equal((await first.read()).lobby.channel.capacity,24);
 const actors=[first];
 for(let batch=0;batch<4;batch++)actors.push(...await Promise.all(Array.from({length:batch===3?11:12},(_,i)=>actor(f,`Canal ${batch} ${i}`))));
 const snapshots=await Promise.all(actors.map(a=>a.read()));
 const counts=new Map<number,number>();
 for(const s of snapshots)counts.set(s.lobby.channel.id,(counts.get(s.lobby.channel.id)||0)+1);
 assert.deepEqual([...counts.values()],[24,24]);
 for(let i=0;i<actors.length;i++){
  const lobby=snapshots[i].lobby;assert.equal(lobby.limit,23);assert.equal(lobby.players.length,23);assert.equal(lobby.truncated,false);
  const expected=actors.filter((_,n)=>n!==i&&snapshots[n].lobby.channel.id===lobby.channel.id).map(a=>a.c.id).sort();
  assert.deepEqual(lobby.players.map((p:any)=>p.id).sort(),expected);
 }
 const home=snapshots[0].lobby.channel.id,away=[...counts.keys()].find(c=>c!==home)!;
 const before=snapshots[0].state;
 await assert.rejects(first.doit('lobby.channel',{channelId:away}),{code:'lobby_channel_full'});
 assert.deepEqual((await first.read()).state,before);
 const leaving=actors.find((_,i)=>snapshots[i].lobby.channel.id===away)!;
 await leaving.doit('world.travel',{islandId:'dawn'});
 const rivals=actors.filter((_,i)=>snapshots[i].lobby.channel.id===home).slice(0,2);
 const changes=await Promise.allSettled(rivals.map(a=>a.doit('lobby.channel',{channelId:away})));
 assert.equal(changes.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(changes.filter(r=>r.status==='rejected'&&r.reason.code==='lobby_channel_full').length,1);
 const winner=rivals[changes.findIndex(r=>r.status==='fulfilled')]!;
 await assert.rejects(winner.doit('lobby.channel',{channelId:home}),{code:'lobby_channel_cooldown'});
 await assert.rejects(leaving.doit('lobby.channel',{channelId:home}),{code:'lobby_required'});
 await leaving.doit('world.return');
 assert.equal((await leaving.read()).lobby.channel.id,home);
 assert.equal((await winner.read()).lobby.players.length,23);
 for(const a of actors.filter(a=>a!==leaving&&!rivals.includes(a)))assert.equal((await a.read()).lobby.channel.id,snapshots[actors.indexOf(a)].lobby.channel.id);
 assert.equal((await f.pool.query('SELECT max(n)::int n FROM (SELECT count(*) n FROM mare_game.lobby_channel_members GROUP BY channel_id) c')).rows[0].n,24);
}));
test('shared lobby exposes only public appearance and authoritative motion; travel and logout remove peers',async()=>authDatabase(async f=>{
 const a=await actor(f,'Navegante Alfa'),b=await actor(f,'Navegante Beta');
 const lobby=(await a.read()).lobby;assert.equal(lobby.players.length,1);const peer=lobby.players[0];assert.equal(peer.id,b.c.id);assert.equal(peer.name,'Navegante Beta');assert.deepEqual(peer.world.position,(await b.read()).world.position);
 assert.deepEqual(Object.keys(peer).sort(),['appearance96','classId','equipment','factionId','hideHeadgear','id','name','world'].sort());
 for(const item of Object.values(peer.equipment) as any[])if(item)assert.deepEqual(Object.keys(item),['def']);
 const before=(await b.read()).state;await Promise.all([a.read(),b.read()]);assert.deepEqual((await b.read()).state,before);
 await assert.rejects(f.service.onlineState(a.login.token,b.c.id),{code:'character_not_found'});
 await b.doit('world.travel',{islandId:'dawn'});assert.deepEqual((await a.read()).lobby.players,[]);assert.deepEqual((await b.read()).lobby.players,[]);
 await b.doit('world.return');assert.equal((await a.read()).lobby.players.length,1);
 await f.service.logout(b.login.token,'local');assert.deepEqual((await a.read()).lobby.players,[]);
}));
test('channel slots follow renewed control, reclaim expiry and reject cross-account directory reads',async()=>authDatabase(async f=>{
 const a=await actor(f,'Alpha'),b=await actor(f,'Beta');
 await assert.rejects(f.service.lobbyChannels(a.login.token,b.c.id),{code:'character_not_found'});
 const old=(await f.pool.query('SELECT reserved_until FROM mare_game.lobby_channel_members WHERE character_id=$1',[b.c.id])).rows[0];
 await f.service.renewControl(b.login.token,b.c.id,b.lease);
 const renewed=(await f.pool.query('SELECT m.reserved_until=c.expires_at exact,m.reserved_until>$2 newer FROM mare_game.lobby_channel_members m JOIN mare_game.character_control c USING(character_id) WHERE m.character_id=$1',[b.c.id,old.reserved_until])).rows[0];assert(renewed.exact&&renewed.newer);
 await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[b.c.id]);
 await f.pool.query("UPDATE mare_game.lobby_channel_members SET reserved_until=clock_timestamp()-interval '1 second' WHERE character_id=$1",[b.c.id]);
 const c=await actor(f,'Gamma');
 assert.equal((await a.read()).lobby.players.some((p:any)=>p.id===b.c.id),false);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.lobby_channel_members WHERE character_id=$1',[b.c.id])).rows[0].n,0);
 await f.service.acquireControl(b.login.token,b.c.id,b.lease.epoch);
 assert.equal((await a.read()).lobby.players.length,2);
 const channels=await f.service.lobbyChannels(c.login.token,c.c.id);assert.deepEqual(channels.channels,[{id:1,occupancy:3,current:true,capacity:24,available:21}]);
 await assert.rejects(a.doit('lobby.channel',{channelId:4096}),{code:'lobby_channel_not_found'});
 const state=await f.service.characterState(a.login.token,a.c.id),input=characterCommandSchema.parse({action:'lobby.channel',payload:{channelId:1},requestId:randomUUID(),expectedVersion:state.version,control:{epoch:a.lease.epoch,token:a.lease.token}});
 const first=await f.service.command(a.login.token,a.c.id,input);assert.deepEqual(await f.service.command(a.login.token,a.c.id,input),first);
 assert.equal((await f.service.characterState(a.login.token,a.c.id)).version,state.version+1);
}));
test('repeated roster frames reuse a generic PostgreSQL plan without leaking another channel',async()=>authDatabase(async f=>{
 const a=await actor(f,'Planejamento'),b=await actor(f,'Vizinho'),world=(await a.read()).world,c=await f.pool.connect();
 try{
  for(let n=0;n<12;n++)assert.deepEqual((await readLobby(c,a.c.id,world)).players.map(p=>p.id),[b.c.id]);
  const plans=(await c.query("SELECT generic_plans::int uses FROM pg_prepared_statements WHERE statement LIKE '%p.appearance,p.preferences,i.equipment%'")).rows;
  assert(plans.some(p=>p.uses>0),'hot roster must reuse its bounded generic query plan');
  await f.pool.query('UPDATE mare_game.lobby_channel_members SET channel_id=2 WHERE character_id=$1',[b.c.id]);
  assert.deepEqual((await readLobby(c,a.c.id,world)).players,[]);
 }finally{c.release();}
}));
test('compact frames batch personal state, world and battle without a redundant battle fetch',async()=>authDatabase(async f=>{
 const a=await actor(f,'Snapshot'),query=pg.Client.prototype.query;let separateBattle=0,repeatedPartySchema=0;
 pg.Client.prototype.query=function(this:any,...args:any[]){const sql=typeof args[0]==='string'?args[0]:args[0].text;if(sql==='SELECT simulation FROM mare_game.character_battles WHERE character_id=$1')separateBattle++;if(sql==="SELECT to_regclass('mare_game.party_members') present")repeatedPartySchema++;return (query as any).apply(this,args);} as any;
 try{
  const frame=await f.service.onlineFrame(a.login.token,a.c.id);
  assert.equal(separateBattle,0,'the compact snapshot must not fetch its already joined personal battle again');
  assert.equal(repeatedPartySchema,0,'presentation must share the schema capability from its initial access query');
  const full=await a.read();assert.deepEqual(frame.world?.position,full.world.position);assert.deepEqual(frame.battle,full.battle);assert.equal(frame.version,full.state.version);
 }finally{pg.Client.prototype.query=query;}
 await a.doit('world.travel',{islandId:'dawn'});
 const frame=await f.service.onlineFrame(a.login.token,a.c.id),full=await a.read();assert.equal(frame.world?.mapId,'dawn');assert.deepEqual(frame.battle,full.battle);assert.equal(frame.version,full.state.version);
}));
test('frame authorization reuses SQL plans but observes committed revocation immediately',async()=>authDatabase(async f=>{
 const a=await actor(f,'Planos');
 for(let n=0;n<12;n++)await f.service.onlineFrame(a.login.token,a.c.id);
 const plans=(await f.pool.query("SELECT generic_plans::int uses FROM pg_prepared_statements WHERE statement LIKE 'SELECT s.id,s.account_id,s.provider_valid_until%'")).rows;
 assert(plans.some(p=>p.uses>0),'repeated access SQL should reuse a generic plan, never authorization data');
 await f.service.logout(a.login.token,'local');
 await assert.rejects(f.service.onlineFrame(a.login.token,a.c.id),{code:'authentication_required'});
}));
test('expired control, revoked epoch and unverified provider sessions are absent; privacy hides gear',async()=>authDatabase(async f=>{
 const a=await actor(f,'Navegante Alfa'),b=await actor(f,'Navegante Beta');
 await b.doit('profile.preferences',{hideItems:true,hideHeadgear:true});const peer=(await a.read()).lobby.players[0];assert.deepEqual(peer.equipment,{});assert.equal(peer.hideHeadgear,true);
 await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[b.c.id]);assert.deepEqual((await a.read()).lobby.players,[]);
 await f.service.acquireControl(b.login.token,b.c.id,b.lease.epoch);assert.equal((await a.read()).lobby.players.length,1);
 await f.pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second' WHERE id=(SELECT session_id FROM mare_game.character_control WHERE character_id=$1)",[b.c.id]);assert.deepEqual((await a.read()).lobby.players,[]);
 await b.read();assert.equal((await a.read()).lobby.players.length,1);
 await f.pool.query('UPDATE mare_game.accounts SET auth_epoch=auth_epoch+1 WHERE id=(SELECT account_id FROM mare_game.characters WHERE id=$1)',[b.c.id]);assert.deepEqual((await a.read()).lobby.players,[]);
}));


test('public character IDs confer no authority and the roster is bounded',async()=>authDatabase(async f=>{
 const a=await actor(f,'Observador'),b=await actor(f,'Companheiro');
 await assert.rejects(f.service.acquireControl(a.login.token,b.c.id),{code:'character_not_found'});
 const forged=characterCommandSchema.parse({requestId:randomUUID(),expectedVersion:(await b.read()).state.version,action:'world.move',payload:{x:1504,y:832},control:{epoch:a.lease.epoch,token:a.lease.token}});
 await assert.rejects(f.service.command(a.login.token,b.c.id,forged),{code:'character_not_found'});
 for(let n=0;n<16;n++)await actor(f,'Visitante '+n);
 const lobby=(await a.read()).lobby;assert.equal(lobby.limit,23);assert.equal(lobby.players.length,17);assert.equal(lobby.truncated,false);assert.equal(new Set(lobby.players.map((p:any)=>p.id)).size,17);assert(!lobby.players.some((p:any)=>p.id===a.c.id));
 const world=(await a.read()).world;
 const c=await f.pool.connect();
 try{
  let queries=0;
  const counting={query(...args:any[]){queries++;return (c.query as Function).apply(c,args);}} as PoolClient;
  const projection=await readLobby(counting,a.c.id,world);
  assert.equal(projection.players.length,17);
  assert.equal(queries,2,'capabilities plus one atomic roster query must also carry the already joined authoritative positions');
 }finally{c.release();}
}));
