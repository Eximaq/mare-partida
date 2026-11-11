import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { requestMetrics } from "../../apps/game-server/src/metrics.js";

test("a stuck readiness probe times out and concurrent clients cannot multiply database probes", async (t) => {
  let calls = 0;
  let release!: (ready: boolean) => void;
  const pending = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  const server = createHttpServer({
    isReady: () => {
      calls++;
      return pending;
    },
    readinessTimeoutMs: 30,
  });
  t.after(() => {
    server.closeAllConnections();
    server.close();
    release(true);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const watchdog = setTimeout(() => server.closeAllConnections(), 1000);
  try {
    const responses = await Promise.all(
      Array.from({ length: 12 }, () => fetch(base + "/health/ready")),
    );
    assert.ok(responses.every((r) => r.status === 503));
    assert.equal(calls, 1);
    assert.equal((await fetch(base + "/health/live")).status, 200);
    assert.equal((await fetch(base + "/health/ready")).status, 503);
    assert.equal(calls, 1);
    release(true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await fetch(base + "/health/ready")).status, 200);
  } finally {
    clearTimeout(watchdog);
  }
});

test("liveness is independent of database; readiness fails closed without exposing errors", async (t) => {
  let ready = false;
  let failing = false;
  const server = createHttpServer({
    isReady: async () => {
      if (failing) throw new Error("postgresql://secret:private@host");
      return ready;
    },
  });
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const live = await fetch(`${base}/health/live`);
  assert.equal(live.status, 200);
  assert.equal(live.headers.get("cache-control"), "no-store");
  assert.equal(live.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await live.json(), { status: "alive" });
  assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  ready = true;
  assert.equal((await fetch(`${base}/health/ready`)).status, 200);
  failing = true;
  const unavailable = await fetch(`${base}/health/ready`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: "not_ready" });
});

test("HTTP serves no checkout files, mutation routes or WebSocket gameplay", async (t) => {
  const server = createHttpServer({ isReady: async () => true });
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const route of [
    "/.git/HEAD",
    "/.env",
    "/game.js",
    "/api/akuma/register",
    "/ws",
  ]) {
    assert.equal((await fetch(base + route)).status, 404);
  }
  const write = await fetch(`${base}/health/live`, {
    method: "POST",
    body: "{}",
  });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get("allow"), "GET");
});

test("HTTP records normalized routes and counts a closed response once", { timeout: 5000 }, async (t) => {
  const metrics = requestMetrics();
  let started!: () => void;
  const pending = new Promise<void>(resolve => { started = resolve; });
  let recordedAbort!: () => void;
  const aborted = new Promise<void>(resolve => { recordedAbort = resolve; });
  const server = createHttpServer({
    isReady: async () => true,
    onRequest(status, duration, route) {
      metrics.record(status, duration, route);
      if (status === null) recordedAbort();
    },
    async handle(request, response) {
      if (request.url?.includes("/online-state")) started();
      else response.end("ok");
    },
  });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const id = "11111111-1111-4111-8111-111111111111";
  await (await fetch(`${base}/v1/characters/${id}/frame?key=sensitive`)).text();
  const controller = new AbortController();
  const abandoned = fetch(`${base}/v1/characters/${id}/online-state`, { signal: controller.signal });
  await pending;
  controller.abort();
  await assert.rejects(abandoned, { name: "AbortError" });
  await aborted;
  const window = metrics.flush();
  assert.equal(window.requests, 1);
  assert.equal(window.aborted, 1);
  assert.equal(window.routes.frame?.requests, 1);
  assert.equal(window.routes.state?.aborted, 1);
  assert.doesNotMatch(JSON.stringify(window), /sensitive|11111111/);
});
