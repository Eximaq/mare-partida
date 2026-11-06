import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import type {CharacterCommand,OriginalItemInstance} from '@mare/shared';
import {z} from 'zod';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readOriginalInventory} from '../gameplay/inventory.js';
import {itemTradeQuantity,itemTradeRestriction} from './item-negotiability.js';

const {items,slots}=getGameCatalog();
const require=createRequire(import.meta.url);
const forge=require('../../../../forge-system.js'),akuma=require('../../../../akuma-system.js');
const rarities=['common','uncommon','rare','epic','legendary','supreme'] as const;
const categories=['weapons','armor','accessories','fruits','pearls','consumables','materials','fragments','other'] as const;
const sortSchema=z.enum(['newest','name_asc','name_desc','price_asc','price_desc','rarity','level','potential','expiry','quantity','category']);
const pageSize=24;
const durations=[24,48,72];
const searchKey=(v:string)=>v.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').trim();
const decimal=(min:number,max:number)=>z.string().regex(/^[0-9]{1,13}$/).transform(Number).pipe(z.number().int().min(min).max(max));
const filterSchema=z.strictObject({
  view:z.enum(['badge','market','inventory','offers','sales','purchases']).default('market'),
  q:z.string().trim().max(100).optional(),mode:z.enum(['direct','auction']).optional(),
  category:z.enum(categories).optional(),slot:z.enum([...slots,'pearl','material','consumable']).optional(),
  rarity:z.enum(rarities).optional(),rank:z.enum(['E','D','C','B','A','S']).optional(),fruitType:z.enum(['paramecia','logia','zoan']).optional(),
  minLevel:decimal(1,100).optional(),maxLevel:decimal(1,100).optional(),minPotential:decimal(0,100).optional(),maxPotential:decimal(0,100).optional(),
  minPrice:decimal(0,1e12).optional(),maxPrice:decimal(0,1e12).optional(),
  classId:z.string().regex(/^[a-z-]{1,30}$/).optional(),
  attribute:z.enum(['attack','defense','hp','energy','strength','dexterity','vitality','intelligence','spirit','crit','attackSpeedPercent','critDamage','critChance','accuracy','evasion']).optional(),
  origin:z.enum(['native','basic']).optional(), sort:sortSchema.default('newest'),page:decimal(1,2000).default(1),
  status:z.enum(['active','proposals','sold','cancelled','expired']).optional(),listingId:z.uuid().optional(),
});
export type MarketRead=z.infer<typeof filterSchema>;
type Query=Pick<PoolClient,'query'>;
type Action=Extract<CharacterCommand,{action:'market.execute'}>;
type Wallet={available:string;reserved:string;receivable:string};
const policy=()=>{
  const envInt=(v:string|undefined,initial:number,min:number,max:number)=>v&&/^\d+$/.test(v)&&Number(v)>=min&&Number(v)<=max?Number(v):initial;
  return {feeBps:process.env.MARE_MARKET_FEE_BPS==='1500'?1500:1000,listingLimit:envInt(process.env.MARE_MARKET_MAX_LISTINGS,20,1,100),
    publishInterval:envInt(process.env.MARE_MARKET_PUBLISH_INTERVAL_SECONDS,5,1,120)};
};

export function parseMarketRead(params:URLSearchParams):MarketRead{
  const raw=Object.fromEntries(params);
  const parsed=filterSchema.safeParse(raw);
  if(!parsed.success||params.size!==Object.keys(raw).length)throw new AuthFault(400,'invalid_request');
  const f=parsed.data;
  if(f.listingId&&f.view!=='purchases')throw new AuthFault(400,'invalid_request');
  if((f.minLevel??1)>(f.maxLevel??100)||(f.minPotential??0)>(f.maxPotential??100)||(f.minPrice??0)>(f.maxPrice??1e12))throw new AuthFault(400,'invalid_request');
  return f;
}
export async function marketAvailable(client:Query){
  return (await client.query("SELECT to_regprocedure('mare_game.market_command(uuid,jsonb,integer,integer,integer)') IS NOT NULL enabled")).rows[0]?.enabled===true;
}
export async function sweepMarket(client:Query){
  if(await marketAvailable(client))await client.query('SELECT mare_game.market_expire(20)');
}
export async function readMarketBadge(client:Query,id:string){
  const pending=(await client.query<{pending:number}>(`
    SELECT ((SELECT count(*) FROM mare_game.market_notifications n JOIN mare_game.market_listings l ON l.id=n.listing_id
      JOIN mare_game.market_proposals p ON p.id=n.subject_id
      WHERE n.character_id=$1 AND n.kind='proposal_received' AND n.read_at IS NULL AND p.status='pending' AND l.status='active' AND l.expires_at>clock_timestamp())+
      (SELECT count(*) FROM mare_game.market_listings WHERE seller_id=$1 AND status='sold' AND collected_at IS NULL))::int pending
  `,[id])).rows[0]!.pending;
  return {pending};
}
export function marketItemDetails(item:OriginalItemInstance){
  const def=items[item.def]!;
  const gear=!!forge.isGear(item,items), fruit=def.type==='akuma_no_mi'?akuma.byId(def.fruitId):null;
  const rank=(item.rank??fruit?.rank??def.rank) as string|undefined;
  const rarity=(fruit?akuma.rarityFor(fruit):item.rarity??def.rarity??'common') as typeof rarities[number];
  const kind=String(def.kind??'');
  const category=fruit?'fruits':kind==='pearl'?'pearls':kind.endsWith('-fragment')?'fragments':
    ['pearl-box','haki-book','xp-boost','potion'].includes(kind)?'consumables':kind.includes('material')?'materials':
    def.slot==='weapon'?'weapons':['necklace','ring','belt','charm'].includes(def.slot)?'accessories':gear?'armor':'other';
  const {attributes:core={},...stats}=gear?forge.itemStats(item,items):{attributes:fruit?akuma.bonusStats(item,items):{}};
  const attributes=Object.fromEntries(Object.entries({...core,...stats}).filter(([,value])=>typeof value==='number'&&value>0)) as Record<string,number>;
  const quantity=itemTradeQuantity(item), name=def.name;
  return {instanceId:item.id,catalogId:item.def,name,searchName:searchKey(name),category,slot:def.slot,rarity,rarityOrder:rarities.indexOf(rarity),
    rank:rank??null,fruitType:fruit?akuma.familyFor(fruit):null,level:gear?item.level:null,potential:gear?item.potential??null:null,attributes,
    upgrade:gear?item.plus:null,pearls:(item.sockets??[]).map(id=>id?{id,name:forge.pearlById[id]?.name,attribute:forge.pearlById[id]?.attribute,level:forge.pearlById[id]?.level}:null),
    origin:item.generation?.family??null,originLabel:item.origin??null,classId:gear&&def.slot==='weapon'?String(def.type??'')||null:null,
    stackable:kind==='haki-fragment',quantity,obtainedAt:item.obtainedAt};
}
type Details=ReturnType<typeof marketItemDetails>;
const money=(s:string|null)=>s===null?null:Number(s);
type Listing={
  id:string;version:number;mode:'direct'|'auction';status:string;seller_id:string;seller_name:string;
  buyer_id:string|null;buyer_name:string|null;details:Details;quantity:number;price:string|null;min_offer:string|null;buy_now:string|null;
  best:string|null;fee_bps:number;created_at:Date;expires_at:Date;ended_at:Date|null;gross:string|null;fee:string|null;net:string|null;
  delivery_mail_id:string|null;collected_at:Date|null;delivered_at:Date|null;
};
type Offer={id:string;listing_id:string;version:number;amount:string;status:string;buyer_id:string;buyer_name:string;created_at:Date;updated_at:Date};
const offerView=(p:Offer)=>({id:p.id,version:p.version,amount:Number(p.amount),reserved:p.status==='pending'?Number(p.amount):0,
  status:p.status,createdAt:p.created_at,updatedAt:p.updated_at,buyer:{id:p.buyer_id,name:p.buyer_name}});
const saleView=(l:Listing)=>({id:l.id,buyer:{id:l.buyer_id,name:l.buyer_name},gross:money(l.gross),fee:money(l.fee),net:money(l.net),
  soldAt:l.ended_at,collectedAt:l.collected_at,mailId:l.delivery_mail_id,deliveredAt:l.delivered_at});
const listingView=(l:Listing)=>({id:l.id,version:l.version,mode:l.mode,status:l.status,item:l.details,quantity:l.quantity,seller:{id:l.seller_id,name:l.seller_name},
  directPrice:money(l.price),minOffer:money(l.min_offer),buyNow:money(l.buy_now),highestOffer:money(l.best),feeBps:l.fee_bps,
  createdAt:l.created_at,expiresAt:l.expires_at,endedAt:l.ended_at});
const live='l.status=\'active\' AND l.expires_at>clock_timestamp()';
const unit='(coalesce(l.price,l.buy_now,l.min_offer)::numeric/l.quantity)';
const sqlOrder:Record<z.infer<typeof sortSchema>,string>={
  newest:'l.created_at DESC',name_asc:"l.details->>'searchName' ASC",name_desc:"l.details->>'searchName' DESC",
  price_asc:unit+' ASC NULLS LAST',price_desc:unit+' DESC NULLS LAST',rarity:"(l.details->>'rarityOrder')::int DESC NULLS LAST",
  level:"(l.details->>'level')::int DESC NULLS LAST",potential:"(l.details->>'potential')::int DESC NULLS LAST",
  expiry:'l.expires_at ASC',quantity:'l.quantity DESC',category:"l.details->>'category' ASC",
};
const listingFields=`l.*,s.name seller_name,b.name buyer_name,m.claimed_at delivered_at,
  (SELECT p.amount FROM mare_game.market_proposals p WHERE p.listing_id=l.id AND p.status='pending' ORDER BY p.amount DESC LIMIT 1) best`;
const listingJoins=`JOIN mare_game.characters s ON s.id=l.seller_id
  LEFT JOIN mare_game.characters b ON b.id=l.buyer_id LEFT JOIN mare_game.social_mail m ON m.id=l.delivery_mail_id`;
const getTradeReservations=async(client:Query,id:string)=>new Set((await client.query<{item_id:string}>(`
  SELECT r.item_id FROM mare_game.social_trade_reservations r JOIN mare_game.social_trades t ON t.id=r.trade_id
  WHERE r.character_id=$1 AND t.status='active' AND t.expires_at>clock_timestamp()`,[id])).rows.map(x=>x.item_id));
const fieldMap={category:'category',slot:'slot',rarity:'rarity',rank:'rank',fruitType:'fruitType',classId:'classId',origin:'origin'} as const;
const numericFields={minLevel:['level','>='],maxLevel:['level','<='],minPotential:['potential','>='],maxPotential:['potential','<=']} as const;

function filterInventory(item:Details,f:MarketRead){
  return (!f.q||item.searchName.includes(searchKey(f.q)))
    && Object.keys(fieldMap).every(key=>{const k=key as keyof typeof fieldMap;return f[k]===undefined||f[k]===item[fieldMap[k]];})
    && Object.keys(numericFields).every(key=>{const k=key as keyof typeof numericFields,[field,op]=numericFields[k],v=f[k];return v===undefined||(item[field]!==null&&(op==='>='?item[field]>=v:item[field]<=v));})
    && (!f.attribute||!!item.attributes[f.attribute]);
}
function orderInventory(a:Details,b:Details,sort:MarketRead['sort']){
  const cmp={name_asc:()=>a.name.localeCompare(b.name,'pt-BR'),name_desc:()=>b.name.localeCompare(a.name,'pt-BR'),
    rarity:()=>b.rarityOrder-a.rarityOrder,level:()=>(b.level??0)-(a.level??0),potential:()=>(b.potential??-1)-(a.potential??-1),
    quantity:()=>b.quantity-a.quantity,category:()=>a.category.localeCompare(b.category,'pt-BR')};
  return (sort in cmp?cmp[sort as keyof typeof cmp]():b.obtainedAt-a.obtainedAt)||a.instanceId.localeCompare(b.instanceId);
}
async function noticeList(client:Query,id:string,view:MarketRead['view']){
  const kinds=view==='sales'?['proposal_received','proposal_withdrawn','sale','listing_expired','listing_cancelled']:
    view==='offers'?['proposal_accepted','proposal_rejected','proposal_closed','proposal_expired']:
    view==='purchases'?['purchase']:[];
  if(!kinds.length)return [];
  return (await client.query(`SELECT id,kind,listing_id AS "listingId",created_at AS "createdAt"
    FROM mare_game.market_notifications WHERE character_id=$1 AND kind=ANY($2::text[]) AND read_at IS NULL
    ORDER BY created_at DESC,id DESC LIMIT 30`,[id,kinds])).rows;
}
export async function readMarket(client:PoolClient,id:string,f:MarketRead){
  if(!await marketAvailable(client))throw new AuthFault(503,'market_unavailable');
  if(f.view==='badge')return readMarketBadge(client,id);
  const wallet=(await client.query<Wallet>('SELECT * FROM mare_game.market_balance($1)',[id])).rows[0]??{available:'0',reserved:'0',receivable:'0'};
  const offset=(f.page-1)*pageSize;
  const base={wallet,feeBps:policy().feeBps,durations,page:f.page,notices:await noticeList(client,id,f.view)};
  const paged=(entries:unknown[])=>({...base,hasMore:entries.length>pageSize,entries:entries.slice(0,pageSize)});
  if(f.view==='inventory'){
    const inventory=await readOriginalInventory(client,id),reserved=await getTradeReservations(client,id);
    return paged((inventory?.inventory??[]).filter(item=>!itemTradeRestriction(item)&&!reserved.has(item.id)).map(marketItemDetails)
      .filter(item=>filterInventory(item,f)).sort((a,b)=>orderInventory(a,b,f.sort)).slice(offset,offset+pageSize+1));
  }
  if(f.view==='offers'){
    const offers=(await client.query<Offer>(`SELECT p.*,c.name buyer_name FROM mare_game.market_proposals p JOIN mare_game.characters c ON c.id=p.buyer_id
      WHERE p.buyer_id=$1 ORDER BY p.updated_at DESC,p.id DESC LIMIT $2 OFFSET $3`,[id,pageSize+1,offset])).rows;
    const listings=(await client.query<Listing>(`SELECT ${listingFields} FROM mare_game.market_listings l ${listingJoins} WHERE l.id=ANY($1::uuid[])`,[offers.map(p=>p.listing_id)])).rows;
    const indexed=new Map(listings.map(l=>[l.id,l]));
    return paged(offers.map(p=>({...offerView(p),listing:listingView(indexed.get(p.listing_id)!)})));
  }
  const args:unknown[]=[];
  const bind=(value:unknown)=>'$'+args.push(value);
  const where:string[]=[];
  if(f.view==='market'){
    where.push(live);
    if(f.q)where.push(`strpos(l.details->>'searchName',${bind(searchKey(f.q))})>0`);
    if(f.mode)where.push('l.mode='+bind(f.mode));
    for(const k of Object.keys(fieldMap) as (keyof typeof fieldMap)[])if(f[k]!==undefined)where.push(`l.details->>'${fieldMap[k]}'=${bind(f[k])}`);
    for(const k of Object.keys(numericFields) as (keyof typeof numericFields)[])if(f[k]!==undefined){
      const [field,op]=numericFields[k];where.push(`(l.details->>'${field}')::int${op}${bind(f[k])}`);
    }
    if(f.minPrice!==undefined)where.push(unit+'>='+bind(f.minPrice));
    if(f.maxPrice!==undefined)where.push(unit+'<='+bind(f.maxPrice));
    if(f.attribute)where.push(`(l.details->'attributes'->>${bind(f.attribute)})::numeric>0`);
  }else if(f.view==='sales'){
    where.push('l.seller_id='+bind(id));
    if(f.status==='proposals')where.push(live+' AND EXISTS (SELECT 1 FROM mare_game.market_proposals p WHERE p.listing_id=l.id AND p.status=\'pending\')');
    else if(f.status==='active')where.push(live);
    else if(f.status)where.push('l.status='+bind(f.status));
  }else {
    where.push('l.buyer_id='+bind(id)+" AND l.status='sold'");
    if(f.listingId)where.push('l.id='+bind(f.listingId));
  }
  const order=f.view==='purchases'?'l.ended_at DESC':f.view==='sales'?'l.created_at DESC':sqlOrder[f.sort];
  const rows=(await client.query<Listing>(`SELECT ${listingFields} FROM mare_game.market_listings l ${listingJoins}
    WHERE ${where.join(' AND ')} ORDER BY ${order},l.id DESC LIMIT ${bind(pageSize+1)} OFFSET ${bind(offset)}`,args)).rows;
  if(f.view==='purchases')return paged(rows.map(l=>({...saleView(l),listing:listingView(l)})));
  const listingIds=rows.map(l=>l.id);
  const proposals=(await client.query<Offer>(`SELECT visible.*,c.name buyer_name FROM unnest($2::uuid[]) AS ids(id)
    CROSS JOIN LATERAL (SELECT p.* FROM mare_game.market_proposals p WHERE p.listing_id=ids.id
      AND ($3::boolean OR (p.buyer_id=$1 AND p.status='pending')) ORDER BY (p.status='pending') DESC,p.amount DESC,p.updated_at DESC,p.id LIMIT 50) visible
    JOIN mare_game.characters c ON c.id=visible.buyer_id`,[id,listingIds,f.view==='sales'])).rows;
  return paged(rows.map(l=>{
    const offers=proposals.filter(p=>p.listing_id===l.id).map(offerView);
    if(f.view==='sales')return {...listingView(l),proposals:offers,sale:l.status==='sold'?saleView(l):null,mailId:l.delivery_mail_id,deliveredAt:l.delivered_at};
    const ownProposal=offers[0];
    return {...listingView(l),ownProposal:ownProposal?{id:ownProposal.id,version:ownProposal.version,amount:ownProposal.amount}:null};
  }));
}

export async function executeMarket(client:PoolClient,id:string,input:Action){
  if(!await marketAvailable(client))throw new AuthFault(503,'market_unavailable');
  const payload=input.payload;
  let data:object=payload;
  if(payload.kind==='market_publish'){
    if(payload.feeBps!==undefined&&payload.feeBps!==policy().feeBps)throw new AuthFault(409,'market_fee_changed');
    const inventory=await readOriginalInventory(client,id);
    if(!inventory)throw new AuthFault(409,'market_inventory_missing');
    const item=inventory.inventory.find(i=>i.id===payload.itemId);
    if(!item)throw new AuthFault(409,Object.values(inventory.equipment).some(i=>i?.id===payload.itemId)?'market_item_equipped':'market_item_unavailable');
    const restriction=itemTradeRestriction(item);
    if(restriction)throw new AuthFault(409,restriction==='locked'?'market_item_locked':'market_item_untradable');
    if(payload.quantity>itemTradeQuantity(item))throw new AuthFault(400,'market_invalid_quantity');
    data={...payload,item,details:marketItemDetails(item)};
  }
  const {feeBps,listingLimit,publishInterval}=policy();
  try{
    const result=(await client.query<{receipt:Record<string,unknown>}>('SELECT mare_game.market_command($1,$2::jsonb,$3,$4,$5) receipt',
      [id,JSON.stringify(data),feeBps,listingLimit,publishInterval])).rows[0]!.receipt;
    if(payload.kind!=='market_read_notices')await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
    return result;
  }catch(error){
    const e=error as {code?:string;message?:string;constraint?:string};
    const code=e.code==='P0001'&&/^market_[a-z_]+$/.test(e.message??'')?e.message:
      e.constraint==='social_trade_inventory_reserved'?'market_item_reserved':e.constraint==='market_wallet_limit'?'market_wallet_limit':
      ['55P03','40P01','40001'].includes(e.code??'')?'market_busy':null;
    if(!code)throw error;
    throw new AuthFault(code==='market_publish_rate'?429:code.endsWith('_missing')?404:409,code);
  }
}
