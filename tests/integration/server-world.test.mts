import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readWorld} from '../../apps/game-server/src/characters/world.js';
import {authDatabase} from './auth-support.mjs';
async function actor(service:any){const email=randomUUID()+'@example.invalid',login=await service.login(email,'fixture');const c=await service.createCharacter(login.token,{name:'Navigator',classId:'sword',factionId:'pirate'});let lease=await service.acquireControl(login.token,c.id);const read=()=>service.onlineState(login.token,c.id);const input=async(action:string,payload={})=>({requestId:randomUUID(),action,payload,expectedVersion:(await read()).state.version,control:{epoch:lease.epoch,token:lease.token}});const send=(v:any)=>service.command(login.token,c.id,v);await send(await input('items.initialize'));return {email,login,c,read,input,send,setLease:(v:any)=>lease=v};}
test('world initializes once at original port, movement consumes only server time, reload and stop preserve position',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),before=await a.read(),init=await a.input('world.initialize'),receipt=await a.send(init);
 assert.ok(receipt.world,'world command must return an authoritative snapshot');assert.deepEqual(receipt.world.position,{x:1504,y:1568});assert.equal(receipt.world.mapId,'lobby');assert.deepEqual(await a.send(init),receipt);
 const start=await a.send(await a.input('world.move',{x:1504,y:1632}));assert.deepEqual(start.world.position,{x:1504,y:1568});assert(start.world.speed>0&&start.world.speed<300);
 await pool.query("UPDATE mare_game.character_world SET started_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id]);
 const moved=(await a.read()).world;assert(moved.position.y>1568&&moved.position.y<1632);assert(moved.position.x===1504);assert(moved.path.length>0);
 const stopped=await a.send(await a.input('world.stop'));assert.equal(stopped.world.path.length,0);assert.deepEqual((await a.read()).world.position,stopped.world.position);
 const after=await a.read();assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);assert.deepEqual(after.originalInventory,before.originalInventory);
 await assert.rejects(a.send(await a.input('world.move',{x:0,y:0})),{code:'world_destination_blocked'});
 const intents=await Promise.all([a.input('world.move',{x:1504,y:1632}),a.input('world.move',{x:1504,y:1696})]);const two=await Promise.allSettled(intents.map(a.send));assert.equal(two.filter(x=>x.status==='fulfilled').length,1);
}));
test('travel respects original island gates and server spawns, crossing accounts and stale controllers cannot move or replay',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),b=await actor(service);await a.send(await a.input('world.initialize'));
 const before=await a.read();await assert.rejects(a.send(await a.input('world.travel',{islandId:'conchas'})),{code:'world_level_required'});assert.deepEqual((await a.read()).world.position,before.world.position);
 const request=await a.input('world.travel',{islandId:'dawn'}),trip=await a.send(request);assert.equal(trip.world.mapId,'dawn');assert.deepEqual(trip.world.position,{x:872,y:1608});assert.equal(trip.world.area,'beach');
 await assert.rejects(service.command(b.login.token,a.c.id,request as any),{code:'character_not_found'});
 // Explicit same-account fixture via the already authorized session takes over epoch.
 const next=await service.acquireControl(a.login.token,a.c.id,request.control.epoch);
 await assert.rejects(a.send(request),{code:'control_conflict'});a.setLease(next);
 await a.send(await a.input('world.return'));assert.deepEqual((await a.read()).world.position,{x:1504,y:1568});
 await assert.rejects(a.send(await a.input('world.travel',{islandId:'quest-dungeons'})),{code:'world_destination_unknown'});
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_world')).rows[0].n,1);
}));

test('the Skypiea catalog destination records an achievement visit without changing balances',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);
 await a.send(await a.input('world.initialize'));
 await pool.query('UPDATE mare_game.character_progression SET level=75 WHERE character_id=$1',[a.c.id]);
 const before=await a.read();
 await a.send(await a.input('world.travel',{islandId:'skypiea-01'}));
 const after=await a.read();
 assert.equal(after.world?.mapId,'skypiea-01');
 assert.deepEqual((await pool.query('SELECT island_id FROM mare_game.achievement_visits WHERE character_id=$1',[a.c.id])).rows,[{island_id:'skypiea-01'}]);
 assert.equal(after.state.experience,before.state.experience);
 assert.equal(after.state.gold,before.state.gold);
}));

test('pilot attacks use authoritative position and reject range bypass before consuming HP, turn or RNG rewards',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(await a.input('world.initialize'));await a.send(await a.input('journey.begin'));await a.send(await a.input('hunt.begin'));
 await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds' WHERE character_id=$1",[a.c.id]);await a.send(await a.input('hunt.claim'));
 await a.send(await a.input('combat.begin'));let o=await a.read();assert.ok(o.combat.enemyPosition,'server must choose the pilot enemy position');assert.equal(o.world.mapId,'dawn');
 await pool.query("UPDATE mare_game.combat_encounters SET next_attack_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[a.c.id]);
 const turn=o.combat.turn;await assert.rejects(a.send(await a.input('combat.attack')),{code:'combat_out_of_range'});assert.equal((await a.read()).combat.turn,turn);
 await a.send(await a.input('world.move',o.combat.enemyPosition));await pool.query("UPDATE mare_game.character_world SET started_at=clock_timestamp()-interval '2 seconds',motion_until=clock_timestamp()+interval '10 seconds' WHERE character_id=$1",[a.c.id]);
 const attack=await a.input('combat.attack'),result=await a.send(attack);assert.equal(result.combat.turn,turn+1);assert.deepEqual(await a.send(attack),result);assert.equal((await a.read()).world.path.length,0);
}));

for(const scope of ['local','all'] as const)test(`movement stops permanently after ${scope} logout, including another controlling device`,async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(await a.input('world.initialize'));await a.send(await a.input('world.move',{x:1504,y:1696}));
 // A global logout can originate in a different device of the same account.
 let token=a.login.token;
 if(scope==='all'){
  token=(await service.login(a.email,'fixture')).token;
 }
 await service.logout(token,scope);
 const c=await pool.connect();try{const stopped=await readWorld(c,a.c.id);await new Promise(r=>setTimeout(r,150));const again=await readWorld(c,a.c.id);assert.deepEqual(again!.position,stopped!.position);assert.equal(again!.path.length,0);}finally{c.release();}
}));
test('world transaction rolls back position, version and receipt on storage failure; lease expiry caps motion',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(await a.input('world.initialize'));
 const before=(await pool.query('SELECT * FROM mare_game.character_world')).rows,version=(await a.read()).state.version;
 await pool.query('ALTER TABLE mare_game.character_commands ADD CONSTRAINT reject_world_test CHECK(false) NOT VALID');
 await assert.rejects(a.send(await a.input('world.move',{x:1504,y:1696})),{code:'23514'});
 assert.deepEqual((await pool.query('SELECT * FROM mare_game.character_world')).rows,before);assert.equal((await a.read()).state.version,version);
 await pool.query('ALTER TABLE mare_game.character_commands DROP CONSTRAINT reject_world_test');
 await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()+interval '400 milliseconds' WHERE character_id=$1",[a.c.id]);
 const moved=await a.send(await a.input('world.move',{x:1504,y:1696}));assert(new Date(moved.world.motionUntil).getTime()-new Date(moved.world.serverNow).getTime()<=400);
 await new Promise(r=>setTimeout(r,450));const first=(await a.read()).world;await new Promise(r=>setTimeout(r,100));assert.deepEqual((await a.read()).world.position,first.position);assert.equal(first.path.length,0);
 await assert.rejects(a.send(await a.input('world.move',{x:1504,y:1696})),{code:'control_conflict'});
}));
