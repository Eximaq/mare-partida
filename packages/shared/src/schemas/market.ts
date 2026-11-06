import { z } from 'zod';
import { instanceIdSchema } from './original-inventory.js';

const version = z.number().int().positive().max(2147483647);
const berry = z.number().int().positive().max(1_000_000_000_000);
const listing = { listingId: z.uuid(), version };
const proposal = { ...listing, proposalId: z.uuid(), proposalVersion: version };

export const marketPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('market_publish'), itemId: instanceIdSchema, quantity: z.number().int().min(1).max(99999),
    mode: z.enum(['direct','auction']), feeBps: z.union([z.literal(1000),z.literal(1500)]).optional(), price: berry.optional(), minOffer: berry.optional(), buyNow: berry.optional(),
    hours: z.union([z.literal(24),z.literal(48),z.literal(72)]) }).refine(
    x=>x.mode==='direct' ? x.price!==undefined&&x.minOffer===undefined&&x.buyNow===undefined
      : x.price===undefined&&x.minOffer!==undefined&&(x.buyNow===undefined||x.buyNow>=x.minOffer)),
  z.strictObject({ kind: z.literal('market_buy'), ...listing, amount: berry }),
  z.strictObject({ kind: z.literal('market_offer'), ...listing, amount: berry, proposalVersion: version.optional(), proposalId: z.uuid().optional() }),
  z.strictObject({ kind: z.enum(['market_withdraw','market_reject','market_accept']), ...proposal }),
  z.strictObject({ kind: z.literal('market_cancel'), ...listing }),
  z.strictObject({ kind: z.literal('market_collect'), saleId: z.uuid() }),
  z.strictObject({ kind: z.literal('market_collect_all') }),
  z.strictObject({ kind: z.literal('market_read_notices'), noticeIds: z.array(z.uuid()).min(1).max(50) }),
]);
export type MarketPayload = z.infer<typeof marketPayloadSchema>;

const moneyReceipt=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const marketReceiptSchema=z.strictObject({
  kind:z.enum(['market_publish','market_buy','market_offer','market_withdraw','market_reject','market_accept','market_cancel','market_collect','market_collect_all','market_read_notices']),
  listingId:z.uuid().optional(), proposalId:z.uuid().optional(), version:version.optional(), proposalVersion:version.optional(),
  status:z.enum(['active','sold','cancelled','expired','pending','accepted','withdrawn','rejected','closed']).optional(),
  mailId:z.uuid().optional(), gross:moneyReceipt.optional(), fee:moneyReceipt.optional(), net:moneyReceipt.optional(), collected:moneyReceipt.optional(),
});
