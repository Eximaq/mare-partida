import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';

const require=createRequire(import.meta.url);
const world=require('../../world-catalog.cjs').load(),engine=require('../../world-battle.cjs');
const previousWorld='9c6aa574e983a938188e17282d07a3754b5fae612fff0fb829dadaae64edd2e7';
const previousBattle='fde69ce5850f0028b5b45ac47805635b3fe798c56aad13c3ade9578297031259';
const newIslands=[
 'thriller-bark-01','thriller-bark-02','thriller-bark-03','thriller-bark-04',
 'sabaody-01','sabaody-02','sabaody-03','sabaody-04',
 'marineford-01','marineford-02','marineford-03','marineford-04','marineford-05','marineford-06'
];

async function actor(service:any){
 const login=await service.login(randomUUID()+'@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'GrandLine',classId:'sword',factionId:'pirate'});
 const lease=await service.acquireControl(login.token,c.id),read=()=>service.onlineState(login.token,c.id);
 const doit=async(action:string,payload:any={})=>service.command(login.token,c.id,{
  requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,
  control:{epoch:lease.epoch,token:lease.token}});
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,read,doit};
}

async function persisted(pool:any){
 const tables=['character_world','character_battles','character_dungeons','character_progression',
  'game_inventory','character_commands','character_talents','world_battle_rewards',
  'dungeon_victories','dungeon_claims','achievement_visits'];
 const saved:any=Object.fromEntries(await Promise.all(tables.map(async table=>[table,
  (await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows.map((r:any)=>r.data)] as const)));
 saved.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return saved;
}

test('migrations 0063–0066 preserve active saves and receipts while admitting 37 visits and seven pending victories',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-late-archipelago-migrations-'));
 const source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0063')await copyFile(new URL(name,source),join(directory,name));
  const swordSql=await readFile(new URL('0064_sword_compendium.sql',source),'utf8');
  const collectionTable=swordSql.match(/^CREATE TABLE mare_game\.sword_collections \([\s\S]*?^\);/m)?.[0];
  assert(collectionTable,'Current fixture runtime reads the sword collection table');
  const lateSql=await readFile(new URL('0063_late_archipelago.sql',source),'utf8');
  const lateBattle=lateSql.match(/to_jsonb\('([a-f0-9]{64})'::text\)/)?.[1];
  assert(lateBattle,'Preserve the battle signature written by the deployed migration');
  await authDatabase(async f=>{
   await f.pool.query(collectionTable);
   const a=await actor(f.service),unknown=await actor(f.service);
   await a.doit('world.travel',{islandId:'dawn'});
   const active=await a.read(),battle=active.battle;
   battle.hp=Math.max(1,battle.hp-2);battle.cooldowns=[7.5,2.25];battle.attackClock=1.75;
   battle.mobs[0].hp=Math.max(1,Math.floor(battle.mobs[0].hp/2));battle.mobs[0].attackClock=2.5;
   battle.pending={targetId:battle.mobs[0].id,remaining:.3};battle.rulesHash=previousBattle;
   for(const id of newIslands)delete battle.hunts.areas[id];
   Object.assign(battle.hunts.areas.beach,{kills:7,bosses:1,firstRewardClaimed:true,bossReadyAt:1793534523000,respawns:{[randomUUID()]:1793534511000}});
   await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at='2026-11-01T12:00:00Z' WHERE character_id=$1",[a.c.id,JSON.stringify(battle)]);
   await f.pool.query("UPDATE mare_game.character_world SET rules_hash=$2,path=$3,speed=120,direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1",[a.c.id,previousWorld,JSON.stringify([{x:active.world.position.x+12,y:active.world.position.y}])]);
   await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[unknown.c.id,'f'.repeat(64)]);
   await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[unknown.c.id,'e'.repeat(64)]);
   await f.pool.query('DROP TABLE mare_game.sword_collections');
   const before=await persisted(f.pool),expected=structuredClone(before);
   expected.character_world.find((r:any)=>r.character_id===a.c.id).rules_hash=world.rulesHash;
   expected.character_battles.find((r:any)=>r.character_id===a.c.id).simulation.rulesHash=lateBattle;
   const pending=['0063_late_archipelago.sql','0064_sword_compendium.sql','0065_skypiea_celestial_map.sql','0066_skypiea_hd_arrival.sql'];
   for(const name of pending)await copyFile(new URL(name,source),join(directory,name));
   assert.deepEqual(await applyMigrations(f.pool,directory),pending);
   assert.deepEqual(await persisted(f.pool),expected);
   assert.deepEqual(await applyMigrations(f.pool,directory),[]);
   await f.pool.query(await readFile(new URL('0063_late_archipelago.sql',source),'utf8'));
   assert.deepEqual(await persisted(f.pool),expected);
   const resumed=await a.read();
   assert.deepEqual(resumed.battle.mobs,battle.mobs);assert.deepEqual(resumed.battle.pending,battle.pending);
   assert.deepEqual(resumed.battle.cooldowns,battle.cooldowns);assert.equal(resumed.battle.hp,battle.hp);
   for(const [id,ledger] of Object.entries(battle.hunts.areas))assert.deepEqual(resumed.battle.hunts.areas[id],ledger);
   for(const id of newIslands)assert.deepEqual(resumed.battle.hunts.areas[id],{kills:0,bosses:0,firstRewardClaimed:false,bossReadyAt:0,respawns:{}});
   assert.deepEqual(resumed.originalInventory,active.originalInventory);
   await assert.rejects(unknown.read(),{code:'world_rules_changed'});
   // Exercise the real SQL constraints, then load the complete public snapshot.
   // Combat victory/reward behavior is already covered by the dungeon suite.
   for(const {id} of world.islands)await f.pool.query('INSERT INTO mare_game.achievement_visits(character_id,island_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.c.id,id]);
   const allVisits=(await a.read()).achievements.records.islands;
   assert.equal(allVisits.length,37);assert(newIslands.every(id=>allVisits.includes(id)));
   await assert.rejects(f.pool.query("INSERT INTO mare_game.achievement_visits(character_id,island_id) VALUES($1,'unregistered-island')",[a.c.id]),{code:'23514'});
   const requestId=(await f.pool.query('SELECT request_id FROM mare_game.character_commands WHERE character_id=$1 LIMIT 1',[a.c.id])).rows[0].request_id;
   for(const id of ['kuma','kizaru','hancock','magellan','ace','aokiji','akainu'])await f.pool.query(
    'INSERT INTO mare_game.dungeon_victories(character_id,dungeon_id,run_id,spawn_id,request_id,reward,rules_hash) VALUES($1,$2,$3,$4,$5,NULL,$6)',
    [a.c.id,id,randomUUID(),randomUUID(),requestId,engine.rulesHash]);
   assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_victories WHERE character_id=$1 AND reward IS NULL',[a.c.id])).rows[0].n,7);
   assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_claims WHERE character_id=$1',[a.c.id])).rows[0].n,0);
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});
