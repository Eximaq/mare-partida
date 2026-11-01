import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const { createSession } = require("../../apps/account-client/game-session.js");
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  let version = 0,
    fail = false;
  const requests: any[] = [],
    storage = new Map();
  const snapshot = () => ({
    state: { characterId: id, version, level: 1, experience: "20", gold: "8" },
    progression: { xpIntoLevel: "20", xpForNextLevel: "80" },
    journey: { started: true },
    hunt: { status: "claimed" },
    combat: { status: "available" },
    attributes: {
      allocated: {
        strength: 0,
        dexterity: 0,
        vitality: 0,
        intelligence: 0,
        spirit: 0,
      },
      available: 0,
    },
    inventory: { items: [], equipped: { weapon: null, armor: null } },
    itemCatalog: [],
  });
  const client = createSession({
    uuid: randomUUID,
    storage: {
      getItem: (k: string) => storage.get(k),
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
    fetch: async (path: string, o: any = {}) => {
      requests.push({ path, ...o });
      if (path === "/v1/me")
        return Response.json({
          account: { id: "a" },
          character: {
            id,
            name: "Fixture",
            classId: "sword",
            factionId: "pirate",
          },
        });
      if (path === "/v1/auth/csrf")
        return Response.json({ csrfToken: "fixture" });
      if (path.endsWith("/online-state")) return Response.json(snapshot());
      if (path.endsWith("/control"))
        return Response.json({ epoch: 1, token: "x".repeat(43) });
      if (path.endsWith("/commands")) {
        if (fail) throw new Error("lost reply");
        version++;
        return Response.json({});
      }
      if (path === "/v1/auth/logout")
        return new Response(null, { status: 204 });
      throw new Error(path);
    },
  });
  return {
    client,
    requests,
    storage,
    fail: () => {
      fail = true;
    },
    recover: () => {
      fail = false;
    },
  };
}
test("game session owns identity and economic commands; it stores only intent and never auth credentials", async () => {
  const f = fixture();
  await f.client.load();
  assert.equal(f.client.data.character.id, id);
  assert.equal(f.client.data.online.state.gold, "8");
  await f.client.acquire();
  await f.client.command("journey.begin", {});
  assert.equal(f.client.data.online.state.version, 1);
  const c = f.requests.find((r) => r.path.endsWith("/commands"));
  const body = JSON.parse(c.body);
  assert.equal(body.expectedVersion, 0);
  assert.equal(body.payload.accountId, undefined);
  assert.equal(f.storage.size, 0);
});
test("uncertain mutation requires explicit same-ID replay and never auto-posts during reload", async () => {
  const f = fixture();
  await f.client.load();
  await f.client.acquire();
  f.fail();
  await assert.rejects(f.client.command("combat.begin", {}));
  const saved = JSON.parse([...f.storage.values()][0]);
  assert.equal(JSON.stringify(saved).includes("token"), false);
  const posts = f.requests.filter((r) => r.path.endsWith("/commands")).length;
  await f.client.read();
  assert.equal(
    f.requests.filter((r) => r.path.endsWith("/commands")).length,
    posts,
  );
  f.recover();
  await f.client.resume();
  const calls = f.requests.filter((r) => r.path.endsWith("/commands"));
  assert.equal(
    JSON.parse(calls[0].body).requestId,
    JSON.parse(calls[1].body).requestId,
  );
  assert.equal(f.storage.size, 0);
});
test("session rejects client authority payloads and logout drops character and control", async () => {
  const f = fixture();
  await f.client.load();
  await f.client.acquire();
  await assert.rejects(
    f.client.command("inventory.buy", {
      itemId: "dock-scrap-v1",
      quantity: 1,
      price: 0,
    }),
  );
  await f.client.logout();
  assert.equal(f.client.data, null);
  assert.equal(f.client.controlled, false);
});

test("game projection removes offline starter rewards and uses only server HP, XP, gold and points", () => {
  const { project, derived } = require("../../apps/account-client/game-ui.js");
  const base = {
    name: "Local",
    gold: 120,
    potions: 4,
    materials: 3,
    inventory: [{ def: 8 }],
    equipment: { weapon: { def: 0 } },
    attributes: { strength: 999 },
    stats: { kills: 999 },
  };
  const fighter = {
    maxHp: 38,
    attackMin: 13,
    attackMax: 17,
    armor: 1,
    cooldownMs: 1860,
    total: {
      strength: 15,
      dexterity: 14,
      vitality: 9,
      intelligence: 6,
      spirit: 6,
    },
  };
  const data = {
    character: { id, name: "Online", classId: "sword", factionId: "pirate" },
    online: {
      state: { level: 2, experience: "80", gold: "8" },
      progression: { xpIntoLevel: "0", xpForNextLevel: "105" },
      attributes: {
        available: 5,
        allocated: {
          strength: 0,
          dexterity: 0,
          vitality: 0,
          intelligence: 0,
          spirit: 0,
        },
      },
      combatPreview: fighter,
      combat: {
        status: "active",
        encounterId: "fixture",
        fighter,
        playerHp: 7,
      },
    },
  };
  const g = project(base, data);
  assert.equal(g.name, "Online");
  assert.equal(g.gold, 8);
  assert.equal(g.hp, 7);
  assert.equal(g.potions, 0);
  assert.equal(g.materials, 0);
  assert.deepEqual(g.inventory, []);
  assert.equal(g.equipment.weapon, null);
  assert.equal(g.attributePoints, 5);
  assert.equal(g.stats.kills, 0);
  assert.equal(base.gold, 120);
  assert.equal(derived({ maxHP: 999 }, data).maxHP, 38);
});
