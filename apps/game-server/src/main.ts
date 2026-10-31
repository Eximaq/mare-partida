import { once } from 'node:events';
import { readConfig } from './config.js';
import { createPool } from './db/pool.js';
import { isDatabaseReady } from './db/migrations.js';
import { createHttpServer } from './http.js';

async function main() {
  const config = readConfig(process.env);
  const pool = createPool(config.databaseUrl);
  let stopping = false;
  const server = createHttpServer({ isReady: () => stopping ? Promise.resolve(false) : isDatabaseReady(pool) });
  try {
    server.listen(config.port, config.host);
    await once(server, 'listening');
  } catch (error) { await pool.end(); throw error; }
  console.log(JSON.stringify({ event: 'listening', host: config.host, port: config.port, phase: 'foundation' }));
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exitCode = 1; }, 10000);
    deadline.unref();
    server.close(() => {
      void pool.end().finally(() => {
        clearTimeout(deadline);
        console.log(JSON.stringify({ event: 'stopped' }));
      });
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
main().catch(() => {
  console.error(JSON.stringify({ event: 'startup_failed', message: 'Check local configuration and port availability.' }));
  process.exitCode = 1;
});
