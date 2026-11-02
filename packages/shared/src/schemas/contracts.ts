import {z} from 'zod';
export const contractIds=['crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol'] as const;
export const contractIdSchema=z.enum(contractIds);
export const contractsSnapshotSchema=z.strictObject({
 rulesetId:z.literal('original-contracts-v1'),
 progress:z.record(contractIdSchema,z.number().int().min(0).max(40)),
 claimed:z.array(contractIdSchema).max(10),
});
