import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

// Foundation only: a protocol contract, not a public gameplay endpoint.
export const clientMessageSchema = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
  requestId: z.uuid(),
  sequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  type: z.literal('ping'),
  payload: z.strictObject({}),
});

export function decodeClientMessage(text: string): z.infer<typeof clientMessageSchema> {
  if (new TextEncoder().encode(text).byteLength > 4096) throw new Error('Message exceeds byte limit');
  let input: unknown;
  try { input = JSON.parse(text); } catch { throw new Error('Invalid JSON'); }
  const result = clientMessageSchema.safeParse(input);
  if (!result.success) throw new Error('Invalid message');
  return result.data;
}
