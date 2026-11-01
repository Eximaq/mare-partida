import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { authDatabase } from "./auth-support.mjs";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
test("bounded local HTTP load preserves economic invariants across 12 independent characters", async () =>
  authDatabase(async ({ pool, service, vault }) => {
    const users = [];
    for (let i = 0; i < 12; i++) {
      const s = await service.login(`load-${i}@example.invalid`, "fixture"),
        c = await service.createCharacter(s.token, {
          name: `Load ${i}`,
          classId: "sword",
          factionId: "pirate",
        }),
        control = await service.acquireControl(s.token, c.id);
      await pool.query(
        "UPDATE mare_game.character_progression SET gold=60 WHERE character_id=$1",
        [c.id],
      );
      users.push({ s, c, control });
    }
    const server = createHttpServer({
      isReady: async () => true,
      handle: createAuthHandler({
        service,
        vault,
        origin: "https://localhost:9443",
        cookieSeconds: 3600,
      }),
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      times: number[] = [];
    try {
      await Promise.all(
        users.map(async ({ s, c, control }) => {
          for (let version = 0; version < 10; version++) {
            const started = performance.now(),
              r = await fetch(`${base}/v1/characters/${c.id}/commands`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  origin: "https://localhost:9443",
                  cookie: `__Host-mare_session=${s.token}`,
                  "x-csrf-token": vault.csrf(s.token),
                },
                body: JSON.stringify({
                  requestId: randomUUID(),
                  expectedVersion: version,
                  action: version % 2 ? "inventory.sell" : "inventory.buy",
                  payload: { itemId: "dock-scrap-v1", quantity: 1 },
                  control: { epoch: control.epoch, token: control.token },
                }),
              });
            assert.equal(r.status, 200);
            assert.equal((await r.json()).state.version, version + 1);
            times.push(performance.now() - started);
          }
          const state = await service.onlineState(s.token, c.id);
          assert.equal(state.state.gold, "55");
          assert.deepEqual(state.inventory.items, []);
        }),
      );
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int n FROM mare_game.inventory_ledger",
          )
        ).rows[0].n,
        120,
      );
      times.sort((a, b) => a - b);
      const p95 = Math.round(times[Math.floor(times.length * 0.95)]!);
      assert.ok(p95 < 5000, "Local p95 must remain below the request deadline");
      console.log(
        JSON.stringify({
          event: "local_load_result",
          clients: 12,
          commands: 120,
          errors: 0,
          p95Ms: p95,
          maxMs: Math.round(times.at(-1)!),
        }),
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }));
