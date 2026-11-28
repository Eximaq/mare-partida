import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import {cosmeticActions,type CharacterCommand,type CharacterState,type CosmeticSlot} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';

type CosmeticAction=(typeof cosmeticActions)[number];
type CosmeticCommand=Extract<CharacterCommand,{action:CosmeticAction}>;
export type CosmeticEquipment=Partial<Record<CosmeticSlot,string>>;
type CosmeticCollection={owned:string[];equipped:CosmeticEquipment;demoClaimed:boolean};
const catalog=createRequire(import.meta.url)('../../../../cosmetics.js') as {
  visualSelection(value:unknown):CosmeticEquipment;
  normalize(value:unknown):CosmeticCollection;
  execute(value:CosmeticCollection,action:CosmeticAction,payload:CosmeticCommand['payload'],appearance:unknown):CosmeticCollection;
};

export const isCosmeticCommand=(input:CharacterCommand):input is CosmeticCommand=>
  (cosmeticActions as readonly string[]).includes(input.action);

export function equippedCosmetics(value:unknown,hidden:boolean):CosmeticEquipment {
  return hidden?{}:catalog.visualSelection(value);
}

export function cosmeticCollection(value:unknown) {
  return value==null?null:catalog.normalize(value);
}

export async function mutateCosmetics(client:PoolClient,id:string,input:CosmeticCommand,state:CharacterState) {
  if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
  const {rows:[row]}=await client.query(
    "SELECT p.appearance,to_jsonb(p)->'cosmetics' AS cosmetics FROM mare_game.character_profile p WHERE p.character_id=$1",
    [id],
  );
  const before=cosmeticCollection(row?.cosmetics);
  if(!before)throw new AuthFault(503,'cosmetics_unavailable');
  let after:CosmeticCollection;
  try{
    after=catalog.execute(before,input.action,input.payload,row.appearance);
  }catch(error){
    if(error instanceof Error&&'code' in error&&typeof error.code==='string'&&error.code.startsWith('cosmetic_')){
      const conflict=error.code==='cosmetic_not_owned'||error.code==='cosmetic_body_unsupported';
      throw new AuthFault(conflict?409:400,error.code);
    }
    throw error;
  }
  if(JSON.stringify(before)===JSON.stringify(after))return;
  await client.query('UPDATE mare_game.character_profile SET cosmetics=$2 WHERE character_id=$1',[id,JSON.stringify(after)]);
  await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
