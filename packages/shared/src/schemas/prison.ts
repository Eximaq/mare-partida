import {z} from 'zod';
export const prisonActions=['prison.prepare','prison.enter','prison.claim'] as const;
export const prisonFloorSchema=z.number().int().min(1).max(100);
const encounter=z.strictObject({floor:prisonFloorSchema,type:z.string().regex(/^[a-z0-9-]{1,60}$/),token:z.string().regex(/^impel-[a-z0-9-]{1,100}$/),spawnId:z.uuid()});
export const prisonStateSchema=z.strictObject({version:z.literal(1),cleared:z.number().int().min(0).max(100),claimed:z.array(z.number().int().min(5).max(50).multipleOf(5)).max(10).refine(a=>new Set(a).size===a.length),options:z.strictObject({autoAdvance:z.boolean(),pauseBeforeBoss:z.boolean()}),encounter:encounter.optional(),lastEncounter:encounter.optional()}).refine(p=>p.claimed.every(f=>f<=p.cleared)&&(!p.encounter||p.encounter.floor===p.cleared+1)&&(!p.lastEncounter||p.lastEncounter.floor<=p.cleared),{message:"Inconsistent prison progress"});
