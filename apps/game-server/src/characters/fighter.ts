import { readGear } from "./inventory.js";
import type { PoolClient } from "pg";
import {
  fighterSchema,
  attributeKeys,
  type CharacterState,
  type AttributeValues,
  type Fighter,
} from "@mare/shared";
import { readAttributes } from "./attributes.js";
import { AuthFault } from "../auth/errors.js";
// Versioned online rules. Birth attributes match the existing seven demo classes.
const classes = {
  sword: {
    birth: [15, 14, 9, 6, 6],
    primary: "strength",
    secondary: "dexterity",
  },
  brawler: {
    birth: [14, 9, 13, 5, 9],
    primary: "strength",
    secondary: "vitality",
  },
  gunner: {
    birth: [9, 15, 8, 10, 8],
    primary: "dexterity",
    secondary: "strength",
  },
  rogue: {
    birth: [10, 16, 9, 7, 8],
    primary: "dexterity",
    secondary: "vitality",
  },
  cyborg: {
    birth: [11, 6, 17, 8, 8],
    primary: "vitality",
    secondary: "strength",
  },
  strategist: {
    birth: [5, 8, 8, 17, 12],
    primary: "intelligence",
    secondary: "spirit",
  },
  healer: {
    birth: [5, 8, 10, 12, 15],
    primary: "spirit",
    secondary: "intelligence",
  },
} as const;
export function deriveFighter(
  classId: keyof typeof classes,
  state: CharacterState,
  allocated: AttributeValues,
  gear = {
    equipped: {
      weapon: null as "training-weapon-v1" | null,
      armor: null as "dock-vest-v1" | null,
    },
    attack: 0,
    hp: 0,
    armor: 0,
  },
): Fighter {
  const spec = classes[classId];
  if (!spec) throw new AuthFault(503, "character_state_unavailable");
  const total = Object.fromEntries(
    attributeKeys.map((k, i) => [k, spec.birth[i]! + allocated[k]]),
  ) as AttributeValues;
  const attackMin =
    gear.attack +
    7 +
    Math.floor(total[spec.primary] / 3) +
    Math.floor(total[spec.secondary] / 10);
  return fighterSchema.parse({
    rulesetId: "online-combat-v2",
    classId,
    level: state.level,
    sourceVersion: state.version,
    allocated,
    total,
    equipped: gear.equipped,
    damageType:
      classId === "strategist" || classId === "healer"
        ? "elemental"
        : "physical",
    maxHp: gear.hp + 20 + 2 * total.vitality,
    attackMin,
    attackMax: attackMin + 4,
    armor: Math.min(
      6,
      gear.armor +
        Math.floor(total.vitality / 12) +
        Math.floor(total.spirit / 20),
    ),
    cooldownMs: Math.max(500, 2000 - 10 * total.dexterity),
  });
}
export async function readFighter(
  client: PoolClient,
  id: string,
  state: CharacterState,
) {
  const row = (
    await client.query<{ class_id: keyof typeof classes }>(
      "SELECT class_id FROM mare_game.characters WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!row) throw new AuthFault(503, "character_state_unavailable");
  const attributes = await readAttributes(client, id, state);
  return deriveFighter(
    row.class_id,
    state,
    attributes.allocated,
    await readGear(client, id),
  );
}
