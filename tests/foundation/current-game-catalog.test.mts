import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
const require = createRequire(import.meta.url);
test("server and original browser rules expose 109 preserved definitions plus twenty class armaments and 56 garments, and appended weapon fragment and XP boost in the exact original order", () => {
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
    "3f54745b49aa5fae5818c250330ec959d2301e1c973a2abd538c77f2f118ce6a",
    "baseline captured before extraction; changing order or values requires an explicit rules migration",
  );
  const server = getGameCatalog();
  assert.equal(server.items[187]?.id,"visual_completo_zoro");
  assert.equal(server.items[187]?.requiredClass,"sword");
  assert.equal(server.items.length, 188);
  assert.equal(server.items[186]?.kind,"xp-boost");
  assert.equal(server.rulesHash,'66324486a472d62b544f990897f13dfc519ae093ddcdb4b9714e35ab375a8560');
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
