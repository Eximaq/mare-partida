import type {PoolClient} from "pg";
import {levelProgressionSchema,type CharacterState} from "@mare/shared";
import {AuthFault} from "../auth/errors.js";
import {advanceOriginalLevel,previousXpNeeded,xpNeeded} from '../gameplay/character.js';

// At most20 levels per reward, matching gainXP. Exact BIGINT XP and immutable receipts.
export async function advanceLevel(client:PoolClient,id:string,requestId:string,state:CharacterState,original?:boolean) {
  const row=(await client.query<{level:number;experience:string;start:string}>(`SELECT level,experience::text,level_start_experience::text AS start
    FROM mare_game.character_progression WHERE character_id=$1`,[id])).rows[0];
  if(!row||row.level!==state.level)throw new AuthFault(503,"character_state_unavailable");
  // Workers already validated the fighter/inventory under these same locks.
  // Older tutorial callers still discover the schema and owned inventory here.
  if(original===undefined){
    const present=(await client.query("SELECT to_regclass('mare_game.game_inventory') IS NOT NULL AS present")).rows[0].present;
    original=!!(present&&(await client.query('SELECT 1 FROM mare_game.game_inventory WHERE character_id=$1',[id])).rowCount);
  }
  const next=advanceOriginalLevel({level:row.level,start:BigInt(row.start),experience:BigInt(row.experience)},20,original?xpNeeded:previousXpNeeded);
  if(next.level===state.level)return;
  for(const earned of next.levels)await client.query(`INSERT INTO mare_game.character_level_ledger(character_id,level,request_id,experience_total,version_before)
    VALUES($1,$2,$3,$4,$5)`,[id,earned.level,requestId,row.experience,state.version]);
  const changed=await client.query(`UPDATE mare_game.character_progression SET level=$2,level_start_experience=$3
    WHERE character_id=$1 AND level=$4 RETURNING character_id`,[id,next.level,next.start.toString(),state.level]);
  if(!changed.rowCount)throw new AuthFault(409,"state_version_conflict");
}
export async function readLevelProgression(client:PoolClient,state:CharacterState,original:boolean) {
  const row=(await client.query<{start:string}>(`SELECT level_start_experience::text AS start FROM mare_game.character_progression WHERE character_id=$1`,[state.characterId])).rows[0];
  if(!row||BigInt(state.experience)<BigInt(row.start))throw new AuthFault(503,"character_state_unavailable");
  const into=BigInt(state.experience)-BigInt(row.start),cost=BigInt((original?xpNeeded:previousXpNeeded)(state.level));
  return levelProgressionSchema.parse({catalogId:"original-levels-v1",maxLevel:null,earnedAttributePoints:(state.level-1)*5,
    xpIntoLevel:into.toString(),xpForNextLevel:cost.toString(),xpToNextLevel:(cost>into?cost-into:0n).toString(),atCap:false});
}
