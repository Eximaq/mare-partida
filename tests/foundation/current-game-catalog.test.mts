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
    // The historical checksum protects saved indices and stats, not this temporary flag.
    items: c.items.slice(0,103).map(({acquisitionBlocked:_restriction,...original}:any)=>original),
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
  assert.equal(server.items.length, 189);
  assert.equal(server.items[186]?.kind,"xp-boost");
  assert.deepEqual(server.items.filter(i=>i.acquisitionBlocked===true).map(i=>i.defIndex),[8,9]);
  assert.equal(server.items[134]?.equipmentFusionFor,"boots");
  assert.equal(server.rulesHash,'7ca7ee214922a807fbc6f7191a02dabc62efc53f1a2a55e7b780bc5efa0341c8');
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

test('all seven classes can deal damage at level one without equipped items',async()=>{
 const {deriveOriginalFighter,resolveOriginalRound}=await import('../../apps/game-server/src/gameplay/character.js');
 const catalog=getGameCatalog(),attributes={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
 const inventory={catalogId:'original-game-v1',inventory:[],equipment:Object.fromEntries(catalog.slots.map(s=>[s,null])),materials:0,potions:4,forgeVersion:5,forgeSeq:0,forgeHistory:[]};
 for(const cls of ['brawler','sword','rogue','gunner','cyborg','strategist','healer']){
  const f=deriveOriginalFighter(cls,'pirate',{level:1,version:0} as any,attributes,inventory as any);
  assert.equal(f.rulesetId,'original-character-v1');
  if(f.rulesetId!=='original-character-v1')throw Error(cls);
  assert(f.maxHp>0&&f.attackMin>0,cls);
  const r=resolveOriginalRound(f.maxHp,36,f,()=>.5);
  assert(r.playerDamage>0&&r.enemyHp<36,cls);
 }
});
