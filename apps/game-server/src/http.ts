import { createServer, type ServerResponse } from 'node:http';
import type { HealthResponse } from '@mare/shared';

export function createHttpServer(options: { isReady: () => Promise<boolean> }) {
  const server = createServer({ maxHeaderSize: 8192 }, (request, response) => {
    const path = request.url?.split('?')[0];
    const reply = (status: number, value: HealthResponse | { error: string }) => {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      }).end(JSON.stringify(value));
    };
    request.resume();
    if (path !== '/health/live' && path !== '/health/ready') return reply(404, { error: 'not_found' });
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return reply(405, { error: 'method_not_allowed' });
    }
    if (path === '/health/live') return reply(200, { status: 'alive' });
    void readiness(options.isReady, response, reply);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  return server;
}

async function readiness(check: () => Promise<boolean>, response: ServerResponse,
  reply: (status: number, value: HealthResponse) => void) {
  let ready = false;
  try { ready = await check(); } catch { /* No connection strings or database errors in HTTP responses. */ }
  if (!response.destroyed) reply(ready ? 200 : 503, { status: ready ? 'ready' : 'not_ready' });
}
