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
export async function readContracts(client:PoolClient,id:string){
 // Historical migration fixtures do not yet have this domain. Reads never initialize it.
 if(!await available(client))return null;
 const rows=(await client.query('SELECT contract_id,progress FROM mare_game.contract_progress WHERE character_id=$1',[id])).rows;
 const claimed=(await client.query('SELECT contract_id FROM mare_game.contract_claims WHERE character_id=$1 ORDER BY contract_id',[id])).rows;
 return contractsSnapshotSchema.parse({rulesetId:contracts.rulesetId,progress:Object.fromEntries(contracts.quests.map((q:any)=>[q.id,rows.find(r=>r.contract_id===q.id)?.progress??0])),claimed:claimed.map(r=>r.contract_id)});
}
// Caller owns the character lock; inserts the unique spawn receipt in the same transaction.
export async function recordContractKills(client:PoolClient,id:string,kills:any[]){
 for(const kill of kills)for(const q of contracts.matching(kill))await client.query(`
  INSERT INTO mare_game.contract_progress(character_id,contract_id,progress) VALUES($1,$2,1)
  ON CONFLICT(character_id,contract_id) DO UPDATE SET progress=LEAST($3,mare_game.contract_progress.progress+1)`,[id,q.id,q.target]);
}
export async function claimContract(client:PoolClient,id:string,requestId:string,state:CharacterState,contractId:string){
 const q=contracts.quests.find((q:any)=>q.id===contractId);
 if(!q)throw new AuthFault(400,'invalid_request');
 const view=await readContracts(client,id);
 if(!view)throw new AuthFault(503,'contracts_unavailable');
 if(view.claimed.includes(q.id))throw new AuthFault(409,'contract_already_claimed');
 if(view.progress[q.id as keyof typeof view.progress]<q.target)throw new AuthFault(409,'contract_incomplete');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const gold=BigInt(state.gold)+BigInt(q.gold),xp=BigInt(state.experience)+BigInt(q.xp);
 if(gold>max||xp>max)throw new AuthFault(409,'progression_limit');
 await client.query(`INSERT INTO mare_game.contract_claims(character_id,contract_id,request_id,version_before,experience_before,gold_before,experience_delta,gold_delta,rules_hash)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,q.id,requestId,state.version,state.experience,state.gold,q.xp,q.gold,rulesHash]);
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
