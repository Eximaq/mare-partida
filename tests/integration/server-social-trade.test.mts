import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import type {CharacterCommand,OriginalItemInstance} from '@mare/shared';
import type pg from 'pg';
import {getGameCatalog} from '../../apps/game-server/src/gameplay/catalog.js';
import type {AuthService} from '../../apps/game-server/src/auth/service.js';
import {authDatabase} from './auth-support.mjs';

const {items,capacity}=getGameCatalog();
const fragmentDef=items.findIndex(x=>x.kind==='haki-fragment');
const gear=(extra:Partial<OriginalItemInstance>={}):OriginalItemInstance=>({
  id:randomUUID(),def:0,locked:false,level:40,plus:3,obtainedAt:1200,rarity:'epic',potential:75,
  baseStats:{attack:118,defense:3,hp:200},extras:[{stat:'dexterity',value:9}],
  sockets:['pearl_for_1',null],reforgeAttempts:5,origin:'Ensaio de troca',...extra,
});

async function actor(service:AuthService,name:string){
  const email=randomUUID()+'@example.invalid';
  const login=await service.login(email,'fixture');
  const {id}=await service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'});
  const lease=await service.acquireControl(login.token,id);
  const state=()=>service.characterState(login.token,id);
  const input=async(action:string,payload:object):Promise<CharacterCommand>=>({
    action,payload,requestId:randomUUID(),expectedVersion:(await state()).version,
    control:{epoch:lease.epoch,token:lease.token},
  } as CharacterCommand);
  const send=(request:CharacterCommand)=>service.command(login.token,id,request);
  const act=async(action:string,payload:object={})=>send(await input(action,payload));
  const social=<V extends 'badge'|'trade'>(view:V)=>service.socialState(login.token,id,{view});
  const trades=async()=>await social('trade') as Awaited<ReturnType<typeof import('../../apps/game-server/src/characters/trade.js').readTrade>>;
  await act('items.initialize');
  await social('badge');
  const reconnect=async()=>{
    const fresh=await service.login(email,'fixture');
    return await service.socialState(fresh.token,id,{view:'trade'}) as Awaited<ReturnType<typeof trades>>;
  };
  return {id,name,state,input,send,act,trades,reconnect,heartbeat:()=>social('badge')};
}

type Actor=Awaited<ReturnType<typeof actor>>;
async function stock(pool:pg.Pool,id:string,list:OriginalItemInstance[]){
  await pool.query('UPDATE mare_game.game_inventory SET inventory=$2::jsonb WHERE character_id=$1',[id,JSON.stringify(list)]);
}
async function bag(pool:pg.Pool,id:string){
  return (await pool.query<{inventory:OriginalItemInstance[]}>('SELECT inventory FROM mare_game.game_inventory WHERE character_id=$1',[id])).rows[0]!.inventory;
}
async function invite(a:Actor,b:Actor){
  await a.heartbeat();
  await b.heartbeat();
  await a.act('trade.invite',{name:b.name});
  return (await b.trades()).invites.find(x=>x.initiatorId===a.id)!;
}
async function start(a:Actor,b:Actor){
  const pending=await invite(a,b);
  assert.equal(pending.status,'pending');
  await b.act('trade.respond',{tradeId:pending.id,accept:true});
  return pending.id;
}
const offer=(a:Actor,tradeId:string,expectedOfferVersion:number,itemId:string,quantity=1)=>
  a.act('trade.offer',{tradeId,expectedOfferVersion,itemId,quantity});
const lock=(a:Actor,tradeId:string,expectedOfferVersion:number,locked=true)=>
  a.act('trade.lock',{tradeId,expectedOfferVersion,locked});
const confirm=(a:Actor,tradeId:string,expectedOfferVersion:number)=>
  a.act('trade.confirm',{tradeId,expectedOfferVersion});

test('trade requires participant consent, invalidates earlier versions, guards inventory and records one exact exchange',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Ofertante'),b=await actor(service,'Convidado'),third=await actor(service,'Observador');
  const first=gear(),second=gear({potential:83}),bound=gear({binding:'character',boundToCharacter:a.id}),blocked=gear({locked:true});
  await stock(pool,a.id,[first,bound,blocked]);
  await stock(pool,b.id,[second]);
  await pool.query('UPDATE mare_game.game_inventory SET materials=100 WHERE character_id=$1',[a.id]);
  await pool.query('UPDATE mare_game.character_progression SET gold=100000 WHERE character_id=$1',[a.id]);
  const inviteRow=await invite(a,b);
  const tradeId=inviteRow.id;
  assert(await b.trades().then(v=>v.trade?.id===tradeId));
  await assert.rejects(a.act('trade.respond',{tradeId,accept:true}),{code:'trade_invite_closed'});
  await assert.rejects(third.act('trade.cancel',{tradeId}),{code:'trade_missing'});
  await assert.rejects(offer(a,tradeId,0,first.id),{code:'trade_not_active'});
  await b.act('trade.respond',{tradeId,accept:true});
  assert.deepEqual((await a.trades()).eligibleItems,[first]);
  await assert.rejects(offer(a,tradeId,0,bound.id),{code:'trade_item_ineligible'});
  await assert.rejects(offer(a,tradeId,0,second.id),{code:'trade_item_ineligible'});
  await offer(a,tradeId,0,first.id);
  await assert.rejects(a.act('items.sell',{itemId:first.id}),{code:'trade_item_reserved'});
  await assert.rejects(a.act('items.equip',{itemId:first.id}),{code:'trade_item_reserved'});
  await assert.rejects(a.act('forge.execute',{operation:{type:'upgrade',itemId:first.id,expectedSeq:0}}),{code:'trade_item_reserved'});
  await offer(b,tradeId,1,second.id);
  await lock(a,tradeId,2);
  await assert.rejects(offer(a,tradeId,2,first.id,0),{code:'trade_offer_locked'});
  await assert.rejects(confirm(a,tradeId,2),{code:'trade_offers_unlocked'});
  await lock(b,tradeId,2);
  await confirm(a,tradeId,2);
  assert.deepEqual(await bag(pool,a.id),[first,bound,blocked]);
  assert.deepEqual(await bag(pool,b.id),[second]);
  await lock(b,tradeId,2,false);
  await offer(b,tradeId,2,second.id,0);
  const changed=(await a.trades()).trade!;
  assert.equal(changed.offerVersion,3);
  assert.equal(changed.ownLocked||changed.peerLocked||changed.ownConfirmed||changed.peerConfirmed,false);
  await assert.rejects(confirm(b,tradeId,2),{code:'trade_offer_changed'});
  await offer(b,tradeId,3,second.id);
  await lock(a,tradeId,4);
  await lock(b,tradeId,4);
  await confirm(a,tradeId,4);
  const final=await b.input('trade.confirm',{tradeId,expectedOfferVersion:4});
  const sale=await a.input('items.sell',{itemId:first.id});
  const [completion,conflictingSale]=await Promise.allSettled([b.send(final),a.send(sale)]);
  assert.equal(conflictingSale.status,'rejected');
  assert(['trade_item_reserved','state_version_conflict','item_not_found'].includes(conflictingSale.reason.code));
  if(completion.status==='rejected')assert.equal(completion.reason.code,'trade_peer_busy');
  const accepted=completion.status==='fulfilled'?completion.value:await b.send(final);
  assert.deepEqual(await b.send(final),accepted);
  assert.deepEqual(await bag(pool,a.id),[bound,blocked,second]);
  assert.deepEqual(await bag(pool,b.id),[first]);
  assert.equal((await a.trades()).trade,null);
  const receipt=(await b.reconnect()).history[0]!;
  assert.equal(receipt.id,tradeId);
  assert.deepEqual(receipt.received,[{item:first,quantity:1}]);
  assert.deepEqual(receipt.sent,[{item:second,quantity:1}]);
  assert.deepEqual((await third.trades()).history,[]);
  await assert.rejects(pool.query("UPDATE mare_game.social_trades SET receipt='{}'::jsonb WHERE id=$1",[tradeId]),
    {constraint:'social_trade_finished'});
  assert.equal((await pool.query('SELECT 1 FROM mare_game.social_trade_reservations WHERE trade_id=$1',[tradeId])).rowCount,0);
}));

test('trade checks final capacity and splits only matching stackable instances',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Inventário Um'),b=await actor(service,'Inventário Dois');
  const handoff=gear(),fragments=gear({def:fragmentDef,qty:8}),existing={...fragments,id:randomUUID(),qty:2};
  const allB=Array.from({length:capacity-1},()=>gear()).concat(existing);
  await stock(pool,a.id,[handoff,fragments]);
  await stock(pool,b.id,allB);
  const tradeId=await start(a,b);
  await offer(a,tradeId,0,handoff.id);
  await lock(a,tradeId,1);
  await lock(b,tradeId,1);
  await confirm(a,tradeId,1);
  await assert.rejects(confirm(b,tradeId,1),{code:'trade_inventory_full'});
  assert.deepEqual(await bag(pool,a.id),[handoff,fragments]);
  assert.deepEqual(await bag(pool,b.id),allB);
  await lock(a,tradeId,1,false);
  await offer(a,tradeId,1,handoff.id,0);
  await assert.rejects(offer(a,tradeId,2,fragments.id,9),{code:'trade_quantity_invalid'});
  await offer(a,tradeId,2,fragments.id,5);
  await lock(a,tradeId,3);
  await lock(b,tradeId,3);
  await confirm(a,tradeId,3);
  await confirm(b,tradeId,3);
  assert.equal((await bag(pool,a.id)).find(x=>x.id===fragments.id)?.qty,3);
  assert.equal((await bag(pool,b.id)).find(x=>x.id===existing.id)?.qty,7);
  assert.equal((await bag(pool,b.id)).length,capacity);
  const received=(await b.trades()).history[0]!.received[0]!;
  assert.equal(received.quantity,5);
  assert.notEqual(received.item.id,fragments.id);

  const fullA=Array.from({length:capacity},()=>gear());
  await stock(pool,a.id,fullA);
  const swap=await start(a,b);
  await offer(a,swap,0,fullA[0]!.id);
  await offer(b,swap,1,allB[0]!.id);
  await lock(a,swap,2);
  await lock(b,swap,2);
  await confirm(a,swap,2);
  await confirm(b,swap,2);
  assert.equal((await bag(pool,a.id)).length,capacity);
  assert.equal((await bag(pool,b.id)).length,capacity);
  assert.deepEqual((await bag(pool,a.id)).at(-1),allB[0]);
  assert.deepEqual((await bag(pool,b.id)).at(-1),fullA[0]);
}));

test('closed invitations, blocked contacts and expired disconnections release reserved items',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Conexão Um'),b=await actor(service,'Conexão Dois'),third=await actor(service,'Outra Pessoa');
  const item=gear();
  await stock(pool,a.id,[item]);
  const pending=await invite(a,b);
  await b.act('trade.respond',{tradeId:pending.id,accept:false});
  await assert.rejects(b.act('trade.respond',{tradeId:pending.id,accept:true}),{code:'trade_closed'});
  const tradeId=await start(a,b);
  await third.heartbeat();
  await assert.rejects(third.act('trade.invite',{targetId:a.id}),{code:'trade_already_active'});
  await offer(a,tradeId,0,item.id);
  await b.act('contact.block',{targetId:a.id,blocked:true});
  assert.equal((await a.trades()).trade,null);
  assert.deepEqual((await a.trades()).eligibleItems,[item]);
  await assert.rejects(a.act('trade.invite',{targetId:b.id}),{code:'contact_blocked'});
  await b.act('contact.block',{targetId:a.id,blocked:false});
  const timedOut=await start(a,b);
  await offer(a,timedOut,0,item.id);
  await pool.query("UPDATE mare_game.social_presence SET last_seen=clock_timestamp()-interval '30 seconds' WHERE character_id=$1",[b.id]);
  await assert.rejects(lock(a,timedOut,1),{code:'trade_peer_offline'});
  await pool.query("UPDATE mare_game.social_trades SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[timedOut]);
  await service.drainRevocations();
  assert.equal((await a.trades()).trade,null);
  assert.equal((await pool.query('SELECT 1 FROM mare_game.social_trade_reservations WHERE trade_id=$1',[timedOut])).rowCount,0);
  await a.act('items.sell',{itemId:item.id});
  assert.equal((await bag(pool,a.id)).length,0);
}));
