import {z} from 'zod';
export const hakiBranchSchema=z.enum(['armament','observation','conqueror']);
export const hakiContinuousSchema=z.enum(['armament','observation']);
export const hakiNodeSchema=z.enum(['coating','hardening','guard','imbuement','emission','armament-final','perception','anticipation','intent','serenity','future','observation-final','presence','resolve','pressure','conqueror-final']);
const integer=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const hakiStateSchema=z.strictObject({version:z.literal(2),unlocked:z.boolean(),current:z.number().finite().min(0).max(100),kingReadyAt:integer,auto:hakiContinuousSchema.nullable(),equipped:hakiContinuousSchema,mastery:z.strictObject({version:z.literal(1),seq:integer,ranks:z.partialRecord(hakiNodeSchema,z.number().int().min(1).max(3)),completedVersions:z.partialRecord(hakiBranchSchema,z.literal(1)),migration:z.null()})});
export const hakiActions=['haki.unlock','haki.invest','haki.configure','haki.toggle','haki.cast'] as const;
