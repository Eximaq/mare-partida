import { readConfig } from './config.js';
import { createPool } from './db/pool.js';
import { applyMigrations } from './db/migrations.js';

async function main() {
  const config = readConfig({ ...process.env, DATABASE_URL: process.env.MIGRATION_DATABASE_URL });
  const pool = createPool(config.databaseUrl);
  try {
    const applied = await applyMigrations(pool);
    console.log(JSON.stringify({ event: 'migrations_complete', applied }));
  } finally { await pool.end(); }
}
main().catch(() => {
  console.error(JSON.stringify({ event: 'migration_failed', message: 'Check configuration, database access and migration history. If the connection failed during COMMIT, the outcome may be unknown; inspect the migration ledger before retrying.' }));
  process.exitCode = 1;
});
