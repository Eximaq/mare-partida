import type {PoolClient} from "pg";
import {attributeAllocationSchema,attributeSnapshotSchema,attributeKeys,type AttributeValues,type CharacterState} from "@mare/shared";
import {AuthFault} from "../auth/errors.js";

export async function readAttributes(client:PoolClient,id:string,state:CharacterState) {
  const row=(await client.query<AttributeValues>(`SELECT coalesce(sum(strength),0)::int strength,
    coalesce(sum(dexterity),0)::int dexterity,coalesce(sum(vitality),0)::int vitality,
    coalesce(sum(intelligence),0)::int intelligence,coalesce(sum(spirit),0)::int spirit
    FROM mare_game.character_attribute_ledger WHERE character_id=$1`,[id])).rows[0]!;
  const last=(await client.query<{request_id:string}>(`SELECT request_id FROM mare_game.character_attribute_ledger
    WHERE character_id=$1 ORDER BY version_before DESC LIMIT 1`,[id])).rows[0];
  const spent=attributeKeys.reduce((n,k)=>n+row[k],0),earned=(state.level-1)*5;
  const result=attributeSnapshotSchema.safeParse({catalogId:"online-attributes-v1",allocated:row,earned,spent,available:earned-spent,lastRequestId:last?.request_id??null});
  if(!result.success) throw new AuthFault(503,"character_state_unavailable");
  return result.data;
}
// Account/character and current-controller checks are held by the command transaction.
export async function allocateAttributes(client:PoolClient,id:string,requestId:string,state:CharacterState,input:AttributeValues) {
  const allocation=attributeAllocationSchema.parse(input);
  const current=await readAttributes(client,id,state),cost=attributeKeys.reduce((n,k)=>n+allocation[k],0);
  if(cost>current.available) throw new AuthFault(409,"attribute_points_insufficient");
  if(state.version>=Number.MAX_SAFE_INTEGER) throw new AuthFault(503,"state_version_exhausted");
  const changed=await client.query("UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id",[id,state.version]);
  if(!changed.rowCount) throw new AuthFault(409,"state_version_conflict");
  await client.query(`INSERT INTO mare_game.character_attribute_ledger
    (character_id,request_id,version_before,strength,dexterity,vitality,intelligence,spirit) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id,requestId,state.version,...attributeKeys.map(k=>allocation[k])]);
  return readAttributes(client,id,state);
}
