import { z } from "zod";
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
}), z.strictObject({...commandEnvelope,action:z.literal("attributes.allocate"),payload:z.strictObject({allocation:attributeAllocationSchema})})]);
export const characterCommandResultSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["state.sync", "journey.begin", "hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim", "attributes.allocate"]),
  attributes: attributeSnapshotSchema.optional(),
  state: characterStateSchema,
  // Optional so immutable receipts from earlier protocol increments remain valid.
  combat: combatSnapshotSchema.optional(),
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
