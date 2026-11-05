import {z} from 'zod';
export const contractIds=['crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol'] as const;
export const contractIdSchema=z.enum(contractIds);
export const contractClaimIdSchema=z.union([contractIdSchema,z.literal('daily-reward')]);
export const contractsSnapshotSchema=z.strictObject({
 rulesetId:z.literal('original-contracts-v1'),
 progress:z.record(contractIdSchema,z.number().int().min(0).max(40)),
 claimed:z.array(contractIdSchema).max(10),
 daily:z.strictObject({
  cycle:z.number().int(),endsAt:z.number().int(),claimed:z.boolean(),
  objectives:z.array(z.strictObject({
   id:z.enum(['daily-combat','daily-berry','daily-prison','daily-reinforcement']),
   title:z.string(),desc:z.string(),target:z.number().int().positive(),current:z.number().int().nonnegative(),
   area:z.string().optional(),type:z.string().optional(),floor:z.number().int().optional(),
  })).min(2).max(3),
 }).optional(),
 xpBoostUntil:z.number().int().nonnegative().optional(),
});
