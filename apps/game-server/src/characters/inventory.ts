import type { PoolClient } from "pg";
import {
  inventorySnapshotSchema,
  type CharacterState,
  type CharacterCommand,
} from "@mare/shared";
import { AuthFault } from "../auth/errors.js";
const MAX = 9223372036854775807n;
type Item = {
  item_id: string;
  name: string;
  slot: "weapon" | "armor" | "material";
  buy_price: number;
  sell_price: number;
  attack_bonus: number;
  hp_bonus: number;
  armor_bonus: number;
};
export async function readItemCatalog(client: PoolClient) {
  const rows = (
    await client.query<Item>(
      "SELECT * FROM mare_game.item_catalog ORDER BY item_id",
    )
  ).rows;
  return rows.map((i) => ({
    itemId: i.item_id,
    name: i.name,
    slot: i.slot,
    buyPrice: String(i.buy_price),
    sellPrice: String(i.sell_price),
    attackBonus: i.attack_bonus,
    hpBonus: i.hp_bonus,
    armorBonus: i.armor_bonus,
  }));
}
export async function readInventory(client: PoolClient, id: string) {
  const items = (
    await client.query<{ itemId: string; quantity: number }>(
      `SELECT item_id AS "itemId",quantity FROM mare_game.character_inventory WHERE character_id=$1 AND quantity>0 ORDER BY item_id`,
      [id],
    )
  ).rows;
  const equipment = (
    await client.query<{ slot: "weapon" | "armor"; item_id: string }>(
      "SELECT slot,item_id FROM mare_game.character_equipment WHERE character_id=$1",
      [id],
    )
  ).rows;
  const equipped = {
    weapon: null as string | null,
    armor: null as string | null,
  };
  for (const e of equipment) {
    if (!items.some((i) => i.itemId === e.item_id))
      throw new AuthFault(503, "character_state_unavailable");
    equipped[e.slot] = e.item_id;
  }
  const last = (
    await client.query<{ request_id: string }>(
      "SELECT request_id FROM mare_game.inventory_ledger WHERE character_id=$1 ORDER BY version_before DESC LIMIT 1",
      [id],
    )
  ).rows[0];
  return inventorySnapshotSchema.parse({
    catalogId: "online-items-v1",
    items,
    equipped,
    lastRequestId: last?.request_id ?? null,
  });
}
export async function readGear(client: PoolClient, id: string) {
  const inventory = await readInventory(client, id),
    rows = (
      await client.query<Item>(
        `SELECT c.* FROM mare_game.character_equipment e JOIN mare_game.item_catalog c USING(item_id) WHERE e.character_id=$1`,
        [id],
      )
    ).rows;
  return {
    equipped: inventory.equipped,
    attack: rows.reduce((n, i) => n + i.attack_bonus, 0),
    hp: rows.reduce((n, i) => n + i.hp_bonus, 0),
    armor: rows.reduce((n, i) => n + i.armor_bonus, 0),
  };
}
async function record(
  client: PoolClient,
  id: string,
  requestId: string,
  version: number,
  event: string,
  itemId: string,
  quantityDelta: number,
  goldDelta: bigint,
  encounterId: string | null = null,
  previous: string | null = null,
) {
  const before =
    (
      await client.query<{ quantity: number }>(
        "SELECT quantity FROM mare_game.character_inventory WHERE character_id=$1 AND item_id=$2",
        [id, itemId],
      )
    ).rows[0]?.quantity ?? 0;
  const after = before + quantityDelta;
  if (after < 0) throw new AuthFault(409, "item_quantity_insufficient");
  if (after > 100000) throw new AuthFault(409, "inventory_stack_full");
  const wallet = (
    await client.query<{ gold: string }>(
      "SELECT gold::text FROM mare_game.character_progression WHERE character_id=$1",
      [id],
    )
  ).rows[0];
  if (!wallet) throw new AuthFault(503, "character_state_unavailable");
  const goldAfter = BigInt(wallet.gold) + goldDelta;
  if (goldAfter < 0n) throw new AuthFault(409, "gold_insufficient");
  if (goldAfter > MAX) throw new AuthFault(409, "progression_limit");
  if (quantityDelta !== 0) {
    const changed = await client.query(
      `INSERT INTO mare_game.character_inventory(character_id,item_id,quantity) VALUES($1,$2,$3)
  ON CONFLICT(character_id,item_id) DO UPDATE SET quantity=EXCLUDED.quantity WHERE character_inventory.quantity=$4 RETURNING item_id`,
      [id, itemId, after, before],
    );
    if (!changed.rowCount) throw new AuthFault(409, "state_version_conflict");
  }
  if (goldDelta !== 0n) {
    const changed = await client.query(
      "UPDATE mare_game.character_progression SET gold=$2 WHERE character_id=$1 AND gold=$3 RETURNING character_id",
      [id, goldAfter.toString(), wallet.gold],
    );
    if (!changed.rowCount) throw new AuthFault(409, "state_version_conflict");
  }
  await client.query(
    `INSERT INTO mare_game.inventory_ledger(character_id,request_id,event,item_id,version_before,quantity_before,quantity_delta,gold_before,gold_delta,encounter_id,previous_item_id)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id,
      requestId,
      event,
      itemId,
      version,
      before,
      quantityDelta,
      wallet.gold,
      goldDelta.toString(),
      encounterId,
      previous,
    ],
  );
}
export async function awardCombatDrop(
  client: PoolClient,
  id: string,
  requestId: string,
  version: number,
  encounterId: string,
) {
  await record(
    client,
    id,
    requestId,
    version,
    "drop",
    "dock-scrap-v1",
    1,
    0n,
    encounterId,
  );
}
export async function mutateInventory(
  client: PoolClient,
  id: string,
  input: CharacterCommand,
  state: CharacterState,
) {
  const snapshot = await readInventory(client, id);
  let itemId: string,
    event: string,
    delta = 0,
    gold = 0n,
    previous: string | null = null;
  if (input.action === "equipment.unequip") {
    itemId = snapshot.equipped[input.payload.slot] ?? "";
    if (!itemId) throw new AuthFault(409, "equipment_empty");
    event = "unequip";
    await client.query(
      "DELETE FROM mare_game.character_equipment WHERE character_id=$1 AND slot=$2",
      [id, input.payload.slot],
    );
  } else if (
    input.action === "equipment.equip" ||
    input.action === "inventory.buy" ||
    input.action === "inventory.sell"
  ) {
    itemId = input.payload.itemId;
    const item = (
      await client.query<Item>(
        "SELECT * FROM mare_game.item_catalog WHERE item_id=$1",
        [itemId],
      )
    ).rows[0];
    if (!item) throw new AuthFault(404, "item_unknown");
    const owned =
      snapshot.items.find((i) => i.itemId === itemId)?.quantity ?? 0;
    if (input.action === "equipment.equip") {
      if (item.slot === "material")
        throw new AuthFault(409, "item_not_equippable");
      if (!owned) throw new AuthFault(409, "item_quantity_insufficient");
      previous = snapshot.equipped[item.slot];
      if (previous === itemId)
        throw new AuthFault(409, "item_already_equipped");
      event = "equip";
      await client.query(
        "INSERT INTO mare_game.character_equipment(character_id,slot,item_id) VALUES($1,$2,$3) ON CONFLICT(character_id,slot) DO UPDATE SET item_id=EXCLUDED.item_id",
        [id, item.slot, itemId],
      );
    } else {
      event = input.action === "inventory.buy" ? "buy" : "sell";
      const amount = input.payload.quantity;
      if (
        event === "sell" &&
        Object.values(snapshot.equipped).some((value) => value === itemId) &&
        owned - amount < 1
      )
        throw new AuthFault(409, "item_equipped");
      delta = event === "buy" ? amount : -amount;
      gold =
        BigInt(event === "buy" ? -item.buy_price : item.sell_price) *
        BigInt(amount);
    }
  } else throw new AuthFault(400, "invalid_request");
  if (state.version >= Number.MAX_SAFE_INTEGER)
    throw new AuthFault(503, "state_version_exhausted");
  const changed = await client.query(
    "UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id",
    [id, state.version],
  );
  if (!changed.rowCount) throw new AuthFault(409, "state_version_conflict");
  await record(
    client,
    id,
    input.requestId,
    state.version,
    event,
    itemId,
    delta,
    gold,
    null,
    previous,
  );
  return readInventory(client, id);
}
