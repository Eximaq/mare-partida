import {randomUUID} from 'node:crypto';
import {readOriginalInventory,writeInventory} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {contractsSnapshotSchema,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {advanceLevel} from './progression.js';
import {readCharacterState} from './state.js';
import {readFighter} from './fighter.js';
import type {readPrison} from './prison.js';
const require=createRequire(import.meta.url);
export const contracts=require('../../../../contract-system.js');
const rulesHash=createHash('sha256').update(JSON.stringify(contracts.quests)).digest('hex');
const max=9223372036854775807n;
async function available(client:PoolClient){
 return !!(await client.query("SELECT to_regclass('mare_game.contract_progress') present")).rows[0].present;
}
const engine=require('../../../../world-battle.cjs');
const behavior=require('../../../../monster-behavior.js');
const impel=require('../../../../prison-system.js');
const profiles=Object.entries(engine.hunt.regions).flatMap(([area,region]:[string,any])=>{
 const slots=behavior.slots(area).filter((slot:any)=>!slot.boss);
 return [...new Set<string>(slots.map((slot:any)=>slot.type))].map(type=>{
  const group=slots.filter((slot:any)=>slot.type===type),first=group[0];
  const nearest=group.map((a:any)=>Math.min(...(group.length>1?group:slots).filter((b:any)=>a!==b).map((b:any)=>Math.hypot(a.x-b.x,a.y-b.y))));
  const travel=nearest.length&&nearest.every(Number.isFinite)?nearest.reduce((a:number,b:number)=>a+b,0)/nearest.length*1.25:200;
  return {...engine.hunt.profile(area,first.sector,type),type,area,entry:region.min,region:region.name,name:engine.prisonCatalog[type].name,slots:group.length,travel,respawnSeconds:behavior.RESPAWN_MS/1000};
 });
});
async function dailyAvailable(client:PoolClient){
 return !!(await client.query("SELECT to_regclass('mare_game.contract_daily_cycles') present")).rows[0].present;
}
type DailyInputs={state:CharacterState;fighter:Awaited<ReturnType<typeof readFighter>>;prison:Awaited<ReturnType<typeof readPrison>>};
async function dailyState(client:PoolClient,id:string,inputs?:DailyInputs){
 if(!await dailyAvailable(client))return null;
 const clock=(await client.query(`SELECT floor(extract(epoch FROM transaction_timestamp())*1000)::bigint now,
   p.level,c.faction_id,COALESCE(extract(epoch FROM p.xp_boost_until)*1000,0)::bigint boost,d.state
   FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
   LEFT JOIN mare_game.contract_daily_cycles d ON d.character_id=p.character_id
    AND d.cycle=floor(extract(epoch FROM transaction_timestamp())/86400)::int
   WHERE p.character_id=$1`,[id])).rows[0];
 if(!clock)return null;
 const cycle=contracts.day(Number(clock.now));
 let row=clock.state?{state:clock.state}:null;
 if(!row){
  const state=inputs?.state??await readCharacterState(client,id),fighter=inputs?.fighter??await readFighter(client,id,state);
  if(fighter.rulesetId!=='original-character-v1')return null;
  const prison=inputs?inputs.prison:(await client.query('SELECT state FROM mare_game.character_prison WHERE character_id=$1',[id])).rows[0]?.state;
  const cleared=prison?.cleared??0,floor=cleared+1;
  const prepared=impel.resolveEncounter(prison?.encounter,engine.prisonCatalog);
  const candidates=!impel.validFloor(floor)?[]:prepared?.floor===floor?[prepared]:
   (impel.isBossFloor(floor)?[impel.spawnImpelDownBoss(floor,engine.prisonCatalog)].filter(Boolean):impel.commonPool(engine.prisonCatalog)).map((m:any)=>impel.scaleMonster(m,floor));
  const stats=fighter.stats;
  const prisonEligible=candidates.length>0&&candidates.every((m:any)=>{
   const magic=stats.attack===stats.elemental&&stats.attack!==stats.physical;
   const hit=Math.max(1,(stats.attack-(magic?m.magicDefense*.15:m.def*.30))*.5);
   const seconds=m.hp/(hit*Math.max(.1,stats.speed));
   const incoming=m.atk*100/(100+stats.defense*3)/m.attackSec;
   return seconds<=900&&seconds*Math.max(0,incoming-stats.healthRegen)<stats.maxHP*2;
  });
  const seed=createHash('sha256').update(id+':'+cycle).digest().readUInt32BE();
  const daily=contracts.daily({cycle,level:clock.level,cleared,seed,profiles,stats,prisonEligible,goldFactor:engine.catalog.factions[clock.faction_id].gold});
  row=(await client.query('INSERT INTO mare_game.contract_daily_cycles(character_id,cycle,state) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING state',[id,cycle,JSON.stringify(daily)])).rows[0]
   ??(await client.query('SELECT state FROM mare_game.contract_daily_cycles WHERE character_id=$1 AND cycle=$2',[id,cycle])).rows[0];
 }
 if(!row)throw new AuthFault(503,'contract_unavailable');
 return {daily:row.state,xpBoostUntil:Number(clock.boost)};
}
export async function recordDailyProgress(client:PoolClient,id:string,kills:any[]){
 if(!kills.length)return;
 const entry=await dailyState(client,id);
 if(!entry||entry.daily.claimed)return;
 for(const kill of kills)contracts.applyDaily(entry.daily,kill);
 await client.query('UPDATE mare_game.contract_daily_cycles SET state=$3 WHERE character_id=$1 AND cycle=$2',[id,entry.daily.cycle,JSON.stringify(entry.daily)]);
}
export async function boostXp(client:PoolClient,id:string,xp:bigint){
 if(xp<=0n||!await dailyAvailable(client))return xp;
 const active=(await client.query('SELECT xp_boost_until>transaction_timestamp() active FROM mare_game.character_progression WHERE character_id=$1',[id])).rows[0]?.active;
 return active?xp*BigInt(contracts.dailyRules.xpMultiplier):xp;
}
async function claimDaily(client:PoolClient,id:string){
 const entry=await dailyState(client,id);
 if(!entry||!contracts.dailyComplete(entry.daily))throw new AuthFault(409,'contract_incomplete');
 if(entry.daily.claimed)throw new AuthFault(409,'contract_already_claimed');
 const stock=await readOriginalInventory(client,id);
 if(!stock||stock.inventory.length>=120)throw new AuthFault(409,'inventory_full');
 const def=getGameCatalog().items.findIndex((item:any)=>item.kind==='xp-boost');
 if(def<0)throw new AuthFault(503,'loot_catalog_unavailable');
 stock.inventory.push({id:randomUUID(),def,level:1,plus:0,rarity:'epic',locked:false,binding:'character',boundToCharacter:id,origin:'Missões diárias',obtainedAt:Date.now()});
 entry.daily.claimed=true;
 await writeInventory(client,id,stock);
 await client.query('UPDATE mare_game.contract_daily_cycles SET state=$3 WHERE character_id=$1 AND cycle=$2',[id,entry.daily.cycle,JSON.stringify(entry.daily)]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function readContracts(client:PoolClient,id:string,inputs?:DailyInputs){
 // Historical migration fixtures do not yet have this domain. New daily cycles are initialized on first access.
 if(!await available(client))return null;
 const {progress,claimed}=(await client.query(`SELECT
   COALESCE((SELECT jsonb_object_agg(contract_id,progress) FROM mare_game.contract_progress WHERE character_id=$1),'{}') progress,
   ARRAY(SELECT contract_id FROM mare_game.contract_claims WHERE character_id=$1 ORDER BY contract_id) claimed`,[id])).rows[0];
 return contractsSnapshotSchema.parse({rulesetId:contracts.rulesetId,progress:Object.fromEntries(contracts.quests.map((q:any)=>[q.id,progress[q.id]??0])),claimed,...await dailyState(client,id,inputs)});
}
// Caller owns the character lock; inserts the unique spawn receipt in the same transaction.
export async function recordContractKills(client:PoolClient,id:string,kills:any[]){
 for(const kill of kills)for(const q of contracts.matching(kill))await client.query(`
  INSERT INTO mare_game.contract_progress(character_id,contract_id,progress) VALUES($1,$2,1)
  ON CONFLICT(character_id,contract_id) DO UPDATE SET progress=LEAST($3,mare_game.contract_progress.progress+1)`,[id,q.id,q.target]);
}
export async function claimContract(client:PoolClient,id:string,requestId:string,state:CharacterState,contractId:string){
 if(contractId==='daily-reward')return claimDaily(client,id);
 const q=contracts.quests.find((q:any)=>q.id===contractId);
 if(!q)throw new AuthFault(400,'invalid_request');
 const view=await readContracts(client,id);
 if(!view)throw new AuthFault(503,'contracts_unavailable');
 if(view.claimed.includes(q.id))throw new AuthFault(409,'contract_already_claimed');
 if(view.progress[q.id as keyof typeof view.progress]<q.target)throw new AuthFault(409,'contract_incomplete');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const xpDelta=await boostXp(client,id,BigInt(q.xp));
 const gold=BigInt(state.gold)+BigInt(q.gold),xp=BigInt(state.experience)+xpDelta;
 if(gold>max||xp>max)throw new AuthFault(409,'progression_limit');
 await client.query(`INSERT INTO mare_game.contract_claims(character_id,contract_id,request_id,version_before,experience_before,gold_before,experience_delta,gold_delta,rules_hash)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,q.id,requestId,state.version,state.experience,state.gold,xpDelta.toString(),q.gold,rulesHash]);
 await client.query('UPDATE mare_game.character_progression SET experience=$2,gold=$3 WHERE character_id=$1',[id,xp.toString(),gold.toString()]);
 await advanceLevel(client,id,requestId,state);
 // Original gainXP heals on level-up. Preserve this rule without a second HP wallet.
 const after=await readCharacterState(client,id);
 if(after.level>state.level){
  const f=await readFighter(client,id,after);
  if(f.rulesetId==='original-character-v1')await client.query(`UPDATE mare_game.character_battles SET simulation=
   jsonb_set(jsonb_set(simulation,'{hp}',to_jsonb($2::int)),'{energy}',to_jsonb($3::int)) WHERE character_id=$1`,[id,f.maxHp,f.stats.maxEnergy]);
 }
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
