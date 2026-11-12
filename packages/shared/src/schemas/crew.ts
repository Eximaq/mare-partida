import {z} from 'zod';

export const crewPolicies=['open','approval'] as const;
export const crewFacilities=['hull','infirmary','galley','command','workshop','navigation','warehouse'] as const;
export const crewProfessions=['doctor','command','cook','carpenter','navigator'] as const;
export const crewActions=['crew.create','crew.join','crew.apply','crew.invite','crew.respond','crew.recruitment','crew.role','crew.transfer','crew.kick','crew.leave','crew.dissolve','crew.donate','crew.upgrade','crew.profession','crew.claim-coins','crew.buy-fragment'] as const;
export const crewPolicySchema=z.enum(crewPolicies);
export const crewMinimumLevelSchema=z.number().int().min(1).max(1000);
export const crewCreatePayload=z.strictObject({
  name:z.string().trim().min(3).max(96),
  tag:z.string().trim().regex(/^[a-z0-9]{2,6}$/i),
  flag:z.string().regex(/^[0-9a-f]{1024}$/),
  policy:crewPolicySchema,
  minLevel:crewMinimumLevelSchema,
});
export const crewRecruitmentPayload=z.strictObject({policy:crewPolicySchema,minLevel:crewMinimumLevelSchema});
