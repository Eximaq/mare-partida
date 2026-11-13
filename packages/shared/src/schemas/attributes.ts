import {z} from "zod";
export const attributeKeys = ["strength","dexterity","vitality","intelligence","spirit"] as const;
const points=z.number().int().min(0).max(2147483647);
export const attributeValuesSchema=z.strictObject({strength:points,dexterity:points,vitality:points,intelligence:points,spirit:points});
export const attributeAllocationSchema=attributeValuesSchema.refine(v=>{
  const sum=attributeKeys.reduce((n,k)=>n+v[k],0);return sum>0 && sum<=2147483647;
});
export const attributeBuildProfileSchema=z.enum(['brawler','sword','rogue','gunner','cyborg','strategist','healer']);
export const attributeBuildSchema=z.strictObject({profile:attributeBuildProfileSchema,automatic:z.boolean(),credits:z.strictObject(Object.fromEntries(attributeKeys.map(k=>[k,z.number().int().min(-1000).max(1000)])) as Record<typeof attributeKeys[number],z.ZodNumber>)});
export const attributeSnapshotSchema=z.strictObject({
  catalogId:z.literal("online-attributes-v1"),allocated:attributeValuesSchema,
  build:attributeBuildSchema.nullable().optional(),
  earned:points,spent:points,available:points,lastRequestId:z.uuid().nullable(),
}).refine(v=>attributeKeys.reduce((n,k)=>n+v.allocated[k],0)===v.spent && v.available===v.earned-v.spent);
export type AttributeValues=z.infer<typeof attributeValuesSchema>;
