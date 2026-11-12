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
const require=createRequire(import.meta.url);
export const contracts=require('../../../../contract-system.js');
const rulesHash=createHash('sha256').update(JSON.stringify(contracts.quests)).digest('hex');
const max=9223372036854775807n;
async function available(client:PoolClient){
 return !!(await client.query("SELECT to_regclass('mare_game.contract_progress') present")).rows[0].present;
}
const engine=require('../../../../world-battle.cjs');
async function dailyAvailable(client:PoolClient){
 return !!(await client.query("SELECT to_regclass('mare_game.contract_daily_cycles') present")).rows[0].present;
}
type DailyInputs={state:CharacterState;legacyFighter?:()=>Awaited<ReturnType<typeof readFighter>>};
const tableByPeriod={daily:'contract_daily_cycles',weekly:'contract_weekly_cycles'} as const;
type Period=keyof typeof tableByPeriod;
async function recurringState(client:PoolClient,id:string){
 const clock=(await client.query(`
  SELECT to_regclass('mare_game.contract_daily_cycles') daily,to_regclass('mare_game.contract_weekly_cycles') weekly,
   floor(extract(epoch FROM transaction_timestamp())*1000)::bigint now,p.level,c.faction_id,c.class_id,
   COALESCE(extract(epoch FROM (to_jsonb(p)->>'xp_boost_until')::timestamptz)*1000,0)::bigint boost
  FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id WHERE p.character_id=$1
 `,[id])).rows[0];
 if(!clock?.daily)return null;
 const now=Number(clock.now),day=contracts.day(now),week=contracts.week(now);
 const states=(await client.query(`
  SELECT 'daily' period,state FROM mare_game.contract_daily_cycles WHERE character_id=$1 AND cycle=$2
  ${clock.weekly?"UNION ALL SELECT 'weekly' period,state FROM mare_game.contract_weekly_cycles WHERE character_id=$1 AND cycle=$3":''}
 `,clock.weekly?[id,day,week]:[id,day])).rows;
 const read=async (period:Period,cycle:number)=>{
  const table=tableByPeriod[period],previous=states.find(row=>row.period===period)?.state;
  const input={cycle,level:clock.level,classId:clock.class_id,goldFactor:engine.catalog.factions[clock.faction_id].gold};
  const state=period==='daily'?contracts.rebalanceDaily(previous,input):previous??contracts.weekly(input);
  if(state===previous)return state;
  const updated=previous
   ?await client.query('UPDATE mare_game.'+table+' SET state=$3 WHERE character_id=$1 AND cycle=$2 AND state=$4 RETURNING state',[id,cycle,JSON.stringify(state),JSON.stringify(previous)])
   :await client.query('INSERT INTO mare_game.'+table+'(character_id,cycle,state) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING state',[id,cycle,JSON.stringify(state)]);
  return updated.rows[0]?.state??(await client.query('SELECT state FROM mare_game.'+table+' WHERE character_id=$1 AND cycle=$2',[id,cycle])).rows[0].state;
 };
 const daily=await read('daily',day),weekly=clock.weekly?await read('weekly',week):undefined;
 return {daily,...(weekly?{weekly}:{}),xpBoostUntil:Number(clock.boost)};
}
export async function recordDailyProgress(client:PoolClient,id:string,kills:any[]){
 if(!kills.length)return;
 const entry=await recurringState(client,id);if(!entry)return;
 for(const period of ['daily','weekly'] as const){
  const state=entry[period];if(!state||state.claimed)continue;
  for(const kill of new Map(kills.map(k=>[k.id,k])).values())contracts.applyDaily(state,kill);
  await client.query('UPDATE mare_game.'+tableByPeriod[period]+' SET state=$3 WHERE character_id=$1 AND cycle=$2',[id,state.cycle,JSON.stringify(state)]);
 }
}
export async function boostXp(client:PoolClient,id:string,xp:bigint){
 if(xp<=0n||!await dailyAvailable(client))return xp;
 const active=(await client.query('SELECT xp_boost_until>transaction_timestamp() active FROM mare_game.character_progression WHERE character_id=$1',[id])).rows[0]?.active;
 return active?xp*BigInt(contracts.dailyRules.xpMultiplier):xp;
}
async function claimRecurring(client:PoolClient,id:string,period:Period){
 const entry=(await recurringState(client,id))?.[period];
 if(!entry||!contracts.dailyComplete(entry))throw new AuthFault(409,'contract_incomplete');
 if(entry.claimed)throw new AuthFault(409,'contract_already_claimed');
 const quantity=period==='weekly'?contracts.dailyRules.weeklyBoosts:contracts.dailyRules.dailyBoosts;
 const stock=await readOriginalInventory(client,id);
 if(!stock||stock.inventory.length+quantity>120)throw new AuthFault(409,'inventory_full');
 const def=getGameCatalog().items.findIndex((item:any)=>item.kind==='xp-boost');
 if(def<0)throw new AuthFault(503,'loot_catalog_unavailable');
 for(let i=0;i<quantity;i++)stock.inventory.push({id:randomUUID(),def,level:1,plus:0,rarity:'epic',locked:false,origin:period==='weekly'?'Missões semanais':'Missões diárias',obtainedAt:Date.now()});
 entry.claimed=true;
 await writeInventory(client,id,stock);
 await client.query('UPDATE mare_game.'+tableByPeriod[period]+' SET state=$3 WHERE character_id=$1 AND cycle=$2',[id,entry.cycle,JSON.stringify(entry)]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function readContracts(client:PoolClient,id:string,_inputs?:DailyInputs){
 // Historical migration fixtures do not yet have this domain. New daily cycles are initialized on first access.
 if(!await available(client))return null;
 const {progress,claimed}=(await client.query(`SELECT
   COALESCE((SELECT jsonb_object_agg(contract_id,progress) FROM mare_game.contract_progress WHERE character_id=$1),'{}') progress,
   ARRAY(SELECT contract_id FROM mare_game.contract_claims WHERE character_id=$1 ORDER BY contract_id) claimed`,[id])).rows[0];
 return contractsSnapshotSchema.parse({rulesetId:contracts.rulesetId,progress:Object.fromEntries(contracts.quests.map((q:any)=>[q.id,progress[q.id]??0])),claimed,...await recurringState(client,id)});
}
// Caller owns the character lock; inserts the unique spawn receipt in the same transaction.
export async function recordContractKills(client:PoolClient,id:string,kills:any[]){
 for(const kill of kills)for(const q of contracts.matching(kill))await client.query(`
  INSERT INTO mare_game.contract_progress(character_id,contract_id,progress) VALUES($1,$2,1)
  ON CONFLICT(character_id,contract_id) DO UPDATE SET progress=LEAST($3,mare_game.contract_progress.progress+1)`,[id,q.id,q.target]);
}
export async function claimContract(client:PoolClient,id:string,requestId:string,state:CharacterState,contractId:string){
 if(contractId==='daily-reward'||contractId==='weekly-reward')return claimRecurring(client,id,contractId==='weekly-reward'?'weekly':'daily');
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
