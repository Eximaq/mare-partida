import {z} from 'zod';
// Only intents are accepted. No HP, time, damage, ownership or reward fields.
export const battleActions=['battle.start','battle.auto','battle.target','battle.skill','battle.first'] as const;
export const battleTargetSchema=z.uuid().nullable();
