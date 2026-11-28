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
const priorWorld='7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4';
const priorBattle='6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65';
const oldSlots=[[2984,3912],[3048,3912],[2424,3448],[2552,3448],[2984,3032],[3112,3016],[3640,3304],[3688,3272],[3032,2504],[3096,2520]];
const sceneMigration='0076_alubarna_city_hd_map.sql';
const sceneSpawn={x:1536,y:1536};
const destinations=[
 ['alubarna-01',50,'puppu',53,10067,543,290],
 ['alubarna-02',55,'valentine',58,13341,681,354],
 ['alubarna-03',60,'merry',63,17771,858,431],
 ['alubarna-04',65,'doublefinger',68,23781,1083,526],
 ['alubarna-05',70,'mr1',75,35345,1645,658]
] as const;
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),name='Alubarna '+randomUUID().slice(0,8);
 const c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),doit=async(action:string,payload:any={})=>f.service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,name,read,doit};
}
async function snapshot(pool:any,tables=['character_world','character_battles','party_instances','character_progression','game_inventory','character_commands','world_battle_rewards','party_deaths','party_experience']){
 const data:any=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY ${table==='character_world'?'t.character_id':'to_jsonb(t)::text'}`)).rows.map((r:any)=>r.data)])));
 data.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return data;
}
function oldMobs(mobs:any[]){
 for(const [i,m] of mobs.entries()){
  const [x,y]=oldSlots[i]!;Object.assign(m,{x:x!+8,y:y!+8,anchorX:x,anchorY:y,hp:i===1?0:11,alive:i!==1,engaged:true,telegraph:{fixture:true},attackClock:2.25,corpseUntil:Date.now()+60000});
 }
}
function preservedMobs(area:string,actual:any[],before:any[]){
 const slots=new Map(B.slots(area).map((s:any)=>[s.id,s]));
 for(const old of before){
  const m=actual.find(x=>x.id===old.id);assert(m,'retain every existing enemy');
  for(const key of ['id','spawnId','type','level','hp','maxHP','alive','corpseUntil','attackClock','attack','defense','balanceVersion'])assert.deepEqual(m[key],old[key],old.spawnId+' '+key);
  const slot:any=slots.get(m.spawnId);
  if(slot)assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[slot.x,slot.y,slot.x,slot.y,slot.sector]);
  assert(W.navigation(area).walkable(m.x,m.y),m.spawnId+' has walkable feet');assert(W.navigation(area).path(W.maps[area].spawn,m).length,m.spawnId+' connects to the landing');
 }
}
test('Alubarna city migration reanchors all five recognized maps once and preserves other positions, progress and receipts',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-alubarna-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0076')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(async f=>{
   const areas=[...destinations.map(d=>d[0]),'enies-lobby-01','alubarna-01'],people=[],originals=[];
   for(const [i,area] of areas.entries()){
    const a=await actor(f);people.push(a);const b=E.create(area,{maxHP:100,maxEnergy:100},100000,()=>.5);
    b.rulesHash=i===6?'e'.repeat(64):priorBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
    b.pending={targetId:b.mobs[0].id,remaining:.3};b.targetId=b.mobs[0].id;b.projectiles=[{x:2984,y:3912}];
    b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[1].spawnId]=Date.now()+600000;
    if(i<5||i===6)oldMobs(b.mobs);originals.push(structuredClone(b));
    await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
    await f.pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=$3,x=3048,y=4408,path='[{"x":3064,"y":4408}]',speed=120,
     direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,[a.c.id,i===6?'f'.repeat(64):priorWorld,area]);
   }
   const before=await snapshot(f.pool),expected=structuredClone(before);
   for(const [i,a] of people.slice(0,6).entries()){
    const row=expected.character_world.find((r:any)=>r.character_id===a.c.id);row.rules_hash=W.rulesHash;
    if(i<5)Object.assign(row,{...sceneSpawn,path:[],speed:0,motion_until:row.started_at});
   }
   assert.deepEqual(await applyMigrations(f.pool),[sceneMigration,'0077_boss_arena_hd_map.sql','0078_marineford_hd_map.sql']);assert.deepEqual(await snapshot(f.pool),expected);
   assert.deepEqual(await applyMigrations(f.pool),[]);await f.pool.query(await readFile(new URL(sceneMigration,source),'utf8'));assert.deepEqual(await snapshot(f.pool),expected);
   for(const [i,a] of people.slice(0,5).entries()){
    const resumed=await a.read();assert.deepEqual(resumed.world.position,sceneSpawn);assert.equal(resumed.world.mapId,areas[i]);assert.equal(resumed.battle.rulesHash,E.rulesHash);
    for(const key of ['hp','energy','cooldowns','hunts'])assert.deepEqual(resumed.battle[key],originals[i][key],key);
    preservedMobs(areas[i]!,resumed.battle.mobs,originals[i].mobs);assert.equal(resumed.battle.pending,null);assert.deepEqual(resumed.battle.projectiles,[]);
   }
   assert.deepEqual((await people[5]!.read()).battle,{...originals[5],rulesHash:E.rulesHash});
   await assert.rejects(people[6]!.read(),{code:'world_rules_changed'});assert.deepEqual(await snapshot(f.pool),expected,'read-only projections do not grant rewards or rewrite state');
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('the five Alubarna destinations keep independent level gates, monster profiles and hunt progress through travel and return',async()=>authDatabase(async f=>{
 const a=await actor(f),progress=new Map<string,any>();
 for(const [index,[area,min,type,level,maxHP,attack,defense]] of destinations.entries()){
  await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,min-1]);
  const locked=await a.read();await assert.rejects(a.doit('world.travel',{islandId:area}),{code:'world_level_required'});
  const rejected=await a.read();assert.deepEqual(rejected.world.position,locked.world.position);assert.equal(rejected.state.version,locked.state.version);
  await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,min]);
  await a.doit('world.travel',{islandId:area});const first=await a.read();
  assert.deepEqual(first.world.position,sceneSpawn);assert.equal(first.world.mapId,area);assert.equal(first.world.area,area);
  assert.equal(first.battle.mobs.length,10);
  assert.deepEqual(first.battle.mobs.map((m:any)=>[m.type,m.level,m.maxHP,m.attack,m.defense]),Array.from({length:10},()=>[type,level,maxHP,attack,defense]));
  assert.deepEqual(first.battle.mobs.map((m:any)=>m.spawnId),['entrada-0','entrada-1','mercado-2','mercado-3','praca-4','praca-5','bairro-6','bairro-7','palacio-8','palacio-9'].map(id=>area+'-'+id));
  assert(W.navigation(area).path(first.world.position,W.maps[area].returnPoint).length);
  first.battle.hunts.areas[area].kills=17+index;first.battle.hunts.areas[area].respawns[first.battle.mobs[1].spawnId]=Date.now()+600000;progress.set(area,structuredClone(first.battle.hunts.areas[area]));
  await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(first.battle)]);
  await a.doit('world.return');await a.doit('world.travel',{islandId:area});const next=await a.read();
  assert.deepEqual(next.world.position,sceneSpawn);
  for(const [visited,ledger] of progress)assert.deepEqual(next.battle.hunts.areas[visited],ledger,visited+' keeps its own progress');
  await a.doit('world.return');
 }
}));
test('Alubarna shared reads and worker reanchor a stale canonical room after personal signatures were promoted',async()=>authDatabase(async f=>{
 const area='alubarna-05',a=await actor(f),b=await actor(f),people=[a,b];
 for(const p of people)await f.pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[p.c.id]);
 await a.doit('party.create');await a.doit('party.invite',{name:b.name});const invite=(await b.read()).party.invites.find((i:any)=>i.status==='pending');await b.doit('party.respond',{inviteId:invite.id,accept:true});
 await a.doit('party.prepare',{kind:'hunt',destination:area});const nonce=(await a.read()).party.group.preparation.nonce;
 for(const p of people)await p.doit('party.ready',{nonce,ready:true});await a.doit('party.start',{nonce});
 const instance=(await a.read()).battle.partyInstanceId,room=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;
 oldMobs(room.mobs);const first=room.mobs[0];room.mobs.push({...structuredClone(first),id:'extra-alubarna',spawnId:'party:'+instance+':fixture',partyExtra:true,x:first.anchorX+96,y:first.anchorY,anchorX:first.anchorX+96,anchorY:first.anchorY});
 room.respawns[room.mobs[1].spawnId]=Date.now()+600000;room.hunts.areas[area].kills=17;room.hunts.areas[area].respawns[room.mobs[1].spawnId]=room.respawns[room.mobs[1].spawnId];
 await f.pool.query('UPDATE mare_game.party_instances SET simulation=$2 WHERE id=$1',[instance,JSON.stringify(room)]);
 for(const p of people){
  const personal=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[p.c.id])).rows[0].simulation;
  personal.rulesHash=E.rulesHash;personal.hp=43;personal.energy=37;personal.auto=false;personal.cooldowns=[7,3];personal.pending={targetId:first.id,remaining:0};personal.projectiles=[{x:2984,y:3912}];
  await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[p.c.id,JSON.stringify(personal)]);
 }
 const before=await snapshot(f.pool),client=await f.pool.connect();
 try{
  const single=await readBattle(client,a.c.id),batch=await readBattleRows(client,people.map(p=>p.c.id));
  for(const current of [single,...[...batch.values()].map(r=>r.simulation)]){
   preservedMobs(area,current.mobs,room.mobs);assert.equal(current.pending,null);assert.deepEqual(current.projectiles,[]);assert.equal(current.hp,43);assert.equal(current.energy,37);assert.deepEqual(current.cooldowns,[7,3]);
  }
 }finally{client.release();}
 assert.deepEqual(await snapshot(f.pool),before,'read projections must not persist a room or duplicate receipts');
 const financialTables=['character_progression','game_inventory','character_commands','world_battle_rewards','party_deaths','party_experience'],economy=await snapshot(f.pool,financialTables);
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '3 seconds' WHERE id=$1",[instance]);await tickPartyBattles(f.pool);
 const persisted=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;
 preservedMobs(area,persisted.mobs,room.mobs);assert.deepEqual(persisted.respawns,room.respawns);assert.deepEqual(persisted.hunts,room.hunts);assert.deepEqual(await snapshot(f.pool,financialTables),economy);
 for(const p of people){const current=await p.read();preservedMobs(area,current.battle.mobs,room.mobs);assert.equal(current.battle.hp,43);assert.equal(current.battle.energy,37);assert.deepEqual(current.battle.cooldowns,[7,3]);}
}));
