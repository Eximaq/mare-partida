import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {characterCommandSchema} from '@mare/shared';
import {authDatabase} from './auth-support.mjs';
async function actor(f:any,name:string){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),doit=async(action:string,payload:any={})=>f.service.command(login.token,c.id,characterCommandSchema.parse({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}}));
 await doit('items.initialize');await doit('world.initialize');await doit('battle.start');return{login,c,lease,read,doit};
}
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
 const lobby=(await a.read()).lobby;assert.equal(lobby.limit,16);assert.equal(lobby.players.length,16);assert.equal(lobby.truncated,true);assert.equal(new Set(lobby.players.map((p:any)=>p.id)).size,16);assert(!lobby.players.some((p:any)=>p.id===a.c.id));
}));
