import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type pg from 'pg';
import { authDatabase } from './auth-support.mjs';
import { applyMigrations, isDatabaseReady } from '../../apps/game-server/src/db/migrations.js';

const source = new URL('../../apps/game-server/migrations/', import.meta.url);
const allNames = (await readdir(source)).filter(name => name.endsWith('.sql')).sort();
const progressionNames = ['0067_world_progression.sql', '0068_dungeon_reward_catalog.sql', '0069_timed_progression.sql'];
const mapNames = [
  '0067_loguetown_hd_map.sql', '0068_arlong_park_hd_map.sql', '0069_baratie_hd_map.sql',
  '0070_syrup_hd_map.sql', '0071_rare_island_hd_map.sql', '0072_dawn_village_hd_map.sql',
  '0073_conchas_marine_hd_map.sql', '0074_orange_town_hd_map.sql', '0075_alabasta_desert_hd_map.sql',
  '0076_alubarna_city_hd_map.sql', '0077_boss_arena_hd_map.sql', '0078_marineford_hd_map.sql',
];
const mainWorld = '7a6056d9a7974974d6d1dc4bc811b4bf9a582901cf6f42d3378ad6fe5f973262';
const hdWorld = 'a24fd0cc9dd735b8be11a4103dc358877599de95a45c8c0036b841c254e5f6c8';
const immutableTables = ['character_level_ledger', 'character_commands', 'game_inventory', 'game_inventory_events', 'dungeon_victories', 'dungeon_claims'];

async function migrationHistory(pool: pg.Pool) {
  return (await pool.query('SELECT name,checksum,applied_at FROM mare_meta.schema_migrations ORDER BY name')).rows;
}
async function receipts(pool: pg.Pool) {
  const result: Record<string, unknown> = {};
  for (const table of immutableTables) {
    result[table] = (await pool.query(`SELECT to_jsonb(t) AS data FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows;
  }
  return result;
}
async function characterState(pool: pg.Pool, id: string) {
  return (await pool.query(`SELECT p.level,p.experience::text,p.level_start_experience::text,p.gold::text,c.state_version::text,
    d.state AS dungeons,w.rules_hash,w.map_id,w.x,w.y,w.path,w.speed
    FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
    JOIN mare_game.character_dungeons d ON d.character_id=p.character_id
    JOIN mare_game.character_world w ON w.character_id=p.character_id WHERE p.character_id=$1`, [id])).rows[0];
}

for (const release of ['main', 'maps'] as const) {
  test(`${release} deployed history reconciles once without replaying XP, rewards, receipts or HD geometry`, async () => {
    const directory = await mkdtemp(join(tmpdir(), `mare-parallel-${release}-`));
    try {
      for (const name of allNames.filter(name => name < '0067')) await copyFile(new URL(name, source), join(directory, name));
      await authDatabase(async ({ service, pool }) => {
        const session = await service.login(randomUUID() + '@example.invalid', 'fixture');
        const character = await service.createCharacter(session.token, { name: 'Parallel release', classId: 'sword', factionId: 'pirate' });
        const lease = await service.acquireControl(session.token, character.id);
        const requestId = randomUUID();
        await service.command(session.token, character.id, {
          action: 'items.initialize', expectedVersion: 0, payload: {}, requestId,
          control: { epoch: lease.epoch, token: lease.token },
        });
        // Level two costs 44 XP in v3/v4 and 348 XP in v5: half a level is
        // exactly 22 -> 174 XP. A second progression execution changes it.
        await pool.query('UPDATE mare_game.character_progression SET level=2,experience=1022,level_start_experience=1000,gold=77 WHERE character_id=$1', [character.id]);
        await pool.query('UPDATE mare_game.characters SET state_version=20 WHERE id=$1', [character.id]);
        await pool.query(`INSERT INTO mare_game.character_level_ledger(character_id,level,source,experience_total,version_before)
          VALUES($1,2,'migration',1000,19)`, [character.id]);
        const pending = { phase: 'pending', ownerId: character.id, runId: randomUUID(), reward: { xp: 0, berry: 0, materialId: 'akuma_fragment_b', quantity: 10, boundToCharacter: character.id } };
        await pool.query(`INSERT INTO mare_game.character_dungeons(character_id,state) VALUES($1,$2)
          ON CONFLICT(character_id) DO UPDATE SET state=EXCLUDED.state`, [character.id, { version: 1, seq: 1, records: { wapol: pending } }]);
        await pool.query(`INSERT INTO mare_game.dungeon_victories(character_id,dungeon_id,run_id,spawn_id,request_id,reward,rules_hash)
          VALUES($1,'alvida',$2,$3,$4,'{"xp":0,"berry":0}',repeat('a',64))`, [character.id, randomUUID(), randomUUID(), requestId]);
        await pool.query(`INSERT INTO mare_game.dungeon_claims(character_id,dungeon_id,request_id,experience_delta,gold_delta)
          VALUES($1,'alvida',$2,0,0)`, [character.id, requestId]);
        await pool.query(`INSERT INTO mare_game.character_world(character_id,rules_hash,map_id,area,x,y,path,speed,direction,started_at,motion_until)
          VALUES($1,$2,'marineford-01','marineford-01',3592,2792,'[]',0,'front','2026-11-01T12:00:00Z','2026-11-01T12:00:00Z')`, [character.id, mainWorld]);
        const originalReceipts = await receipts(pool);

        const deployedNames = release === 'main' ? progressionNames : mapNames;
        for (const name of deployedNames) await copyFile(new URL(name, source), join(directory, name));
        assert.deepEqual(await applyMigrations(pool, directory), deployedNames);
        const deployedHistory = await migrationHistory(pool);
        assert.equal(deployedHistory.length, release === 'main' ? 69 : 78);
        const before = await characterState(pool, character.id);
        assert.equal(before.experience, release === 'main' ? '1174' : '1022');
        assert.equal(before.state_version, release === 'main' ? '22' : '20');
        assert.equal(await isDatabaseReady(pool), false);

        const executions = await Promise.all([applyMigrations(pool), applyMigrations(pool)]);
        assert.deepEqual(executions.flat().sort(), [...(release === 'main' ? mapNames : progressionNames), '0079_character_cosmetics.sql']);
        assert.equal(executions.filter(names => names.length).length, 1);
        const after = await characterState(pool, character.id);
        assert.deepEqual(after, {
          level: 2, experience: '1174', level_start_experience: '1000', gold: '77', state_version: '22',
          dungeons: { version: 1, seq: 1, records: { wapol: { ...pending, reward: {
            xp: 0, berry: 0, items: [{ materialId: 'akuma_fragment_c', quantity: 10, boundToCharacter: character.id }],
          } } } },
          rules_hash: hdWorld, map_id: 'marineford-01', x: 1536, y: 1824, path: [], speed: 0,
        });
        assert.deepEqual(await receipts(pool), originalReceipts);
        const completeHistory = await migrationHistory(pool);
        const oldNames = new Set(deployedHistory.map(row => row.name));
        assert.deepEqual(completeHistory.filter(row => oldNames.has(row.name)), deployedHistory, 'existing names, checksums and applied timestamps stay untouched');
        const expectedHistory = await Promise.all(allNames.map(async name => ({
          name, checksum: createHash('sha256').update((await readFile(new URL(name, source), 'utf8')).replaceAll('\r\n', '\n')).digest('hex'),
        })));
        assert.deepEqual(completeHistory.map(({ name, checksum }) => ({ name, checksum })), expectedHistory);
        assert.equal(completeHistory.length, 82);
        assert.equal(await isDatabaseReady(pool), true);
        assert.deepEqual(await applyMigrations(pool), []);
        assert.deepEqual(await characterState(pool, character.id), after);
        assert.deepEqual(await receipts(pool), originalReceipts);
        assert.deepEqual(await migrationHistory(pool), completeHistory);
      }, directory);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
