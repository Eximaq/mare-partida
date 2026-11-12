import pg from 'pg';

export function createPool(connectionString: string, max=10) {
  const pool = new pg.Pool({
    connectionString, max, connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000, statement_timeout: 5000, query_timeout: 6000,
    // Combat queries run on every tick. JIT compilation can cost more than executing them.
    options: '-c jit=off',
    application_name: 'mare-foundation',
  });
  pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));
  return pool;
}
