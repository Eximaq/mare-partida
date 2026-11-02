import { createRequire } from "node:module";
import { randomInt, randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  originalInventorySchema,
  originalActionSchema,
  type OriginalInventory,
  type OriginalItemInstance,
  type CharacterState,
  type CharacterCommand,
  type TalentBuild,
} from "@mare/shared";
import { getGameCatalog } from "./catalog.js";
import { AuthFault } from "../auth/errors.js";
import {readBattle,storeBattle} from '../characters/battle.js';
import {readFighter} from '../characters/fighter.js';
const require = createRequire(import.meta.url),
  forge = require("../../../../forge-system.js");
const catalog = getGameCatalog(),
  defs = catalog.items;
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const random = () => randomInt(0, 0x100000000) / 0x100000000;
const maxGold = 9223372036854775807n;
export const isOriginalAction = (action: string) =>
  originalActionSchema.options.includes(action as any);
export async function awardWorldLoot(client:PoolClient,id:string,requestId:string,state:CharacterState,kills:any[],first?:{area:string;rarity:string;gold:number;level:number;classId:string},potionsUsed=0,passives:{build?:TalentBuild|undefined;steals?:{spawnId:string;amount:number}[];rng?:()=>number;grant?:OriginalItemInstance|undefined;action?:'prison.reward'|'prison.claim'|'dungeon.battle'}={}){
 const roll=passives.rng??(()=>randomInt(0,0x100000000)/0x100000000),random=()=>{const r=roll();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid loot RNG');return r;};
 const before=await readOriginalInventory(client,id);if(!before)throw new AuthFault(409,'original_inventory_required');
 const after=structuredClone(before),identity=(await client.query('SELECT class_id,faction_id FROM mare_game.characters WHERE id=$1',[id])).rows[0];
 const T=require('../../../../talent-system.js'),U=require('../../../../ultimate-system.js'),g={classId:identity.class_id,talentBuilds:{[identity.class_id]:passives.build||T.empty()}},underworld=U.selected(g)==='underworld',lootMultiplier=underworld?2:1,rareChance=Math.min(.5,(T.bonuses(g).rareChance||0)+(T.keystone(g)==='lightHands'?.2:0));
 const battle=require('../../../../world-battle.cjs');let xp=0n,gold=BigInt(first?.gold??0);
 if(!Number.isSafeInteger(potionsUsed)||potionsUsed<0||potionsUsed>after.potions)throw new AuthFault(503,'potion_stock_conflict');after.potions-=potionsUsed;
 const make=(def:number,level:number,rarity:string,origin:string)=>forge.normalizeItem({id:randomUUID(),def,level,rarity,plus:0,locked:false,obtainedAt:Date.now(),origin},defs,random);
 for(const steal of passives.steals??[]){
  if(T.keystone(g)!=='lightHands'||!Number.isInteger(steal.amount)||steal.amount<1||steal.amount>6)throw new AuthFault(503,'invalid_talent_reward');
  await client.query('INSERT INTO mare_game.battle_talent_steals(character_id,spawn_id,total) VALUES($1,$2,$3) ON CONFLICT(character_id,spawn_id) DO UPDATE SET total=mare_game.battle_talent_steals.total+EXCLUDED.total',[id,steal.spawnId,steal.amount]);gold+=BigInt(steal.amount);
 }
 if(first){
  if(after.inventory.length>=120)throw new AuthFault(409,'inventory_full');
  const def=({sword:0,brawler:2,gunner:4,rogue:12,cyborg:14,strategist:16,healer:31} as Record<string,number>)[identity.class_id]!;
  after.inventory.unshift(make(def,first.level,first.rarity,'Primeira vitória · '+battle.hunt.get(first.area).name));
 }
 for(const k of kills){
  const r=k.reward;xp+=BigInt(r.xp);gold+=BigInt(Math.round(r.gold*battle.catalog.factions[identity.faction_id].gold));
  if(random()<Math.min(1,r.materialChance*lootMultiplier))after.materials=Math.min(1000000000,after.materials+r.materials);
  if(random()<Math.min(1,r.gearChance*lootMultiplier)&&after.inventory.length<120){
   const rarity=battle.hunt.rarity(k.area,k.monster.type==='boss'||require('../../../../monster-catalog.js')[k.monster.type]?.boss===true,random(),rareChance);
   const eligible=defs.map((d,i)=>({d,i})).filter(({d})=>!d.kind&&d.type!=='akuma_no_mi'&&(d.slot!=='weapon'||d.type===identity.class_id)&&(!d.fixedRarity||d.rarity===rarity&&d.rarity!=='supreme'));
   const chosen=eligible[Math.floor(random()*eligible.length)];if(!chosen)throw new AuthFault(503,'loot_catalog_unavailable');
   after.inventory.unshift(make(chosen.i,r.gearLevel,rarity,battle.hunt.get(k.area).name));
  }
  if(random()<Math.min(1,r.potionChance*lootMultiplier))after.potions=Math.min(1000000000,after.potions+r.potions);
  if(require('../../../../haki-system.js').drop({...k.monster,source:k.monster.source??'world'},random)&&after.inventory.length<120){const def=defs.findIndex(d=>d.kind==='haki-book');if(def<0)throw new AuthFault(503,'loot_catalog_unavailable');after.inventory.unshift(make(def,1,'epic',battle.hunt.get(k.area).name));}
  if(underworld&&k.monster.type!=='boss'&&after.inventory.length<120){
   const special=U.loot(g,random);
   if(special.box){const def=defs.findIndex(d=>d.kind==='pearl-box'&&d.boxLevel===1);if(def<0)throw new AuthFault(503,'loot_catalog_unavailable');after.inventory.unshift(make(def,1,String(defs[def]!.rarity??'common'),'Senhor do Submundo'));}
   if(special.legendary&&after.inventory.length<120){const eligible=defs.map((d,i)=>({d,i})).filter(({d})=>!d.kind&&d.type!=='akuma_no_mi'&&(d.slot!=='weapon'||d.type===identity.class_id)&&(!d.fixedRarity||d.rarity==='legendary'));const chosen=eligible[Math.floor(random()*eligible.length)];if(!chosen)throw new AuthFault(503,'loot_catalog_unavailable');after.inventory.unshift(make(chosen.i,r.gearLevel,'legendary','Senhor do Submundo'));}
  }
 }
 if(passives.grant){if(after.inventory.length>=120)throw new AuthFault(409,'inventory_full');after.inventory.push(passives.grant);}
 if(BigInt(state.gold)+gold>maxGold||BigInt(state.experience)+xp>maxGold)throw new AuthFault(409,'progression_limit');
 await writeInventory(client,id,after);
 await client.query('UPDATE mare_game.character_progression SET gold=gold+$2,experience=experience+$3 WHERE character_id=$1',[id,gold.toString(),xp.toString()]);
 await event(client,id,requestId,state.version,passives.action??(first?'battle.first':'battle.reward'),before,after,BigInt(state.gold),gold,{experience:xp.toString(),spawns:kills.map(k=>k.id),potionsUsed,firstArea:first?.area??null,domainItem:passives.grant?.id??null,talentSteals:passives.steals??[],underworld,rareChance});
 return {xp,gold};
}
function valid(input: unknown,owner?:string): OriginalInventory {
  const parsed = originalInventorySchema.safeParse(input);
  if (!parsed.success)
    throw new AuthFault(503, "original_inventory_unavailable");
  const v = parsed.data,
    all = [
      ...v.inventory,
      ...Object.values(v.equipment).filter(Boolean),
    ] as OriginalItemInstance[];
  if (new Set(all.map((i) => i.id)).size !== all.length)
    throw new AuthFault(503, "original_inventory_unavailable");
  for(const item of all){
    if(item.qty!==undefined&&defs[item.def]?.kind!=='haki-fragment')throw new AuthFault(503,'original_inventory_unavailable');
    if(owner&&item.boundToCharacter&&item.boundToCharacter!==owner)throw new AuthFault(503,'original_inventory_unavailable');
    const def=defs[item.def];
    if((item.type==='akuma_no_mi'||item.fruitId!==undefined)&&(def?.type!=='akuma_no_mi'||item.fruitId!==def.fruitId))throw new AuthFault(503,'original_inventory_unavailable');
    if(def?.kind==='akuma-fragment'&&(!item.boundToCharacter||item.binding!=='character'||item.materialId!==def.materialId||item.rank!==def.rank||!item.quantity))throw new AuthFault(503,'original_inventory_unavailable');
  }
  for (const [slot, item] of Object.entries(v.equipment))
    if (item && defs[item.def]?.slot !== slot)
      throw new AuthFault(503, "original_inventory_unavailable");
  return v;
}
export async function readOriginalInventory(
  client: PoolClient,
  id: string,
): Promise<OriginalInventory | undefined> {
  const row = (
    await client.query(
      "SELECT inventory,equipment,materials,potions,forge_seq,forge_history FROM mare_game.game_inventory WHERE character_id=$1",
      [id],
    )
  ).rows[0];
  return row
    ? valid({
        catalogId: catalog.catalogId,
        inventory: row.inventory,
        equipment: row.equipment,
        materials: row.materials,
        potions: row.potions,
        forgeVersion: 4,
        forgeSeq: Number(row.forge_seq),
        forgeHistory: row.forge_history,
      },id)
    : undefined;
}
export async function readOriginalGear(client: PoolClient, id: string) {
  const inventory = await readOriginalInventory(client, id);
  if (!inventory) return undefined;
  const gear = forge.aggregate(inventory.equipment, defs);
  // The alpha encounter still has its own versioned combat formula. Its gear
  // inputs now come from the same owned instances; no second equipment wallet.
  return {
    equipped: { weapon: null, armor: null },
    attack: gear.attack,
    hp: gear.hp,
    armor: gear.defense,
  };
}
export async function writeInventory(
  client: PoolClient,
  id: string,
  i: OriginalInventory,
) {
  valid(i,id);
  await client.query(
    "UPDATE mare_game.game_inventory SET inventory=$2::jsonb,equipment=$3::jsonb,materials=$4,potions=$5,forge_seq=$6,forge_history=$7::jsonb WHERE character_id=$1",
    [
      id,
      JSON.stringify(i.inventory),
      JSON.stringify(i.equipment),
      i.materials,
      i.potions,
      i.forgeSeq,
      JSON.stringify(i.forgeHistory),
    ],
  );
}
export async function event(
  client: PoolClient,
  id: string,
  requestId: string,
  version: number,
  action: string,
  before: unknown,
  after: unknown,
  gold: bigint,
  delta: bigint,
  outcome: unknown,
) {
  await client.query(
    `INSERT INTO mare_game.game_inventory_events(character_id,request_id,version_before,action,rules_hash,before_hash,after_hash,gold_before,gold_delta,outcome)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      id,
      requestId,
      version,
      action,
      catalog.rulesHash,
      hash(before),
      hash(after),
      gold.toString(),
      delta.toString(),
      JSON.stringify(outcome),
    ],
  );
}
function newGear(def: number) {
  return forge.normalizeItem(
    {
      id: randomUUID(),
      def,
      level: 1,
      plus: 0,
      locked: false,
      rarity: defs[def]!.rarity ?? "common",
      obtainedAt: Date.now(),
    },
    defs,
    random,
  ) as OriginalItemInstance;
}
async function initialize(
  client: PoolClient,
  id: string,
  input: CharacterCommand,
  state: CharacterState,
) {
  const entries = (
    await client.query<{ item_id: string; quantity: number }>(
      "SELECT item_id,quantity FROM mare_game.character_inventory WHERE character_id=$1 ORDER BY item_id",
      [id],
    )
  ).rows;
  const worn = (
    await client.query<{ slot: string; item_id: string }>(
      "SELECT slot,item_id FROM mare_game.character_equipment WHERE character_id=$1 ORDER BY slot",
      [id],
    )
  ).rows;
  const { class_id: cls } = (
    await client.query(
      "SELECT class_id FROM mare_game.characters WHERE id=$1",
      [id],
    )
  ).rows[0];
  const weapon = (
    {
      sword: 0,
      brawler: 2,
      gunner: 4,
      rogue: 12,
      cyborg: 14,
      strategist: 16,
      healer: 31,
    } as Record<string, number>
  )[cls];
  if (weapon === undefined)
    throw new AuthFault(503, "original_inventory_unavailable");
  const i: OriginalInventory = {
    catalogId: "original-game-v1",
    inventory: [],
    equipment: Object.fromEntries(
      catalog.slots.map((s) => [s, null]),
    ) as OriginalInventory["equipment"],
    materials: 3,
    potions: 4,
    forgeVersion: 4,
    forgeSeq: 0,
    forgeHistory: [],
  };
  const bagCount =
    entries
      .filter((e) => e.item_id !== "dock-scrap-v1")
      .reduce((n, e) => n + e.quantity, 0) - worn.length;
  if (bagCount > 120) throw new AuthFault(409, "inventory_conversion_capacity");
  for (const row of entries) {
    if (row.item_id === "dock-scrap-v1") {
      i.materials += row.quantity;
      continue;
    }
    const def =
      row.item_id === "training-weapon-v1"
        ? weapon
        : row.item_id === "dock-vest-v1"
          ? 6
          : null;
    if (def === null) throw new AuthFault(409, "inventory_conversion_unknown");
    for (let n = 0; n < row.quantity; n++) {
      const item = newGear(def),
        slot = defs[def]!.slot as keyof OriginalInventory["equipment"];
      if (n === 0 && worn.some((e) => e.item_id === row.item_id))
        i.equipment[slot] = item;
      else i.inventory.push(item);
    }
  }
  // These starter resources never existed in the alpha. Add missing starter gear
  // once, but preserve every converted copy and every existing balance/XP.
  for (const [slot, def] of [
    ["weapon", weapon],
    ["coat", 6],
    ["boots", 8],
  ] as const) {
    if (i.equipment[slot] || i.inventory.some((item) => item.def === def))
      continue;
    if (slot === "boots") i.inventory.push(newGear(def));
    else i.equipment[slot] = newGear(def);
  }
  if (i.inventory.length > 120)
    throw new AuthFault(409, "inventory_conversion_capacity");
  const fresh =
    state.version === 0 &&
    state.gold === "0" &&
    state.experience === "0" &&
    entries.length === 0;
  await client.query(
    `INSERT INTO mare_game.game_inventory(character_id,inventory,equipment,materials,potions,forge_seq,forge_history,alpha_snapshot,initialized_request_id)
    VALUES($1,$2::jsonb,$3::jsonb,$4,$5,0,'[]',$6::jsonb,$7)`,
    [
      id,
      JSON.stringify(i.inventory),
      JSON.stringify(i.equipment),
      i.materials,
      i.potions,
      JSON.stringify({
        items: entries,
        equipment: worn,
        version: state.version,
        gold: state.gold,
        experience: state.experience,
      }),
      input.requestId,
    ],
  );
  return { inventory: valid(i), delta: fresh ? 120n : 0n };
}
// Caller owns account/character locks. Authorization, fencing, replay and version
// checks must precede this transition, in the same transaction and receipt.
export async function mutateOriginalInventory(
  client: PoolClient,
  id: string,
  input: CharacterCommand,
  state: CharacterState,
) {
  const before = await readOriginalInventory(client, id);
  let i = before ? structuredClone(before) : undefined,
    delta = 0n,
    outcome: unknown = {};
  const combat = (
    await client.query(
      "SELECT phase,player_hp,player_max_hp,encounter_id FROM mare_game.combat_encounters WHERE character_id=$1 ORDER BY ordinal DESC LIMIT 1",
      [id],
    )
  ).rows[0];
  const changesGear = [
    "items.initialize",
    "items.equip",
    "items.unequip",
    "forge.execute",
  ].includes(input.action);
  const battle=await readBattle(client,id);
  if (changesGear && (combat?.phase === "active"||battle&&(battle.auto||battle.pending||battle.skillJob||battle.mobs.some((m:any)=>m.alive&&m.engaged))))
    throw new AuthFault(409, "equipment_during_combat");
  if (input.action === "items.initialize") {
    if (i) throw new AuthFault(409, "inventory_already_initialized");
    const created = await initialize(client, id, input, state);
    i = created.inventory;
    delta = created.delta;
  } else {
    if (!i) throw new AuthFault(409, "original_inventory_required");
    if (
      input.action === "items.equip" ||
      input.action === "items.sell" ||
      input.action === "items.lock"
    ) {
      const item =
        i.inventory.find((x) => x.id === input.payload.itemId) ??
        Object.values(i.equipment).find((x) => x?.id === input.payload.itemId);
      if (!item) throw new AuthFault(404, "item_not_found");
      const def = defs[item.def]!;
      if (input.action === "items.lock") {
        item.locked = input.payload.locked;
      } else if (input.action === "items.sell") {
        if (!i.inventory.some((x) => x.id === item.id))
          throw new AuthFault(409, "item_equipped");
        if (
          item.locked || item.boundToCharacter ||
          ["pearl-box", "haki-fragment"].includes(String(def.kind))
        )
          throw new AuthFault(409, "item_protected");
        delta = BigInt(Math.round(14 + item.level * 7 + item.plus * 18));
        i.inventory = i.inventory.filter((x) => x.id !== item.id);
      } else {
        if (!i.inventory.some((x) => x.id === item.id))
          throw new AuthFault(409, "item_already_equipped");
        if (!forge.isGear(item, defs)&&def.type!=='akuma_no_mi')
          throw new AuthFault(409, "item_not_equippable");
        const cls = (
          await client.query(
            "SELECT class_id FROM mare_game.characters WHERE id=$1",
            [id],
          )
        ).rows[0].class_id;
        if (def.slot === "weapon" && def.type !== cls)
          throw new AuthFault(409, "item_class_mismatch");
        const slot = def.slot as keyof typeof i.equipment,
          previous = i.equipment[slot];
        i.inventory = i.inventory.filter((x) => x.id !== item.id);
        i.equipment[slot] = item;
        if (previous) i.inventory.push(previous);
      }
    } else if (input.action === "items.open-box") {
      const box=i.inventory.find(x=>x.id===input.payload.itemId);if(!box)throw new AuthFault(404,'item_not_found');
      const result=require('../../../../prison-system.js').openBox(i,input.payload.itemId,defs,random,Date.now());
      if(!result.ok)throw new AuthFault(409,box.locked?'item_protected':'box_unavailable');
      i={...i,inventory:result.state.inventory};outcome={consumed:box.id,created:result.item.id};
    } else if (input.action === "items.unequip") {
      const slot = input.payload.slot,
        item = i.equipment[slot];
      if (!item) throw new AuthFault(409, "equipment_empty");
      if (i.inventory.length >= 120) throw new AuthFault(409, "inventory_full");
      i.equipment[slot] = null;
      i.inventory.unshift(item);
    } else if (input.action === "potions.buy") {
      if (i.potions >= 1000000000)
        throw new AuthFault(409, "inventory_stock_full");
      delta = -35n;
      i.potions++;
    } else if (input.action === "potions.use") {
      if (i.potions === 0) throw new AuthFault(409, "potion_insufficient");
      if(battle){
       const fighter=await readFighter(client,id,state);
       if(battle.hp<=0||battle.hp>=fighter.maxHp)throw new AuthFault(409,'potion_not_needed');
       const hp=battle.hp;battle.hp=Math.min(fighter.maxHp,battle.hp+Math.round(fighter.maxHp*.44)*(1+(fighter.rulesetId==='original-character-v1'?fighter.stats.healingReceivedPercent:0)));
       await storeBattle(client,id,battle);i.potions--;outcome={healed:battle.hp-hp};
      }else{
      if (
        combat?.phase !== "active" ||
        combat.player_hp <= 0 ||
        combat.player_hp >= combat.player_max_hp
      )
        throw new AuthFault(409, "potion_not_needed");
      const hp = Math.min(
        combat.player_max_hp,
        combat.player_hp + Math.round(combat.player_max_hp * 0.44),
      );
      await client.query(
        "UPDATE mare_game.combat_encounters SET player_hp=$3 WHERE character_id=$1 AND encounter_id=$2",
        [id, combat.encounter_id, hp],
      );
      i.potions--;
      outcome = { healed: hp - combat.player_hp };
      }
    } else if (input.action === "forge.execute") {
      if (BigInt(state.gold) > BigInt(Number.MAX_SAFE_INTEGER))
        throw new AuthFault(409, "original_currency_limit");
      const result = forge.execute(
        {
          ...i,
          gold: Number(state.gold),
          classId: (
            await client.query(
              "SELECT class_id FROM mare_game.characters WHERE id=$1",
              [id],
            )
          ).rows[0].class_id,
        },
        input.payload.operation,
        defs,
        random,
        Date.now(),
      );
      if (!result.ok) throw new AuthFault(409, "forge_operation_rejected");
      const { gold, classId, ...next } = result.state;
      i = valid(next);
      delta = BigInt(gold) - BigInt(state.gold);
      outcome = result.result;
    } else throw new AuthFault(400, "invalid_request");
  }
  valid(i);
  const gold = BigInt(state.gold),
    afterGold = gold + delta;
  if (afterGold < 0n) throw new AuthFault(409, "gold_insufficient");
  if (afterGold > maxGold) throw new AuthFault(409, "progression_limit");
  if (state.version >= Number.MAX_SAFE_INTEGER)
    throw new AuthFault(503, "state_version_exhausted");
  if (delta !== 0n)
    await client.query(
      "UPDATE mare_game.character_progression SET gold=$2 WHERE character_id=$1",
      [id, afterGold.toString()],
    );
  if (
    !(
      await client.query(
        "UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id",
        [id, state.version],
      )
    ).rowCount
  )
    throw new AuthFault(409, "state_version_conflict");
  await writeInventory(client, id, i!);
  await event(
    client,
    id,
    input.requestId,
    state.version,
    input.action,
    before ?? null,
    i!,
    gold,
    delta,
    outcome,
  );
}

export async function awardOriginalMaterial(
  client: PoolClient,
  id: string,
  requestId: string,
  version: number,
  encounterId: string,
) {
  const before = await readOriginalInventory(client, id);
  if (!before) return false;
  if (before.materials >= 1000000000)
    throw new AuthFault(409, "inventory_stock_full");
  const after = valid({ ...before, materials: before.materials + 1 });
  await writeInventory(client, id, after);
  const gold = BigInt(
    (
      await client.query(
        "SELECT gold::text FROM mare_game.character_progression WHERE character_id=$1",
        [id],
      )
    ).rows[0].gold,
  );
  await event(
    client,
    id,
    requestId,
    version,
    "combat.claim",
    before,
    after,
    gold,
    0n,
    { materialsDelta: 1, encounterId },
  );
  return true;
}
