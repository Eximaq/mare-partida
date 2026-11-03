import { test } from "node:test";
import assert from "node:assert/strict";
import { requestMetrics } from "../../apps/game-server/src/metrics.js";
test("operational windows aggregate errors and throttling without identifiers, and reset without growing history", () => {
  const m = requestMetrics();
  m.record(200, 10);
  m.record(503, 30);
  m.record(429, 20);
  assert.deepEqual(m.flush(), {
    event: "http_window",
    requests: 3,
    errors: 1,
    limited: 1,
    meanMs: 20,
    maxMs: 30,p50Ms:25,p95Ms:50,p99Ms:50,
  });
  assert.deepEqual(m.flush(), {
    event: "http_window",
    requests: 0,
    errors: 0,
    limited: 0,
    meanMs: 0,
    maxMs: 0,p50Ms:0,p95Ms:0,p99Ms:0,
  });
});
