import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase, placeAtMerchant } from "./auth-support.mjs";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
const require = createRequire(import.meta.url),
  forge = require("../../forge-system.js"),
  defs = getGameCatalog().items;
const gear = (def = 0, rarity = "common") =>
  forge.normalizeItem(
    {
      id: randomUUID(),
      def,
      rarity,
      level: 1,
      plus: 0,
      locked: false,
      obtainedAt: 1,
    },
    defs,
    () => 0,
  );
const pearl = () => ({
  id: randomUUID(),
  def: defs.findIndex((d) => d.pearlId === "pearl_for_1"),
  pearlId: "pearl_for_1",
  level: 1,
  plus: 0,
  locked: false,
  obtainedAt: 1,
  forgeVersion: 4,
});

async function fixture(run: (f: any) => Promise<void>) {
  await authDatabase(async ({ service, pool, vault, provider }) => {
    const a = await service.login(
      "original-inventory@example.invalid",
      "fixture",
    );
    const b = await service.login("other-inventory@example.invalid", "fixture");
    const c = await service.createCharacter(a.token, {
      name: "Original",
      classId: "sword",
      factionId: "pirate",
    });
    const lease = await service.acquireControl(a.token, c.id);
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
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const body = (action: string, payload: any = {}, expectedVersion = 0) => ({
      requestId: randomUUID(),
      action,
      payload,
      expectedVersion,
      control: { epoch: lease.epoch, token: lease.token },
    });
    const send = async (
      input: any,
      token = a.token,
      id = c.id,
      csrf = true,
    ) => {
      const r = await fetch(`${base}/v1/characters/${id}/commands`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://localhost:9443",
          cookie: `__Host-mare_session=${token}`,
          ...(csrf ? { "x-csrf-token": vault.csrf(token) } : {}),
        },
        body: JSON.stringify(input),
      });
      return { status: r.status, body: await r.json() };
    };
    const read = async () => service.onlineState(a.token, c.id) as Promise<any>;
    try {
      await run({
        a,
        b,
        c,
        lease,
        body,
        send,
        read,
        pool,
        service,
        vault,
        provider,
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
}

async function beginCanonicalCombat(f: any) {
  for (const [action, version] of [
    ["journey.begin", 1],
    ["hunt.begin", 2],
  ] as const)
    assert.equal((await f.send(f.body(action, {}, version))).status, 200);
  await f.pool.query(
    "UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds' WHERE character_id=$1",
    [f.c.id],
  );
  assert.equal((await f.send(f.body("hunt.claim", {}, 3))).status, 200);
  assert.equal((await f.send(f.body("combat.begin", {}, 4))).status, 200);
}

test("canonical inventory converts owned alpha copies once, preserves gold/XP and archives the original data", async () =>
  fixture(async (f) => {
    await f.pool.query(
      "UPDATE mare_game.character_progression SET gold=77 WHERE character_id=$1",
      [f.c.id],
    );
    await f.pool.query(
      "INSERT INTO mare_game.character_inventory VALUES($1,'training-weapon-v1',2),($1,'dock-vest-v1',1),($1,'dock-scrap-v1',5)",
      [f.c.id],
    );
    await f.pool.query(
      "INSERT INTO mare_game.character_equipment VALUES($1,'weapon','training-weapon-v1')",
      [f.c.id],
    );
    const input = f.body("items.initialize");
    const accepted = await f.send(input);
    assert.equal(accepted.status, 200);
    assert.deepEqual(
      await f.send(input),
      accepted,
      "lost responses replay the same receipt",
    );
    const o = await f.read(),
      i = o.originalInventory;
    assert.equal(o.state.gold, "77");
    assert.equal(o.state.experience, "0");
    assert.equal(o.state.version, 1);
    assert.equal(i.catalogId, "original-game-v1");
    assert.equal(Object.keys(i.equipment).length, 13);
    assert.equal(i.equipment.visual_completo,null);
    assert.equal(i.equipment.weapon.def, 0);
    assert.equal(i.inventory.length, 3);
    assert.equal(i.inventory.filter((x: any) => x.def === 0).length, 1);
    assert.equal(i.inventory.filter((x: any) => x.def === 6).length, 1);
    assert.equal(i.potions, 4);
    assert.equal(i.materials, 8);
    assert.equal(
      new Set(
        [...i.inventory, ...Object.values(i.equipment).filter(Boolean)].map(
          (x: any) => x.id,
        ),
      ).size,
      4,
    );
    assert.equal((await f.send(f.body("items.initialize", {}, 1))).status, 409);
    assert.equal(
      (
        await f.send(
          f.body(
            "inventory.sell",
            { itemId: "training-weapon-v1", quantity: 1 },
            1,
          ),
        )
      ).status,
      409,
      "old economy must not be usable after conversion",
    );
    assert.equal(
      (
        await f.pool.query(
          "SELECT quantity FROM mare_game.character_inventory WHERE character_id=$1 AND item_id=$2",
          [f.c.id, "training-weapon-v1"],
        )
      ).rows[0].quantity,
      2,
    );
    assert.ok(
      (
        await f.pool.query(
          "SELECT alpha_snapshot FROM mare_game.game_inventory WHERE character_id=$1",
          [f.c.id],
        )
      ).rows[0].alpha_snapshot,
    );
  }));

test("fresh original starter kit is granted exactly once and purchase replay cannot debit or mint twice", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    let o = await f.read();
    assert.equal(o.state.gold, "120");
    assert.equal(o.originalInventory.inventory.length, 1);
    await placeAtMerchant(f.pool, f.c.id);
    const purchase = f.body("potions.buy", {}, 1),
      responses = await Promise.all([f.send(purchase), f.send(purchase)]);
    assert.equal(responses[0].status, 200);
    assert.deepEqual(responses[0], responses[1]);
    o = await f.read();
    assert.equal(o.state.gold, "85");
    assert.equal(o.originalInventory.potions, 5);
    const raced = await Promise.all([
      f.send(f.body("potions.buy", {}, 2)),
      f.send(f.body("potions.buy", {}, 2)),
    ]);
    assert.deepEqual(raced.map((x: any) => x.status).sort(), [200, 409]);
    o = await f.read();
    assert.equal(o.state.gold, "50");
    assert.equal(o.originalInventory.potions, 6);
    for (const payload of [
      { price: 0 },
      { quantity: -1 },
      { gold: 99999 },
      { accountId: f.c.id },
    ])
      assert.equal(
        (await f.send(f.body("potions.buy", payload, 3))).status,
        400,
      );
  }));

test("merchant gates potion purchases and Mana restores 25 percent with the shared four-second cooldown", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    for (const payload of [{}, {kind: "mana", quantity: 2}])
      assert.deepEqual(await f.send(f.body("potions.buy", payload, 1)), {
        status: 409, body: {error: "merchant_out_of_range"},
      });
    await placeAtMerchant(f.pool, f.c.id);
    const purchase = f.body("potions.buy", {kind: "mana", quantity: 2}, 1);
    const receipt = await f.send(purchase);
    assert.equal(receipt.status, 200);
    assert.deepEqual(await f.send(purchase), receipt);
    let current = await f.read();
    assert.equal(current.state.gold, "50");
    assert.equal(current.originalInventory.manaPotions, 2);
    assert.equal(current.originalInventory.potions, 4);
    const event = (await f.pool.query(
      "SELECT gold_delta,outcome FROM mare_game.game_inventory_events WHERE character_id=$1 AND request_id=$2",
      [f.c.id,purchase.requestId],
    )).rows[0];
    assert.equal(String(event.gold_delta), "-70");
    assert.deepEqual(event.outcome, {itemId: "mana-potion", quantity: 2, unitPrice: 35});
    assert.deepEqual(await f.send(f.body("potions.buy", {kind: "mana", quantity: 2}, 2)), {
      status: 409, body: {error: "gold_insufficient"},
    });
    assert.equal((await f.send(f.body("battle.start", {}, 2))).status, 200);
    const simulation = async () => (await f.pool.query(
      "SELECT simulation FROM mare_game.character_battles WHERE character_id=$1", [f.c.id],
    )).rows[0].simulation;
    const maxEnergy = (await simulation()).energy;
    await f.pool.query(
      "UPDATE mare_game.character_battles SET simulation=simulation||'{\"hp\":1,\"energy\":1}'::jsonb WHERE character_id=$1", [f.c.id],
    );
    const consume = f.body("potions.use", {kind: "mana"}, 3);
    const consumed = await f.send(consume);
    assert.equal(consumed.status, 200);
    assert.deepEqual(await f.send(consume), consumed);
    current = await f.read();
    const restored = await simulation();
    assert.equal(restored.energy, 1 + Math.round(maxEnergy * 0.25));
    assert.equal(restored.hp, 1);
    assert.equal(current.originalInventory.manaPotions, 1);
    assert.equal(current.originalInventory.potions, 4);
    for (const kind of ["mana", "health"])
      assert.deepEqual(await f.send(f.body("potions.use", {kind}, 4)), {
        status: 409, body: {error: "potion_cooldown"},
      });
    await f.pool.query(
      "UPDATE mare_game.character_battles SET simulation=simulation||jsonb_build_object('potionReadyAt',1,'energy',$2::float8) WHERE character_id=$1",
      [f.c.id, maxEnergy - 1],
    );
    assert.equal((await f.send(f.body("potions.use", {kind: "mana"}, 4))).status, 200);
    assert.equal((await simulation()).energy, maxEnergy);
    current = await f.read();
    assert.equal(current.state.gold, "50");
    assert.equal(current.originalInventory.manaPotions, 0);
  }));

test("original equip, lock, sale and unequip are owned-instance operations with original prices", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const boots = (await f.read()).originalInventory.inventory[0];
    assert.equal(
      (await f.send(f.body("items.equip", { itemId: boots.id }, 1))).status,
      200,
    );
    let o = await f.read();
    assert.equal(o.originalInventory.equipment.boots.id, boots.id);
    assert.equal(o.originalInventory.inventory.length, 0);
    assert.equal(
      (await f.send(f.body("items.sell", { itemId: boots.id }, 2))).status,
      409,
    );
    assert.equal(
      (await f.send(f.body("items.unequip", { slot: "boots" }, 2))).status,
      200,
    );
    assert.equal(
      (
        await f.send(
          f.body("items.lock", { itemId: boots.id, locked: true }, 3),
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.send(f.body("items.sell", { itemId: boots.id }, 4))).status,
      409,
    );
    assert.equal(
      (
        await f.send(
          f.body("items.lock", { itemId: boots.id, locked: false }, 4),
        )
      ).status,
      200,
    );
    const sale = f.body("items.sell", { itemId: boots.id }, 5);
    assert.equal((await f.send(sale)).status, 200);
    assert.equal((await f.send(sale)).status, 200);
    o = await f.read();
    assert.equal(o.state.gold, "141", "14 + level1*7 + plus0*18 = 21");
    assert.equal(o.originalInventory.inventory.length, 0);
    const event = (
      await f.pool.query(
        "SELECT before_hash,after_hash FROM mare_game.game_inventory_events WHERE character_id=$1 AND action='items.sell'",
        [f.c.id],
      )
    ).rows[0];
    assert.notEqual(
      event.before_hash,
      event.after_hash,
      "audit must hash the unmodified pre-sale inventory",
    );
    for (const payload of [
      { itemId: boots.id, price: 999 },
      { itemId: boots.id, ownerId: f.c.id },
    ])
      assert.equal(
        (await f.send(f.body("items.sell", payload, 6))).status,
        400,
      );
    assert.equal(
      (await f.send(f.body("items.equip", { itemId: randomUUID() }, 6))).status,
      404,
    );
    assert.equal(
      (await f.send(f.body("items.unequip", { slot: "armor" }, 6))).status,
      400,
    );
    assert.equal(
      (
        await f.send(
          f.body("items.lock", { itemId: boots.id, locked: true }, 6),
          f.b.token,
        )
      ).status,
      404,
    );
    assert.equal(
      (await f.send(f.body("potions.buy", {}, 6), f.a.token, f.c.id, false))
        .status,
      403,
    );
  }));

test("original forge uses persisted gear and server costs, is replay-safe, and rolls back failed operations", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const item = (await f.read()).originalInventory.equipment.weapon;
    const upgrade = f.body(
      "forge.execute",
      { operation: { type: "upgrade", itemId: item.id, expectedSeq: 0 } },
      1,
    );
    assert.equal((await f.send(upgrade)).status, 200);
    assert.equal((await f.send(upgrade)).status, 200);
    let o = await f.read();
    assert.equal(o.state.gold, "70");
    assert.equal(o.originalInventory.materials, 1);
    assert.equal(o.originalInventory.forgeSeq, 1);
    assert.equal(o.originalInventory.equipment.weapon.plus, 1);
    const before = JSON.stringify([o.state, o.originalInventory]);
    assert.equal(
      (
        await f.send(
          f.body(
            "forge.execute",
            { operation: { type: "upgrade", itemId: item.id, expectedSeq: 1 } },
            2,
          ),
        )
      ).status,
      409,
    );
    const after = await f.read();
    assert.equal(
      JSON.stringify([after.state, after.originalInventory]),
      before,
      "insufficient resources roll back the entire transaction",
    );
    for (const extra of [
      { random: 0 },
      { gold: 0 },
      { now: 0 },
      { success: true },
    ])
      assert.equal(
        (
          await f.send(
            f.body(
              "forge.execute",
              {
                operation: {
                  type: "upgrade",
                  itemId: item.id,
                  expectedSeq: 1,
                  ...extra,
                },
              },
              2,
            ),
          )
        ).status,
        400,
      );
    assert.equal(
      (
        await f.send({
          ...upgrade,
          payload: {
            operation: {
              type: "upgrade",
              itemId: randomUUID(),
              expectedSeq: 0,
            },
          },
        })
      ).status,
      409,
      "reused request ID cannot change intent",
    );
  }));

test("oversized conversion refuses without truncating items, granting a kit or changing progression", async () =>
  fixture(async (f) => {
    await f.pool.query(
      "INSERT INTO mare_game.character_inventory VALUES($1,'training-weapon-v1',122)",
      [f.c.id],
    );
    const before = await f.read();
    assert.equal((await f.send(f.body("items.initialize"))).status, 409);
    const after = await f.read();
    assert.deepEqual(after.state, before.state);
    assert.equal(after.originalInventory, undefined);
    assert.equal(
      (
        await f.pool.query(
          "SELECT quantity FROM mare_game.character_inventory WHERE character_id=$1",
          [f.c.id],
        )
      ).rows[0].quantity,
      122,
    );
  }));

test("potion heals 25 percent of server HP, clamps at max, preserves attack timing and consumes once", async () =>
  fixture(async (f) => {
    const init = f.body("items.initialize");
    assert.equal((await f.send(init)).status, 200);
    await beginCanonicalCombat(f);
    const o = await f.read(),
      fighter = o.combatPreview;
    await f.pool.query(
      "UPDATE mare_game.combat_encounters SET player_hp=25,next_attack_at=clock_timestamp()+interval '10 seconds' WHERE character_id=$1",
      [f.c.id],
    );
    const before = (await f.read()).combat.nextAttackAt;
    const use = f.body("potions.use", {}, 5);
    assert.equal((await f.send(use)).status, 200);
    assert.equal((await f.send(use)).status, 200);
    const after = await f.read();
    assert.equal(after.originalInventory.potions, 3);
    assert.equal(
      after.combat.playerHp,
      Math.min(fighter.maxHp, 25 + Math.round(fighter.maxHp * 0.25)),
    );
    assert.equal(after.combat.nextAttackAt, before);
    assert.equal(after.combat.turn, 0);
    await f.pool.query(
      "UPDATE mare_game.combat_encounters SET player_hp=player_max_hp WHERE character_id=$1",
      [f.c.id],
    );
    assert.equal((await f.send(f.body("potions.use", {}, 6))).status, 409);
    assert.equal((await f.read()).originalInventory.potions, 3);
  }));

test("combat rewards credit materials to canonical inventory and never write the archived alpha stacks", async () =>
  fixture(async (f) => {
    const init = f.body("items.initialize");
    assert.equal((await f.send(init)).status, 200);
    await beginCanonicalCombat(f);
    await f.pool.query(
      "UPDATE mare_game.combat_encounters SET enemy_hp=0,phase='won',turn=1 WHERE character_id=$1",
      [f.c.id],
    );
    const claim = f.body("combat.claim", {}, 5);
    assert.equal((await f.send(claim)).status, 200);
    assert.equal((await f.send(claim)).status, 200);
    const o = await f.read();
    assert.equal(o.state.gold, "140");
    assert.equal(o.originalInventory.materials, 4);
    assert.equal(o.inventory.items.length, 0);
  }));

test("original sockets and reforge charge original costs and preserve unaffected lines", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const weapon = gear(0, "rare"),
      p = pearl();
    await f.pool.query(
      "UPDATE mare_game.game_inventory SET inventory=$2::jsonb,equipment=jsonb_set(equipment,'{weapon}',$3::jsonb),materials=100 WHERE character_id=$1",
      [f.c.id, JSON.stringify([p]), JSON.stringify(weapon)],
    );
    await f.pool.query(
      "UPDATE mare_game.character_progression SET gold=500 WHERE character_id=$1",
      [f.c.id],
    );
    const send = async (operation: any, version: number) =>
      f.send(f.body("forge.execute", { operation }, version));
    assert.equal(
      (
        await send(
          {
            type: "imbue",
            itemId: weapon.id,
            pearlItemId: p.id,
            socket: 0,
            expectedSeq: 0,
          },
          1,
        )
      ).status,
      200,
    );
    let o = await f.read();
    assert.equal(o.originalInventory.inventory.length, 0);
    assert.equal(
      o.originalInventory.equipment.weapon.sockets[0],
      "pearl_for_1",
    );
    assert.equal(o.state.gold, "500");
    assert.equal(
      (
        await send(
          { type: "remove", itemId: weapon.id, socket: 0, expectedSeq: 1 },
          2,
        )
      ).status,
      200,
    );
    o = await f.read();
    assert.equal(o.state.gold, "428");
    assert.equal(o.originalInventory.inventory.length, 1);
    assert.equal(o.originalInventory.equipment.weapon.sockets[0], null);
    const unchanged = o.originalInventory.equipment.weapon.extras.slice(1);
    assert.equal(
      (
        await send(
          { type: "reforgeLine", itemId: weapon.id, line: 0, expectedSeq: 2 },
          3,
        )
      ).status,
      200,
    );
    o = await f.read();
    assert.equal(o.state.gold, "362");
    assert.equal(o.originalInventory.materials, 97);
    assert.deepEqual(
      o.originalInventory.equipment.weapon.extras.slice(1),
      unchanged,
    );
    assert.equal(
      (await send({ type: "reforge", itemId: weapon.id, expectedSeq: 3 }, 4))
        .status,
      200,
    );
    o = await f.read();
    assert.equal(o.state.gold, "171");
    assert.equal(o.originalInventory.materials, 91);
    assert.equal(o.originalInventory.equipment.weapon.reforgeAttempts, 2);
  }));

test("equipment and pearl fusion consume five owned instances with their original costs and outcomes", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const five = Array.from({ length: 5 }, () => gear()),
      pearls = Array.from({ length: 5 }, pearl);
    await f.pool.query(
      "UPDATE mare_game.game_inventory SET inventory=$2::jsonb,materials=100 WHERE character_id=$1",
      [f.c.id, JSON.stringify([...five, ...pearls])],
    );
    await f.pool.query(
      "UPDATE mare_game.character_progression SET gold=500 WHERE character_id=$1",
      [f.c.id],
    );
    const fusion = f.body(
      "forge.execute",
      {
        operation: {
          type: "fuseEquipment",
          itemIds: five.map((x) => x.id),
          slot: "weapon",
          expectedSeq: 0,
        },
      },
      1,
    );
    assert.equal((await f.send(fusion)).status, 200);
    assert.equal((await f.send(fusion)).status, 200);
    let o = await f.read();
    assert.equal(o.state.gold, "337");
    assert.equal(o.originalInventory.materials, 96);
    const output = o.originalInventory.inventory.find((x: any) => !x.pearlId);
    assert.equal(output.rarity, "uncommon");
    assert.equal(output.def, 0);
    assert.equal(output.level, 1);
    assert.equal(o.originalInventory.inventory.length, 6);
    const fusePearls = f.body(
      "forge.execute",
      {
        operation: {
          type: "fuse",
          itemIds: pearls.map((x) => x.id),
          expectedSeq: 1,
        },
      },
      2,
    );
    assert.equal((await f.send(fusePearls)).status, 200);
    assert.equal((await f.send(fusePearls)).status, 200);
    o = await f.read();
    assert.equal(o.state.gold, "297");
    const success = o.originalInventory.forgeHistory.at(-1).success;
    assert.equal(typeof success, "boolean");
    assert.equal(o.originalInventory.inventory.length, success ? 2 : 1);
    assert.equal(
      o.originalInventory.inventory.some((x: any) =>
        pearls.some((p) => p.id === x.id),
      ),
      false,
    );
    if (success)
      assert.equal(
        o.originalInventory.inventory.find((x: any) => x.pearlId).pearlId,
        "pearl_for_2",
      );
    assert.equal(
      (
        await f.send(
          f.body(
            "forge.execute",
            {
              operation: {
                type: "fuse",
                itemIds: Array(5).fill(output.id),
                expectedSeq: 2,
              },
            },
            3,
          ),
        )
      ).status,
      400,
    );
  }));

test("a full original bag permits a swap, rejects unequip and enforces class compatibility", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const bag = [gear(2), ...Array.from({ length: 119 }, () => gear())];
    await f.pool.query(
      "UPDATE mare_game.game_inventory SET inventory=$2::jsonb WHERE character_id=$1",
      [f.c.id, JSON.stringify(bag)],
    );
    assert.equal(
      (await f.send(f.body("items.unequip", { slot: "weapon" }, 1))).status,
      409,
    );
    assert.equal(
      (await f.send(f.body("items.equip", { itemId: bag[0].id }, 1))).status,
      409,
    );
    assert.equal(
      (await f.send(f.body("items.equip", { itemId: bag[1].id }, 1))).status,
      200,
    );
    const o = await f.read();
    assert.equal(o.originalInventory.inventory.length, 120);
    assert.equal(o.originalInventory.equipment.weapon.id, bag[1].id);
  }));

test("a late SQL failure rolls back wallet, inventory, version, journal and receipt together", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const before = await f.read();
    await f.pool.query(
      "CREATE FUNCTION mare_game.fail_inventory_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated rollback fixture'; END $$; CREATE TRIGGER fail_inventory_fixture BEFORE INSERT ON mare_game.game_inventory_events FOR EACH ROW EXECUTE FUNCTION mare_game.fail_inventory_fixture()",
    );
    await placeAtMerchant(f.pool, f.c.id);
    const input = f.body("potions.buy", {kind: "mana"}, 1);
    assert.equal((await f.send(input)).status, 503);
    const after = await f.read();
    assert.deepEqual(
      [after.state, after.originalInventory],
      [before.state, before.originalInventory],
    );
    assert.equal(
      (
        await f.pool.query(
          "SELECT count(*)::int AS n FROM mare_game.character_commands WHERE character_id=$1 AND request_id=$2",
          [f.c.id, input.requestId],
        )
      ).rows[0].n,
      0,
    );
  }));

test("runtime can execute original inventory commands but cannot rewrite its migration snapshot or immutable journal", async () =>
  fixture(async (f) => {
    const role = "inv_" + randomUUID().replaceAll("-", ""),
      password = randomUUID().replaceAll("-", "");
    await f.pool.query(
      `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
    );
    let runtime: pg.Pool | undefined;
    try {
      const grants = await readFile(
        new URL("../../infra/postgres/grant-auth.sql", import.meta.url),
        "utf8",
      );
      await f.pool.query(grants.replaceAll("mare_runtime", `"${role}"`));
      const url = new URL(f.pool.options.connectionString);
      url.username = role;
      url.password = password;
      runtime = new pg.Pool({ connectionString: url.toString(), max: 2 });
      const service = new AuthService({
        pool: runtime,
        provider: f.provider,
        vault: f.vault,
        policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 },
        origin: "https://localhost:9443",
      });
      await service.command(f.a.token, f.c.id, f.body("items.initialize"));
      await placeAtMerchant(f.pool, f.c.id);
      const purchase = f.body("potions.buy", {kind: "mana"}, 1);
      await service.command(f.a.token, f.c.id, purchase);
      assert.equal(
        (await service.onlineState(f.a.token, f.c.id)).state.gold,
        "85",
      );
      for (const sql of [
        "DELETE FROM mare_game.game_inventory",
        "UPDATE mare_game.game_inventory SET alpha_snapshot='{}'",
        "UPDATE mare_game.game_inventory SET initialized_request_id=gen_random_uuid()",
        "UPDATE mare_game.game_inventory SET created_at=now()",
        "DELETE FROM mare_game.game_inventory_events",
        "UPDATE mare_game.game_inventory_events SET gold_delta=999",
      ])
        await assert.rejects(runtime.query(sql), { code: "42501" });
      await assert.rejects(
        runtime.query(
          "INSERT INTO mare_game.character_inventory VALUES($1,'training-weapon-v1',1)",
          [f.c.id],
        ),
        { code: "23514" },
      );
    } finally {
      await runtime?.end();
      await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);
    }
  }));

test("valid session and control for another owned character cannot equip or forge an instance from account A", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    const item = (await f.read()).originalInventory.inventory[0];
    const c = await f.service.createCharacter(f.b.token, {
        name: "Other",
        classId: "sword",
        factionId: "pirate",
      }),
      control = await f.service.acquireControl(f.b.token, c.id);
    const bBody = (action: string, payload: any, version = 1) => ({
      ...f.body(action, payload, version),
      control: { epoch: control.epoch, token: control.token },
    });
    assert.equal(
      (await f.send(bBody("items.initialize", {}, 0), f.b.token, c.id)).status,
      200,
    );
    for (const action of ["items.equip", "items.sell", "items.lock"]) {
      const payload = {
        itemId: item.id,
        ...(action === "items.lock" ? { locked: true } : {}),
      };
      const denied = await f.send(bBody(action, payload), f.b.token, c.id);
      assert.deepEqual(denied, {
        status: 404,
        body: { error: "item_not_found" },
      });
    }
    const otherForge = await f.send(
      bBody("forge.execute", {
        operation: { type: "upgrade", itemId: item.id, expectedSeq: 0 },
      }),
      f.b.token,
      c.id,
    );
    assert.deepEqual(otherForge, {
      status: 409,
      body: { error: "forge_operation_rejected" },
    });
    assert.equal((await f.read()).originalInventory.inventory[0].id, item.id);
  }));
test("a full potion stock refuses purchase as a conflict and preserves the wallet", async () =>
  fixture(async (f) => {
    assert.equal((await f.send(f.body("items.initialize"))).status, 200);
    await f.pool.query(
      "UPDATE mare_game.game_inventory SET potions=1000000000 WHERE character_id=$1",
      [f.c.id],
    );
    await placeAtMerchant(f.pool, f.c.id);
    assert.equal((await f.send(f.body("potions.buy", {}, 1))).status, 409);
    assert.equal((await f.read()).state.gold, "120");
  }));
