import type {PoolClient} from "pg";
import {levelProgressionSchema,type CharacterState} from "@mare/shared";
import {AuthFault} from "../auth/errors.js";

// Reward mutation, level history and receipt share the existing authorized transaction.
export async function advanceLevel(client:PoolClient,id:string,requestId:string,state:CharacterState) {
  const row=(await client.query<{level:number;experience:string}>(`SELECT l.level,p.experience::text
    FROM mare_game.character_progression p JOIN mare_game.progression_levels l ON l.required_experience<=p.experience
    WHERE p.character_id=$1 ORDER BY l.level DESC LIMIT 1`,[id])).rows[0];
  if(!row || row.level<state.level) throw new AuthFault(503,"character_state_unavailable");
  if(row.level===state.level) return;
  await client.query(`INSERT INTO mare_game.character_level_ledger(character_id,level,request_id,experience_total,version_before)
    SELECT $1,level,$2,$3,$4 FROM mare_game.progression_levels WHERE level>$5 AND level<=$6`,
    [id,requestId,row.experience,state.version,state.level,row.level]);
  const changed=await client.query("UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1 AND level=$3 RETURNING character_id",[id,row.level,state.level]);
  if(!changed.rowCount) throw new AuthFault(409,"state_version_conflict");
}

export async function readLevelProgression(client:PoolClient,state:CharacterState) {
  const row=(await client.query<{catalog_id:string;required:string;next:string|null}>(`SELECT l.catalog_id,l.required_experience::text AS required,n.required_experience::text AS next
    FROM mare_game.progression_levels l LEFT JOIN mare_game.progression_levels n ON n.level=l.level+1 WHERE l.level=$1`,[state.level])).rows[0];
  if(!row || BigInt(state.experience)<BigInt(row.required) || (row.next!==null && BigInt(state.experience)>=BigInt(row.next)))
    throw new AuthFault(503,"character_state_unavailable");
  return levelProgressionSchema.parse({catalogId:row.catalog_id,maxLevel:20,earnedAttributePoints:(state.level-1)*5,
    xpIntoLevel:(BigInt(state.experience)-BigInt(row.required)).toString(),
    xpForNextLevel:row.next===null?null:(BigInt(row.next)-BigInt(row.required)).toString(),
    xpToNextLevel:row.next===null?null:(BigInt(row.next)-BigInt(state.experience)).toString(),atCap:row.next===null});
}
