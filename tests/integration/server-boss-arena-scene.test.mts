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
import {tickWeeklyBosses} from '../../apps/game-server/src/characters/weekly-boss-worker.js';

const require=createRequire(import.meta.url),W=require('../../world-catalog.cjs').load(),E=require('../../world-battle.cjs'),A=require('../../akainu-combat.js'),R=require('../../weekly-boss-rules.cjs');
const priorWorld='efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87';
const priorBattle='c9607a8978503a6a30677f041a6c8f24a932be20932e322da0f80366b0e35d32';
const migration='0077_boss_arena_hd_map.sql';
async function beforeArena(run:(f:any)=>Promise<void>){
 const directory=await mkdtemp(join(tmpdir(),'mare-boss-arena-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0077')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(run,directory);
 }finally{await rm(directory,{recursive:true,force:true});}
}
async function actor(f:any,level=100){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const c=await f.service.createCharacter(login.token,{name:'Arena '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'});
 const lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(value:any)=>f.service.command(login.token,c.id,value),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[c.id,level]);
 return {c,login,lease,read,input,send,doit,event:(payload:any)=>doit('weeklyBoss.execute',payload)};
}
async function win(f:any,a:any){
 const state=await a.read(),b=state.battle,m=b.mobs[0];Object.assign(m,{hp:1,defense:0,attackClock:999});b.pending={targetId:m.id,remaining:0};b.auto=false;b.autoSkills=false;
 await f.pool.query("UPDATE mare_game.character_world SET x=$2,y=$3,path='[]',speed=0 WHERE character_id=$1",[a.c.id,m.x-20,m.y]);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 for(let i=0;i<10;i++){
  await tickWorldBattles(f.pool);if((await a.read()).dungeons.records[b.dungeon.id].phase==='pending')return;
  await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify({targetId:m.id,remaining:0})]);
 }
 throw Error('Fixture did not defeat the dungeon boss');
}
async function nearChest(f:any,a:any){await f.pool.query("UPDATE mare_game.character_world SET x=1536,y=696,path='[]',speed=0 WHERE character_id=$1",[a.c.id]);}
async function rows(pool:any,table:string){return (await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows.map((r:any)=>r.data);}
async function progression(pool:any){
 const result:any={};
 for(const table of ['character_progression','game_inventory','character_dungeons','dungeon_victories','dungeon_claims','character_commands','social_mail','world_battle_rewards','weekly_boss_victories','weekly_boss_entitlements'])result[table]=await rows(pool,table);
 result.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return result;
}
async function oldWorld(pool:any,id:string,map='quest-dungeons',hash=priorWorld){
 await pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=CASE WHEN $3='lobby' THEN NULL ELSE $3 END,x=1824,y=2144,path='[{"x":1840,"y":2128}]',speed=120,
 direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,[id,hash,map]);
}
test('boss arena migration preserves dungeon victories, claims and other maps while safely resuming old fights',async()=>beforeArena(async f=>{
 const running=await actor(f),pending=await actor(f),undefinedReward=await actor(f),claimed=await actor(f),other=await actor(f),unknown=await actor(f);
 for(const a of [running,pending,claimed])await a.doit('dungeon.enter',{dungeonId:'alvida'});
 await win(f,pending);await win(f,claimed);await nearChest(f,claimed);await claimed.doit('dungeon.claim',{dungeonId:'alvida'});
 await undefinedReward.doit('dungeon.enter',{dungeonId:'rob-lucci'});await win(f,undefinedReward);
 // Model a victory saved before Rob Lucci received a configured reward.
 await f.pool.query("UPDATE mare_game.dungeon_victories SET reward=NULL WHERE character_id=$1 AND dungeon_id='rob-lucci'",[undefinedReward.c.id]);
 await f.pool.query("UPDATE mare_game.character_dungeons SET state=jsonb_set(state,'{records,rob-lucci,reward}','null') WHERE character_id=$1",[undefinedReward.c.id]);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{dungeon,record,reward}','null') WHERE character_id=$1",[undefinedReward.c.id]);
 await other.doit('world.travel',{islandId:'alubarna-01'});
 const saves=new Map<string,any>();
 for(const a of [running,pending,undefinedReward]){
  const state=await a.read(),b=state.battle;b.rulesHash=priorBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.talentCooldowns={immortalUntil:9000000000000};
  b.pending={targetId:b.mobs[0]?.id,remaining:.4};b.projectiles=[{x:1816,y:1384}];
  for(const m of b.mobs)Object.assign(m,{x:1840,y:1408,anchorX:1816,anchorY:1384,talentStolen:6,dungeonAttack:{elapsed:.2,impacted:false},telegraph:{x:1840,y:1408}});
  saves.set(a.c.id,structuredClone(b));await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
  await oldWorld(f.pool,a.c.id);
 }
 await oldWorld(f.pool,other.c.id,'alubarna-01');await oldWorld(f.pool,claimed.c.id,'lobby');await oldWorld(f.pool,unknown.c.id,'quest-dungeons','f'.repeat(64));
 const before=await progression(f.pool),oldRows=await rows(f.pool,'character_world');
 await applyMigrations(f.pool);
 const afterRows=await rows(f.pool,'character_world');
 for(const old of oldRows){
  const actual=afterRows.find((r:any)=>r.character_id===old.character_id),expected=structuredClone(old);
  if(old.rules_hash===priorWorld){expected.rules_hash=W.rulesHash;if(old.map_id==='quest-dungeons')Object.assign(expected,{x:1536,y:1824,path:[],speed:0,motion_until:old.started_at});}
  assert.deepEqual(actual,expected,'only recognized dungeon coordinates may change');
 }
 assert.deepEqual(await progression(f.pool),before,'migration cannot grant, duplicate or rewrite rewards');
 assert.deepEqual(await applyMigrations(f.pool),[]);await f.pool.query(await readFile(new URL('../../apps/game-server/migrations/'+migration,import.meta.url),'utf8'));
 assert.deepEqual(await rows(f.pool,'character_world'),afterRows,'raw migration replay is idempotent');assert.deepEqual(await progression(f.pool),before);
 for(const a of [running,pending,undefinedReward]){
  const current=await a.read(),old=saves.get(a.c.id);assert.deepEqual(current.world.position,{x:1536,y:1824});assert.equal(current.battle.rulesHash,E.rulesHash);
  for(const key of ['hp','energy','cooldowns','talentCooldowns','dungeon','hunts'])assert.deepEqual(current.battle[key],old[key],key);
  for(const m of current.battle.mobs){const original=old.mobs.find((x:any)=>x.id===m.id);assert(original);for(const key of ['id','type','hp','maxHP','alive','dungeonRunId','dungeonEncounterId','talentStolen'])assert.deepEqual(m[key],original[key]);assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY],[1536,1152,1536,1152]);assert.equal(m.dungeonAttack,null);}
 }
 await assert.rejects(unknown.read(),{code:'world_rules_changed'});
 await pending.doit('world.return');await pending.doit('dungeon.enter',{dungeonId:'alvida'});assert.equal((await pending.read()).battle.mobs.length,0);
 await nearChest(f,pending);const command=await pending.input('dungeon.claim',{dungeonId:'alvida'});assert.deepEqual(...await Promise.all([pending.send(command),pending.send(command)]));
 const received=await pending.read();assert.equal(received.dungeons.records.alvida.phase,'claimed');assert.equal(received.world.mapId,'lobby');assert.deepEqual(received.world.position,{...W.maps.lobby.spawn});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_claims WHERE character_id=$1',[pending.c.id])).rows[0].n,1);
 await assert.rejects(pending.doit('dungeon.claim',{dungeonId:'alvida'}),{code:'dungeon_reward_unavailable'});
 assert.equal((await undefinedReward.read()).dungeons.records['rob-lucci'].reward,null);
 await nearChest(f,undefinedReward);await undefinedReward.doit('dungeon.claim',{dungeonId:'rob-lucci'});
 const recovered=(await undefinedReward.read()).dungeons.records['rob-lucci'];
 assert.equal(recovered.phase,'claimed');assert.equal(recovered.reward.items[0].itemId,'epic-equipment-box');
 assert.equal((await f.pool.query("SELECT count(*)::int n FROM mare_game.dungeon_claims WHERE character_id=$1 AND dungeon_id='rob-lucci'",[undefinedReward.c.id])).rows[0].n,1);
 await assert.rejects(undefinedReward.doit('dungeon.claim',{dungeonId:'rob-lucci'}),{code:'dungeon_reward_unavailable'});
}));
test('private rehearsal migration keeps shared boss health and restores compatible port snapshots after leave',async()=>beforeArena(async f=>{
 const people=[await actor(f),await actor(f)] as const,events:any[]=[],returns:any[]=[];
 for(const [i,a] of people.entries()){
  const account=(await f.service.me(a.login.token)).account.id;await f.pool.query('INSERT INTO mare_game.weekly_boss_operators(account_id,slot) VALUES($1,$2)',[account,i+1]);
  const b=(await a.read()).battle;b.hp=43;b.energy=37;b.cooldowns=[7,3];await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
  // Reconstruct an existing legacy room. The current test command deliberately
  // requires an approved new profile and cannot generate a 20,000 HP room.
  const id=randomUUID(),at=new Date(),nav=W.navigation('quest-dungeons'),entry={...nav.map.spawn};
  const spawn=nav.nearest({x:entry.x,y:entry.y-180});
  assert.ok(spawn);
  const profile={hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:110,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:480};
  const rehearsal={mapId:'quest-dungeons',spawn,entry,maxPlayers:2,minLevel:1,durationMinutes:15,balanceApproved:false,profile};
  const boss=A.create({id:randomUUID(),...spawn,profile,now:at.getTime()});
  boss.balanceVersion=E.balanceVersion;
  const room={id,mapId:rehearsal.mapId,config:rehearsal,mode:'test',rulesVersion:1,mobs:[boss],contributions:{}};
  const closes=new Date(Math.min(at.getTime()+15*60000,R.cycleEnd(at.getTime())));
  await f.pool.query("INSERT INTO mare_game.weekly_boss_events(id,mode,map_id,cycle_key,config,simulation,created_by,opened_at,closes_at,tick_at) VALUES($1,'test',$2,$3,$4,$5,$6,$7,$8,$7)",
   [id,rehearsal.mapId,R.cycleKey(at.getTime()),rehearsal,room,account,at,closes]);
  await a.event({op:'join',eventId:id});
  const row=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0],config={...row.config,entry:{x:1824,y:2144},spawn:{x:1824,y:1964}},simulation=row.simulation;
  simulation.config=config;simulation.contributions[a.c.id]={damage:123,healing:45,combatMs:600,lastSeen:1000};
  Object.assign(simulation.mobs[0],{x:1840,y:2000,anchorX:1824,anchorY:1964,hp:i===0?0:12345,alive:i!==0,action:{kind:'aoe',center:{x:1840,y:2000}},telegraph:{x:1840,y:2000},attackCount:7});
  await f.pool.query("UPDATE mare_game.weekly_boss_events SET config=$2,simulation=$3,status=$4,ended_at=CASE WHEN $4='won' THEN clock_timestamp() ELSE NULL END WHERE id=$1",[id,JSON.stringify(config),JSON.stringify(simulation),i===0?'won':'active']);
  events.push((await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0]);
  const member=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_members WHERE character_id=$1',[a.c.id])).rows[0];
  // One rehearsal began before the Alubarna release; the other began after it.
  member.return_world.rulesHash=i===0?'7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4':priorWorld;
  member.return_battle.rulesHash=i===0?'6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65':priorBattle;returns.push(member);
  await f.pool.query('UPDATE mare_game.weekly_boss_members SET return_world=$2,return_battle=$3 WHERE character_id=$1',[a.c.id,JSON.stringify(member.return_world),JSON.stringify(member.return_battle)]);
  const active=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].simulation;active.rulesHash=priorBattle;active.mobs=simulation.mobs;
  await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(active)]);await oldWorld(f.pool,a.c.id);
 }
 const economic=await progression(f.pool);await applyMigrations(f.pool);
 for(const [i,a] of people.entries()){
  const row=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[events[i].id])).rows[0],boss=row.simulation.mobs[0],before=events[i];
  assert.deepEqual(row.config.entry,{x:1536,y:1824});assert.deepEqual(row.config.spawn,{x:1536,y:1644});assert.deepEqual(row.simulation.config,row.config);
  assert.deepEqual([boss.x,boss.y,boss.anchorX,boss.anchorY],[1536,1644,1536,1644]);
  for(const key of ['id','spawnId','hp','maxHP','alive','attackCount','nextPunchAt','nextAoeAt','profile'])assert.deepEqual(boss[key],before.simulation.mobs[0][key],key);
  assert.equal(boss.action,null);assert.equal(boss.telegraph,null);assert.deepEqual(row.simulation.contributions,before.simulation.contributions);
  for(const key of ['status','version','opened_at','closes_at','tick_at','ended_at'])assert.deepEqual(row[key],before[key],key);
  const member=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_members WHERE character_id=$1',[a.c.id])).rows[0];
  assert.deepEqual(member.return_world,{...returns[i].return_world,rulesHash:W.rulesHash});assert.deepEqual(member.return_battle,returns[i].return_battle,'combat snapshots upgrade through the normal recognized runtime path');
 }
 const onceEvents=await rows(f.pool,'weekly_boss_events'),onceMembers=await rows(f.pool,'weekly_boss_members');await f.pool.query(await readFile(new URL('../../apps/game-server/migrations/'+migration,import.meta.url),'utf8'));
 assert.deepEqual(await rows(f.pool,'weekly_boss_events'),onceEvents);assert.deepEqual(await rows(f.pool,'weekly_boss_members'),onceMembers);assert.deepEqual(await progression(f.pool),economic);
 const member=onceMembers.find((m:any)=>m.character_id===people[0].c.id),unknown={...member.return_world,rulesHash:'f'.repeat(64)};
 await f.pool.query('UPDATE mare_game.weekly_boss_members SET return_world=$2 WHERE character_id=$1',[people[0].c.id,JSON.stringify(unknown)]);
 await f.pool.query(await readFile(new URL('../../apps/game-server/migrations/'+migration,import.meta.url),'utf8'));
 assert.deepEqual((await f.pool.query('SELECT return_world FROM mare_game.weekly_boss_members WHERE character_id=$1',[people[0].c.id])).rows[0].return_world,unknown,'unknown snapshot signatures stay unrecognized');
 await f.pool.query('UPDATE mare_game.weekly_boss_members SET return_world=$2 WHERE character_id=$1',[people[0].c.id,JSON.stringify(member.return_world)]);
 // Exercise the canonical active room with two real actors, not just JSON migration.
 await people[0].event({op:'leave'});await people[0].event({op:'join',eventId:events[1].id});
 await f.pool.query("UPDATE mare_game.weekly_boss_events SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[events[1].id]);await tickWeeklyBosses(f.pool);
 for(const a of people){const state=await a.read();assert.equal(state.world.mapId,'quest-dungeons');assert.equal(state.battle.mobs[0].id,events[1].simulation.mobs[0].id);assert.equal(state.battle.mobs[0].maxHP,20000);}
 for(const [i,a] of people.entries()){
  await a.event({op:'leave'});const state=await a.read();assert.equal(state.world.mapId,'lobby');assert.deepEqual(state.world.position,returns[i].return_world.position);assert.equal(state.battle.rulesHash,E.rulesHash);
  for(const key of ['hp','energy','cooldowns'])assert.deepEqual(state.battle[key],returns[i].return_battle[key]);
 }
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_members')).rows[0].n,0);
 for(const table of ['weekly_boss_victories','weekly_boss_entitlements','dungeon_claims','dungeon_victories'])assert.equal((await rows(f.pool,table)).length,0,table);
}));
