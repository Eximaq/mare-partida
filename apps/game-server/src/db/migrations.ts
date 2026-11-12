import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const defaultDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
type Migration = { name: string; sql: string; checksum: string };
type Applied = { name: string; checksum: string };

async function loadMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  if (!names.length || names.some((name) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(name)) ||
      new Set(names.map((name) => name.slice(0, 4))).size !== names.length) {
    throw new Error('Invalid migration filenames');
  }
  return Promise.all(names.map(async (name) => {
    // Git checkout line endings must not change migration identity across Windows/Linux.
    const sql = (await readFile(join(directory, name), 'utf8')).replaceAll('\r\n', '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export function pendingMigrations<T extends Applied>(migrations: T[], applied: Applied[]): T[] {
  const oldAkainu = '0050_akainu_weekly_boss.sql';
  const currentAkainu = '0054_akainu_weekly_boss.sql';
  const historic = applied.find(row => row.name === oldAkainu);
  const mismatch = () => new Error('Migration history mismatch; restore matching files or add a new migration');
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
  for (const [index, row] of history.entries()) {
    const expected = plan[index];
    if (!expected || expected.name !== row.name || expected.checksum !== row.checksum) throw mismatch();
  }
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
