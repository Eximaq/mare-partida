import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";
async function fixture(service: any, pool: any) {
  const session = await service.login("inventory@example.invalid", "fixture"),
    character = await service.createCharacter(session.token, {
      name: "Inventory",
      classId: "sword",
      factionId: "pirate",
    });
  const lease = await service.acquireControl(session.token, character.id);
  await pool.query(
    "UPDATE mare_game.character_progression SET gold=60 WHERE character_id=$1",
    [character.id],
  );
  const input = (action: string, payload: any, expectedVersion = 0) => ({
    requestId: randomUUID(),
    action,
    payload,
    expectedVersion,
    control: { epoch: lease.epoch, token: lease.token },
  });
  const send = (c: any) => service.command(session.token, character.id, c);
  return { session, character, lease, input, send };
}
test("inventory HTTP uses server prices, equips owned items, and refuses forged gold/ownership and selling equipped copies", async () =>
  authDatabase(async ({ service, pool, vault }) => {
    const f = await fixture(service, pool),
      server = createHttpServer({
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
    const send = (body: any, token = f.session.token, id = f.character.id) =>
      fetch(`${base}/v1/characters/${id}/commands`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://localhost:9443",
          cookie: `__Host-mare_session=${token}`,
          "x-csrf-token": vault.csrf(token),
        },
        body: JSON.stringify(body),
      });
    try {
      const command = f.input("inventory.buy", {
          itemId: "training-weapon-v1",
          quantity: 1,
        }),
        response = await send(command);
      assert.equal(response.status, 200);
      const bought = await response.json();
      assert.equal(bought.state.gold, "30");
      assert.deepEqual(bought.inventory.items, [
        { itemId: "training-weapon-v1", quantity: 1 },
      ]);
      assert.equal(bought.state.version, 1);
      assert.deepEqual(await (await send(command)).json(), bought);
      for (const forged of [
        { ...command, accountId: randomUUID() },
        { ...command, payload: { ...command.payload, price: 0 } },
        { ...command, payload: { ...command.payload, gold: 999 } },
        { ...command, payload: { ...command.payload, ownerId: randomUUID() } },
        { ...command, payload: { itemId: "training-weapon-v1", quantity: -1 } },
        {
          ...command,
          payload: { itemId: "training-weapon-v1", quantity: 1.5 },
        },
        { ...command, payload: { itemId: "missing", quantity: 1 } },
      ])
        assert.equal((await send(forged)).status, 400);
      const equipped = await f.send(
        f.input("equipment.equip", { itemId: "training-weapon-v1" }, 1),
      );
      assert.equal(equipped.inventory.equipped.weapon, "training-weapon-v1");
      const view: any = await service.onlineState(
        f.session.token,
        f.character.id,
      );
      assert.equal(view.combatPreview.attackMin, 15);
      await assert.rejects(
        f.send(
          f.input(
            "inventory.sell",
            { itemId: "training-weapon-v1", quantity: 1 },
            2,
          ),
        ),
        { code: "item_equipped" },
      );
      await f.send(f.input("equipment.unequip", { slot: "weapon" }, 2));
      const sold = await f.send(
        f.input(
          "inventory.sell",
          { itemId: "training-weapon-v1", quantity: 1 },
          3,
        ),
      );
      assert.equal(sold.state.gold, "40");
      assert.deepEqual(sold.inventory.items, []);
      assert.equal(sold.inventory.equipped.weapon, null);
      const other = await service.login(
        "inventory-other@example.invalid",
        "fixture",
      );
      assert.equal((await send(command, other.token)).status, 404);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }));
for (const same of [true, false])
  test(`concurrent inventory purchase ${same ? "replays" : "conflicts"} without duplicate items or overdraft`, async () =>
    authDatabase(async ({ service, pool, provider, vault }) => {
      const f = await fixture(service, pool),
        command = f.input("inventory.buy", {
          itemId: "training-weapon-v1",
          quantity: 2,
        });
      const replica = new AuthService({
        pool,
        provider,
        vault,
        origin: "https://localhost:9443",
        policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 },
      });
      const outcomes = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) =>
          (i % 2 ? replica : service).command(f.session.token, f.character.id, {
            ...command,
            requestId: same ? command.requestId : randomUUID(),
          } as any),
        ),
      );
      assert.equal(
        outcomes.filter((r) => r.status === "fulfilled").length,
        same ? 6 : 1,
      );
      const view: any = await service.onlineState(
        f.session.token,
        f.character.id,
      );
      assert.equal(view.state.gold, "0");
      assert.equal(view.inventory.items[0].quantity, 2);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int n FROM mare_game.inventory_ledger",
          )
        ).rows[0].n,
        1,
      );
    }));
for (const table of ["inventory_ledger", "character_commands"])
  test(`inventory transaction rolls back item, gold and version if ${table} fails`, async () =>
    authDatabase(async ({ service, pool }) => {
      const f = await fixture(service, pool);
      await pool.query(
        `ALTER TABLE mare_game.${table} ADD CONSTRAINT reject_fixture CHECK(false) NOT VALID`,
      );
      await assert.rejects(
        f.send(
          f.input("inventory.buy", {
            itemId: "training-weapon-v1",
            quantity: 1,
          }),
        ),
        { code: "23514" },
      );
      const view: any = await service.onlineState(
        f.session.token,
        f.character.id,
      );
      assert.equal(view.state.gold, "60");
      assert.equal(view.state.version, 0);
      assert.deepEqual(view.inventory.items, []);
    }));
