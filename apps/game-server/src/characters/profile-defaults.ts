import {createRequire} from 'node:module';
import {appearanceSchema,preferencesSchema} from '@mare/shared';
const require=createRequire(import.meta.url);
export const defaultAppearance=appearanceSchema.parse(require('../../../../character-appearance.js').defaults);
export const defaultPreferences=preferencesSchema.parse({hideItems:false,hideHeadgear:false,healThreshold:.7});
