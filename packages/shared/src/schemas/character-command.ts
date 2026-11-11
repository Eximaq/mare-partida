import {weeklyBossPayloadSchema,weeklyBossReceiptSchema} from './weekly-boss.js';
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
import {marketPayloadSchema,marketReceiptSchema} from "./market.js";
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
import {crewActions,crewCreatePayload,crewFacilities,crewProfessions,crewRecruitmentPayload} from './crew.js';
const inviteTarget = z.union([z.strictObject({targetId:z.uuid()}),z.strictObject({name:z.string().trim().min(1).max(40)})]);
const socialActions = ['friend.request','friend.respond','friend.cancel','friend.remove','contact.block','message.send','message.read',
 'mail.read','mail.claim','mail.claim-all','mail.archive','mail.archive-claimed',
 'trade.invite','trade.respond','trade.offer','trade.lock','trade.confirm','trade.cancel'] as const;
const offerVersion = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const messageIdSchema = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(id=>BigInt(id)<=9223372036854775807n);
export const characterCommandSchema = z.discriminatedUnion("action", [
 z.strictObject({...commandEnvelope,action:z.literal('weeklyBoss.execute'),payload:weeklyBossPayloadSchema}),
 z.strictObject({...commandEnvelope,action:z.enum(['friend.request','friend.remove']),payload:z.strictObject({targetId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('friend.respond'),payload:z.strictObject({requestId:z.uuid(),accept:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('friend.cancel'),payload:z.strictObject({requestId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('contact.block'),payload:z.strictObject({targetId:z.uuid(),blocked:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('message.send'),payload:z.strictObject({targetId:z.uuid(),body:z.string().trim().min(1).max(500)})}),
 z.strictObject({...commandEnvelope,action:z.literal('message.read'),payload:z.strictObject({targetId:z.uuid(),throughId:messageIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.enum(['mail.read','mail.claim','mail.archive']),payload:z.strictObject({mailId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.enum(['mail.claim-all','mail.archive-claimed']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.invite'),payload:inviteTarget}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.respond'),payload:z.strictObject({tradeId:z.uuid(),accept:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.offer'),payload:z.strictObject({tradeId:z.uuid(),expectedOfferVersion:offerVersion,itemId:instanceIdSchema,quantity:z.number().int().min(0).max(99999)})}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.lock'),payload:z.strictObject({tradeId:z.uuid(),expectedOfferVersion:offerVersion,locked:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.confirm'),payload:z.strictObject({tradeId:z.uuid(),expectedOfferVersion:offerVersion})}),
 z.strictObject({...commandEnvelope,action:z.literal('trade.cancel'),payload:z.strictObject({tradeId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('market.execute'),payload:marketPayloadSchema}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.create'),payload:crewCreatePayload}),
 z.strictObject({...commandEnvelope,action:z.enum(['crew.join','crew.apply']),payload:z.strictObject({crewId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.invite'),payload:inviteTarget}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.respond'),payload:z.strictObject({requestId:z.uuid(),accept:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.recruitment'),payload:crewRecruitmentPayload}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.role'),payload:z.strictObject({memberId:z.uuid(),role:z.enum(['officer','member'])})}),
 z.strictObject({...commandEnvelope,action:z.enum(['crew.transfer','crew.kick']),payload:z.strictObject({memberId:z.uuid()})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.leave'),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.dissolve'),payload:z.strictObject({confirmed:z.literal(true)})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.donate'),payload:z.strictObject({amount:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.upgrade'),payload:z.strictObject({facility:z.enum(crewFacilities),expectedLevel:z.number().int().min(1).max(5)})}),
 z.strictObject({...commandEnvelope,action:z.literal('crew.profession'),payload:z.strictObject({profession:z.enum(crewProfessions)})}),
 z.strictObject({...commandEnvelope,action:z.enum(['party.create','party.leave']),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('party.invite'),payload:inviteTarget}),
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
 z.strictObject({...commandEnvelope,action:z.literal('items.initialize'),payload:z.strictObject({})}),
 z.strictObject({...commandEnvelope,action:z.literal('potions.buy'),payload:z.strictObject({kind:z.enum(['health','mana']).optional(),quantity:z.number().int().min(1).max(99).optional()})}),
 z.strictObject({...commandEnvelope,action:z.literal('potions.use'),payload:z.strictObject({kind:z.enum(['health','mana']).optional()})}),
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
  action: z.enum(["weeklyBoss.execute", "state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim", "attributes.allocate", "inventory.buy", "inventory.sell", "equipment.equip", "equipment.unequip",...originalActionSchema.options,...partyActions,...crewActions,...socialActions,'market.execute',...worldActions,...battleActions,...prisonActions,...dungeonActions,...hakiActions,'battle.reward','contract.claim','talents.commit','talents.reset','achievement.claim','hierarchy.promote','fruit.register','fruit.cast','fruit.transform','fruit.move','profile.appearance','profile.preferences','profile.identity']),
  weeklyBoss:weeklyBossReceiptSchema.optional(),
  world:worldSnapshotSchema.optional(),
  attributes: attributeSnapshotSchema.optional(),
  inventory: inventorySnapshotSchema.optional(),
  mail: z.strictObject({claimed:z.array(z.uuid()),pending:z.array(z.uuid()),reason:z.literal('inventory_full').optional()}).optional(),
  market: marketReceiptSchema.optional(),
  state: characterStateSchema,
  // Optional so immutable receipts from earlier protocol increments remain valid.
  combat: combatSnapshotSchema.optional(),
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
