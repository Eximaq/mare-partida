import { z } from "zod";
export const originalSlotSchema = z.enum([
  "head",
  "necklace",
  "coat",
  "legs",
  "boots",
  "weapon",
  "cloak",
  "gloves",
  "ring",
  "belt",
  "charm",
  "akuma_no_mi",
  "visual_completo",
]);
export const instanceIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9:-]+$/);
const count = z.number().int().min(0).max(1000000000);
const stat = z.number().finite().min(0).max(1000000);
export const originalItemSchema = z.strictObject({
  id: instanceIdSchema,
  def: z.number().int().min(0).max(187),
  level: z.number().int().min(1).max(100),
  plus: z.number().int().min(0).max(20),
  locked: z.boolean(),
  obtainedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  rarity: z
    .enum(["common", "uncommon", "rare", "epic", "legendary", "supreme"])
    .optional(),
  potential: z.number().int().min(0).max(100).nullable().optional(),
  generation: z.strictObject({version:z.union([z.literal(0),z.literal(1)]),family:z.enum(['basic','native','legacy']),nativeRarity:z.string().max(16).nullable(),source:z.string().max(100),baseMultiplier:stat.optional(),extraBudget:count.optional(),minBudget:count.optional(),maxBudget:count.optional()}).optional(),
  baseAttributes: z.strictObject({strength:stat,dexterity:stat,vitality:stat,intelligence:stat,spirit:stat}).optional(),
  baseStats: z
    .strictObject({ attack: stat, defense: stat, hp: stat })
    .optional(),
  extras: z
    .array(
      z.strictObject({
        stat: z.enum([
          "strength",
          "dexterity",
          "vitality",
          "intelligence",
          "spirit",
          "hp",
          "energy",
          "crit",
          "attackSpeedPercent",
          "critDamage",
        ]),
        value: stat,
        points: count.optional(),
      }),
    )
    .max(8)
    .optional(),
  sockets: z.array(z.string().max(80).nullable()).max(5).optional(),
  reforgeAttempts: count.optional(),
  forgeVersion: z.union([z.literal(4),z.literal(5)]).optional(),
  pearlId: z.string().max(80).optional(),
  materialId: z.enum(['akuma_fragment_e','akuma_fragment_d','akuma_fragment_c','akuma_fragment_b','akuma_fragment_a','akuma_fragment_s','epic_weapon_fragment']).optional(),
  qty: z.number().int().min(1).max(99999).optional(),
  quantity: z.number().int().min(1).max(9999).optional(),
  rank: z.enum(['E','D','C','B','A','S']).optional(),
  binding: z.literal('character').optional(),
  boundToCharacter: z.uuid().optional(),
  sources: z.array(z.string().max(80)).max(9).optional(),
  type: z.literal('akuma_no_mi').optional(),
  fruitId: z.string().regex(/^[a-z0-9_]{1,60}$/).optional(),
  origin: z.string().max(120).optional(),
});
const equipment = z.strictObject(
  Object.fromEntries(
    originalSlotSchema.options.map((s) => [s, s==="visual_completo"?originalItemSchema.nullable().default(null):originalItemSchema.nullable()]),
  ) as Record<
    z.infer<typeof originalSlotSchema>,
    ReturnType<typeof originalItemSchema.nullable>
  >,
);
export const originalInventorySchema = z.strictObject({
  catalogId: z.literal("original-game-v1"),
  inventory: z.array(originalItemSchema).max(120),
  equipment,
  potions: count,
  manaPotions: count.optional(),
  materials: count,
  forgeVersion: z.union([z.literal(4),z.literal(5)]),
  forgeSeq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  forgeHistory: z.array(z.record(z.string(), z.unknown())).max(12),
});
const revision = {
  expectedSeq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
};
const item = { ...revision, itemId: instanceIdSchema };
const five = z
  .array(instanceIdSchema)
  .length(5)
  .refine((a) => new Set(a).size === 5);
export const forgeOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({...revision,type:z.literal("formEpicWeapon")}),
  z.strictObject({ ...item, type: z.literal("upgrade") }),
  z.strictObject({
    ...item,
    type: z.literal("imbue"),
    pearlItemId: instanceIdSchema,
    socket: z.number().int().min(0).max(4),
  }),
  z.strictObject({
    ...item,
    type: z.literal("remove"),
    socket: z.number().int().min(0).max(4),
  }),
  z.strictObject({ ...revision, type: z.literal("fuse"), itemIds: five }),
  z.strictObject({
    ...revision,
    type: z.literal("fuseEquipment"),
    itemIds: five,
    slot: originalSlotSchema,
  }),
  z.strictObject({ ...item, type: z.literal("reforge") }),
  z.strictObject({
    ...item,
    type: z.literal("reforgeLine"),
    line: z.number().int().min(0).max(7),
  }),
]);
export const originalActionSchema = z.enum([
  "items.initialize",
  "items.equip",
  "items.unequip",
  "items.lock",
  "items.sell",
  "items.open-box",
  "items.use-xp-boost",
  "potions.buy",
  "potions.use",
  "forge.execute",
]);
export type OriginalInventory = z.infer<typeof originalInventorySchema>;
export type OriginalItemInstance = z.infer<typeof originalItemSchema>;
