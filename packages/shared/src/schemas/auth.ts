import {appearanceSchema} from './profile.js';
import { z } from "zod";
export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});
export const signupSchema = loginSchema.extend({
  inviteCode: z.string().trim().min(1).max(128).optional(),
});
export const recoverSchema = z.strictObject({ email: emailSchema });
export const resetSchema = z.strictObject({ password: passwordSchema });
export const emptySchema = z.strictObject({});
export const logoutSchema = z.strictObject({
  scope: z.enum(["local", "all"]).default("local"),
});
export const characterIdentitySchema = z.strictObject({
  appearance: appearanceSchema.optional(),
  name: z
    .string()
    .transform((value) => value.normalize("NFC").trim())
    .pipe(
      z
        .string()
        .min(1)
        .max(40)
        .regex(/^[\p{L}\p{N}][\p{L}\p{M}\p{N} '\-]*$/u),
    ),
  classId: z.enum([
    "brawler",
    "sword",
    "gunner",
    "rogue",
    "cyborg",
    "strategist",
    "healer",
  ]),
  factionId: z.enum(["revolutionary", "pirate", "marine", "government"]),
});
const nameSegmenter = new Intl.Segmenter('pt-BR',{granularity:'grapheme'});
export const visibleNameLength=(name:string)=>[...nameSegmenter.segment(name.normalize('NFC'))].length;
export const characterCreateSchema = characterIdentitySchema.extend({
  name:characterIdentitySchema.shape.name.refine(name=>visibleNameLength(name)<=12,'Use até 12 caracteres no nome.'),
});
export const controlSchema = z.strictObject({
  expectedEpoch: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
});
export const renewControlSchema = z.strictObject({
  epoch: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export type CharacterCreate = z.infer<typeof characterCreateSchema>;
