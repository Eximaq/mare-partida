import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Trusted, checked-in pure rule modules only. Never load paths or code from requests.
const require = createRequire(import.meta.url);
const load = (file: string) =>
  require(fileURLToPath(new URL("../../../../" + file, import.meta.url)));
const forge = load("forge-system.js"),
  prison = load("prison-system.js"),
  haki = load("haki-system.js"),
  akuma = load("akuma-system.js");
const hakiProgression = load("haki-progression.js");
const assembled = load("item-catalog.js").create({
  forge,
  prison,
  haki,
  akuma,
  hakiProgression,
});
const slots = z
  .array(z.string().min(1).max(30))
  .length(12)
  .parse([...assembled.inventorySlotsLeft, ...assembled.inventorySlotsRight]);
const definition = z
  .object({
    name: z.string().min(1).max(100),
    slot: z.string().min(1).max(30),
    attack: z.number().finite().min(0).optional(),
    defense: z.number().finite().min(0).optional(),
    hp: z.number().finite().min(0).optional(),
  })
  .passthrough()
  .refine(
    (item) =>
      item.type === "akuma_no_mi" ||
      [item.attack, item.defense, item.hp].every((n) => typeof n === "number"),
    "Equipment/material stats required",
  );
const definitions = z
  .array(definition)
  .min(100)
  .max(1000)
  .parse(JSON.parse(JSON.stringify(assembled.items)));
if (
  new Set(slots).size !== 12 ||
  assembled.capacity !== 120 ||
  !Number.isInteger(assembled.healerWeaponIndex)
)
  throw new Error("Invalid original catalog assembly");
const summary = {
  items: assembled.items,
  slots,
  capacity: assembled.capacity,
  healerWeaponIndex: assembled.healerWeaponIndex,
};
export type OriginalItem = Readonly<{
  defIndex: number;
  name: string;
  slot: string;
  attack?: number;
  defense?: number;
  hp?: number;
  [key: string]: unknown;
}>;
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const catalog = freeze({
  catalogId: "original-game-v1",
  rulesHash: createHash("sha256").update(JSON.stringify(summary)).digest("hex"),
  capacity: assembled.capacity as number,
  slots: slots as readonly string[],
  healerWeaponIndex: assembled.healerWeaponIndex as number,
  slotNames: assembled.slotNames as Readonly<Record<string, string>>,
  items: definitions.map((item, defIndex) => ({
    ...item,
    defIndex,
  })) as readonly OriginalItem[],
});
export function getGameCatalog() {
  return catalog;
}
