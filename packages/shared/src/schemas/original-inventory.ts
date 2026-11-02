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
]);
export const instanceIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9-]+$/);
const count = z.number().int().min(0).max(1000000000);
const stat = z.number().finite().min(0).max(1000000);
export const originalItemSchema = z.strictObject({
  id: instanceIdSchema,
  def: z.number().int().min(0).max(102),
  level: z.number().int().min(1).max(100),
  plus: z.number().int().min(0).max(20),
  locked: z.boolean(),
  obtainedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  rarity: z
    .enum(["common", "uncommon", "rare", "epic", "legendary", "supreme"])
    .optional(),
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
        ]),
        value: stat,
      }),
    )
    .max(8)
    .optional(),
  sockets: z.array(z.string().max(80).nullable()).max(5).optional(),
  reforgeAttempts: count.optional(),
  forgeVersion: z.literal(4).optional(),
  pearlId: z.string().max(80).optional(),
  origin: z.string().max(120).optional(),
});
const equipment = z.strictObject(
  Object.fromEntries(
    originalSlotSchema.options.map((s) => [s, originalItemSchema.nullable()]),
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
  materials: count,
  forgeVersion: z.literal(4),
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
  "potions.buy",
  "potions.use",
  "forge.execute",
]);
export type OriginalInventory = z.infer<typeof originalInventorySchema>;
export type OriginalItemInstance = z.infer<typeof originalItemSchema>;
