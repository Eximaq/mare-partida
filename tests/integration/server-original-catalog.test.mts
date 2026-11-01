import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { authDatabase } from "./auth-support.mjs";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
test("original catalog is complete, read-only and scoped by authenticated character ownership", async () =>
  authDatabase(async ({ service, pool, vault }) => {
    const login = await service.login("catalog@example.invalid", "fixture"),
      other = await service.login("catalog-other@example.invalid", "fixture");
    const c = await service.createCharacter(login.token, {
      name: "Catalog",
      classId: "sword",
      factionId: "pirate",
    });
    const before = (
      await pool.query(
        "SELECT state_version FROM mare_game.characters WHERE id=$1",
        [c.id],
      )
    ).rows[0].state_version;
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
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const get = (token = login.token, query = "", method = "GET") =>
      fetch(`${base}/v1/characters/${c.id}/game-catalog${query}`, {
        method,
        headers: token ? { cookie: `__Host-mare_session=${token}` } : {},
      });
    try {
      assert.equal((await get("")).status, 401);
      assert.equal((await get(other.token)).status, 404);
      const response = await get();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const catalog = await response.json();
      assert.equal(catalog.items.length, 103);
      assert.equal(catalog.slots.length, 12);
      assert.equal(catalog.items[67].name, "Katana da Maelstrom");
      assert.equal(catalog.items[67].defIndex, 67);
      assert.equal(
        catalog.rulesHash,
        "3f54745b49aa5fae5818c250330ec959d2301e1c973a2abd538c77f2f118ce6a",
      );
      assert.equal((await get(login.token, "?ownerId=forged")).status, 400);
      assert.equal((await get(login.token, "", "POST")).status, 405);
      const denied = await get(other.token);
      assert.deepEqual(await denied.json(), { error: "character_not_found" });
      assert.equal(
        (
          await pool.query(
            "SELECT state_version FROM mare_game.characters WHERE id=$1",
            [c.id],
          )
        ).rows[0].state_version,
        before,
        "catalog reads never mutate progression",
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }));
