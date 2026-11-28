import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const defaultDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
type Migration = { name: string; sql: string; checksum: string };
type Applied = { name: string; checksum: string };

// Both deployed branches used 0067-0069. These exact files are the only allowed
// sequence collisions; their original names and SQL remain migration identity.
const parallelReleaseChecksums: Record<string, string> = {
  '0067_loguetown_hd_map.sql': '91971b44ba0ee7da3b598b297a167ac74ef73d9ff56739ad9a2f813127f1863a',
  '0067_world_progression.sql': '3d8e96dc76085862ac072904e341ba4e5bdf8f6516be1ab9125bc6358ae0fcfd',
  '0068_arlong_park_hd_map.sql': '614b517e346d2d8e2013ed89b21a85d55138a5b8c1674fa1d7ad441236f5c137',
  '0068_dungeon_reward_catalog.sql': 'c8bf4d804ee955aa66050c36da4ee6e9f5807513eb846a2d2893e83e96174ea8',
  '0069_baratie_hd_map.sql': '8086d924451f19121519255136a97db9f0de82e4c90bf22032ee9028060939f6',
  '0069_timed_progression.sql': '2f2f039f7305466a3688a28f70d451a230ff62db0e8a5f2e64965dd68b209f7a',
};
const parallelProgression = new Set(['0067_world_progression.sql', '0068_dungeon_reward_catalog.sql', '0069_timed_progression.sql']);
const mismatch = () => new Error('Migration history mismatch; restore matching files or add a new migration');

function validateSequenceNumbers(migrations: Applied[]): boolean {
  const sequences = new Map<string, Applied[]>();
  for (const row of migrations) {
    const checksum = parallelReleaseChecksums[row.name];
    if (checksum && checksum !== row.checksum) throw mismatch();
    const sequence = row.name.slice(0, 4);
    sequences.set(sequence, [...(sequences.get(sequence) ?? []), row]);
  }
  let parallel = false;
  for (const rows of sequences.values()) {
    if (rows.length === 1) continue;
    if (rows.length !== 2 || new Set(rows.map(row => row.name)).size !== 2 ||
        rows.some(row => !parallelReleaseChecksums[row.name])) throw new Error('Invalid migration filenames');
    parallel = true;
  }
  return parallel;
}

function verifyPrefix(plan: Applied[], history: Applied[]): void {
  for (const [index, row] of history.entries()) {
    const expected = plan[index];
    if (!expected || expected.name !== row.name || expected.checksum !== row.checksum) throw mismatch();
  }
}

async function loadMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  if (!names.length || names.some((name) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(name))) {
    throw new Error('Invalid migration filenames');
  }
  const migrations = await Promise.all(names.map(async (name) => {
    // Git checkout line endings must not change migration identity across Windows/Linux.
    const sql = (await readFile(join(directory, name), 'utf8')).replaceAll('\r\n', '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
  validateSequenceNumbers(migrations);
  return migrations;
}

export function pendingMigrations<T extends Applied>(migrations: T[], applied: Applied[]): T[] {
  const parallel = validateSequenceNumbers(migrations);
  const oldAkainu = '0050_akainu_weekly_boss.sql';
  const currentAkainu = '0054_akainu_weekly_boss.sql';
  const historic = applied.find(row => row.name === oldAkainu);
  let plan = migrations;
  let history = applied;
  if (historic) {
    const canonical = migrations.find(row => row.name === currentAkainu);
    if (!canonical || canonical.checksum !== historic.checksum ||
        applied.some(row => row.name === currentAkainu) ||
        applied.filter(row => row.name < oldAkainu).length !== migrations.filter(row => row.name < oldAkainu).length) {
      throw mismatch();
    }
    // The deployed Akainu branch and main both used sequence 0050.
    // Keep the recorded name and checksum intact and skip only the identical SQL.
    plan = migrations.filter(row => row.name !== currentAkainu);
    history = applied.filter(row => row.name !== oldAkainu);
  }
  if (parallel) {
    // Each branch must still be a prefix of its own history. Missing map SQL
    // cannot hide behind an applied progression migration, or vice versa.
    const mapPlan = plan.filter(row => !parallelProgression.has(row.name));
    const mapHistory = history.filter(row => !parallelProgression.has(row.name));
    const progressionPlan = plan.filter(row => parallelProgression.has(row.name));
    const progressionHistory = history.filter(row => parallelProgression.has(row.name));
    verifyPrefix(mapPlan, mapHistory);
    verifyPrefix(progressionPlan, progressionHistory);
    const commonCount = mapPlan.filter(row => row.name < '0067').length;
    if ((progressionHistory.length && mapHistory.length < commonCount) ||
        (mapHistory.some(row => row.name > '0078_marineford_hd_map.sql') && progressionHistory.length !== progressionPlan.length)) throw mismatch();
    const recordedNames = new Set(history.map(row => row.name));
    const recorded = plan.filter(row => recordedNames.has(row.name));
    if (recorded.length !== history.length) throw mismatch();
    verifyPrefix(recorded, history);
    return plan.filter(row => !recordedNames.has(row.name));
  }
  verifyPrefix(plan, history);
  return plan.slice(history.length);
}
export async function applyMigrations(pool: Pool, directory = defaultDirectory): Promise<string[]> {
  const migrations = await loadMigrations(directory);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    // Serializes migration runners in this database, including the first schema creation.
    await client.query('SELECT pg_advisory_xact_lock(1296126533)');
    await client.query(`CREATE SCHEMA IF NOT EXISTS mare_meta;
      REVOKE ALL ON SCHEMA mare_meta FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS mare_meta.schema_migrations (
        name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    const applied = await client.query<Applied>('SELECT name, checksum FROM mare_meta.schema_migrations ORDER BY name');
    const pending = pendingMigrations(migrations, applied.rows);
    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query('INSERT INTO mare_meta.schema_migrations(name,checksum) VALUES($1,$2)', [migration.name, migration.checksum]);
    }
    await client.query('COMMIT');
    return pending.map((migration) => migration.name);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function isDatabaseReady(pool: Pool): Promise<boolean> {
  try {
    const migrations = await loadMigrations(defaultDirectory);
    const applied = await pool.query<Applied>('SELECT name, checksum FROM mare_meta.schema_migrations ORDER BY name');
    return pendingMigrations(migrations, applied.rows).length === 0;
  } catch { return false; }
}
