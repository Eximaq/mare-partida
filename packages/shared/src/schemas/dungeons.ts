import {z} from 'zod';
import {akumaRankSchema,instanceIdSchema} from './original-inventory.js';
export const dungeonIdSchema=z.enum(['alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile','rob-lucci','gecko-moria','kuma','kizaru','hancock','magellan','ace','aokiji','akainu']);
export const dungeonActions=['dungeon.enter','dungeon.claim','dungeon.craft','dungeon.acknowledge'] as const;
const integer=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const dungeonItems=z.union([
 z.strictObject({materialId:z.enum(['akuma_fragment_b','akuma_fragment_c']),quantity:z.literal(10),boundToCharacter:z.uuid()}),
 z.strictObject({materialId:z.literal('legendary_weapon_fragment'),quantity:z.literal(5)}),
 z.strictObject({itemId:z.literal('epic-equipment-box'),quantity:z.literal(1),equipmentLevel:z.number().int().min(1).max(1000)}),
 z.strictObject({itemId:z.string().regex(/^sword-collection-[a-z0-9-]{1,50}$/),quantity:z.literal(1)}),
]);
const legacyReward=z.union([z.strictObject({xp:integer,berry:integer,materialId:z.enum(['akuma_fragment_e','akuma_fragment_b','epic_weapon_fragment']),quantity:z.union([z.literal(5),z.literal(10)]),boundToCharacter:z.uuid()}),z.strictObject({xp:z.literal(0),berry:z.literal(0),itemId:z.literal('will-book'),quantity:z.literal(1),boundToCharacter:z.uuid()}),z.strictObject({xp:z.literal(0),berry:z.literal(0),itemId:z.literal('epic-equipment-box'),quantity:z.literal(1),equipmentLevel:z.number().int().min(1).max(1000),boundToCharacter:z.uuid()})]);
const reward=z.union([legacyReward,z.strictObject({xp:z.literal(0),berry:z.literal(0),items:z.array(dungeonItems).min(1).max(2)})]);
const record=z.strictObject({phase:z.enum(['running','pending','claimed']),runId:z.uuid(),encounterId:z.string().max(80),spawnId:z.uuid(),ownerId:z.uuid(),startedAt:integer,berryReward:integer,defeatedAt:integer.optional(),claimedAt:integer.optional(),mailId:z.uuid().optional(),mailClaimedAt:integer.optional(),receipt:z.string().max(80).optional(),reward:reward.nullable().optional()});
export const dungeonStateSchema=z.strictObject({version:z.union([z.literal(1),z.literal(2),z.literal(3)]),seq:integer,records:z.partialRecord(dungeonIdSchema,record),reveal:z.strictObject({itemId:instanceIdSchema,fruitId:z.string().regex(/^[a-z0-9_]{1,60}$/),rank:akumaRankSchema,boundToCharacter:z.uuid().optional(),createdAt:integer}).nullable()});
