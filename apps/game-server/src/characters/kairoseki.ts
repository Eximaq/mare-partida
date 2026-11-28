import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';

export const crewCreationCost = 10;
export const kairosekiProducts = {
  'xp-1h': {price:5, item:'kairoseki-xp-boost'},
  'drop-1h': {price:5, item:'kairoseki-drop-boost'},
  'vip-7d': {price:10, days:7},
  'vip-30d': {price:20, days:30},
} as const;
export type KairosekiProduct = keyof typeof kairosekiProducts;
type KairosekiSnapshot = {
  kairoseki?:string;
  kairosekiShop?:{vipUntil:number;dropBoostUntil:number;serverNow:number;crewCreationCost:number;prices:Record<string,number>};
};

export async function spendKairoseki(client:PoolClient,id:string,price:number,days=0,needsVip=false){
  const available=await client.query("SELECT to_regprocedure('mare_game.spend_kairoseki(uuid,integer,integer,boolean)') IS NOT NULL present");
  if(!available.rows[0]?.present)throw new AuthFault(503,'kairoseki_unavailable');
  const {result}=(await client.query<{result:string}>(
    'SELECT mare_game.spend_kairoseki($1,$2,$3,$4) result',[id,price,days,needsVip],
  )).rows[0]!;
  if(result!=='ok')throw new AuthFault(409,result);
}

export async function readKairoseki(client:PoolClient,accountId:string,id:string):Promise<KairosekiSnapshot>{
  const {present,shop}=(await client.query(`
    SELECT to_regclass('mare_game.account_kairoseki') IS NOT NULL present,
           to_regprocedure('mare_game.spend_kairoseki(uuid,integer,integer,boolean)') IS NOT NULL shop
  `)).rows[0];
  if(!present)return {};
  const wallet=(await client.query(`
    SELECT w.balance::text, COALESCE((extract(epoch FROM (to_jsonb(w)->>'vip_until')::timestamptz)*1000)::bigint,0) vip_until,
           COALESCE((extract(epoch FROM (to_jsonb(p)->>'drop_boost_until')::timestamptz)*1000)::bigint,0) drop_until,
           (extract(epoch FROM statement_timestamp())*1000)::bigint now
    FROM mare_game.character_progression p LEFT JOIN mare_game.account_kairoseki w ON w.account_id=$1
    WHERE p.character_id=$2
  `,[accountId,id])).rows[0];
  return {
    kairoseki:wallet?.balance??'0',
    ...(shop&&wallet?{kairosekiShop:{
      vipUntil:Number(wallet.vip_until),dropBoostUntil:Number(wallet.drop_until),serverNow:Number(wallet.now),
      crewCreationCost,
      prices:Object.fromEntries(Object.entries(kairosekiProducts).map(([product,{price}])=>[product,price])),
    }}:{}),
  };
}

export async function rewardBoosts(client:PoolClient,id:string){
  const {present}=(await client.query("SELECT to_regprocedure('mare_game.spend_kairoseki(uuid,integer,integer,boolean)') IS NOT NULL present")).rows[0];
  const row=(await client.query<{xp:number;drop:boolean;vip:boolean}>(present?`
    SELECT CASE WHEN p.xp_boost_until>transaction_timestamp() THEN p.xp_boost_percent ELSE 0 END xp,
           p.drop_boost_until>transaction_timestamp() drop,
           w.vip_until>transaction_timestamp() vip
    FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
    LEFT JOIN mare_game.account_kairoseki w ON w.account_id=c.account_id WHERE p.character_id=$1
  `:`
    SELECT CASE WHEN (to_jsonb(p)->>'xp_boost_until')::timestamptz>transaction_timestamp() THEN 100 ELSE 0 END xp,
           false drop, false vip
    FROM mare_game.character_progression p WHERE p.character_id=$1
  `,[id])).rows[0];
  return {xp:row?.xp??0,drop:!!row?.drop,vip:!!row?.vip};
}
