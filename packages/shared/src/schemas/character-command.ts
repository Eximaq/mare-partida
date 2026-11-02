import {dungeonActions,dungeonIdSchema} from './dungeons.js';
import {prisonActions,prisonFloorSchema} from './prison.js';
import {achievementIdSchema} from './achievements.js';
import {talentBuildSchema} from './talents.js';
import {worldPointSchema,worldActions,worldSnapshotSchema} from './world.js';
import {contractIdSchema} from './contracts.js';
import {battleActions,battleTargetSchema} from './battle.js';
import {inventoryTradeSchema,inventorySnapshotSchema,equipmentItemSchema,equipmentSlotSchema} from "./inventory.js";
import { z } from "zod";
import {originalActionSchema,instanceIdSchema,originalSlotSchema,forgeOperationSchema} from './original-inventory.js';
import { renewControlSchema } from "./auth.js";
import { characterStateSchema } from "./character-state.js";
import { combatSnapshotSchema } from "./combat.js";

import {attributeAllocationSchema,attributeSnapshotSchema} from "./attributes.js";

const commandEnvelope = {
  requestId: z.uuid(),
  expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  control: renewControlSchema,
};
export const characterCommandSchema = z.discriminatedUnion("action", [
 z.strictObject({...commandEnvelope,action:z.enum(['dungeon.enter','dungeon.claim']),payload:z.strictObject({dungeonId:dungeonIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('dungeon.craft'),payload:z.strictObject({expectedSeq:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)})}),
 z.strictObject({...commandEnvelope,action:z.literal('dungeon.acknowledge'),payload:z.strictObject({itemId:instanceIdSchema})}),z.strictObject({...commandEnvelope,action:z.enum(prisonActions),payload:z.strictObject({floor:prisonFloorSchema})}),z.strictObject({...commandEnvelope,action:z.literal('achievement.claim'),payload:z.strictObject({achievementId:achievementIdSchema})}),z.strictObject({...commandEnvelope,action:z.literal('talents.commit'),payload:z.strictObject({build:talentBuildSchema})}),z.strictObject({...commandEnvelope,action:z.literal('talents.reset'),payload:z.strictObject({})}),z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim"]),
  expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  control: renewControlSchema,
  payload: z.strictObject({}),
}), z.strictObject({...commandEnvelope,action:z.literal("attributes.allocate"),payload:z.strictObject({allocation:attributeAllocationSchema})}),
 z.strictObject({...commandEnvelope,action:z.enum(["inventory.buy","inventory.sell"]),payload:inventoryTradeSchema}),
 z.strictObject({...commandEnvelope,action:z.literal("equipment.equip"),payload:z.strictObject({itemId:equipmentItemSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal("equipment.unequip"),payload:z.strictObject({slot:equipmentSlotSchema})}),
 z.strictObject({...commandEnvelope,action:z.enum(['items.initialize','potions.buy','potions.use']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.enum(['items.equip','items.sell','items.open-box']),payload:z.strictObject({itemId:instanceIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('items.unequip'),payload:z.strictObject({slot:originalSlotSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('items.lock'),payload:z.strictObject({itemId:instanceIdSchema,locked:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('forge.execute'),payload:z.strictObject({operation:forgeOperationSchema})}),
 z.strictObject({...commandEnvelope,action:z.enum(['world.initialize','world.stop','world.return']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('world.move'),payload:worldPointSchema}),
 z.strictObject({...commandEnvelope,action:z.literal('world.travel'),payload:z.strictObject({islandId:z.string().regex(/^[a-z0-9-]{1,40}$/)})}),
 z.strictObject({...commandEnvelope,action:z.enum(['battle.start','battle.first']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('battle.auto'),payload:z.strictObject({enabled:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('battle.target'),payload:z.strictObject({targetId:battleTargetSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('battle.skill'),payload:z.strictObject({index:z.number().int().min(0).max(1)})}),
 z.strictObject({...commandEnvelope,action:z.literal('contract.claim'),payload:z.strictObject({contractId:contractIdSchema})}),
]);
export const characterCommandResultSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim", "attributes.allocate", "inventory.buy", "inventory.sell", "equipment.equip", "equipment.unequip",...originalActionSchema.options,...worldActions,...battleActions,...prisonActions,...dungeonActions,'battle.reward','contract.claim','talents.commit','talents.reset','achievement.claim']),
  world:worldSnapshotSchema.optional(),
  attributes: attributeSnapshotSchema.optional(),
  inventory: inventorySnapshotSchema.optional(),
  state: characterStateSchema,
  // Optional so immutable receipts from earlier protocol increments remain valid.
  combat: combatSnapshotSchema.optional(),
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
