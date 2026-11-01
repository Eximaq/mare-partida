import { z } from "zod";

// PostgreSQL BIGINT values travel as decimal strings, never imprecise JS numbers.
export const progressionAmountSchema = z.string().regex(/^(0|[1-9][0-9]{0,18})$/)
  .pipe(z.string().refine((value) => BigInt(value) <= 9223372036854775807n));
export const characterStateSchema = z.strictObject({
  characterId: z.uuid(),
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  level: z.number().int().min(1).max(2147483647),
  experience: progressionAmountSchema,
  gold: progressionAmountSchema,
});
export type CharacterState = z.infer<typeof characterStateSchema>;
