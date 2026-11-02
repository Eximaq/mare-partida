import {z} from 'zod';
export const achievementIdSchema=z.enum(["kills-0", "kills-1", "kills-2", "kills-3", "floors-0", "floors-1", "floors-2", "floors-3", "coins-0", "coins-1", "coins-2", "level-0", "level-1", "level-2", "level-3", "level-4", "power-0", "power-1", "power-2", "power-3", "power-4", "fruits-0", "fruits-1", "awakenings-0", "observation-0", "armament-0", "conqueror-0", "hakiMastery-0", "islands-0", "fastTravel-0", "bounties-0"]);
const count=(max:number)=>z.number().int().min(0).max(max);
export const achievementsSnapshotSchema=z.strictObject({
 rulesetId:z.literal('original-achievements-v1'),claimed:z.array(achievementIdSchema).max(31),bonus:count(72),kills:count(10000),
 records:z.strictObject({coins:count(1000000),peakPower:count(100000),islands:z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(32)}),
 entries:z.array(z.strictObject({id:achievementIdSchema,category:z.string().max(32),metric:z.string().max(32),name:z.string().max(100),target:count(1000000),points:count(5),feature:z.string().max(32).nullable(),progress:count(1000000),claimed:z.boolean(),enabled:z.boolean(),ready:z.boolean()})).length(31)
});
