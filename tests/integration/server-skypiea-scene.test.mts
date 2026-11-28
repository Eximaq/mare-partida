import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';

const require=createRequire(import.meta.url),W=require('../../world-catalog.cjs').load(),E=require('../../world-battle.cjs');
const priorWorld='24fb16ebe9096c84138d5a0d3180edec15d557ad787991148172715d34c05b97';
const priorBattle='28c090f587fc5f11aa1f007f8008b509cfdd31e630fba12d83a8acfbb8391adf';
const areas=['skypiea-01','skypiea-02','skypiea-03','skypiea-04'];
const oldStarts=[[1512,2600],[2136,2872],[5944,2872],[2136,1464]];
const oldSlots=[
 [[2152,2600],[2376,2600],[3480,2488],[3704,2488],[4744,2488],[4968,2488]],
 [[2520,3128],[2776,3128],[3800,3192],[3976,3256],[5144,3256],[5352,3256]],
 [[5912,1992],[6088,1992],[5016,1288],[5240,1288],[4584,2280],[4808,2280]],
 [[2808,1016],[3032,1032],[3384,1656],[3608,1656],[4152,1032],[4376,1032]]
];

async function actor(service:any){
 const login=await service.login(randomUUID()+'@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'SkyCompat',classId:'sword',factionId:'pirate'});
 const lease=await service.acquireControl(login.token,c.id),read=()=>service.onlineState(login.token,c.id);
 const doit=async(action:string,payload:any={})=>service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,read,doit};
}
async function persisted(pool:any){
 const tables=['character_world','character_battles','character_progression','game_inventory','character_commands',
  'character_talents','world_battle_rewards','dungeon_victories','dungeon_claims','achievement_visits'];
 const saved:any=Object.fromEntries(await Promise.all(tables.map(async table=>[table,
  (await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY ${table==='character_world'?'t.character_id':'to_jsonb(t)::text'}`)).rows.map((r:any)=>r.data)] as const)));
 saved.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;
 return saved;
}

test('new Skypiea scene migrates four saved positions once while preserving combat receipts and unrelated worlds',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-skypiea-scene-migrations-'));
 const source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0065')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(async f=>{
   const people=[];for(let i=0;i<6;i++)people.push(await actor(f.service));
   const originals=[];
   for(const [i,a] of people.entries()){
    const area=areas[i]??'enies-lobby-01',isSky=i<4,start=isSky?oldStarts[i]!:[W.maps['enies-lobby-01'].spawn.x,W.maps['enies-lobby-01'].spawn.y];
    const active=await a.read(),b=E.create(area,{maxHP:100,maxEnergy:100},100000,()=>.5);
    b.rulesHash=i===5?'e'.repeat(64):priorBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
    b.pending={targetId:b.mobs[0].id,remaining:.3};b.targetId=b.mobs[0].id;b.projectiles=[{x:start[0],y:start[1]}];
    b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[5].spawnId]=1795799000000;
    for(const [n,m] of b.mobs.entries()){
     if(isSky){const [x,y]=oldSlots[i]![n]!;Object.assign(m,{x,y,anchorX:x,anchorY:y});}
     m.hp=n===1?0:11;m.alive=n!==1;m.attackClock=2.25;
    }
    await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
    await f.pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=$4,x=$5,y=$6,path=$7,speed=120,
     direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,
     [a.c.id,i===5?'f'.repeat(64):priorWorld,isSky?area:'enies-lobby-01',area,start[0],start[1],JSON.stringify([{x:start[0]!+16,y:start[1]}])]);
    originals.push({active,b});
   }
   const before=await persisted(f.pool),expected=structuredClone(before);
   for(const [i,a] of people.entries()){
    if(i===5)continue;
    const row=expected.character_world.find((r:any)=>r.character_id===a.c.id);row.rules_hash=W.rulesHash;
    if(i<4)Object.assign(row,{x:1296,y:2190,path:[],speed:0,motion_until:row.started_at});
   }
   assert.deepEqual(await applyMigrations(f.pool),['0065_skypiea_celestial_map.sql','0066_skypiea_hd_arrival.sql','0067_loguetown_hd_map.sql','0068_arlong_park_hd_map.sql','0069_baratie_hd_map.sql','0070_syrup_hd_map.sql','0071_rare_island_hd_map.sql','0072_dawn_village_hd_map.sql','0073_conchas_marine_hd_map.sql','0074_orange_town_hd_map.sql','0075_alabasta_desert_hd_map.sql','0076_alubarna_city_hd_map.sql']);
   assert.deepEqual(await persisted(f.pool),expected,'SQL changes only known world positions/signatures');
   assert.deepEqual(await applyMigrations(f.pool),[]);
   await f.pool.query(await readFile(new URL('0065_skypiea_celestial_map.sql',source),'utf8'));
   assert.deepEqual(await persisted(f.pool),expected,'reapplying cannot relocate current saves');
   for(const [i,a] of people.slice(0,5).entries()){
    const resumed=await a.read();
    const old:ReturnType<typeof E.create>=originals[i]!.b;
    assert.equal(resumed.world.rulesHash,W.rulesHash);assert.equal(resumed.battle.rulesHash,E.rulesHash);
    assert.deepEqual(resumed.battle.mobs.map((m:any)=>[m.id,m.spawnId,m.hp,m.alive,m.attackClock]),old.mobs.map((m:any)=>[m.id,m.spawnId,m.hp,m.alive,m.attackClock]));
    assert.deepEqual([resumed.battle.hp,resumed.battle.energy,resumed.battle.cooldowns,resumed.battle.hunts],[43,37,[7,3],old.hunts]);
    assert.deepEqual(resumed.originalInventory,originals[i]!.active.originalInventory);
    if(i<4){
     assert.deepEqual(resumed.world.position,{x:1296,y:2190});assert.deepEqual(resumed.world.path,[]);
     assert.deepEqual([resumed.battle.pending,resumed.battle.projectiles,resumed.battle.auto],[null,[],false]);
     const nav=W.navigation(areas[i]);
     for(const m of resumed.battle.mobs)assert(nav.walkable(m.x,m.y)&&nav.path(nav.map.spawn,m).length>0,'relocated enemy remains reachable');
    }else{
     assert.deepEqual(resumed.battle,{...old,rulesHash:E.rulesHash});
    }
   }
   await assert.rejects(people[5]!.read(),{code:'world_rules_changed'});
   // Reading projects compatibility without issuing rewards or mutating rows.
   assert.deepEqual(await persisted(f.pool),expected);
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('new Skypiea arrivals use the marked gate without resetting hunt progress',async()=>authDatabase(async f=>{
 const a=await actor(f.service);
 await f.pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[a.c.id]);
 for(const islandId of areas){
  await a.doit('world.travel',{islandId});
  const entered=await a.read();
  assert.equal(entered.world.mapId,islandId);
  assert.deepEqual(entered.world.position,{x:534,y:2604});
  const nav=W.navigation(islandId);
  assert(nav.walkable(entered.world.position.x,entered.world.position.y));
  assert(nav.path(entered.world.position,nav.map.returnPoint).length,'arrival connects to the return dais');
  const b=entered.battle;
  b.hunts.areas[islandId].kills=17;
  b.hunts.areas[islandId].respawns[islandId+'-5']=Date.now()+600000;
  await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
  await a.doit('world.return');await a.doit('world.travel',{islandId});
  const resumed=await a.read();
  assert.deepEqual(resumed.world.position,{x:534,y:2604});
  assert.deepEqual(resumed.battle.hunts.areas[islandId],b.hunts.areas[islandId]);
 }
}));

test('HD Skypiea migration preserves existing paths and battles while promoting only known signatures',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mare-skypiea-hd-migrations-'));
 const source=new URL('../../apps/game-server/migrations/',import.meta.url);
 const celestialWorld='5fb13302bc58e2a07ce57eb65ccf8c8c7845246cc991d4f6e876ee18858b8e16';
 const celestialBattle='c66c9af7ffaae0d2d98c47196f5edee82ff4fa0875da9f0d08c1cf37b1e7c401';
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0066')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(async f=>{
   const people=[];for(let i=0;i<6;i++)people.push(await actor(f.service));
   const originalBattles=[];
   for(const [i,a] of people.entries()){
    const area=areas[i]??'enies-lobby-01',isSky=i<4,start=isSky?{x:1296,y:2190}:W.maps['enies-lobby-01'].spawn;
    const b=E.create(area,{maxHP:100,maxEnergy:100},100000,()=>.5),m=b.mobs[0];
    b.rulesHash=i===5?'e'.repeat(64):celestialBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
    b.pending={targetId:m.id,remaining:.3};b.targetId=m.id;b.projectiles=[{x:m.x,y:m.y}];
    Object.assign(m,{x:m.x+8,y:m.y+8,hp:11,attackClock:2.25,engaged:true,telegraph:{fixture:true}});
    Object.assign(b.mobs[1],{hp:0,alive:false,corpseUntil:110000});
    b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[5].spawnId]=120000;
    originalBattles.push(structuredClone(b));
    await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
    await f.pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=$4,x=$5,y=$6,path=$7,speed=120,
     direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,
     [a.c.id,i===5?'f'.repeat(64):celestialWorld,isSky?area:'enies-lobby-01',area,start.x,start.y,JSON.stringify([{x:start.x+16,y:start.y}])]);
   }
   const before=await persisted(f.pool),expected=structuredClone(before);
   for(const a of people.slice(0,5))expected.character_world.find((r:any)=>r.character_id===a.c.id).rules_hash=W.rulesHash;
   assert.deepEqual(await applyMigrations(f.pool),['0066_skypiea_hd_arrival.sql','0067_loguetown_hd_map.sql','0068_arlong_park_hd_map.sql','0069_baratie_hd_map.sql','0070_syrup_hd_map.sql','0071_rare_island_hd_map.sql','0072_dawn_village_hd_map.sql','0073_conchas_marine_hd_map.sql','0074_orange_town_hd_map.sql','0075_alabasta_desert_hd_map.sql','0076_alubarna_city_hd_map.sql']);
   assert.deepEqual(await persisted(f.pool),expected,'art and entry changes must not relocate existing players or affect receipts');
   assert.deepEqual(await applyMigrations(f.pool),[]);
   await f.pool.query(await readFile(new URL('0066_skypiea_hd_arrival.sql',source),'utf8'));
   assert.deepEqual(await persisted(f.pool),expected,'direct migration replay is idempotent');
   for(const [i,a] of people.slice(0,5).entries()){
    const resumed=await a.read();
    assert.equal(resumed.world.rulesHash,W.rulesHash);
    assert.deepEqual(resumed.battle,{...originalBattles[i],rulesHash:E.rulesHash},'read promotes only the battle signature');
   }
   await assert.rejects(people[5]!.read(),{code:'world_rules_changed'});
   assert.deepEqual(await persisted(f.pool),expected,'compatibility reads do not issue rewards or rewrite saved state');
  },directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});
