import { z } from "zod";
export const itemIdSchema = z.enum([
  "dock-scrap-v1",
  "training-weapon-v1",
  "dock-vest-v1",
]);
export const equipmentItemSchema = z.enum([
  "training-weapon-v1",
  "dock-vest-v1",
]);
export const equipmentSlotSchema = z.enum(["weapon", "armor"]);
export const inventoryTradeSchema = z.strictObject({
  itemId: itemIdSchema,
  quantity: z.number().int().min(1).max(100),
});
export const inventorySnapshotSchema = z.strictObject({
  catalogId: z.literal("online-items-v1"),
  items: z
    .array(
      z.strictObject({
        itemId: itemIdSchema,
        quantity: z.number().int().min(1).max(100000),
      }),
    )
    .max(3),
  equipped: z.strictObject({
    weapon: z.literal("training-weapon-v1").nullable(),
    armor: z.literal("dock-vest-v1").nullable(),
  }),
  lastRequestId: z.uuid().nullable(),
});
