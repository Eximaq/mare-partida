import {z} from 'zod';
const nodeId=z.string().regex(/^(sword|brawler|gunner|rogue|cyborg|strategist|healer)-[0-2]-[0-4]$/);
const passiveId=z.string().regex(/^[a-zA-Z]{1,32}$/).nullable();
export const talentBuildSchema=z.strictObject({nodes:z.record(nodeId,z.number().int().min(0).max(10)).refine(v=>Object.keys(v).length<=15),keystone:passiveId,ultimate:passiveId});
export const talentSnapshotSchema=z.strictObject({rulesetId:z.literal('original-talents-v1'),revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),earned:z.number().int().min(1).max(2147483719),spent:z.number().int().min(0).max(154),available:z.number().int().min(0).max(2147483719),build:talentBuildSchema});
export type TalentBuild=z.infer<typeof talentBuildSchema>;
