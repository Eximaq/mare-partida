import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
const require = createRequire(import.meta.url);
test("server and original browser rules expose preserved original definitions and append-only reward items in the exact catalog order", () => {
  const { create } = require("../../item-catalog.js");
  const forge = require("../../forge-system.js"),
    prison = require("../../prison-system.js"),
    haki = require("../../haki-system.js"),
    akuma = require("../../akuma-system.js");
  const c = create({
    forge,
    prison,
    haki,
    akuma,
    hakiProgression: require("../../haki-progression.js"),
  });
  const summary = {
    items: c.items.slice(0,103),
    slots: [...c.inventorySlotsLeft, ...c.inventorySlotsRight],
    capacity: c.capacity,
    healerWeaponIndex: c.healerWeaponIndex,
  };
  assert.equal(
    createHash("sha256").update(JSON.stringify(summary)).digest("hex"),
    "ada245510d65d39257605761b9abe43ba252af13dcaf6df0f036589976e83259",
    "baseline captured before extraction; changing order or values requires an explicit rules migration",
  );
  const server = getGameCatalog();
  assert.equal(server.items[187]?.id,"visual_completo_zoro");
  assert.equal(server.items[187]?.requiredClass,"sword");
  assert.equal(server.items.length, 247);
  assert.equal(server.items[246]?.id,"visual_completo_luffy");
  assert.equal(server.items[228]?.id,"sword-fragment-kibarachi");
  assert.equal(server.items[229]?.id,"legendary_weapon_fragment");
  assert.equal(server.items.filter(item=>item.kind==="sword-collection").length,16);
  assert.equal(server.items[186]?.kind,"xp-boost");
  const previousRules={items:c.items.slice(0,246),slots:server.slots,capacity:server.capacity,healerWeaponIndex:server.healerWeaponIndex};
  assert.equal(createHash('sha256').update(JSON.stringify(previousRules)).digest('hex'),'c4becaac75ee93b6dd15b78e6b53d133e0977e74285519a7c03b059c6925a367','all prior catalog definitions and rules retain their original hash');
  assert.notEqual(server.rulesHash,'c4becaac75ee93b6dd15b78e6b53d133e0977e74285519a7c03b059c6925a367','the appended cosmetic changes the complete authoritative catalog hash');
  assert.deepEqual(c.items.slice(103,109),require('../../boss-dungeon-system.js').fragments);
  assert.equal(server.items.filter((i) => i.type === "akuma_no_mi").length, 30);
  assert.equal(server.slots.length, 13);
  assert.equal(server.capacity, 120);
  assert.equal(server.healerWeaponIndex, 31);
  for (const [i, item] of server.items.entries()) {
    const { defIndex, ...definition } = item;
    assert.equal(defIndex, i);
    assert.deepEqual(definition, JSON.parse(JSON.stringify(c.items[i])));
  }
  assert.equal(server.items[0]!.name, "Espada de Ferro Salgado");
  assert.equal(server.items[6]!.name, "Casaco de Marinheiro");
});
test("server catalog is deeply immutable; client-supplied changes cannot rewrite authoritative values", () => {
  const c = getGameCatalog();
  assert.ok(Object.isFrozen(c));
  assert.ok(Object.isFrozen(c.items));
  assert.ok(Object.isFrozen(c.items[0]));
  assert.throws(() => {
    (c.items[0] as any).attack = 9999;
  }, TypeError);
  assert.equal(getGameCatalog().items[0]!.attack, 6);
});
