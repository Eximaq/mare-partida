import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { HealthResponse } from "@mare/shared";
import { httpRouteGroup, type HttpRouteGroup } from "./metrics.js";
export {attachRealtime} from './realtime.js';

export function createHttpServer(options: {
  isReady: () => Promise<boolean>;
  onRequest?: (status: number | null, durationMs: number, route: HttpRouteGroup) => void;
  readinessTimeoutMs?: number;
  handle?: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => Promise<void>;
}) {
  let pending: Promise<boolean> | undefined;
  const check = () => {
    pending ??= Promise.resolve()
      .then(options.isReady)
      .catch(() => false)
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
  const server = createServer({ maxHeaderSize: 8192 }, (request, response) => {
    const path = request.url?.split("?")[0];
    const onRequest = options.onRequest;
    if (onRequest) {
      const started = performance.now();
      const route = httpRouteGroup(path);
      response.once("finish", () => onRequest(response.statusCode, performance.now() - started, route));
      response.once("close", () => {
        if (!response.writableFinished) onRequest(null, performance.now() - started, route);
      });
    }
    const reply = (
      status: number,
      value: HealthResponse | { error: string },
    ) => {
      response
        .writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .end(JSON.stringify(value));
    };
    if (path !== "/health/live" && path !== "/health/ready") {
      if (options.handle) {
        void options.handle(request, response).catch(() => {
          if (!response.headersSent && !response.destroyed)
            reply(503, { error: "unavailable" });
          else response.destroy();
        });
        return;
      }
      request.resume();
      return reply(404, { error: "not_found" });
    }
    request.resume();
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return reply(405, { error: "method_not_allowed" });
    }
    if (path === "/health/live") return reply(200, { status: "alive" });
    void readiness(check, response, reply, options.readinessTimeoutMs ?? 1000);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  server.maxConnections = 128;
  server.maxRequestsPerSocket = 100;
  return server;
}

async function readiness(
  check: () => Promise<boolean>,
  response: ServerResponse,
  reply: (status: number, value: HealthResponse) => void,
  timeout: number,
) {
  let ready = false;
  let timer: NodeJS.Timeout | undefined;
  try {
    ready = await Promise.race([
      check(),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeout);
      }),
    ]);
  } catch {
    /* No connection strings or database errors in HTTP responses. */
  } finally {
    clearTimeout(timer);
  }
  if (!response.destroyed)
    reply(ready ? 200 : 503, { status: ready ? "ready" : "not_ready" });
}
