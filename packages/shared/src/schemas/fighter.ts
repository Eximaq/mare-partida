import { z } from "zod";
import { inventorySnapshotSchema } from "./inventory.js";
import { characterCreateSchema } from "./auth.js";
import { attributeValuesSchema } from "./attributes.js";
const total = z.number().int().min(0).max(2147483647);
const legacyFighterSchema = z
  .strictObject({
    rulesetId: z.literal("online-combat-v2"),
    classId: characterCreateSchema.shape.classId,
    level: z.number().int().min(1).max(2147483647),
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
    maxHp: z.number().int().min(30).max(2147483647),
    attackMin: z.number().int().min(10).max(2147483643),
    attackMax: z.number().int().min(14).max(2147483647),
    armor: z.number().int().min(0).max(6),
    cooldownMs: z.number().int().min(500).max(2000),
  })
  .refine((v) => v.attackMax === v.attackMin + 4);
const scalar=z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER);
const totals=z.strictObject({strength:scalar,dexterity:scalar,vitality:scalar,intelligence:scalar,spirit:scalar});
export const originalCharacterStatsSchema=z.strictObject({
  attributes:totals,preAttributes:totals,pearlPercent:totals.partial(),
  physical:scalar,elemental:scalar,attack:scalar,defense:scalar,maxHP:z.number().int().min(30).max(2147483647),
  maxEnergy:scalar,speed:z.number().positive().max(3),crit:z.number().min(0).max(.5),evasion:z.number().min(0).max(.35),
  range:scalar,accuracy:z.number().min(0).max(1),healing:scalar,healingReceivedPercent:scalar,impactResistancePercent:scalar,
  energyRegen:scalar,healthRegen:scalar,protection:z.number().min(0).max(.65),mitigation:z.number().min(0).max(1),
  regenBuff:scalar,moveSpeed:scalar,huntSpeed:scalar,power:scalar,
});
export const originalFighterSchema=z.strictObject({
  rulesetId:z.literal("original-character-v1"),rulesHash:z.string().regex(/^[a-f0-9]{64}$/),
  classId:characterCreateSchema.shape.classId,factionId:characterCreateSchema.shape.factionId,
  level:z.number().int().min(1).max(2147483647),sourceVersion:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  equipped:inventorySnapshotSchema.shape.equipped,allocated:attributeValuesSchema,total:totals,
  stats:originalCharacterStatsSchema,damageType:z.enum(["physical","elemental"]),
  maxHp:z.number().int().min(30).max(2147483647),attackMin:scalar,attackMax:scalar,armor:scalar,
  cooldownMs:z.number().int().min(334).max(10000),
}).refine(v=>v.maxHp===v.stats.maxHP&&v.attackMax>=v.attackMin);
export const fighterSchema=z.union([legacyFighterSchema,originalFighterSchema]);
export type Fighter = z.infer<typeof fighterSchema>;
