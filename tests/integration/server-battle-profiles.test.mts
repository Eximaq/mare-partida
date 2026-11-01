import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { authDatabase } from "./auth-support.mjs";
const zero = {
  strength: 0,
  dexterity: 0,
  vitality: 0,
  intelligence: 0,
  spirit: 0,
};
async function fixture(service: any, pool: any, classId = "sword") {
  const session = await service.login(
    "battle-profile@example.invalid",
    "fixture",
  );
  const character = await service.createCharacter(session.token, {
    name: "Battle Profile",
    classId,
    factionId: "pirate",
  });
  const lease = await service.acquireControl(session.token, character.id);
  const command = (action: string, version: number, payload: any = {}) => ({
    action,
    requestId: randomUUID(),
    expectedVersion: version,
    control: { epoch: lease.epoch, token: lease.token },
    payload,
  });
  const send = async (action: string, payload: any = {}) =>
    service.command(
      session.token,
      character.id,
      command(
        action,
        (await service.characterState(session.token, character.id)).version,
        payload,
      ),
    );
  await pool.query(
    "UPDATE mare_game.character_progression SET level=2,experience=80 WHERE character_id=$1",
    [character.id],
  );
  await send("journey.begin");
  await send("hunt.begin");
  await pool.query(
    "UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'",
  );
  await send("hunt.claim");
  return { session, character, lease, command, send };
}
test("combat snapshots allocated attributes and keeps the active fighter immutable after another allocation", async () =>
  authDatabase(async ({ service, pool }) => {
    const f = await fixture(service, pool);
    await f.send("attributes.allocate", {
      allocation: { ...zero, strength: 3 },
    });
    const begin = await f.send("combat.begin");
    assert.ok(
      begin.combat.fighter,
      "new encounters must snapshot authoritative fighter attributes",
    );
    assert.equal(begin.combat.playerMaxHp, 38);
    assert.equal(begin.combat.playerHp, 38);
    assert.equal(begin.combat.fighter.attackMin, 14);
    assert.equal(begin.combat.fighter.attackMax, 18);
    assert.equal(begin.combat.fighter.allocated.strength, 3);
    assert.equal(begin.combat.fighter.total.strength, 18);
    await f.send("attributes.allocate", {
      allocation: { ...zero, vitality: 2 },
    });
    const view: any = await service.onlineState(
      f.session.token,
      f.character.id,
    );
    assert.deepEqual(view.combat.fighter, begin.combat.fighter);
    assert.equal(view.combat.playerHp, 38);
    assert.equal(view.combatPreview.maxHp, 42);
    assert.equal(view.combatPreview.allocated.vitality, 2);
    await pool.query(
      "UPDATE mare_game.combat_encounters SET next_attack_at=clock_timestamp()-interval '1 second'",
    );
    const input = f.command("combat.attack", view.state.version),
      round = await service.command(
        f.session.token,
        f.character.id,
        input as any,
      );
    assert.ok(
      round.combat!.lastAttack!.playerDamage >= 14 &&
        round.combat!.lastAttack!.playerDamage <= 18,
    );
    assert.deepEqual(
      await service.command(f.session.token, f.character.id, input as any),
      round,
    );
    const stored = (
      await pool.query(
        "SELECT fighter,player_max_hp FROM mare_game.combat_encounters",
      )
    ).rows[0];
    assert.deepEqual(stored.fighter, begin.combat.fighter);
    assert.equal(stored.player_max_hp, 38);
  }));

test("equipping during combat only changes the next fighter; reward/drop are atomic and replay exactly once", async () =>
  authDatabase(async ({ service, pool }) => {
    const f = await fixture(service, pool);
    await pool.query("UPDATE mare_game.character_progression SET gold=60");
    await f.send("inventory.buy", {
      itemId: "training-weapon-v1",
      quantity: 1,
    });
    const started = await f.send("combat.begin");
    await f.send("equipment.equip", { itemId: "training-weapon-v1" });
    const view: any = await service.onlineState(
      f.session.token,
      f.character.id,
    );
    assert.deepEqual(view.combat.fighter, started.combat.fighter);
    assert.equal(view.combatPreview.attackMin, 15);
    await pool.query(
      "UPDATE mare_game.combat_encounters SET enemy_hp=1,next_attack_at=clock_timestamp()-interval '1 second'",
    );
    await f.send("combat.attack");
    const before: any = await service.onlineState(
        f.session.token,
        f.character.id,
      ),
      claim = f.command("combat.claim", before.state.version);
    await pool.query(
      "ALTER TABLE mare_game.inventory_ledger ADD CONSTRAINT reject_drop CHECK(event!='drop') NOT VALID",
    );
    await assert.rejects(
      service.command(f.session.token, f.character.id, claim as any),
      { code: "23514" },
    );
    const rolled: any = await service.onlineState(
      f.session.token,
      f.character.id,
    );
    assert.deepEqual(rolled.state, before.state);
    assert.deepEqual(rolled.inventory, before.inventory);
    assert.equal(rolled.combat.status, "won");
    await pool.query(
      "ALTER TABLE mare_game.inventory_ledger DROP CONSTRAINT reject_drop",
    );
    const won = await service.command(
      f.session.token,
      f.character.id,
      claim as any,
    );
    assert.equal(won.state.gold, "42");
    assert.equal(
      won.inventory!.items.find((i) => i.itemId === "dock-scrap-v1")!.quantity,
      1,
    );
    assert.deepEqual(
      await service.command(f.session.token, f.character.id, claim as any),
      won,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM mare_game.inventory_ledger WHERE event='drop'",
        )
      ).rows[0].n,
      1,
    );
  }));
