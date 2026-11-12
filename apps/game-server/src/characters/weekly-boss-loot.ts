import {randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {OriginalItemInstance} from '@mare/shared';
import {getGameCatalog} from '../gameplay/catalog.js';
import {sendOfficialMail} from './mail.js';

export const weeklyBossLootRules=Object.freeze({rankBChance:.01,hakiChance:.01,armamentShare:.5,quantity:1});
type BossLoot={rank_b:boolean;haki:'armament'|'observation'|null};
const secureRandom=()=>randomInt(0,0x100000000)/0x100000000;

export function rollWeeklyBossLoot(random=secureRandom):BossLoot{
 const rank_b=random()<weeklyBossLootRules.rankBChance;
 const haki=random()<weeklyBossLootRules.hakiChance
  ?(random()<weeklyBossLootRules.armamentShare?'armament':'observation'):null;
 return {rank_b,haki};
}

// The official victory transaction owns the event lock. A receipt stores both
// category results, including misses. The existing mail key deduplicates delivery.
export async function grantWeeklyBossLoot(client:PoolClient,eventId:string,eligibleCharacterIds:readonly string[],random=secureRandom){
 const catalog=getGameCatalog().items;
 for(const id of [...new Set(eligibleCharacterIds)].sort()){
  let receipt=(await client.query<BossLoot>(
   'SELECT rank_b,haki FROM mare_game.weekly_boss_loot WHERE event_id=$1 AND character_id=$2',[eventId,id]
  )).rows[0];
  if(!receipt){
   const roll=rollWeeklyBossLoot(random);
   receipt=(await client.query<BossLoot>(
    'INSERT INTO mare_game.weekly_boss_loot(event_id,character_id,rank_b,haki) VALUES($1,$2,$3,$4) RETURNING rank_b,haki',
    [eventId,id,roll.rank_b,roll.haki]
   )).rows[0]!;
  }
  if(!receipt.rank_b&&!receipt.haki)continue;
  const result=receipt;
  const makeItem=(def:number,extra:Partial<OriginalItemInstance>):OriginalItemInstance=>{
   if(def<0)throw new Error('Fragmento do Boss Semanal ausente do catálogo');
   return {id:randomUUID(),def,rarity:catalog[def]!.rarity as OriginalItemInstance['rarity'],
    level:1,plus:0,locked:false,obtainedAt:Date.now(),origin:'Boss Semanal',...extra};
  };
  await sendOfficialMail(client,id,{
   source:'event',sourceId:eventId,rewardId:'weekly-boss-fragments',title:'Recompensa do Boss Semanal',
   message:'Fragmentos obtidos na vitória do evento.',
   makeAttachments:()=>[
    ...(result.rank_b?[makeItem(catalog.findIndex(item=>item.kind==='akuma-fragment'&&item.rank==='B'),
     {materialId:'akuma_fragment_b',rank:'B',quantity:weeklyBossLootRules.quantity})]:[]),
    ...(result.haki?[makeItem(catalog.findIndex(item=>item.kind==='haki-fragment'&&item.branch===result.haki),
     {qty:weeklyBossLootRules.quantity})]:[]),
   ],
  });
 }
}
