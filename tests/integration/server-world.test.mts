import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readWorld} from '../../apps/game-server/src/characters/world.js';
import {authDatabase} from './auth-support.mjs';
async function actor(service:any){const email=randomUUID()+'@example.invalid',login=await service.login(email,'fixture');const c=await service.createCharacter(login.token,{name:'Navigator',classId:'sword',factionId:'pirate'});let lease=await service.acquireControl(login.token,c.id);const read=()=>service.onlineState(login.token,c.id);const input=async(action:string,payload={})=>({requestId:randomUUID(),action,payload,expectedVersion:(await read()).state.version,control:{epoch:lease.epoch,token:lease.token}});const send=(v:any)=>service.command(login.token,c.id,v);await send(await input('items.initialize'));return {email,login,c,read,input,send,setLease:(v:any)=>lease=v};}
test('world initializes once at original port, movement consumes only server time, reload and stop preserve position',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),before=await a.read(),init=await a.input('world.initialize'),receipt=await a.send(init);
 assert.ok(receipt.world,'world command must return an authoritative snapshot');assert.deepEqual(receipt.world.position,{x:1504,y:1568});assert.equal(receipt.world.mapId,'lobby');assert.deepEqual(await a.send(init),receipt);
 const destination={x:1504,y:1632};
 const start=await a.send(await a.input('world.move',destination));assert.deepEqual(start.world.position,{x:1504,y:1568});assert(start.world.speed>0&&start.world.speed<300);
 await pool.query("UPDATE mare_game.character_world SET started_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id]);
 const moved=(await a.read()).world;assert(moved.position.y>1568&&moved.position.y<destination.y);assert(moved.position.x===destination.x);assert(moved.path.length>0);
 const stopped=await a.send(await a.input('world.stop'));assert.equal(stopped.world.path.length,0);assert.deepEqual((await a.read()).world.position,stopped.world.position);
 const after=await a.read();assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);assert.deepEqual(after.originalInventory,before.originalInventory);
 await assert.rejects(a.send(await a.input('world.move',{x:0,y:0})),{code:'world_destination_blocked'});
 const intents=await Promise.all([a.input('world.move',destination),a.input('world.move',{x:1504,y:1664})]);const two=await Promise.allSettled(intents.map(a.send));assert.equal(two.filter(x=>x.status==='fulfilled').length,1);
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
 const a=await actor(service);await a.send(await a.input('world.initialize'));await a.send(await a.input('world.move',{x:1504,y:1440}));
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
 await assert.rejects(a.send(await a.input('world.move',{x:1504,y:1440})),{code:'23514'});
 assert.deepEqual((await pool.query('SELECT * FROM mare_game.character_world')).rows,before);assert.equal((await a.read()).state.version,version);
 await pool.query('ALTER TABLE mare_game.character_commands DROP CONSTRAINT reject_world_test');
 await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()+interval '400 milliseconds' WHERE character_id=$1",[a.c.id]);
 const moved=await a.send(await a.input('world.move',{x:1504,y:1440}));assert(new Date(moved.world.motionUntil).getTime()-new Date(moved.world.serverNow).getTime()<=400);
 await new Promise(r=>setTimeout(r,450));const first=(await a.read()).world;await new Promise(r=>setTimeout(r,100));assert.deepEqual((await a.read()).world.position,first.position);assert.equal(first.path.length,0);
 await assert.rejects(a.send(await a.input('world.move',{x:1504,y:1440})),{code:'control_conflict'});
}));

test('server travel enforces all four Skypiea minimums and spawns on the chosen authored map',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);
 const {createRequire}=await import('node:module');
 const rules=createRequire(import.meta.url)('../../world-catalog.cjs').load();
 await a.send(await a.input('world.initialize'));
 await a.send(await a.input('battle.start'));
 for(const [islandId,min,type,level] of [['skypiea-01',75,'satori',77],['skypiea-02',80,'shura',84],['skypiea-03',85,'gendatsu',88],['skypiea-04',90,'ohm',95]] as const){
  const setLevel=(level:number)=>pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,level]);
  await setLevel(min-1);
  const before=await a.read();
  await assert.rejects(a.send(await a.input('world.travel',{islandId})),{code:'world_level_required'});
  const afterRejected=await a.read();
  assert.equal(afterRejected.world.mapId,before.world.mapId);
  assert.deepEqual(afterRejected.world.position,before.world.position);
  assert.equal(afterRejected.state.version,before.state.version);
  await setLevel(min);
  const moved=await a.send(await a.input('world.travel',{islandId}));
  assert.equal(moved.world.mapId,islandId);assert.equal(moved.world.area,islandId);
  assert.deepEqual(moved.world.position,{...rules.navigation(islandId).map.spawn});
  assert.deepEqual(moved.world.path,[]);
  assert.equal(moved.world.rulesHash,rules.rulesHash);
  const battle=(await a.read()).battle;assert.equal(battle.area,islandId);
  assert(battle.mobs.length>0&&battle.mobs.every((m:any)=>m.type===type&&m.level===level&&m.source==='world'));
 }
 await a.send(await a.input('world.return'));
 assert.equal((await a.read()).world.mapId,'lobby');
}));

test('Skypiea world migration moves only the audited old island and retains unrelated routes',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),b=await actor(service),c=await actor(service);
 for(const p of [a,b,c])await p.send(await p.input('world.initialize'));
 const previous='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9',unknown='f'.repeat(64);
 const seed=(id:string,hash:string,mapId:string,area:string|null)=>pool.query(
  "UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=$4,x=1392,y=1968,path='[{\"x\":1456,\"y\":1968}]',speed=150,motion_until=started_at+interval '30 seconds' WHERE character_id=$1",
  [id,hash,mapId,area]);
 await seed(a.c.id,previous,'skypiea-01','skypiea-01');
 await seed(b.c.id,previous,'lobby',null);
 await seed(c.c.id,unknown,'skypiea-01','skypiea-01');
 const {readFile}=await import('node:fs/promises');
 const sql=await readFile(new URL('../../apps/game-server/migrations/0061_skypiea_multi_maps.sql',import.meta.url),'utf8');
 await pool.query(sql);
 await pool.query(await readFile(new URL('../../apps/game-server/migrations/0062_enies_lobby.sql',import.meta.url),'utf8'));
 const rows=new Map((await pool.query('SELECT * FROM mare_game.character_world')).rows.map(row=>[row.character_id,row]));
 const oldSky=rows.get(a.c.id),other=rows.get(b.c.id),rejected=rows.get(c.c.id),spawn={x:1512,y:2600};
 const historicalHash='9c6aa574e983a938188e17282d07a3754b5fae612fff0fb829dadaae64edd2e7';
 assert.equal(oldSky.map_id,'skypiea-01');assert.equal(oldSky.area,'skypiea-01');
 assert.equal(oldSky.rules_hash,historicalHash);
 assert.deepEqual([oldSky.x,oldSky.y,oldSky.speed,oldSky.path],[spawn.x,spawn.y,0,[]]);
 assert.equal(oldSky.motion_until.getTime(),oldSky.started_at.getTime());
 assert.equal(other.rules_hash,historicalHash);
 for(const row of [other,rejected])assert.deepEqual([row.x,row.y,row.speed,row.path],[1392,1968,150,[{x:1456,y:1968}]]);
 assert.equal(rejected.rules_hash,unknown);
}));
