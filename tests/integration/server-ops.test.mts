import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";
import { authDatabase } from "./auth-support.mjs";
import { createHttpServer } from "../../apps/game-server/src/http.js";
test("local monitoring reports storage health and fails on a stale revocation without exposing its payload", async () =>
  authDatabase(async ({ pool }) => {
    const server = createHttpServer({ isReady: async () => true });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const run = () =>
      new Promise<{ code: number | null; data: any }>((resolve, reject) => {
        const child = spawn(process.execPath, ["tools/ops-probe.mts"], {
          env: {
            ...process.env,
            DATABASE_URL: pool.options.connectionString!,
            OPS_PORT: String((server.address() as AddressInfo).port),
            PG_DATA_FILESYSTEM: tmpdir(),
          },
          windowsHide: true,
        });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, data: JSON.parse(out) }));
      });
    try {
      const first = await run();
      assert.equal(first.code, first.data.ok ? 0 : 1);
      assert.equal(first.data.pendingRevocations, 0);
      assert.equal(first.data.event, "ops_probe");
      assert.ok(Number.isFinite(first.data.diskFreePercent));
      assert.ok(first.data.readinessMs < 1000);
      await pool.query(
        "INSERT INTO mare_game.provider_revocations(id,payload_ciphertext,scope,created_at) VALUES(gen_random_uuid(),'private-fixture','local',clock_timestamp()-interval '6 minutes')",
      );
      const second = await run();
      assert.equal(second.code, 1);
      assert.equal(second.data.pendingRevocations, 1);
      assert.ok(second.data.oldestRevocationSeconds >= 360);
      assert.equal(JSON.stringify(second).includes("private-fixture"), false);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }));
