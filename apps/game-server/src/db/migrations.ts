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

function assertHistory(migrations: Migration[], applied: Applied[]) {
  // Keep deployed receipts immutable when public main allocated the same numbers.
  // Only these exact, audited private scripts may appear outside the public prefix.
  const groups = [
    {current:'0052_detach_claimed_dungeon_members.sql', checksum:'87423f59558537c4be6e3dd32d72ee625e1906fa0550436e7cdf3f619efed331',
      names:['0040_detach_claimed_dungeon_members.sql','0047_detach_claimed_dungeon_members.sql','0049_detach_claimed_dungeon_members.sql','0050_detach_claimed_dungeon_members.sql']},
    {current:'0053_fruit_rework_compatibility.sql', checksum:'41e298e875e2aa27082c3c242ef370702ae699f09a2548e75e72e9e5d1793b3a',
      names:['0051_fruit_rework_compatibility.sql']},
  ];
  const aliases = new Map<string,string>();
  for(const group of groups){
    const rows=applied.filter(row=>group.names.includes(row.name));
    if(!rows.length)continue;
    const row=rows[0]!;
    if(rows.length!==1 || row.checksum!==group.checksum || applied.some(r=>r.name===group.current) ||
       !migrations.some(r=>r.name===group.current&&r.checksum===group.checksum)){
      throw new Error('Migration history mismatch; unknown or duplicate private receipt');
    }
    const prefix=Math.min(Number(row.name.slice(0,4)),50);
    if(migrations.some(r=>Number(r.name.slice(0,4))<prefix&&!applied.some(a=>a.name===r.name&&a.checksum===r.checksum))){
      throw new Error('Migration history mismatch; private receipt requires its complete predecessors');
    }
    aliases.set(row.name,group.current);
  }
  if(aliases.has('0051_fruit_rework_compatibility.sql') &&
     !applied.some(row=>row.name===groups[0]!.current||groups[0]!.names.includes(row.name))){
    throw new Error('Migration history mismatch; fruit rework requires the dungeon repair');
  }
  const renamed=new Set(aliases.values());
  const expectedHistory=migrations.filter(row=>!renamed.has(row.name));
  const canonicalHistory=applied.filter(row=>!aliases.has(row.name));
  for(const [index,row] of canonicalHistory.entries()){
    const expected=expectedHistory[index];
    if(!expected||expected.name!==row.name||expected.checksum!==row.checksum){
      throw new Error('Migration history mismatch; restore matching files or add a new migration');
    }
  }
  return new Set(applied.map(row=>aliases.get(row.name)??row.name));
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
    const completed = assertHistory(migrations, applied.rows);
    const pending = migrations.filter(migration => !completed.has(migration.name));
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
    const completed = assertHistory(migrations, applied.rows);
    return completed.size === migrations.length;
  } catch { return false; }
}
