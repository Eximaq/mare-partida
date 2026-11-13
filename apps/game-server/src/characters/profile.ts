import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {appearanceSchema,preferencesSchema,type CharacterCommand,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readWorld} from './world.js';
import {readBattle,storeBattle} from './battle.js';
import {readTalents} from './talents.js';
import {readFighter} from './fighter.js';
import {readOriginalInventory,writeInventory} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
const require=createRequire(import.meta.url),A=require('../../../../character-appearance.js'),T=require('../../../../talent-system.js'),engine=require('../../../../world-battle.cjs'),forge=require('../../../../forge-system.js');
import {defaultAppearance,defaultPreferences as preferences} from './profile-defaults.js';
async function available(client:PoolClient){return !!(await client.query("SELECT to_regclass('mare_game.character_profile') present")).rows[0].present;}
export async function initializeProfile(client:PoolClient,id:string,appearance?:unknown){
 if(!await available(client))return;
 await client.query(`INSERT INTO mare_game.character_profile(character_id,appearance,preferences,starter_classes) SELECT id,$2,$3,ARRAY[class_id] FROM mare_game.characters WHERE id=$1 ON CONFLICT DO NOTHING`,[id,JSON.stringify(appearanceSchema.parse(appearance??A.defaults)),JSON.stringify(preferences)]);
}
async function raw(client:PoolClient,id:string){
 await initializeProfile(client,id);
 return (await client.query('SELECT appearance,preferences,class_builds,starter_classes FROM mare_game.character_profile WHERE character_id=$1',[id])).rows[0];
}
export async function readProfile(client:PoolClient,id:string){
 if(!await available(client))return null;
 // Historical profiles are represented by the same defaults without writing
 // during presentation; creation and profile commands persist them explicitly.
 const row=(await client.query('SELECT appearance,preferences FROM mare_game.character_profile WHERE character_id=$1',[id])).rows[0]??{appearance:defaultAppearance,preferences},identity=(await client.query('SELECT name,class_id,faction_id,created_at FROM mare_game.characters WHERE id=$1',[id])).rows[0];
 return {rulesetId:'original-profile-v1',appearance:appearanceSchema.parse(row.appearance),preferences:preferencesSchema.parse(row.preferences),identity:{name:identity.name,classId:identity.class_id,factionId:identity.faction_id},createdAt:identity.created_at.toISOString()};
}
export async function mutateProfile(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 if(!['profile.appearance','profile.preferences','profile.identity'].includes(input.action))throw new AuthFault(400,'invalid_request');
 if(!await available(client))throw new AuthFault(503,'profile_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const before=await raw(client,id),after=structuredClone(before),audit:any={before:{...before},after:{}};
 if(input.action==='profile.preferences')after.preferences=preferencesSchema.parse({...before.preferences,...input.payload});
 if(input.action==='profile.appearance'||input.action==='profile.identity')after.appearance=appearanceSchema.parse(input.payload.appearance);
 if(input.action==='profile.identity'){
  const world=await readWorld(client,id);if(!world||world.mapId!=='lobby'||world.area!==null)throw new AuthFault(409,'profile_port_only');
  const identity=(await client.query('SELECT name,class_id,faction_id FROM mare_game.characters WHERE id=$1',[id])).rows[0];
  audit.before.identity=identity;audit.after.identity={name:input.payload.name,class_id:input.payload.classId,faction_id:input.payload.factionId};
  const b=await readBattle(client,id);if(!b)throw new AuthFault(409,'battle_not_started');
  if(identity.class_id!==input.payload.classId){
   const talents=await readTalents(client,id,state);if(!talents||talents.revision>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'talents_unavailable');
   after.class_builds[identity.class_id]=talents.build;
   const build=after.class_builds[input.payload.classId]??T.empty();
   if(T.validate(input.payload.classId,build,talents.earned,build))throw new AuthFault(503,'talent_build_invalid');
   audit.before.activeBuild=talents.build;audit.after.activeBuild=build;
   await client.query('INSERT INTO mare_game.character_talents(character_id,build,revision) VALUES($1,$2,$3) ON CONFLICT(character_id) DO UPDATE SET build=EXCLUDED.build,revision=EXCLUDED.revision',[id,JSON.stringify(build),talents.revision+1]);
   const inventory=await readOriginalInventory(client,id);if(!inventory)throw new AuthFault(409,'original_inventory_required');
   const next=structuredClone(inventory),defs=getGameCatalog().items;
   const found=next.inventory.findIndex(i=>defs[i.def]?.slot==='weapon'&&defs[i.def]?.type===input.payload.classId);
   let weapon=found<0?null:next.inventory.splice(found,1)[0]!;
   if(!after.starter_classes.includes(input.payload.classId)){
    after.starter_classes.push(input.payload.classId);
    if(!weapon){const def=({sword:0,brawler:2,gunner:4,rogue:12,cyborg:14,strategist:16,healer:31} as Record<string,number>)[input.payload.classId]!;
     weapon=forge.generateItem({id:randomUUID(),def,level:1,plus:0,rarity:'common',locked:false,obtainedAt:Date.now(),origin:'Equipamento inicial da classe'},defs,()=>randomInt(0,0x100000000)/0x100000000);}
   }
   if(next.equipment.weapon){if(next.inventory.length>=120)throw new AuthFault(409,'inventory_full');next.inventory.push(next.equipment.weapon);}
   next.equipment.weapon=weapon;
   audit.before.inventory=inventory;audit.after.inventory=next;
   await writeInventory(client,id,next);
  }
  await client.query('UPDATE mare_game.characters SET name=$2,class_id=$3,faction_id=$4 WHERE id=$1',[id,input.payload.name,input.payload.classId,input.payload.factionId]);
  // Preserve absolute cooldowns and current health/energy; editing is not a heal.
  engine.cancel(b);engine.resetHaki(b);b.talents=null;await storeBattle(client,id,b);
  const fighter=await readFighter(client,id,state);b.hp=Math.min(b.hp,fighter.maxHp);if(fighter.rulesetId==='original-character-v1')b.energy=Math.min(b.energy,fighter.stats.maxEnergy);await storeBattle(client,id,b);
 }
 audit.after={...after,...audit.after};
 await client.query('INSERT INTO mare_game.profile_events(character_id,request_id,action,version_before,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)',[id,input.requestId,input.action,state.version,JSON.stringify(audit.before),JSON.stringify(audit.after)]);
 await client.query('UPDATE mare_game.character_profile SET appearance=$2,preferences=$3,class_builds=$4,starter_classes=$5 WHERE character_id=$1',[id,JSON.stringify(after.appearance),JSON.stringify(after.preferences),JSON.stringify(after.class_builds),after.starter_classes]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
