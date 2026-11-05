import {appearanceSchema,preferencePatchSchema} from './profile.js';
import {hakiActions,hakiNodeSchema,hakiContinuousSchema} from './haki.js';
import {dungeonActions,dungeonIdSchema} from './dungeons.js';
import {prisonActions,prisonFloorSchema} from './prison.js';
import {achievementIdSchema} from './achievements.js';
import {talentBuildSchema} from './talents.js';
import {worldPointSchema,worldActions,worldSnapshotSchema} from './world.js';
import {contractClaimIdSchema} from './contracts.js';
import {battleActions,battleTargetSchema} from './battle.js';
import {inventoryTradeSchema,inventorySnapshotSchema,equipmentItemSchema,equipmentSlotSchema} from "./inventory.js";
import { z } from "zod";
import {originalActionSchema,instanceIdSchema,originalSlotSchema,forgeOperationSchema} from './original-inventory.js';
import { renewControlSchema,characterIdentitySchema } from "./auth.js";
import { characterStateSchema } from "./character-state.js";
import { combatSnapshotSchema } from "./combat.js";

import {attributeAllocationSchema,attributeSnapshotSchema} from "./attributes.js";

const commandEnvelope = {
  requestId: z.uuid(),
  expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  control: renewControlSchema,
};
import {partyActions} from './party.js';
export const characterCommandSchema = z.discriminatedUnion("action", [
 z.strictObject({...commandEnvelope,action:z.enum(['party.create','party.leave']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.invite'),payload:z.strictObject({name:z.string().trim().min(1).max(40)})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.respond'),payload:z.strictObject({inviteId:z.uuid(),accept:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.enum(['party.kick','party.promote']),payload:z.strictObject({memberId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.prepare'),payload:z.strictObject({kind:z.enum(['hunt','dungeon']),destination:z.string().regex(/^[a-z0-9-]{1,40}$/)})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.ready'),payload:z.strictObject({nonce:z.uuid(),ready:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.start'),payload:z.strictObject({nonce:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('profile.appearance'),payload:z.strictObject({appearance:appearanceSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('profile.preferences'),payload:preferencePatchSchema}),
 z.strictObject({...commandEnvelope,action:z.literal('profile.identity'),payload:characterIdentitySchema.extend({appearance:appearanceSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('fruit.cast'),payload:z.strictObject({key:z.enum(['1','2','3']),point:worldPointSchema.optional()})}),
 z.strictObject({...commandEnvelope,action:z.literal('fruit.transform'),payload:z.strictObject({enabled:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('fruit.move'),payload:worldPointSchema}),
 z.strictObject({...commandEnvelope,action:z.literal("fruit.register"),payload:z.strictObject({itemId:instanceIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal("hierarchy.promote"),payload:z.strictObject({expectedTier:z.number().int().min(1).max(5)})}),
 z.strictObject({...commandEnvelope,action:z.literal('haki.unlock'),payload:z.strictObject({itemId:instanceIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('haki.invest'),payload:z.strictObject({nodeId:hakiNodeSchema,expectedSeq:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)})}),
 z.strictObject({...commandEnvelope,action:z.literal('haki.configure'),payload:z.strictObject({branch:hakiContinuousSchema,enabled:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('haki.toggle'),payload:z.strictObject({branch:hakiContinuousSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('haki.cast'),payload:z.strictObject({})}),
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
 z.strictObject({...commandEnvelope,action:z.enum(['items.equip','items.sell','items.open-box','items.use-xp-boost']),payload:z.strictObject({itemId:instanceIdSchema})}),
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
 z.strictObject({...commandEnvelope,action:z.literal('contract.claim'),payload:z.strictObject({contractId:contractClaimIdSchema})}),
]);
export const characterCommandResultSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim", "attributes.allocate", "inventory.buy", "inventory.sell", "equipment.equip", "equipment.unequip",...originalActionSchema.options,...partyActions,...worldActions,...battleActions,...prisonActions,...dungeonActions,...hakiActions,'battle.reward','contract.claim','talents.commit','talents.reset','achievement.claim','hierarchy.promote','fruit.register','fruit.cast','fruit.transform','fruit.move','profile.appearance','profile.preferences','profile.identity']),
  world:worldSnapshotSchema.optional(),
  attributes: attributeSnapshotSchema.optional(),
  inventory: inventorySnapshotSchema.optional(),
  state: characterStateSchema,
  // Optional so immutable receipts from earlier protocol increments remain valid.
  combat: combatSnapshotSchema.optional(),
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
