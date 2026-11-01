import { z } from "zod";

export const combatSnapshotSchema = z.strictObject({
  catalogId: z.literal("dock-raider-v1"),
  enemyName: z.string().max(80),
  status: z.enum(["locked", "available", "active", "won", "lost", "claimed"]),
  playerHp: z.number().int().min(0).max(30),
  playerMaxHp: z.literal(30),
  enemyHp: z.number().int().min(0).max(36),
  enemyMaxHp: z.literal(36),
  turn: z.number().int().min(0).max(4),
  attackReady: z.boolean(),
  nextAttackAt: z.iso.datetime().nullable(),
  lastRequestId: z.uuid().nullable(),
  lastAttack: z.strictObject({ playerDamage: z.number().int().min(1).max(14), enemyDamage: z.number().int().min(0).max(11) }).nullable(),
  experience: z.literal("30"),
  gold: z.literal("12"),
  // Optional only for immutable pre-3G receipts. Current reads always include these.
  encounterId: z.uuid().nullable().optional(),
  encounterNumber: z.number().int().min(0).max(100).optional(),
  canBegin: z.boolean().optional(),
  nextEncounterAt: z.iso.datetime().nullable().optional(),
  startsRemaining: z.number().int().min(0).max(10).optional(),
  historyFull: z.boolean().optional(),
});
export type CombatSnapshot = z.infer<typeof combatSnapshotSchema>;
