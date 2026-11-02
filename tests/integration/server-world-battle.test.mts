import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import * as battle from '../../apps/game-server/src/characters/battle.js';
async function actor(service:any,classId="sword"){const login=await service.login(randomUUID()+'@example.invalid','fixture'),c=await service.createCharacter(login.token,{name:'Hunter',classId,factionId:'pirate'});let lease=await service.acquireControl(login.token,c.id);const read=()=>service.onlineState(login.token,c.id),input=async(action:string,payload={})=>({requestId:randomUUID(),action,payload,expectedVersion:(await read()).state.version,control:{epoch:lease.epoch,token:lease.token}}),send=(v:any)=>service.command(login.token,c.id,v);await send(await input('items.initialize'));await send(await input('world.initialize'));return {login,c,read,input,send,setLease:(l:any)=>lease=l};}
test('battle is opt-in, preserves prior progress, starts once and isolates other accounts',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),b=await actor(service),before=await a.read();
 const start=await a.input('battle.start'),receipt=await a.send(start);assert.deepEqual(await a.send(start),receipt);
 await a.send(await a.input('world.travel',{islandId:'dawn'}));const o=await a.read();
 assert.equal(o.battle.area,'beach');assert.equal(o.battle.mobs.length,14);assert.equal(o.state.gold,before.state.gold);assert.deepEqual(o.originalInventory,before.originalInventory);
 await assert.rejects(service.command(b.login.token,a.c.id,await a.input('battle.auto',{enabled:true}) as any),{code:'character_not_found'});
 await assert.rejects(a.send(await a.input('battle.target',{targetId:randomUUID()})),{code:'battle_target_missing'});
 const old=await a.input('battle.auto',{enabled:true});await a.send(old);a.setLease(await service.acquireControl(a.login.token,a.c.id,old.control.epoch));
 await assert.rejects(a.send(old),{code:'control_conflict'});assert.equal((await a.read()).battle.auto,false);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_battles')).rows[0].n,1);
}));
test('first victory claims once and preserves entitlement with a full bag; travel preserves respawn deadlines',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(await a.input('battle.start'));await a.send(await a.input('world.travel',{islandId:'dawn'}));let o=await a.read();
 await assert.rejects(a.send(await a.input('battle.first')),{code:'battle_first_unavailable'});
 o.battle.hunts.areas.beach.bosses=1;o.battle.hunts.areas.beach.respawns['beach-cais-0']=Date.now()+30000;
 await pool.query('UPDATE mare_game.character_battles SET simulation=$1',[JSON.stringify(o.battle)]);
 const inventory=o.originalInventory.inventory;
 const full=Array.from({length:120},()=>({...inventory[0],id:randomUUID()}));await pool.query('UPDATE mare_game.game_inventory SET inventory=$1',[JSON.stringify(full)]);
 await assert.rejects(a.send(await a.input('battle.first')),{code:'inventory_full'});assert.equal((await a.read()).battle.hunts.areas.beach.firstRewardClaimed,false);
 await pool.query('UPDATE mare_game.game_inventory SET inventory=$1',[JSON.stringify(inventory)]);
 const previousGold=BigInt(o.state.gold),first=await a.input('battle.first'),receipt=await a.send(first);assert.deepEqual(await a.send(first),receipt);
 o=await a.read();assert.equal(BigInt(o.state.gold),previousGold+300n);assert.equal(o.originalInventory.inventory.length,inventory.length+1);assert.equal(o.battle.hunts.areas.beach.firstRewardClaimed,true);
 await assert.rejects(a.send(await a.input('battle.first')),{code:'battle_first_unavailable'});
 await a.send(await a.input('world.return'));await a.send(await a.input('world.travel',{islandId:'dawn'}));o=await a.read();assert.equal(o.battle.mobs.some((m:any)=>m.spawnId==='beach-cais-0'),false);assert.equal(o.battle.hunts.areas.beach.firstRewardClaimed,true);
}));
test('skills, potions and equipment obey living battle state without a second HP wallet',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(await a.input('battle.start'));await a.send(await a.input('world.travel',{islandId:'dawn'}));let o=await a.read();
 const b=o.battle,m=b.mobs[0];b.hp=20;m.patrolClock=100;m.engaged=true;
 await pool.query('UPDATE mare_game.character_battles SET simulation=$1',[JSON.stringify(b)]);
 await a.send(await a.input('potions.use'));o=await a.read();assert(o.battle.hp>20);assert.equal(o.originalInventory.potions,3);
 await assert.rejects(a.send(await a.input('items.unequip',{slot:'weapon'})),{code:'equipment_during_combat'});
 await pool.query('UPDATE mare_game.character_world SET x=$1,y=$2',[m.x-25,m.y]);await a.send(await a.input('battle.target',{targetId:m.id}));
 const energy=(await a.read()).battle.energy;await a.send(await a.input('battle.skill',{index:0}));assert.equal((await a.read()).battle.energy,energy-17);
 await assert.rejects(a.send(await a.input('battle.skill',{index:0})),{code:'battle_skill_unavailable'});
}));
test('worker advances only authorized server time, serializes kills and atomically awards original loot',async()=>authDatabase(async({service,pool})=>{
 assert.equal(typeof (battle as any).tickWorldBattles,'function');const tick=()=>(battle as any).tickWorldBattles(pool);
 const a=await actor(service,'strategist');await a.send(await a.input('battle.start'));await a.send(await a.input('world.travel',{islandId:'dawn'}));
 let o=await a.read();const m=o.battle.mobs[0];
 await pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-25,m.y]);
 await a.send(await a.input('battle.target',{targetId:m.id}));
 // Isolated PostgreSQL fixture: a near-death monster makes the transactional race deterministic.
 o=await a.read();o.battle.mobs[0].hp=1;o.battle.mobs[0].patrolClock=100;
 o.battle.pending={targetId:m.id,remaining:.01};o.battle.attackClock=1;
 await pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '250 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(o.battle)]);
 await Promise.all([tick(),tick()]);const after=await a.read();
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.world_battle_rewards')).rows[0].n,1);
 assert.equal(after.contracts.progress['dawn-patrol'],1,'concurrent worker retries cannot duplicate contract progress');
 assert(BigInt(after.state.experience)>BigInt(o.state.experience));assert(BigInt(after.state.gold)>BigInt(o.state.gold));
 const xp=after.state.experience;await tick();assert.equal((await a.read()).state.experience,xp);assert.equal((await a.read()).contracts.progress['dawn-patrol'],1);
 const snapshot=(await pool.query('SELECT simulation,tick_at FROM mare_game.character_battles')).rows;
 await a.read();await a.read();assert.deepEqual((await pool.query('SELECT simulation,tick_at FROM mare_game.character_battles')).rows,snapshot,'GET never advances simulation');
 await service.logout(a.login.token,'all');await tick();assert.deepEqual((await pool.query('SELECT simulation,tick_at FROM mare_game.character_battles')).rows,snapshot);
}));
test('expired controller/provider and restart gaps never farm offline; reward write failure rolls back the whole tick',async()=>authDatabase(async({service,pool})=>{
 const tick=()=>(battle as any).tickWorldBattles(pool),a=await actor(service,'strategist');await a.send(await a.input('battle.start'));await a.send(await a.input('world.travel',{islandId:'dawn'}));await a.send(await a.input('battle.auto',{enabled:true}));
 await pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '1 hour'");await tick();let o=await a.read();assert.equal(o.battle.auto,false);assert.equal(o.state.experience,'0');
 const m=o.battle.mobs[0];await pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-25,m.y]);
 await a.send(await a.input('battle.target',{targetId:m.id}));o=await a.read();o.battle.mobs[0].hp=1;o.battle.mobs[0].patrolClock=100;o.battle.pending={targetId:m.id,remaining:.01};o.battle.attackClock=1;
 await pool.query("UPDATE mare_game.character_battles SET simulation=$1,tick_at=clock_timestamp()-interval '250 milliseconds'",[JSON.stringify(o.battle)]);
 const before=(await pool.query('SELECT * FROM mare_game.character_battles')).rows;
 await pool.query('ALTER TABLE mare_game.world_battle_rewards ADD CONSTRAINT reject_reward_test CHECK(false) NOT VALID');await assert.rejects(tick());
 assert.deepEqual((await pool.query('SELECT * FROM mare_game.character_battles')).rows,before);assert.equal((await a.read()).state.experience,'0');
 await pool.query('ALTER TABLE mare_game.world_battle_rewards DROP CONSTRAINT reject_reward_test');
 await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");await tick();assert.deepEqual((await pool.query('SELECT * FROM mare_game.character_battles')).rows,before);
 await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()+interval '1 minute'");await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second'");await tick();assert.deepEqual((await pool.query('SELECT * FROM mare_game.character_battles')).rows,before);
}));
test('one invalid battle rolls back without starving another account in the worker batch',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),b=await actor(service);
 for(const owner of [a,b]){await owner.send(await owner.input('battle.start'));await owner.send(await owner.input('world.travel',{islandId:'dawn'}));}
 await pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('outdated'::text)),tick_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[a.c.id]);
 await pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '250 milliseconds' WHERE character_id=$1",[b.c.id]);
 const before=(await pool.query('SELECT character_id,simulation,tick_at FROM mare_game.character_battles')).rows;
 await assert.rejects(battle.tickWorldBattles(pool));
 const after=(await pool.query('SELECT character_id,simulation,tick_at FROM mare_game.character_battles')).rows;
 assert.deepEqual(after.find(r=>r.character_id===a.c.id),before.find(r=>r.character_id===a.c.id),'invalid battle must remain unchanged');
 assert(after.find(r=>r.character_id===b.c.id).tick_at>before.find(r=>r.character_id===b.c.id).tick_at,'another account must still advance');
}));
