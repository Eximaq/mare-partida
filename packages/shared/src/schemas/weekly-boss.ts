import {z} from 'zod';
import {worldPointSchema} from './world.js';
const profile=z.strictObject({hp:z.number().int().min(1).max(1e9),attack:z.number().min(1).max(1e6),defense:z.number().min(0).max(1e6),magicDefense:z.number().min(0).max(1e6),speed:z.number().min(1).max(240),reach:z.number().min(24).max(160),attackSec:z.number().min(1).max(30),aoeCooldown:z.number().min(4).max(120),aoeRadius:z.number().min(48).max(240),aoeWindup:z.number().min(.8).max(5),aoeMultiplier:z.number().min(.1).max(10),level:z.number().int().min(1).max(1000),leash:z.number().min(240).max(1200)});
export const weeklyBossConfigSchema=z.strictObject({mapId:z.literal('marineford'),spawn:worldPointSchema,entry:worldPointSchema,maxPlayers:z.number().int().min(1).max(16),minLevel:z.number().int().min(1).max(1000),durationMinutes:z.number().int().min(1).max(180),balanceApproved:z.literal(true),profile});
const version=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const weeklyBossPayloadSchema=z.discriminatedUnion('op',[
 z.strictObject({op:z.literal('configure'),revision:version,config:weeklyBossConfigSchema}),
 z.strictObject({op:z.literal('activate'),revision:version}),
 z.strictObject({op:z.literal('test')}),
 z.strictObject({op:z.literal('join'),eventId:z.uuid()}),
 z.strictObject({op:z.literal('leave')}),
 z.strictObject({op:z.literal('cancel'),eventId:z.uuid(),version}),
]);
export const weeklyBossReceiptSchema=z.strictObject({eventId:z.uuid().optional(),revision:version.optional()});
export type WeeklyBossPayload=z.infer<typeof weeklyBossPayloadSchema>;
