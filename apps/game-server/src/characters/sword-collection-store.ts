import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {OriginalItemInstance} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';

export type SwordCollection=Record<string,{active:boolean;fragments:number}>;
type FragmentCounts=Record<string,number>;
type Transition={collection:SwordCollection;excess:FragmentCounts};
export const swordRules=createRequire(import.meta.url)('../../../../sword-compendium.js') as {
 receive(before:SwordCollection,fragments:FragmentCounts):Transition;
 activate(before:SwordCollection,id:string):Transition|null;
 activateComplete(before:SwordCollection,id:string):Transition|null;
 roll(random:()=>number):FragmentCounts;
};
export async function readSwordCollection(client:PoolClient,characterId:string):Promise<SwordCollection>{
 const result=await client.query<{entries:SwordCollection}>('SELECT entries FROM mare_game.sword_collections WHERE character_id=$1',[characterId]);
 return result.rows[0]?.entries??{};
}
// The command wrapper already locks the owner character. Direct trades lock both owners.
export async function storeSwordCollection(client:PoolClient,characterId:string,collection:SwordCollection){
 await client.query('INSERT INTO mare_game.sword_collections(character_id,entries) VALUES($1,$2::jsonb) ON CONFLICT(character_id) DO UPDATE SET entries=EXCLUDED.entries',[characterId,JSON.stringify(collection)]);
}
export function routeSwordItems(before:SwordCollection,items:readonly OriginalItemInstance[]){
 const counts:FragmentCounts={};
 const inventoryItems=items.filter(item=>{
  const def=getGameCatalog().items[item.def];
  if(def?.kind!=='sword-fragment'||typeof def.swordId!=='string'||before[def.swordId]?.active)return true;
  counts[def.swordId]=(counts[def.swordId]??0)+(item.qty??1);
  return false;
 });
 return {collection:swordRules.receive(before,counts).collection,inventoryItems,changed:inventoryItems.length!==items.length};
}
export function swordAttachments(counts:FragmentCounts,origin:string):OriginalItemInstance[]{
 const items:OriginalItemInstance[]=[];
 for(const [id,count] of Object.entries(counts)){
  const def=getGameCatalog().items.find(item=>item.kind==='sword-fragment'&&item.swordId===id);
  if(!def||!Number.isSafeInteger(count)||count<1)throw new AuthFault(503,'sword_fragment_invalid');
  for(let left=count;left>0;left-=99999)items.push({id:randomUUID(),def:def.defIndex,qty:Math.min(left,99999),level:1,plus:0,locked:false,obtainedAt:Date.now(),origin});
 }
 return items;
}
