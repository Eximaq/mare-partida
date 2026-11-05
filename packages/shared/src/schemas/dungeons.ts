import {z} from 'zod';
import {instanceIdSchema} from './original-inventory.js';
export const dungeonIdSchema=z.enum(['alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile']);
export const dungeonActions=['dungeon.enter','dungeon.claim','dungeon.craft','dungeon.acknowledge'] as const;
const integer=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const reward=z.union([z.strictObject({xp:integer,berry:integer,materialId:z.enum(['akuma_fragment_e','epic_weapon_fragment']),quantity:z.union([z.literal(5),z.literal(10)]),boundToCharacter:z.uuid()}),z.strictObject({xp:z.literal(0),berry:z.literal(0),itemId:z.literal('will-book'),quantity:z.literal(1),boundToCharacter:z.uuid()})]);
const record=z.strictObject({phase:z.enum(['running','pending','claimed']),runId:z.uuid(),encounterId:z.string().max(80),spawnId:z.uuid(),ownerId:z.uuid(),startedAt:integer,berryReward:integer,defeatedAt:integer.optional(),claimedAt:integer.optional(),receipt:z.string().max(80).optional(),reward:reward.nullable().optional()});
export const dungeonStateSchema=z.strictObject({version:z.union([z.literal(1),z.literal(2),z.literal(3)]),seq:integer,records:z.partialRecord(dungeonIdSchema,record),reveal:z.strictObject({itemId:instanceIdSchema,fruitId:z.string().regex(/^[a-z0-9_]{1,60}$/),rank:z.literal('E'),boundToCharacter:z.uuid(),createdAt:integer}).nullable()});
