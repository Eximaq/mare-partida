import {itemTradeRestriction,itemTradeQuantity as itemQuantity} from './item-negotiability.js';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {PoolClient} from 'pg';
import type {CharacterCommand,OriginalItemInstance} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readOriginalInventory,writeInventory} from '../gameplay/inventory.js';
import {assertSocialContactAllowed,isSocialCharacterOnline} from './social-contacts.js';

export type TradeCommand=Extract<CharacterCommand,{action:`trade.${string}`}>;

type Item = OriginalItemInstance;
type Offer = {item:Item;quantity:number};
type TradeRow = {
  id:string;initiator_id:string;target_id:string;
  status:'pending'|'active'|'declined'|'cancelled'|'expired'|'completed';
  offer_version:number;initiator_locked:boolean;target_locked:boolean;
  initiator_confirmed:boolean;target_confirmed:boolean;expires_at:Date;ended_at:Date|null;
  expired:boolean;partner_name:string;
};
type Reservation = {character_id:string;item_id:string;item:Item;quantity:number};
type Receipt = {initiator:Offer[];target:Offer[]};

type TradeQuery=Pick<PoolClient,'query'>;
const {items,capacity}=getGameCatalog();
const limits={inviteSeconds:60,idleSeconds:90,invitesPerMinute:5,offerSlots:20,historyPage:15,inviteList:30};
const live="t.status IN ('pending','active') AND t.expires_at>clock_timestamp()";
const participants='(t.initiator_id=$1 OR t.target_id=$1)';
const peerOf=(t:TradeRow,id:string)=>t.initiator_id===id?t.target_id:t.initiator_id;
const pairOf=(a:string,b:string)=>[a,b].sort();

export async function tradeAvailable(client:TradeQuery){
  return (await client.query("SELECT to_regclass('mare_game.social_trades') IS NOT NULL available")).rows[0]?.available===true;
}

function tradeEligible(item:Item){return !itemTradeRestriction(item);}

async function closeTrade(client:PoolClient,tradeId:string,status:'declined'|'cancelled'){
  await client.query('UPDATE mare_game.social_trades SET status=$2,ended_at=clock_timestamp() WHERE id=$1',[tradeId,status]);
  await client.query('DELETE FROM mare_game.social_trade_members WHERE trade_id=$1',[tradeId]);
}

async function expireTradeRows(client:TradeQuery,characters?:readonly string[]){
  await client.query(`
    WITH stale AS (
      SELECT id FROM mare_game.social_trades
      WHERE status IN ('pending','active') AND expires_at<=clock_timestamp()
        AND ($1::uuid[] IS NULL OR initiator_id=ANY($1) OR target_id=ANY($1))
      ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ), closed AS (
      UPDATE mare_game.social_trades t SET status='expired',ended_at=clock_timestamp()
      FROM stale WHERE t.id=stale.id RETURNING t.id
    )
    DELETE FROM mare_game.social_trade_members m USING closed WHERE m.trade_id=closed.id
  `,[characters??null]);
}

export async function reapExpiredTrades(client:TradeQuery){
  if(await tradeAvailable(client))await expireTradeRows(client);
}

/** Called while the contact pair's advisory lock is held. */
export async function cancelBlockedTrade(client:PoolClient,actorId:string,targetId:string){
  if(!await tradeAvailable(client))return;
  await client.query(`
    WITH closed AS (
      UPDATE mare_game.social_trades SET status='cancelled',ended_at=clock_timestamp()
      WHERE least(initiator_id,target_id)=$1 AND greatest(initiator_id,target_id)=$2
        AND status IN ('pending','active') RETURNING id
    )
    DELETE FROM mare_game.social_trade_members m USING closed WHERE m.trade_id=closed.id
  `,pairOf(actorId,targetId));
}

async function findTarget(client:PoolClient,id:string,p:{targetId?:string;name?:string}){
  if(!!p.targetId===!!p.name)throw new AuthFault(400,'invalid_request');
  const result=p.targetId
    ?await client.query<{id:string}>('SELECT id FROM mare_game.characters WHERE id=$1',[p.targetId])
    :await client.query<{id:string}>('SELECT id FROM mare_game.characters WHERE lower(name)=lower($1) ORDER BY id LIMIT 2',[p.name?.trim()]);
  if(result.rows.length!==1)throw new AuthFault(404,'trade_target_missing');
  const target=result.rows[0]!.id;
  if(target===id)throw new AuthFault(409,'trade_self');
  return target;
}

async function ensureOnline(client:PoolClient,id:string,peer:string){
  if(!await isSocialCharacterOnline(client,id)||!await isSocialCharacterOnline(client,peer))
    throw new AuthFault(409,'trade_peer_offline');
}

async function tryLockPeer(client:PoolClient,id:string){
  // Same session -> account -> character order as gameplay and Party. Never wait for
  // a peer holding those locks while we hold our actor, contact or trade row locks.
  const peer=(await client.query<{session_id:string;account_id:string}>(`
    SELECT cc.session_id,c.account_id FROM mare_game.characters c
    JOIN mare_game.character_control cc ON cc.character_id=c.id WHERE c.id=$1
  `,[id])).rows[0];
  if(!peer)throw new AuthFault(409,'trade_peer_offline');
  const session=await client.query('SELECT id FROM mare_game.app_sessions WHERE id=$1 FOR UPDATE SKIP LOCKED',[peer.session_id]);
  if(!session.rowCount)throw new AuthFault(409,'trade_peer_busy');
  const account=await client.query('SELECT id FROM mare_game.accounts WHERE id=$1 FOR UPDATE SKIP LOCKED',[peer.account_id]);
  if(!account.rowCount)throw new AuthFault(409,'trade_peer_busy');
  const lock=await client.query<{locked:boolean}>('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1296126533)) locked',[id]);
  if(!lock.rows[0]?.locked)throw new AuthFault(409,'trade_peer_busy');
}

async function invite(client:PoolClient,id:string,p:{targetId?:string;name?:string}){
  const target=await findTarget(client,id,p);
  await assertSocialContactAllowed(client,id,target);
  await ensureOnline(client,id,target);
  await expireTradeRows(client,[id,target]);
  if((await client.query(`SELECT 1 FROM mare_game.social_trade_members m JOIN mare_game.social_trades t ON t.id=m.trade_id
      WHERE m.character_id=ANY($1::uuid[]) AND ${live} LIMIT 1`,[[id,target]])).rowCount)
    throw new AuthFault(409,'trade_already_active');
  const count=await client.query<{recent:number}>(`
    SELECT count(*)::int recent FROM mare_game.social_trades WHERE initiator_id=$1
      AND created_at>clock_timestamp()-interval '1 minute'
  `,[id]);
  if(count.rows[0]!.recent>=limits.invitesPerMinute)throw new AuthFault(429,'trade_rate_limited');
  const created=await client.query(`
    INSERT INTO mare_game.social_trades(id,initiator_id,target_id,expires_at)
    VALUES($1,$2,$3,clock_timestamp()+$4::int*interval '1 second')
    ON CONFLICT DO NOTHING
  `,[randomUUID(),id,target,limits.inviteSeconds]);
  if(!created.rowCount)throw new AuthFault(409,'trade_invite_pending');
}

async function ownedTrade(client:PoolClient,id:string,tradeId:string,checkContact:boolean){
  const base=`FROM mare_game.social_trades t WHERE ${participants} AND t.id=$2`;
  const known=(await client.query<TradeRow>(`SELECT t.* ${base}`,[id,tradeId])).rows[0];
  if(!known)throw new AuthFault(404,'trade_missing');
  if(checkContact)await assertSocialContactAllowed(client,id,peerOf(known,id));
  const row=(await client.query<TradeRow>(`SELECT t.*,t.expires_at<=clock_timestamp() expired ${base} FOR UPDATE`,[id,tradeId])).rows[0]!;
  if(row.expired||!['pending','active'].includes(row.status))throw new AuthFault(409,'trade_closed');
  return row;
}

async function accept(client:PoolClient,t:TradeRow,id:string){
  const peer=peerOf(t,id);
  await tryLockPeer(client,peer);
  await ensureOnline(client,id,peer);
  const inventory=await client.query('SELECT character_id FROM mare_game.game_inventory WHERE character_id=ANY($1::uuid[])',[[id,peer]]);
  if(inventory.rowCount!==2)throw new AuthFault(409,'original_inventory_required');
  await expireTradeRows(client,[id,peer]);
  const members=await client.query(`
    INSERT INTO mare_game.social_trade_members(character_id,trade_id)
    SELECT member,$1 FROM unnest($2::uuid[]) member ORDER BY member
    ON CONFLICT(character_id) DO NOTHING RETURNING character_id
  `,[t.id,[id,peer]]);
  if(members.rowCount!==2)throw new AuthFault(409,'trade_already_active');
  await client.query(`
    UPDATE mare_game.social_trades SET status='active',expires_at=clock_timestamp()+$2::int*interval '1 second' WHERE id=$1
  `,[t.id,limits.idleSeconds]);
}

async function getReservations(client:PoolClient,tradeId:string){
  return (await client.query<Reservation>(`
    SELECT character_id,item_id,item,quantity FROM mare_game.social_trade_reservations
    WHERE trade_id=$1 ORDER BY created_at,item_id
  `,[tradeId])).rows;
}

async function modifyOffer(client:PoolClient,t:TradeRow,id:string,p:{itemId:string;quantity:number}){
  if(t.initiator_id===id?t.initiator_locked:t.target_locked)throw new AuthFault(409,'trade_offer_locked');
  const reservations=await getReservations(client,t.id);
  const current=reservations.find(x=>x.character_id===id&&x.item_id===p.itemId);
  if(current?.quantity===p.quantity||(!current&&p.quantity===0))return;
  if(p.quantity===0){
    await client.query('DELETE FROM mare_game.social_trade_reservations WHERE character_id=$1 AND trade_id=$2 AND item_id=$3',[id,t.id,p.itemId]);
  }else{
    if(!current&&reservations.filter(x=>x.character_id===id).length>=limits.offerSlots)
      throw new AuthFault(409,'trade_offer_full');
    // The actor lock serializes normal writers; the row lock also fences any
    // SQL inventory writer that doesn't use the command dispatcher.
    await client.query('SELECT character_id FROM mare_game.game_inventory WHERE character_id=$1 FOR UPDATE',[id]);
    const item=(await readOriginalInventory(client,id))?.inventory.find(x=>x.id===p.itemId);
    if(!item||!tradeEligible(item))throw new AuthFault(409,'trade_item_ineligible');
    if(p.quantity>itemQuantity(item))throw new AuthFault(409,'trade_quantity_invalid');
    const stored=await client.query(`
      INSERT INTO mare_game.social_trade_reservations(character_id,item_id,trade_id,quantity,item)
      VALUES($1,$2,$3,$4,$5::jsonb)
      ON CONFLICT(character_id,item_id) DO UPDATE SET quantity=excluded.quantity
      WHERE mare_game.social_trade_reservations.trade_id=excluded.trade_id
      RETURNING item_id
    `,[id,p.itemId,t.id,p.quantity,JSON.stringify(item)]);
    if(!stored.rowCount)throw new AuthFault(409,'trade_item_reserved');
  }
  await client.query(`
    UPDATE mare_game.social_trades SET offer_version=offer_version+1,
      initiator_locked=false,target_locked=false,initiator_confirmed=false,target_confirmed=false,
      expires_at=clock_timestamp()+$2::int*interval '1 second' WHERE id=$1
  `,[t.id,limits.idleSeconds]);
}

function separate(inventory:Item[],reservations:Reservation[]){
  const outgoing:Offer[]=[];
  const staying=[...inventory];
  for(const r of reservations){
    const index=staying.findIndex(x=>x.id===r.item_id);
    const item=staying[index];
    if(!item||!tradeEligible(item)||!isDeepStrictEqual(item,r.item)||r.quantity>itemQuantity(item))
      throw new AuthFault(409,'trade_item_changed');
    if(r.quantity===itemQuantity(item)){
      staying.splice(index,1);
      outgoing.push({item,quantity:r.quantity});
    }else{
      staying[index]={...item,qty:itemQuantity(item)-r.quantity};
      outgoing.push({item:{...item,id:randomUUID(),qty:r.quantity},quantity:r.quantity});
    }
  }
  return {staying,outgoing};
}

function stackCompatible(a:Item,b:Item){
  const {id:_a,qty:_aq,...aProperties}=a;
  const {id:_b,qty:_bq,...bProperties}=b;
  return isDeepStrictEqual(aProperties,bProperties);
}

function receive(inventory:Item[],incoming:Offer[]){
  const result=[...inventory];
  for(const {item,quantity} of incoming){
    if(result.some(x=>x.id===item.id))throw new AuthFault(409,'trade_item_conflict');
    const stackLimit=items[item.def]?.stackLimit;
    let left=quantity;
    if(items[item.def]?.kind==='haki-fragment'&&typeof stackLimit==='number'){
      for(const [index,existing] of result.entries()){
        if(!stackCompatible(existing,item))continue;
        const add=Math.min(left,Math.max(0,stackLimit-itemQuantity(existing)));
        if(!add)continue;
        result[index]={...existing,qty:itemQuantity(existing)+add};
        left-=add;
        if(!left)break;
      }
      if(left)result.push(left===quantity?item:{...item,qty:left});
    }else result.push(item);
  }
  if(result.length>capacity)throw new AuthFault(409,'trade_inventory_full');
  return result;
}

async function settle(client:PoolClient,t:TradeRow,id:string){
  const peer=peerOf(t,id);
  await tryLockPeer(client,peer);
  await ensureOnline(client,id,peer);
  await client.query('SELECT character_id FROM mare_game.game_inventory WHERE character_id=ANY($1::uuid[]) ORDER BY character_id FOR UPDATE',[[id,peer]]);
  const first=await readOriginalInventory(client,t.initiator_id),second=await readOriginalInventory(client,t.target_id);
  if(!first||!second)throw new AuthFault(409,'original_inventory_required');
  const reservations=await getReservations(client,t.id);
  if(!reservations.length)throw new AuthFault(409,'trade_empty');
  const a=separate(first.inventory,reservations.filter(x=>x.character_id===t.initiator_id));
  const b=separate(second.inventory,reservations.filter(x=>x.character_id===t.target_id));
  const firstResult=receive(a.staying,b.outgoing),secondResult=receive(b.staying,a.outgoing);
  const receipt:Receipt={initiator:a.outgoing,target:b.outgoing};
  const completed=await client.query(`
    UPDATE mare_game.social_trades SET status='completed',ended_at=date_trunc('milliseconds',clock_timestamp()),receipt=$2::jsonb,
      initiator_confirmed=true,target_confirmed=true
    WHERE id=$1 AND status='active' AND expires_at>clock_timestamp() AND offer_version=$3
      AND initiator_locked AND target_locked AND (initiator_confirmed OR target_confirmed)
    RETURNING id
  `,[t.id,JSON.stringify(receipt),t.offer_version]);
  if(!completed.rowCount)throw new AuthFault(409,'trade_closed');
  await client.query('DELETE FROM mare_game.social_trade_members WHERE trade_id=$1',[t.id]);
  await writeInventory(client,t.initiator_id,{...first,inventory:firstResult});
  await writeInventory(client,t.target_id,{...second,inventory:secondResult});
  const versions=await client.query(`
    UPDATE mare_game.characters SET state_version=state_version+1
    WHERE id=ANY($1::uuid[]) AND state_version<9007199254740991 RETURNING id
  `,[[id,peer]]);
  if(versions.rowCount!==2)throw new AuthFault(409,'state_version_exhausted');
}

export async function mutateTrade(client:PoolClient,id:string,input:TradeCommand){
  if(!await tradeAvailable(client))throw new AuthFault(503,'trade_unavailable');
  if(input.action==='trade.invite')return invite(client,id,input.payload);
  const t=await ownedTrade(client,id,input.payload.tradeId,input.action!=='trade.cancel'&&(input.action!=='trade.respond'||input.payload.accept));
  if(input.action==='trade.cancel'){
    if(t.status==='pending'&&t.initiator_id!==id)throw new AuthFault(409,'trade_invite_closed');
    return closeTrade(client,t.id,'cancelled');
  }
  if(input.action==='trade.respond'){
    if(t.status!=='pending'||t.target_id!==id)throw new AuthFault(409,'trade_invite_closed');
    return input.payload.accept?accept(client,t,id):closeTrade(client,t.id,'declined');
  }
  if(t.status!=='active')throw new AuthFault(409,'trade_not_active');
  if(t.offer_version!==input.payload.expectedOfferVersion)throw new AuthFault(409,'trade_offer_changed');
  await ensureOnline(client,id,peerOf(t,id));
  if(input.action==='trade.offer')return modifyOffer(client,t,id,input.payload);
  const own=t.initiator_id===id?'initiator':'target';
  if(input.action==='trade.lock'){
    if(t[`${own}_locked`]===input.payload.locked)return;
    await client.query(`
      UPDATE mare_game.social_trades SET ${own}_locked=$2,
        initiator_confirmed=false,target_confirmed=false,expires_at=clock_timestamp()+$3::int*interval '1 second'
      WHERE id=$1
    `,[t.id,input.payload.locked,limits.idleSeconds]);
    return;
  }
  if(!t.initiator_locked||!t.target_locked)throw new AuthFault(409,'trade_offers_unlocked');
  if(t[`${own}_confirmed`])return;
  if(t.initiator_confirmed||t.target_confirmed)return settle(client,t,id);
  if(!(await getReservations(client,t.id)).length)throw new AuthFault(409,'trade_empty');
  await client.query(`
    UPDATE mare_game.social_trades SET ${own}_confirmed=true,expires_at=clock_timestamp()+$2::int*interval '1 second' WHERE id=$1
  `,[t.id,limits.idleSeconds]);
}

function projectTrade(row:TradeRow,id:string,reservations:Reservation[]){
  const own=row.initiator_id===id?'initiator':'target',peer=own==='initiator'?'target':'initiator';
  const offer=(characterId:string)=>reservations.filter(x=>x.character_id===characterId).map(({item,quantity})=>({item,quantity}));
  return {
    id:row.id,status:row.status,offerVersion:row.offer_version,expiresAt:row.expires_at.toISOString(),
    initiatorId:row.initiator_id,partnerId:peerOf(row,id),partnerName:row.partner_name,
    ownLocked:row[`${own}_locked`],peerLocked:row[`${peer}_locked`],
    ownConfirmed:row[`${own}_confirmed`],peerConfirmed:row[`${peer}_confirmed`],
    ownItems:offer(id),peerItems:offer(peerOf(row,id)),
  };
}

const partnerJoin='JOIN mare_game.characters peer ON peer.id=CASE WHEN t.initiator_id=$1 THEN t.target_id ELSE t.initiator_id END';

export async function readSocialTradeCount(client:PoolClient,id:string){
  if(!await tradeAvailable(client))return 0;
  return (await client.query<{total:number}>(`
    SELECT count(*)::int total FROM mare_game.social_trades
    WHERE target_id=$1 AND status='pending' AND expires_at>clock_timestamp()
  `,[id])).rows[0]!.total;
}

export async function readTrade(client:PoolClient,id:string,before?:{at:string;id:string}){
  if(!await tradeAvailable(client))throw new AuthFault(503,'trade_unavailable');
  const sessions=(await client.query<TradeRow&{reservations:Reservation[]}>(`
    SELECT t.*,peer.name partner_name,COALESCE(offer.reservations,'[]'::jsonb) reservations
    FROM mare_game.social_trades t ${partnerJoin}
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('character_id',r.character_id,'item_id',r.item_id,
        'item',r.item,'quantity',r.quantity) ORDER BY r.created_at,r.item_id) reservations
      FROM mare_game.social_trade_reservations r WHERE r.trade_id=t.id
    ) offer ON t.status='active'
    WHERE ${participants} AND ${live}
    ORDER BY (t.status='active') DESC,(t.target_id=$1) DESC,t.created_at DESC,t.id LIMIT $2
  `,[id,limits.inviteList+1])).rows;
  const active=sessions.find(t=>t.status==='active');
  const invites=sessions.filter(t=>t.status==='pending').slice(0,limits.inviteList).map(t=>projectTrade(t,id,[]));
  const reservations=active?.reservations??[];
  const stock=await readOriginalInventory(client,id);
  const reserved=new Set(reservations.filter(x=>x.character_id===id).map(x=>x.item_id));
  const rows=(await client.query<TradeRow&{receipt:Receipt}>(`
    SELECT t.*,peer.name partner_name FROM mare_game.social_trades t ${partnerJoin}
    WHERE ${participants} AND t.status='completed'
      AND ($3::timestamptz IS NULL OR (t.ended_at,t.id)<($3,$4::uuid))
    ORDER BY t.ended_at DESC,t.id DESC LIMIT $2
  `,[id,limits.historyPage+1,before?.at??null,before?.id??null])).rows;
  const history=rows.slice(0,limits.historyPage).map(row=>({
    id:row.id,partnerId:peerOf(row,id),partnerName:row.partner_name,completedAt:row.ended_at!.toISOString(),
    offerVersion:row.offer_version,sent:row.initiator_id===id?row.receipt.initiator:row.receipt.target,
    received:row.initiator_id===id?row.receipt.target:row.receipt.initiator,
  }));
  const last=history.at(-1);
  return {
    trade:active?projectTrade(active,id,reservations):invites[0]??null,invites,history,
    ...(rows.length>limits.historyPage&&last?{nextHistory:{at:last.completedAt,id:last.id}}:{}),
    eligibleItems:(stock?.inventory??[]).filter(item=>!reserved.has(item.id)&&tradeEligible(item)),
  };
}
