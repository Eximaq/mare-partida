import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readdir,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations,isDatabaseReady} from '../../apps/game-server/src/db/migrations.js';

const source=new URL('../../apps/game-server/migrations/',import.meta.url);
const legacy='0040_detach_claimed_dungeon_members.sql';
const current='0050_detach_claimed_dungeon_members.sql';
const rework='0051_fruit_rework_compatibility.sql';

async function history(kind:'private'|'main'){
 const dir=await mkdtemp(join(tmpdir(),'mare-lineage-'));
 for(const name of await readdir(source)){
  if(kind==='private'&&name>='0040')continue;
  if(kind==='main'&&name>=current)continue;
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
  assert.equal(added.length,11);
  assert.equal(added[0],'0040_daily_contracts.sql');
  assert.equal(added.at(-1),rework);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);
  assert.deepEqual(await applyMigrations(f.pool),[]);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM mare_meta.schema_migrations")).rows[0].n,51);
  assert((await f.pool.query("SELECT to_regclass('mare_game.contract_daily_cycles') present")).rows[0].present);
 },dir);
});

test('the official 49 migration history receives the dungeon repair exactly once',async()=>{
 const dir=await history('main');
 await authDatabase(async f=>{
  assert.deepEqual(await applyMigrations(f.pool),[current,rework]);
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
  assert.deepEqual(await applyMigrations(f.pool),['0047_market.sql','0048_merchant_potions.sql','0049_market_wallet_grants.sql',rework]);
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
  assert.deepEqual(await applyMigrations(f.pool),['0049_market_wallet_grants.sql',rework]);
  for(const row of before)assert.deepEqual((await f.pool.query('SELECT * FROM mare_meta.schema_migrations WHERE name=$1',[row.name])).rows,[row]);
  assert.equal(await isDatabaseReady(f.pool),true);assert.deepEqual(await applyMigrations(f.pool),[]);
 },dir);
});
