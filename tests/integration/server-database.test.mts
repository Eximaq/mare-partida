import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer, connect, type Socket, type AddressInfo } from 'node:net';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import pg from 'pg';
import { applyMigrations, isDatabaseReady } from '../../apps/game-server/src/db/migrations.js';
import { createPool } from '../../apps/game-server/src/db/pool.js';

async function database(run: (pool: pg.Pool, url: URL) => Promise<void>) {
  const connectionString = process.env.TEST_DATABASE_URL;
  assert.ok(connectionString, 'Set TEST_DATABASE_URL to an isolated local PostgreSQL admin connection');
  const url = new URL(connectionString);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Integration tests require loopback');
  const admin = new pg.Pool({ connectionString, max: 1 });
  const name = `mare_test_${randomUUID().replaceAll('-', '')}`;
  let pool: pg.Pool | undefined;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    url.pathname = `/${name}`;
    pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
    await run(pool, url);
  } finally {
    await pool?.end();
    // Only the UUID database created in this invocation is eligible for cleanup.
    if (created) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
}

test('concurrent migrations commit once, are repeatable and make readiness true', async () => {
  await database(async (pool) => {
    assert.equal(await isDatabaseReady(pool), false);
    const applied = (await Promise.all([applyMigrations(pool), applyMigrations(pool)])).flat();
    assert.deepEqual(applied, ['0001_foundation.sql','0002_auth_sessions.sql','0003_character_progression.sql','0004_character_commands.sql','0005_character_journey.sql','0006_first_hunt.sql','0007_first_combat.sql','0008_repeatable_encounters.sql','0009_level_progression.sql','0010_attribute_allocation.sql', '0011_battle_profiles.sql', '0012_inventory_economy.sql', '0013_continuous_play.sql','0014_original_inventory.sql','0015_original_character.sql','0016_original_world.sql','0017_original_battles.sql','0018_battle_profile_compatibility.sql','0019_original_contracts.sql','0020_restore_stable_battle_hash.sql','0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql']);
    assert.deepEqual(await applyMigrations(pool), []);
    assert.equal(await isDatabaseReady(pool), true);
    const history = await pool.query('SELECT name FROM mare_meta.schema_migrations ORDER BY name');
    assert.deepEqual(history.rows, [{ name: '0001_foundation.sql' },{name:'0002_auth_sessions.sql'},{name:'0003_character_progression.sql'},{name:'0004_character_commands.sql'},{name:'0005_character_journey.sql'},{name:'0006_first_hunt.sql'},{name:'0007_first_combat.sql'},{name:'0008_repeatable_encounters.sql'},{name:'0009_level_progression.sql'},{name:'0010_attribute_allocation.sql'},{name:'0011_battle_profiles.sql'},{name:'0012_inventory_economy.sql'},{name:'0013_continuous_play.sql'},{name:'0014_original_inventory.sql'},{name:'0015_original_character.sql'},{name:'0016_original_world.sql'},{name:'0017_original_battles.sql'},{name:'0018_battle_profile_compatibility.sql'},{name:'0019_original_contracts.sql'},{name:'0020_restore_stable_battle_hash.sql'},{name:'0021_original_talents.sql'},{name:'0022_talent_battle_compatibility.sql'},{name:'0023_original_achievements.sql'},{name:'0024_original_prison.sql'},{name:'0025_original_dungeons.sql'},{name:'0026_original_haki.sql'},{name:'0027_original_hierarchy.sql'},{name:'0028_original_fruits.sql'},{name:'0029_original_profile.sql'},{name:'0030_navigation_broadphase.sql'},{name:'0031_navigation_terminal_edges.sql'},{name:'0032_parties.sql'},{name:'0033_navigation_memo.sql'},{name:'0034_navigation_open_mask.sql'},{name:'0035_skypiea_catalog.sql'},{name:'0036_skypiea_map_refresh.sql'}]);
  });
});

test('identity and character constraints prevent duplicate ownership, orphans and invalid catalog IDs', async () => {
  await database(async (pool) => {
    assert.deepEqual(await applyMigrations(pool), ['0001_foundation.sql','0002_auth_sessions.sql','0003_character_progression.sql','0004_character_commands.sql','0005_character_journey.sql','0006_first_hunt.sql','0007_first_combat.sql','0008_repeatable_encounters.sql','0009_level_progression.sql','0010_attribute_allocation.sql', '0011_battle_profiles.sql', '0012_inventory_economy.sql', '0013_continuous_play.sql','0014_original_inventory.sql','0015_original_character.sql','0016_original_world.sql','0017_original_battles.sql','0018_battle_profile_compatibility.sql','0019_original_contracts.sql','0020_restore_stable_battle_hash.sql','0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql']);
    const account = randomUUID();
    await pool.query('INSERT INTO mare_game.accounts(id,provider,subject) VALUES($1,$2,$3)', [account, 'test', 'alice']);
    await assert.rejects(pool.query('INSERT INTO mare_game.accounts(id,provider,subject) VALUES($1,$2,$3)', [randomUUID(), 'test', 'alice']), { code: '23505' });
    const insert = 'INSERT INTO mare_game.characters(id,account_id,name,class_id,faction_id) VALUES($1,$2,$3,$4,$5)';
    await pool.query(insert, [randomUUID(), account, 'Captain', 'sword', 'pirate']);
    await assert.rejects(pool.query(insert, [randomUUID(), account, 'Other', 'sword', 'pirate']), { code: '23505' });
    await assert.rejects(pool.query(insert, [randomUUID(), randomUUID(), 'Orphan', 'sword', 'pirate']), { code: '23503' });
    await assert.rejects(pool.query(insert, [randomUUID(), randomUUID(), 'Bad', 'forged-class', 'pirate']), { code: '23514' });
  });
});

test('a failed migration rolls back its SQL and the complete migration ledger', async () => {
  await database(async (pool) => {
    const dir = await mkdtemp(join(tmpdir(), 'mare-migration-failure-'));
    await writeFile(join(dir, '0001_failure.sql'), 'CREATE TABLE public.must_rollback(id integer); SELECT * FROM public.missing_table;');
    await assert.rejects(applyMigrations(pool, dir));
    const result = await pool.query("SELECT to_regclass('public.must_rollback') AS partial, to_regclass('mare_meta.schema_migrations') AS ledger");
    assert.deepEqual(result.rows, [{ partial: null, ledger: null }]);
  });
});

test('modified history fails closed; equivalent Windows line endings remain compatible', async () => {
  await database(async (pool) => {
    assert.deepEqual(await applyMigrations(pool), ['0001_foundation.sql','0002_auth_sessions.sql','0003_character_progression.sql','0004_character_commands.sql','0005_character_journey.sql','0006_first_hunt.sql','0007_first_combat.sql','0008_repeatable_encounters.sql','0009_level_progression.sql','0010_attribute_allocation.sql', '0011_battle_profiles.sql', '0012_inventory_economy.sql', '0013_continuous_play.sql','0014_original_inventory.sql','0015_original_character.sql','0016_original_world.sql','0017_original_battles.sql','0018_battle_profile_compatibility.sql','0019_original_contracts.sql','0020_restore_stable_battle_hash.sql','0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql']);
    const dir = await mkdtemp(join(tmpdir(), 'mare-migration-checksum-'));
    const source = await readFile(new URL('../../apps/game-server/migrations/0001_foundation.sql', import.meta.url), 'utf8');
    for(const name of ['0011_battle_profiles.sql','0012_inventory_economy.sql','0013_continuous_play.sql','0014_original_inventory.sql','0015_original_character.sql','0016_original_world.sql','0017_original_battles.sql','0018_battle_profile_compatibility.sql','0019_original_contracts.sql','0020_restore_stable_battle_hash.sql','0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql']) await writeFile(join(dir,name),await readFile(new URL('../../apps/game-server/migrations/'+name,import.meta.url),'utf8'));
    await writeFile(join(dir,'0010_attribute_allocation.sql'),await readFile(new URL('../../apps/game-server/migrations/0010_attribute_allocation.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0009_level_progression.sql'),await readFile(new URL('../../apps/game-server/migrations/0009_level_progression.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0002_auth_sessions.sql'),await readFile(new URL('../../apps/game-server/migrations/0002_auth_sessions.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0003_character_progression.sql'),await readFile(new URL('../../apps/game-server/migrations/0003_character_progression.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0004_character_commands.sql'),await readFile(new URL('../../apps/game-server/migrations/0004_character_commands.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0005_character_journey.sql'),await readFile(new URL('../../apps/game-server/migrations/0005_character_journey.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0006_first_hunt.sql'),await readFile(new URL('../../apps/game-server/migrations/0006_first_hunt.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0007_first_combat.sql'),await readFile(new URL('../../apps/game-server/migrations/0007_first_combat.sql',import.meta.url),'utf8'));
    await writeFile(join(dir,'0008_repeatable_encounters.sql'),await readFile(new URL('../../apps/game-server/migrations/0008_repeatable_encounters.sql',import.meta.url),'utf8'));
    await writeFile(join(dir, '0001_foundation.sql'), source.replace(/\r?\n/g, '\r\n'));
    assert.deepEqual(await applyMigrations(pool, dir), []);
    await writeFile(join(dir, '0001_foundation.sql'), source + '\n-- unexpected change');
    await assert.rejects(applyMigrations(pool, dir), /Migration history mismatch/);
    await pool.query("UPDATE mare_meta.schema_migrations SET checksum = 'invalid'");
    assert.equal(await isDatabaseReady(pool), false);
  });
});

test('readiness and the real connection pool recover after a network interruption without restarting PostgreSQL', async () => {
  await database(async (pool, databaseUrl) => {
    await applyMigrations(pool);
    let available = true;
    const sockets = new Set<Socket>();
    const proxy = createServer((client) => {
      if (!available) { client.destroy(); return; }
      const upstream = connect({ host: databaseUrl.hostname, port: Number(databaseUrl.port || 5432) });
      for (const socket of [client, upstream]) {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => { client.destroy(); upstream.destroy(); });
      }
      client.on('close', () => upstream.destroy());
      upstream.on('close', () => client.destroy());
      client.pipe(upstream).pipe(client);
    });
    proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
    const proxiedUrl = new URL(databaseUrl);
    proxiedUrl.hostname = '127.0.0.1';
    proxiedUrl.port = String((proxy.address() as AddressInfo).port);
    const runtime = createPool(proxiedUrl.toString());
    try {
      assert.equal(await isDatabaseReady(runtime), true);
      available = false;
      for (const socket of sockets) socket.destroy();
      assert.equal(await isDatabaseReady(runtime), false);
      available = true;
      assert.equal(await isDatabaseReady(runtime), true);
    } finally {
      await runtime.end();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
  });
});
