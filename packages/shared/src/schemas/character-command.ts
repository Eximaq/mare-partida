import { z } from "zod";
import { renewControlSchema } from "./auth.js";
import { characterStateSchema } from "./character-state.js";

export const characterCommandSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.literal("state.sync"),
  expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  control: renewControlSchema,
  payload: z.strictObject({}),
});
export const characterCommandResultSchema = z.strictObject({
  requestId: z.uuid(),
  action: z.literal("state.sync"),
  state: characterStateSchema,
});
export type CharacterCommand = z.infer<typeof characterCommandSchema>;
export type CharacterCommandResult = z.infer<typeof characterCommandResultSchema>;
