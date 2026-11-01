import { z } from "zod";
import { inventorySnapshotSchema } from "./inventory.js";
import { characterCreateSchema } from "./auth.js";
import { attributeValuesSchema } from "./attributes.js";
const total = z.number().int().min(0).max(112);
export const fighterSchema = z
  .strictObject({
    rulesetId: z.literal("online-combat-v2"),
    classId: characterCreateSchema.shape.classId,
    level: z.number().int().min(1).max(20),
    sourceVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    equipped: inventorySnapshotSchema.shape.equipped,
    allocated: attributeValuesSchema,
    total: z.strictObject({
      strength: total,
      dexterity: total,
      vitality: total,
      intelligence: total,
      spirit: total,
    }),
    damageType: z.enum(["physical", "elemental"]),
    maxHp: z.number().int().min(30).max(300),
    attackMin: z.number().int().min(10).max(60),
    attackMax: z.number().int().min(14).max(64),
    armor: z.number().int().min(0).max(6),
    cooldownMs: z.number().int().min(500).max(2000),
  })
  .refine((v) => v.attackMax === v.attackMin + 4);
export type Fighter = z.infer<typeof fighterSchema>;
