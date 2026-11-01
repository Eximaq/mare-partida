import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { authDatabase } from "./auth-support.mjs";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
const { createSession } = createRequire(import.meta.url)(
  "../../apps/account-client/game-session.js",
);
test("actual game client uses BFF cookies, persists economy, replays a lost committed reply, fences controllers and logs out", async () =>
  authDatabase(async ({ pool, service, vault }) => {
    const login = await service.login("game-client@example.invalid", "fixture");
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
      storage = new Map();
    let lose = false,
      posts = 0;
    const make = (token: string) => {
      const cookies = new Map([["__Host-mare_session", token]]);
      // Internal HTTP fixture only; browser cookie flags are checked by gateway tests.
      return createSession({
        storage: {
          getItem: (k: string) => storage.get(k),
          setItem: (k: string, v: string) => storage.set(k, v),
          removeItem: (k: string) => storage.delete(k),
        },
        fetch: async (path: string, options: any = {}) => {
          const response = await fetch(base + path, {
            ...options,
            headers: {
              ...options.headers,
              origin: "https://localhost:9443",
              cookie: [...cookies].map(([k, v]) => k + "=" + v).join("; "),
            },
          });
          for (const cookie of response.headers.getSetCookie()) {
            const first = cookie.split(";")[0]!,
              at = first.indexOf("=");
            if (/Max-Age=0/.test(cookie)) cookies.delete(first.slice(0, at));
            else cookies.set(first.slice(0, at), first.slice(at + 1));
          }
          if (path.endsWith("/commands")) {
            posts++;
            if (lose) {
              lose = false;
              await response.text();
              throw new Error("Committed reply lost");
            }
          }
          return response;
        },
      });
    };
    try {
      const client = make(login.token);
      await client.load();
      assert.equal(client.data.character, null);
      await client.api("/v1/characters", {
        name: "Connected",
        classId: "sword",
        factionId: "pirate",
      });
      await client.load();
      const id = client.data.character.id;
      await pool.query(
        "UPDATE mare_game.character_progression SET gold=60 WHERE character_id=$1",
        [id],
      );
      await client.read();
      await client.acquire();
      await client.command("inventory.buy", {
        itemId: "training-weapon-v1",
        quantity: 1,
      });
      assert.equal(client.data.online.state.gold, "30");
      const reloaded = make(login.token);
      const before = posts;
      await reloaded.load();
      assert.equal(posts, before);
      assert.equal(reloaded.data.online.inventory.items[0].quantity, 1);
      await reloaded.acquire(true);
      await assert.rejects(
        client.command("equipment.equip", { itemId: "training-weapon-v1" }),
        { code: "control_conflict" },
      );
      lose = true;
      await assert.rejects(
        reloaded.command("equipment.equip", { itemId: "training-weapon-v1" }),
      );
      assert.ok(reloaded.pending);
      assert.equal(
        reloaded.data.online.inventory.equipped.weapon,
        "training-weapon-v1",
      );
      await reloaded.resume();
      assert.equal(reloaded.pending, null);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int n FROM mare_game.inventory_ledger WHERE event='equip'",
          )
        ).rows[0].n,
        1,
      );
      const other = await service.login(
          "game-other@example.invalid",
          "fixture",
        ),
        otherClient = make(other.token);
      await otherClient.load();
      await assert.rejects(
        otherClient.api(`/v1/characters/${id}/online-state`),
        { code: "character_not_found" },
      );
      await reloaded.logout();
      assert.equal(reloaded.data, null);
      await assert.rejects(reloaded.read(), {
        code: "authentication_required",
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }));
