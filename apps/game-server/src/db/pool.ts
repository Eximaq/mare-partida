import pg from 'pg';

export function createPool(connectionString: string) {
  const pool = new pg.Pool({
    connectionString, max: 10, connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000, statement_timeout: 5000, query_timeout: 6000,
    application_name: 'mare-foundation',
  });
  pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));
  return pool;
}
