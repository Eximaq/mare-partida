import { z } from "zod";
import {fighterSchema} from "./fighter.js";

export const combatSnapshotSchema = z.strictObject({
  catalogId: z.literal("dock-raider-v1"),
  enemyName: z.string().max(80),
  status: z.enum(["locked", "available", "active", "won", "lost", "claimed"]),
  playerHp: z.number().int().min(0).max(300),
  playerMaxHp: z.number().int().min(30).max(300),
  fighter: fighterSchema.nullable().optional(),
  enemyHp: z.number().int().min(0).max(36),
  enemyMaxHp: z.literal(36),
  turn: z.number().int().min(0).max(4),
  attackReady: z.boolean(),
  nextAttackAt: z.iso.datetime().nullable(),
  lastRequestId: z.uuid().nullable(),
  lastAttack: z.strictObject({ playerDamage: z.number().int().min(1).max(36), enemyDamage: z.number().int().min(0).max(11) }).nullable(),
  experience: z.literal("30"),
  gold: z.literal("12"),
  // Optional only for immutable pre-3G receipts. Current reads always include these.
  encounterId: z.uuid().nullable().optional(),
  encounterNumber: z.number().int().min(0).max(2147483647).optional(),
  canBegin: z.boolean().optional(),
  nextEncounterAt: z.iso.datetime().nullable().optional(),
  startsRemaining: z.number().int().min(0).max(10).optional(),
  historyFull: z.boolean().optional(),
}).refine(v=>v.playerHp<=v.playerMaxHp && v.playerMaxHp===(v.fighter?.maxHp??30));
export type CombatSnapshot = z.infer<typeof combatSnapshotSchema>;
