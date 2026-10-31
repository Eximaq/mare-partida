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
    assert.deepEqual(applied, ['0001_foundation.sql','0002_auth_sessions.sql']);
    assert.deepEqual(await applyMigrations(pool), []);
    assert.equal(await isDatabaseReady(pool), true);
    const history = await pool.query('SELECT name FROM mare_meta.schema_migrations');
    assert.deepEqual(history.rows, [{ name: '0001_foundation.sql' },{name:'0002_auth_sessions.sql'}]);
  });
});

test('identity and character constraints prevent duplicate ownership, orphans and invalid catalog IDs', async () => {
  await database(async (pool) => {
    assert.deepEqual(await applyMigrations(pool), ['0001_foundation.sql','0002_auth_sessions.sql']);
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
    assert.deepEqual(await applyMigrations(pool), ['0001_foundation.sql','0002_auth_sessions.sql']);
    const dir = await mkdtemp(join(tmpdir(), 'mare-migration-checksum-'));
    const source = await readFile(new URL('../../apps/game-server/migrations/0001_foundation.sql', import.meta.url), 'utf8');
    await writeFile(join(dir,'0002_auth_sessions.sql'),await readFile(new URL('../../apps/game-server/migrations/0002_auth_sessions.sql',import.meta.url),'utf8'));
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
