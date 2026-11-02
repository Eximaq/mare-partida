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
export const characterCommandSchema = z.discriminatedUnion("action", [z.strictObject({
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
 z.strictObject({...commandEnvelope,action:z.enum(['items.equip','items.sell']),payload:z.strictObject({itemId:instanceIdSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('items.unequip'),payload:z.strictObject({slot:originalSlotSchema})}),
 z.strictObject({...commandEnvelope,action:z.literal('items.lock'),payload:z.strictObject({itemId:instanceIdSchema,locked:z.boolean()})}),
 z.strictObject({...commandEnvelope,action:z.literal('forge.execute'),payload:z.strictObject({operation:forgeOperationSchema})}),
]);
export const characterCommandResultSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim", "attributes.allocate", "inventory.buy", "inventory.sell", "equipment.equip", "equipment.unequip",...originalActionSchema.options]),
  attributes: attributeSnapshotSchema.optional(),
  inventory: inventorySnapshotSchema.optional(),
  state: characterStateSchema,
  // Optional so immutable receipts from earlier protocol increments remain valid.
  combat: combatSnapshotSchema.optional(),
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
