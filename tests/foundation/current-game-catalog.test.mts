import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
const require = createRequire(import.meta.url);
test("server and original browser rules expose all 103 definitions in the exact original order", () => {
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
    items: c.items,
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
  assert.equal(server.items.length, 103);
  assert.equal(server.items.filter((i) => i.type === "akuma_no_mi").length, 30);
  assert.equal(server.slots.length, 12);
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
