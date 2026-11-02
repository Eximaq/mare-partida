import {z} from 'zod';
export const worldPointSchema=z.strictObject({x:z.number().finite().min(0).max(100000),y:z.number().finite().min(0).max(100000)});
export const worldActions=['world.initialize','world.move','world.stop','world.travel','world.return'] as const;
export const worldSnapshotSchema=z.strictObject({rulesetId:z.literal('original-world-v1'),rulesHash:z.string().regex(/^[a-f0-9]{64}$/),mapId:z.string().min(1).max(40),area:z.string().max(40).nullable(),position:worldPointSchema,path:z.array(worldPointSchema).max(128),speed:z.number().finite().min(0).max(500),direction:z.enum(['front','back','left','right']),serverNow:z.iso.datetime(),motionUntil:z.iso.datetime()});
export type WorldSnapshot=z.infer<typeof worldSnapshotSchema>;
