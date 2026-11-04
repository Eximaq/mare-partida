import type {PoolClient} from 'pg';
import {createRequire} from 'node:module';
import {characterStateSchema,appearanceSchema,preferencesSchema} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {attributeView} from './attributes.js';
import {talentView} from './talents.js';
import {fruitView} from './fruits.js';
import {hakiView} from './haki.js';
import {readProfile} from './profile.js';
import {originalInventoryView} from '../gameplay/inventory.js';
import {deriveOriginalFighter} from '../gameplay/character.js';
const runtime=createRequire(import.meta.url)('../../../../talent-runtime.cjs');
/** Current-schema, server-internal inputs. Caller must hold the existing character/
 * Party authorization locks. No cache survives this call, transaction or tick.
 * Batch size is bounded by the four-member roster, never supplied by a route. */
export async function readCombatInputs(c:PoolClient,ids:readonly string[]){
 const unique=[...new Set(ids)];if(unique.length>4)throw new RangeError('combat_batch_too_large');
 const result=new Map<string,CombatInputs>();if(!unique.length)return result;
 const rows=(await c.query(`SELECT ch.id,ch.class_id,ch.faction_id,ch.state_version::float8 version,
 p.level,p.experience::text,p.gold::text,to_jsonb(i) inventory,t.build,t.revision,coalesce(a.budget,0) legacy_budget,pr.appearance,pr.preferences,
 (SELECT jsonb_build_object('strength',coalesce(sum(strength),0),'dexterity',coalesce(sum(dexterity),0),
 'vitality',coalesce(sum(vitality),0),'intelligence',coalesce(sum(intelligence),0),'spirit',coalesce(sum(spirit),0))
 FROM mare_game.character_attribute_ledger WHERE character_id=ch.id) allocated,
 (SELECT request_id FROM mare_game.character_attribute_ledger WHERE character_id=ch.id ORDER BY version_before DESC LIMIT 1) last_request_id,
 (SELECT coalesce(sum(points),0)::int FROM mare_game.achievement_claims WHERE character_id=ch.id) bonus,
 ARRAY(SELECT fruit_id FROM mare_game.fruit_registrations WHERE character_id=ch.id ORDER BY fruit_id) registered
 FROM mare_game.characters ch JOIN mare_game.character_progression p ON p.character_id=ch.id
 LEFT JOIN mare_game.game_inventory i ON i.character_id=ch.id
 LEFT JOIN mare_game.character_talents t ON t.character_id=ch.id
 LEFT JOIN mare_game.talent_legacy_allowances a ON a.character_id=ch.id
 LEFT JOIN mare_game.character_profile pr ON pr.character_id=ch.id
 WHERE ch.id=ANY($1::uuid[])`,[unique])).rows;
 for(const row of rows){
  const state=characterStateSchema.parse({characterId:row.id,version:row.version,level:row.level,experience:row.experience,gold:row.gold});
  const attributes=attributeView(row.allocated,row.last_request_id,state),inventory=originalInventoryView(row.inventory,row.id);
  const talents=talentView(row,state,row.bonus),fruits=fruitView(row.registered);
  // Preserve lazy initialization only for historical rows without a profile.
  const fallback=row.preferences?null:await readProfile(c,row.id);
  const preferences=preferencesSchema.parse(row.preferences??fallback?.preferences),appearance=appearanceSchema.parse(row.appearance??fallback?.appearance);
  result.set(row.id,{state,attributes,inventory,talents,fruits,preferences,appearance,permanentPower:()=>{if(!inventory)return 0;const f=deriveOriginalFighter(row.class_id,row.faction_id,state,attributes.allocated,inventory,talents.build,undefined,undefined,fruits);return f.rulesetId==='original-character-v1'?Math.min(1000000000,Math.max(0,Math.floor(f.stats.power))):0;},fighter:(battle:any)=>{if(!inventory)throw new AuthFault(503,'original_inventory_required');return deriveOriginalFighter(row.class_id,row.faction_id,state,attributes.allocated,inventory,talents.build,battle?runtime.load(battle):undefined,battle?hakiView(battle):undefined,fruits,battle);}});
 }
 if(result.size!==unique.length)throw new AuthFault(503,'character_state_unavailable');return result;
}
type CombatInputs={attributes:ReturnType<typeof attributeView>;fruits:ReturnType<typeof fruitView>;permanentPower:()=>number;state:ReturnType<typeof characterStateSchema.parse>;inventory:ReturnType<typeof originalInventoryView>;talents:ReturnType<typeof talentView>;preferences:ReturnType<typeof preferencesSchema.parse>;appearance:ReturnType<typeof appearanceSchema.parse>;fighter:(battle:any)=>ReturnType<typeof deriveOriginalFighter>};
