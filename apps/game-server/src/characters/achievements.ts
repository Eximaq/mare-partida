import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {achievementsSnapshotSchema,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory} from '../gameplay/inventory.js';
import {deriveOriginalFighter} from '../gameplay/character.js';
import {readAttributes} from './attributes.js';
import {readTalents} from './talents.js';
const require=createRequire(import.meta.url),A=require('../../../../achievement-system.js');
const rulesHash=createHash('sha256').update(JSON.stringify(A.catalog)).digest('hex');
const flags=Object.freeze({prison:false,fruit:false,haki:false,fastTravel:false,bounty:false});
const cappedGold=(n:string)=>Number(BigInt(n)>1000000n?1000000n:BigInt(n));
async function available(client:PoolClient){return !!(await client.query("SELECT to_regclass('mare_game.achievement_claims') present")).rows[0].present;}
export async function achievementBonus(client:PoolClient,id:string){
 if(!await available(client))return 0;
 return Number((await client.query('SELECT COALESCE(sum(points),0)::int points FROM mare_game.achievement_claims WHERE character_id=$1',[id])).rows[0].points);
}
// No combat runtime: temporary shields, blessings and previews never increase permanent BP.
export async function permanentAchievementPower(client:PoolClient,id:string,state:CharacterState){
 if(!await available(client))return 0;
 const inventory=await readOriginalInventory(client,id);if(!inventory)return 0;
 const identity=(await client.query('SELECT class_id,faction_id FROM mare_game.characters WHERE id=$1',[id])).rows[0];
 const attributes=await readAttributes(client,id,state),talents=await readTalents(client,id,state);
 const f=deriveOriginalFighter(identity.class_id,identity.faction_id,state,attributes.allocated,inventory,talents?.build);
 return f.rulesetId==='original-character-v1'?Math.min(100000,Math.floor(f.stats.power)):0;
}
export async function readAchievements(client:PoolClient,id:string,state:CharacterState){
 if(!await available(client))return null;
 const row=(await client.query('SELECT kills,coins,peak_power FROM mare_game.achievement_progress WHERE character_id=$1',[id])).rows[0];
 const claimed=(await client.query('SELECT achievement_id FROM mare_game.achievement_claims WHERE character_id=$1 ORDER BY achievement_id',[id])).rows.map(r=>r.achievement_id);
 const islands=(await client.query('SELECT island_id FROM mare_game.achievement_visits WHERE character_id=$1 ORDER BY island_id',[id])).rows.map(r=>r.island_id);
 const records={coins:Math.max(row?.coins??0,cappedGold(state.gold)),peakPower:Math.max(row?.peak_power??0,await permanentAchievementPower(client,id,state)),islands};
 const kills=row?.kills??0,g={level:state.level,stats:{kills},achievements:{claimed,records}};
 return achievementsSnapshotSchema.parse({rulesetId:'original-achievements-v1',claimed,bonus:A.bonus(g),kills,records,entries:A.list(g,flags)});
}
// Called only inside an authorized command or worker transaction, after its mutation.
// Replay returns before this hook; failure rolls counters back with the economy/receipt.
export async function observeServerAchievements(client:PoolClient,id:string,before:CharacterState,after:CharacterState,options:{kills?:number;island?:string;powerBefore?:number}={}){
 if(!await available(client))return;
 const kills=options.kills??0;if(!Number.isSafeInteger(kills)||kills<0)throw new AuthFault(503,'invalid_achievement_event');
 const delta=BigInt(after.gold)-BigInt(before.gold),gain=delta>0n?Number(delta>1000000n?1000000n:delta):0;
 const power=Math.max(options.powerBefore??0,await permanentAchievementPower(client,id,after));
 await client.query(`INSERT INTO mare_game.achievement_progress(character_id,kills,coins,peak_power) VALUES($1,LEAST(10000,$2::int),LEAST(1000000,$3::int+$4::int),$5)
 ON CONFLICT(character_id) DO UPDATE SET kills=LEAST(10000,mare_game.achievement_progress.kills+$2),
 coins=LEAST(1000000,GREATEST(mare_game.achievement_progress.coins,$3)+$4),peak_power=GREATEST(mare_game.achievement_progress.peak_power,$5)`,[id,Math.min(10000,kills),cappedGold(before.gold),gain,power]);
 if(options.island){
  if(!A.travelIds.includes(options.island))throw new AuthFault(503,'invalid_achievement_event');
  await client.query('INSERT INTO mare_game.achievement_visits(character_id,island_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,options.island]);
 }
}
export async function claimAchievement(client:PoolClient,id:string,requestId:string,state:CharacterState,achievementId:string){
 const view=await readAchievements(client,id,state),a=view?.entries.find(a=>a.id===achievementId);
 if(!a||!a.enabled)throw new AuthFault(409,'achievement_unavailable');
 if(a.claimed)throw new AuthFault(409,'achievement_already_claimed');
 if(!a.ready)throw new AuthFault(409,'achievement_incomplete');
 const talents=await readTalents(client,id,state);if(!talents)throw new AuthFault(503,'talents_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER||talents.revision>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 await client.query('INSERT INTO mare_game.achievement_claims(character_id,achievement_id,request_id,points,progress,version_before,rules_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,a.id,requestId,a.points,a.progress,state.version,rulesHash]);
 await client.query('INSERT INTO mare_game.character_talents(character_id,build,revision) VALUES($1,$2,$3) ON CONFLICT(character_id) DO UPDATE SET revision=EXCLUDED.revision',[id,JSON.stringify(talents.build),talents.revision+1]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
