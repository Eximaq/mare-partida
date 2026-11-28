import {z} from 'zod';
export const cosmeticActions=['cosmetics.claim-demo','cosmetics.equip','cosmetics.unequip'] as const;
export const cosmeticSlots=['head','coat','legs','gloves','boots','weapon'] as const;
export const cosmeticSlotSchema=z.enum(cosmeticSlots);
export const cosmeticIdSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);
export type CosmeticSlot=z.infer<typeof cosmeticSlotSchema>;
