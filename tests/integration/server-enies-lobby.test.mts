import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';

const require=createRequire(import.meta.url),world=require('../../world-catalog.cjs').load(),engine=require('../../world-battle.cjs');
const previousWorld='1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd';
const previousBattle='5fa0fe9ceb9c07af9b4b3510e97b31edcb816034683ee0eb8f2af4da7b3f1810';

async function actor(service:any){
 const login=await service.login(randomUUID()+'@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'Enies',classId:'sword',factionId:'pirate'});
 const lease=await service.acquireControl(login.token,c.id);
 const read=()=>service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(value:any)=>service.command(login.token,c.id,value);
 const doit=async(action:string,payload:any={})=>send(await input(action,payload));
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {login,c,read,input,send,doit};
}
async function level(f:any,a:any,value:number){
 await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,value]);
}
async function defeat(f:any,a:any){
 const o=await a.read(),b=o.battle,m=b.mobs[0];
 Object.assign(m,{hp:1,defense:0,attackClock:999});b.pending={targetId:m.id,remaining:0};b.auto=false;b.autoSkills=false;
 await f.pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-20,m.y]);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 for(let attempt=0;attempt<10;attempt++){
  await tickWorldBattles(f.pool);
  if((await a.read()).dungeons.records[b.dungeon.id].phase==='pending')return;
  await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify({targetId:m.id,remaining:0})]);
 }
 assert.fail('The authoritative worker did not persist the fixture victory');
}

test('Enies Lobby travel enforces all five level gates and persists each visit once',async()=>authDatabase(async f=>{
 const a=await actor(f.service);
 const destinations=[['enies-lobby-01',95,'fukurou'],['enies-lobby-02',101,'kalifa'],['enies-lobby-03',104,'jabra'],['enies-lobby-04',107,'blueno'],['enies-lobby-05',110,'kaku']] as const;
 for(const [islandId,minLevel,monster] of destinations){
  await level(f,a,minLevel-1);
  await assert.rejects(a.doit('world.travel',{islandId}),{code:'world_level_required'});
  await level(f,a,minLevel);
  const request=await a.input('world.travel',{islandId});
  assert.deepEqual(...await Promise.all([a.send(request),a.send(request)]));
  const state=await a.read();
  assert.equal(state.world.mapId,islandId);assert.equal(state.world.area,islandId);
  assert(state.battle.mobs.length>0);assert(state.battle.mobs.every((m:any)=>m.type===monster));
  assert(state.achievements.records.islands.includes(islandId));
  await a.doit('world.return');
 }
 const visits=(await f.pool.query('SELECT island_id FROM mare_game.achievement_visits WHERE character_id=$1 ORDER BY island_id',[a.c.id])).rows;
 assert.deepEqual(visits.map((r:any)=>r.island_id),destinations.map(d=>d[0]));
 await assert.rejects(a.doit('world.travel',{islandId:'enies-lobby-06'}),{code:'world_destination_unknown'});
}));

test('Lucci and Moria victories reload as pending without XP, Berry, items or duplicate claims',async()=>authDatabase(async f=>{
 const a=await actor(f.service);
 for(const [dungeonId,minLevel] of [['rob-lucci',100],['gecko-moria',110]] as const){
  await level(f,a,minLevel-1);
  await assert.rejects(a.doit('dungeon.enter',{dungeonId}),{code:'dungeon_level_required'});
  await level(f,a,minLevel);
  const request=await a.input('dungeon.enter',{dungeonId});
  assert.deepEqual(...await Promise.all([a.send(request),a.send(request)]));
  const entered=await a.read(),record=entered.dungeons.records[dungeonId];
  assert.equal(entered.battle.mobs[0].type,'dungeon-'+dungeonId);
  assert.equal(entered.world.mapId,'quest-dungeons');
  await a.doit('world.return');await a.doit('dungeon.enter',{dungeonId});
  const resumed=await a.read();
  assert.equal(resumed.battle.mobs[0].id,record.spawnId);
  // Leaving before victory starts a fresh run, while the stable spawn prevents
  // farming the same boss's talent-steal allowance across retries.
  const activeRecord=resumed.dungeons.records[dungeonId];
  assert.notEqual(activeRecord.runId,record.runId);
  assert.notEqual(activeRecord.encounterId,record.encounterId);
  assert.equal(resumed.battle.mobs[0].dungeonRunId,activeRecord.runId);
  assert.equal(resumed.battle.mobs[0].dungeonEncounterId,activeRecord.encounterId);
  await defeat(f,a);
  const won=await a.read();
  assert.equal(won.dungeons.records[dungeonId].phase,'pending');
  assert.equal(won.dungeons.records[dungeonId].reward,null);
  assert.equal(won.state.experience,resumed.state.experience);assert.equal(won.state.gold,resumed.state.gold);
  assert.deepEqual(won.originalInventory,resumed.originalInventory);
  assert.deepEqual((await a.read()).dungeons.records[dungeonId],won.dungeons.records[dungeonId]);
  await assert.rejects(a.doit('dungeon.claim',{dungeonId}),{code:'dungeon_reward_unavailable'});
  await a.doit('world.return');await a.doit('dungeon.enter',{dungeonId});
  const pending=await a.read();assert.equal(pending.battle.mobs.length,0);
  assert.equal(pending.dungeons.records[dungeonId].runId,activeRecord.runId);
  await tickWorldBattles(f.pool);await a.doit('world.return');
 }
 const victories=(await f.pool.query('SELECT dungeon_id,reward FROM mare_game.dungeon_victories WHERE character_id=$1 ORDER BY dungeon_id',[a.c.id])).rows;
 assert.deepEqual(victories,[{dungeon_id:'gecko-moria',reward:null},{dungeon_id:'rob-lucci',reward:null}]);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_claims WHERE character_id=$1',[a.c.id])).rows[0].n,0);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.social_mail WHERE character_id=$1',[a.c.id])).rows[0].n,0);
}));

async function persisted(pool:any){
 const tables=['character_world','character_battles','character_dungeons','character_progression','game_inventory','character_commands','character_talents','world_battle_rewards','dungeon_victories','dungeon_claims','achievement_visits'];
 const entries=await Promise.all(tables.map(async table=>[table,(await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows.map((r:any)=>r.data)] as const));
 const saved:any=Object.fromEntries(entries);
 saved.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return saved;
}

test('migrations 0062–0067 preserve active saves and historical receipts, is idempotent and refuses unknown hashes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-enies-migrations-'));
 const source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0062')await copyFile(new URL(name,source),join(directory,name));
  const swordSql=await readFile(new URL('0064_sword_compendium.sql',source),'utf8');
  const collectionTable=swordSql.match(/^CREATE TABLE mare_game\.sword_collections \([\s\S]*?^\);/m)?.[0];
  assert(collectionTable,'Locate the new collection table required by the current fixture runtime');
  const lateSql=await readFile(new URL('0063_late_archipelago.sql',source),'utf8');
  const lateBattle=lateSql.match(/to_jsonb\('([a-f0-9]{64})'::text\)/)?.[1];
  assert(lateBattle,'Locate the battle hash written by the historical migration');
  await authDatabase(async f=>{
   // Build the historical fixture through today's runtime, then remove its new dependency before migrating.
   await f.pool.query(collectionTable);
   const a=await actor(f.service),unknown=await actor(f.service);
   await level(f,a,110);await a.doit('world.travel',{islandId:'dawn'});
   await a.doit('dungeon.enter',{dungeonId:'alvida'});await defeat(f,a);
   await a.doit('dungeon.enter',{dungeonId:'morgan'});
   const active=await a.read(),battle=active.battle;
   battle.hp=Math.max(1,battle.hp-3);battle.cooldowns=[7.5,2.25];battle.attackClock=1.75;
   battle.mobs[0].hp=Math.max(1,Math.floor(battle.mobs[0].hp/2));battle.mobs[0].attackClock=2.5;
   battle.pending={targetId:battle.mobs[0].id,remaining:.3};battle.rulesHash=previousBattle;
   for(const id of Object.keys(battle.hunts.areas))if(id.startsWith('enies-lobby-'))delete battle.hunts.areas[id];
   Object.assign(battle.hunts.areas.beach,{kills:7,bosses:1,firstRewardClaimed:true,bossReadyAt:1793534523000,respawns:{[randomUUID()]:1793534511000}});
   await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at='2026-11-01T12:00:00Z' WHERE character_id=$1",[a.c.id,JSON.stringify(battle)]);
   await f.pool.query("UPDATE mare_game.character_world SET rules_hash=$2,path=$3,speed=120,direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1",[a.c.id,previousWorld,JSON.stringify([{x:active.world.position.x+12,y:active.world.position.y}])]);
   await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[unknown.c.id,'f'.repeat(64)]);
   await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[unknown.c.id,'e'.repeat(64)]);
   await f.pool.query('DROP TABLE mare_game.sword_collections');
   const before=await persisted(f.pool),expected=structuredClone(before);
   expected.character_world.find((r:any)=>r.character_id===a.c.id).rules_hash=world.rulesHash;
   expected.character_battles.find((r:any)=>r.character_id===a.c.id).simulation.rulesHash=lateBattle;
   assert.deepEqual(await applyMigrations(f.pool),['0062_enies_lobby.sql','0063_late_archipelago.sql','0064_sword_compendium.sql','0065_skypiea_celestial_map.sql','0066_skypiea_hd_arrival.sql','0067_loguetown_hd_map.sql']);
   assert.deepEqual(await persisted(f.pool),expected);
   assert.deepEqual(await applyMigrations(f.pool),[]);
   await f.pool.query(await readFile(new URL('0062_enies_lobby.sql',source),'utf8'));
   await f.pool.query(await readFile(new URL('0063_late_archipelago.sql',source),'utf8'));
   assert.deepEqual(await persisted(f.pool),expected);
   const resumed=await a.read();
   assert.equal(resumed.world.rulesHash,world.rulesHash);assert.equal(resumed.battle.rulesHash,engine.rulesHash);
   assert.deepEqual(resumed.battle.mobs,battle.mobs);assert.deepEqual(resumed.battle.pending,battle.pending);
   assert.deepEqual(resumed.battle.cooldowns,battle.cooldowns);assert.equal(resumed.battle.hp,battle.hp);
   for(const [id,ledger] of Object.entries(battle.hunts.areas))assert.deepEqual(resumed.battle.hunts.areas[id],ledger);
   for(let index=1;index<=5;index++)assert.deepEqual(resumed.battle.hunts.areas[`enies-lobby-0${index}`],{kills:0,bosses:0,firstRewardClaimed:false,bossReadyAt:0,respawns:{}});
   assert.deepEqual(resumed.dungeons,active.dungeons);assert.deepEqual(resumed.originalInventory,active.originalInventory);
   await assert.rejects(unknown.read(),{code:'world_rules_changed'});
   for(const island of ['skypiea-01','skypiea-02','skypiea-03','skypiea-04'])await f.pool.query('INSERT INTO mare_game.achievement_visits(character_id,island_id) VALUES($1,$2)',[a.c.id,island]);
   await assert.rejects(f.pool.query("INSERT INTO mare_game.achievement_visits(character_id,island_id) VALUES($1,'unregistered-island')",[a.c.id]),{code:'23514'});
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});
