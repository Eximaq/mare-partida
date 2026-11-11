import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readdir,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations,isDatabaseReady} from '../../apps/game-server/src/db/migrations.js';

const source=new URL('../../apps/game-server/migrations/',import.meta.url);
const legacy='0040_detach_claimed_dungeon_members.sql';
const current='0053_detach_claimed_dungeon_members.sql';
const rework='0054_fruit_rework_compatibility.sql';
const weekly='0055_akainu_weekly_boss.sql';
const progression=['0050_character_xp_curve.sql','0051_bounty_victories.sql','0052_world_map_exports.sql'];

async function installedHistory(){
 const dir=await history('main');
 await copyFile(new URL(current,source),join(dir,'0050_detach_claimed_dungeon_members.sql'));
 await copyFile(new URL(rework,source),join(dir,'0051_fruit_rework_compatibility.sql'));
 return dir;
}

test('installed private 75ffa2e history accepts public progression without changing either private receipt',async()=>{
 const dir=await installedHistory();
 await authDatabase(async f=>{
  const session=await f.service.login(randomUUID()+'@example.invalid','fixture');
  const character=await f.service.createCharacter(session.token,{name:'ProgressÃƒÂ£o',classId:'sword',factionId:'pirate'});
  const lease=await f.service.acquireControl(session.token,character.id);
  const initial=await f.service.characterState(session.token,character.id);
  await f.service.command(session.token,character.id,{action:'items.initialize',payload:{},expectedVersion:initial.version,requestId:randomUUID(),control:{epoch:lease.epoch,token:lease.token}});
  await f.pool.query('UPDATE mare_game.character_progression SET experience=120,gold=73,level=1,level_start_experience=0 WHERE character_id=$1',[character.id]);
  const inventory=(await f.pool.query('SELECT * FROM mare_game.game_inventory WHERE character_id=$1',[character.id])).rows;
  const version=(await f.service.characterState(session.token,character.id)).version;
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations ORDER BY name')).rows;
  assert.equal(before.length,51);
  assert.deepEqual(await applyMigrations(f.pool),[...progression,weekly]);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);
  assert.deepEqual(await applyMigrations(f.pool),[]);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_meta.schema_migrations')).rows[0].n,55);
  const state=await f.service.characterState(session.token,character.id);
  assert.equal(state.level,3);assert.equal(state.experience,'120');assert.equal(state.gold,'73');assert.equal(state.version,version+1);
  assert.equal((await f.pool.query('SELECT level_start_experience::text start FROM mare_game.character_progression WHERE character_id=$1',[character.id])).rows[0].start,'71');
  assert.deepEqual((await f.pool.query('SELECT level,source FROM mare_game.character_level_ledger WHERE character_id=$1 ORDER BY level',[character.id])).rows,[{level:2,source:'migration'},{level:3,source:'migration'}]);
  assert.deepEqual((await f.pool.query('SELECT * FROM mare_game.game_inventory WHERE character_id=$1',[character.id])).rows,inventory);
 },dir);
});

test('public progression history receives both private repairs without rewriting public receipts',async()=>{
 const dir=await history('main');
 for(const name of progression)await copyFile(new URL(name,source),join(dir,name));
 await authDatabase(async f=>{
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations ORDER BY name')).rows;
  assert.deepEqual(await applyMigrations(f.pool),[current,rework,weekly]);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});

test('tampered and duplicate rework aliases cannot bypass migration validation',async()=>{
 const dir=await installedHistory();
 await authDatabase(async f=>{
  await f.pool.query('UPDATE mare_meta.schema_migrations SET checksum=$1 WHERE name=$2',['0'.repeat(64),'0051_fruit_rework_compatibility.sql']);
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  assert.equal((await f.pool.query("SELECT to_regclass('mare_game.bounty_victories') present")).rows[0].present,null);
 },dir);
 await authDatabase(async f=>{
  await f.pool.query('INSERT INTO mare_meta.schema_migrations(name,checksum) SELECT $1,checksum FROM mare_meta.schema_migrations WHERE name=$2',['0051_fruit_rework_compatibility.sql',rework]);
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  assert.equal(await isDatabaseReady(f.pool),false);
 });
});

async function history(kind:'private'|'main'){
 const dir=await mkdtemp(join(tmpdir(),'mare-lineage-'));
 for(const name of await readdir(source)){
  if(kind==='private'&&name>='0040')continue;
  if(kind==='main'&&name>='0050')continue;
  await copyFile(new URL(name,source),join(dir,name));
 }
 if(kind==='private')await copyFile(new URL(current,source),join(dir,legacy));
 return dir;
}

test('the private 0040 repair upgrades to current social schema without rewriting its receipt',async()=>{
 const dir=await history('private');
 await authDatabase(async f=>{
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations ORDER BY name')).rows;
  assert.equal(before.length,40);
  const added=await applyMigrations(f.pool);
  assert.equal(added.length,15);
  assert.equal(added[0],'0040_daily_contracts.sql');
  assert.equal(added.at(-1),weekly);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);
  assert.deepEqual(await applyMigrations(f.pool),[]);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM mare_meta.schema_migrations")).rows[0].n,55);
  assert((await f.pool.query("SELECT to_regclass('mare_game.contract_daily_cycles') present")).rows[0].present);
 },dir);
});

test('the official 49 migration history receives the dungeon repair exactly once',async()=>{
 const dir=await history('main');
 await authDatabase(async f=>{
  assert.deepEqual(await applyMigrations(f.pool),[...progression,current,rework,weekly]);
  assert.equal(await isDatabaseReady(f.pool),true);
  assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});

test('an altered private repair fails closed before creating any new tables',async()=>{
 const dir=await history('private');
 await authDatabase(async f=>{
  await f.pool.query('UPDATE mare_meta.schema_migrations SET checksum=$1 WHERE name=$2',['0'.repeat(64),legacy]);
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  assert.equal(await isDatabaseReady(f.pool),false);
  assert.equal((await f.pool.query("SELECT to_regclass('mare_game.contract_daily_cycles') present")).rows[0].present,null);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_meta.schema_migrations')).rows[0].n,40);
 },dir);
});

test('duplicate aliases and a missing middle migration are rejected',async()=>{
 await authDatabase(async f=>{
  await f.pool.query('INSERT INTO mare_meta.schema_migrations(name,checksum) SELECT $1,checksum FROM mare_meta.schema_migrations WHERE name=$2',[legacy,current]);
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  await f.pool.query('DELETE FROM mare_meta.schema_migrations WHERE name=$1',[legacy]);
  await f.pool.query("DELETE FROM mare_meta.schema_migrations WHERE name='0041_progression_hud_balance.sql'");
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  assert.equal(await isDatabaseReady(f.pool),false);
 });
});

test('a private repair cannot conceal a missing predecessor receipt',async()=>{
 const dir=await history('private');
 await authDatabase(async f=>{
  await f.pool.query("DELETE FROM mare_meta.schema_migrations WHERE name='0039_equipment_potential_compatibility.sql'");
  await assert.rejects(applyMigrations(f.pool),/history mismatch/i);
  assert.equal(await isDatabaseReady(f.pool),false);
 },dir);
});

test('the intermediate 0047 private repair also upgrades without rewriting its receipt',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-lineage-intermediate-'));
 for(const name of await readdir(source))if(name<'0047')await copyFile(new URL(name,source),join(dir,name));
 const intermediate='0047_detach_claimed_dungeon_members.sql';
 await copyFile(new URL(current,source),join(dir,intermediate));
 await authDatabase(async f=>{
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[intermediate])).rows;
  assert.deepEqual(await applyMigrations(f.pool),['0047_market.sql','0048_merchant_potions.sql','0049_market_wallet_grants.sql',...progression,rework,weekly]);
  assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[intermediate])).rows,before);
  assert.equal(await isDatabaseReady(f.pool),true);assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});


test('the installed 0049 private repair upgrades wallet rules without rewriting history',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-lineage-installed-'));
 for(const name of await readdir(source))if(name<'0049')await copyFile(new URL(name,source),join(dir,name));
 const intermediate='0049_detach_claimed_dungeon_members.sql';
 await copyFile(new URL(current,source),join(dir,intermediate));
 await authDatabase(async f=>{
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations ORDER BY name')).rows;
  assert.deepEqual(await applyMigrations(f.pool),['0049_market_wallet_grants.sql',...progression,rework,weekly]);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});


test('the previous 53-migration private installation adds the public maps once',async()=>{
 const dir=await history('main');
 for(const name of progression.slice(0,2))await copyFile(new URL(name,source),join(dir,name));
 await copyFile(new URL(current,source),join(dir,'0052_detach_claimed_dungeon_members.sql'));
 await copyFile(new URL(rework,source),join(dir,'0053_fruit_rework_compatibility.sql'));
 await authDatabase(async f=>{
  const before=(await f.pool.query('SELECT * FROM mare_meta.schema_migrations ORDER BY name')).rows;
  assert.deepEqual(await applyMigrations(f.pool),['0052_world_map_exports.sql',weekly]);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);
  assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});
