import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {readBattle,readBattleRows} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';

const require=createRequire(import.meta.url),W=require('../../world-catalog.cjs').load(),E=require('../../world-battle.cjs'),B=require('../../monster-behavior.js');
const priorWorld='0ec69dfeb2ffe38be8a38f37c65479bf4f65d1c4f695cfe5336f172924bd7989';
const priorBattle='77987989a99918858134db83b9767b30bc1fb83ab432ffbe04861b9b502b1c7d';
const oldSlots=[[2236,2538],[2364,2602],[1932,2100],[2064,2152],[1696,1708],[1820,1792],[2656,1618],[2784,1682]];
const sceneMigration='0070_syrup_hd_map.sql';
const sceneSpawn={x:1504,y:1952};
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),name='Syrup '+randomUUID().slice(0,8);
 const c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),doit=async(action:string,payload:any={})=>f.service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,name,read,doit};
}
async function snapshot(pool:any,tables=['character_world','character_battles','character_progression','game_inventory','character_commands','world_battle_rewards','party_deaths','party_experience']){
 const data:any=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY ${table==='character_world'?'t.character_id':'to_jsonb(t)::text'}`)).rows.map((r:any)=>r.data)])));
 data.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return data;
}
function oldMobs(mobs:any[]){
 for(const [i,m] of mobs.entries()){
  const [x,y]=oldSlots[i]!;Object.assign(m,{x:x!+8,y:y!+8,anchorX:x,anchorY:y,hp:i===1?0:11,alive:i!==1,engaged:true,telegraph:{fixture:true},attackClock:2.25,corpseUntil:Date.now()+60000});
 }
}
function preservedMobs(actual:any[],before:any[]){
 const slots=new Map(B.slots('syrup').map((s:any)=>[s.id,s]));
 for(const old of before){
  const m=actual.find(x=>x.id===old.id);assert(m,'retain every existing enemy');
  for(const key of ['id','spawnId','type','level','hp','maxHP','alive','corpseUntil','attackClock','attack','defense','balanceVersion'])assert.deepEqual(m[key],old[key],old.spawnId+' '+key);
  const slot:any=slots.get(m.spawnId);
  if(slot)assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[slot.x,slot.y,slot.x,slot.y,slot.sector]);
  assert(W.navigation('syrup').walkable(m.x,m.y));assert(W.navigation('syrup').path(W.maps.syrup.spawn,m).length);
 }
}
test('Syrup migration reanchors only recognized village saves and preserves progress and receipts',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-syrup-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0070')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(async f=>{
   const people=[await actor(f),await actor(f),await actor(f)],originals=[];
   for(const [i,a] of people.entries()){
    const area=i===1?'beach':'syrup',b=E.create(area,{maxHP:100,maxEnergy:100},100000,()=>.5);
    b.rulesHash=i===2?'e'.repeat(64):priorBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
    b.pending={targetId:b.mobs[0].id,remaining:.3};b.targetId=b.mobs[0].id;b.projectiles=[{x:2236,y:2538}];
    b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[1].spawnId]=Date.now()+600000;
    if(area==='syrup')oldMobs(b.mobs);originals.push(structuredClone(b));
    await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
    await f.pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=$4,x=2296,y=3144,path='[{"x":2320,"y":3144}]',speed=120,
     direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,[a.c.id,i===2?'f'.repeat(64):priorWorld,i===1?'dawn':'syrup',area]);
   }
   const before=await snapshot(f.pool),expected=structuredClone(before);
   for(const a of people.slice(0,2))expected.character_world.find((r:any)=>r.character_id===a.c.id).rules_hash=W.rulesHash;
   const village=expected.character_world.find((r:any)=>r.character_id===people[0]!.c.id);Object.assign(village,{...sceneSpawn,path:[],speed:0,motion_until:village.started_at});
   assert.deepEqual(await applyMigrations(f.pool),[sceneMigration]);assert.deepEqual(await snapshot(f.pool),expected);
   assert.deepEqual(await applyMigrations(f.pool),[]);await f.pool.query(await readFile(new URL(sceneMigration,source),'utf8'));assert.deepEqual(await snapshot(f.pool),expected);
   const resumed=await people[0]!.read();assert.deepEqual(resumed.world.position,sceneSpawn);assert.equal(resumed.battle.rulesHash,E.rulesHash);
   for(const key of ['hp','energy','cooldowns','hunts'])assert.deepEqual(resumed.battle[key],originals[0][key],key);
   preservedMobs(resumed.battle.mobs,originals[0].mobs);assert.equal(resumed.battle.pending,null);assert.deepEqual(resumed.battle.projectiles,[]);
   assert.deepEqual((await people[1]!.read()).battle,{...originals[1],rulesHash:E.rulesHash});
   await assert.rejects(people[2]!.read(),{code:'world_rules_changed'});assert.deepEqual(await snapshot(f.pool),expected,'read-only projections do not grant rewards or rewrite state');
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('new Syrup travel uses the HD village arrival and keeps the same eight encounters and hunt progress',async()=>authDatabase(async f=>{
 const a=await actor(f);await f.pool.query('UPDATE mare_game.character_progression SET level=20 WHERE character_id=$1',[a.c.id]);
 const locked=await a.read();await assert.rejects(a.doit('world.travel',{islandId:'syrup'}),{code:'world_level_required'});
 const rejected=await a.read();assert.deepEqual(rejected.world.position,locked.world.position);assert.equal(rejected.state.version,locked.state.version);
 await f.pool.query('UPDATE mare_game.character_progression SET level=21 WHERE character_id=$1',[a.c.id]);
 await a.doit('world.travel',{islandId:'syrup'});const first=await a.read();
 assert.deepEqual(first.world.position,sceneSpawn);assert.equal(first.battle.mobs.length,8);
 assert.deepEqual(first.battle.mobs.map((m:any)=>[m.type,m.level]),[['sham',23],['buchi',23],['buchi',23],['sham',23],['sham',23],['buchi',23],['buchi',23],['sham',23]]);
 assert.deepEqual(first.battle.mobs.map((m:any)=>m.spawnId),['syrup-entrada-0','syrup-entrada-1','syrup-vila-baixa-0','syrup-vila-baixa-1','syrup-praça-0','syrup-praça-1','syrup-bosque-0','syrup-bosque-1']);
 assert(W.navigation('syrup').path(first.world.position,W.maps.syrup.returnPoint).length);
 first.battle.hunts.areas.syrup.kills=17;first.battle.hunts.areas.syrup.respawns[first.battle.mobs[1].spawnId]=Date.now()+600000;
 await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(first.battle)]);
 await a.doit('world.return');await a.doit('world.travel',{islandId:'syrup'});const next=await a.read();
 assert.deepEqual(next.world.position,sceneSpawn);assert.deepEqual(next.battle.hunts.areas.syrup,first.battle.hunts.areas.syrup);
}));
test('Syrup party reads and worker reanchor a stale canonical room even after personal signatures were promoted',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),people=[a,b];
 for(const p of people)await f.pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[p.c.id]);
 await a.doit('party.create');await a.doit('party.invite',{name:b.name});const invite=(await b.read()).party.invites.find((i:any)=>i.status==='pending');await b.doit('party.respond',{inviteId:invite.id,accept:true});
 await a.doit('party.prepare',{kind:'hunt',destination:'syrup'});const nonce=(await a.read()).party.group.preparation.nonce;
 for(const p of people)await p.doit('party.ready',{nonce,ready:true});await a.doit('party.start',{nonce});
 const instance=(await a.read()).battle.partyInstanceId,room=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;
 oldMobs(room.mobs);const first=room.mobs[0];room.mobs.push({...structuredClone(first),id:'extra-syrup',spawnId:'party:'+instance+':fixture',partyExtra:true,x:first.anchorX+96,y:first.anchorY,anchorX:first.anchorX+96,anchorY:first.anchorY});
 room.respawns[room.mobs[1].spawnId]=Date.now()+600000;room.hunts.areas.syrup.kills=17;room.hunts.areas.syrup.respawns[room.mobs[1].spawnId]=room.respawns[room.mobs[1].spawnId];
 await f.pool.query('UPDATE mare_game.party_instances SET simulation=$2 WHERE id=$1',[instance,JSON.stringify(room)]);
 for(const p of people){
  const personal=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[p.c.id])).rows[0].simulation;
  personal.rulesHash=E.rulesHash;personal.hp=43;personal.energy=37;personal.auto=false;personal.cooldowns=[7,3];personal.pending={targetId:first.id,remaining:0};personal.projectiles=[{x:2236,y:2538}];
  await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[p.c.id,JSON.stringify(personal)]);
 }
 const before=await snapshot(f.pool),client=await f.pool.connect();
 try{
  const single=await readBattle(client,a.c.id),batch=await readBattleRows(client,people.map(p=>p.c.id));
  for(const current of [single,...[...batch.values()].map(r=>r.simulation)]){
   preservedMobs(current.mobs,room.mobs);assert.equal(current.pending,null);assert.deepEqual(current.projectiles,[]);assert.equal(current.hp,43);assert.equal(current.energy,37);assert.deepEqual(current.cooldowns,[7,3]);
  }
 }finally{client.release();}
 assert.deepEqual(await snapshot(f.pool),before,'read projections must not persist a room or duplicate receipts');
 const financialTables=['character_progression','game_inventory','character_commands','world_battle_rewards','party_deaths','party_experience'],economy=await snapshot(f.pool,financialTables);
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '3 seconds' WHERE id=$1",[instance]);await tickPartyBattles(f.pool);
 const persisted=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;
 preservedMobs(persisted.mobs,room.mobs);assert.deepEqual(persisted.respawns,room.respawns);assert.deepEqual(persisted.hunts,room.hunts);assert.deepEqual(await snapshot(f.pool,financialTables),economy);
 for(const p of people){const current=await p.read();preservedMobs(current.battle.mobs,room.mobs);assert.equal(current.battle.hp,43);assert.equal(current.battle.energy,37);assert.deepEqual(current.battle.cooldowns,[7,3]);}
}));
