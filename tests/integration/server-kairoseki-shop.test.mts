import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {characterCommandSchema} from '@mare/shared';
import {boostXp} from '../../apps/game-server/src/characters/contracts.js';
import {rewardBoosts} from '../../apps/game-server/src/characters/kairoseki.js';
import {awardWorldLoot} from '../../apps/game-server/src/gameplay/inventory.js';
import {authDatabase,seedKairoseki} from './auth-support.mjs';

test('the shop debits once, grants both boosts, renews VIP and gates crew creation',()=>authDatabase(async({pool,service})=>{
  const {token}=await service.login('premium@example.invalid','fixture');
  const {id}=await service.createCharacter(token,{name:'Navegante de Teste',classId:'sword',factionId:'pirate'});
  const control=await service.acquireControl(token,id);
  const prepare=async(action:string,payload:object={})=>characterCommandSchema.parse({
    action,payload,requestId:randomUUID(),expectedVersion:(await service.characterState(token,id)).version,
    control:{epoch:control.epoch,token:control.token},
  });
  const send=(command:Awaited<ReturnType<typeof prepare>>)=>service.command(token,id,command);
  const act=async(action:string,payload:object={})=>send(await prepare(action,payload));
  const read=()=>service.onlineState(token,id);
  const crew={name:'Maré de Teste',tag:'MAR',flag:'1'+'0'.repeat(1023),policy:'open',minLevel:1};
  const day=86_400_000;

  await act('items.initialize');
  assert.equal((await read()).kairoseki,'0');
  assert.deepEqual((await read()).kairosekiShop!.prices,{'xp-1h':5,'drop-1h':5,'vip-7d':10,'vip-30d':20});
  await assert.rejects(act('crew.create',crew),{code:'crew_vip_required'});
  await assert.rejects(act('kairoseki.buy',{product:'vip-7d'}),{code:'kairoseki_insufficient'});
  await seedKairoseki(pool,id,50);
  await assert.rejects(act('crew.create',crew),{code:'crew_vip_required'});
  assert.equal((await read()).kairoseki,'50');
  const seven=await prepare('kairoseki.buy',{product:'vip-7d'});
  assert.equal(characterCommandSchema.safeParse({...seven,payload:{product:'vip-7d',price:1}}).success,false);
  const [first,replay]=await Promise.all([send(seven),send(seven)]);
  assert.deepEqual(first,replay);
  const vip=await read(),firstUntil=vip.kairosekiShop!.vipUntil;
  assert.equal(vip.kairoseki,'40');
  assert(Math.abs(firstUntil-vip.kairosekiShop!.serverNow-7*day)<10_000);
  await act('kairoseki.buy',{product:'vip-30d'});
  assert.equal((await read()).kairosekiShop!.vipUntil,firstUntil+30*day);
  await act('kairoseki.buy',{product:'xp-1h'});
  await act('kairoseki.buy',{product:'drop-1h'});
  const stock=await read();
  assert.equal(stock.kairoseki,'10');
  const xp=stock.originalInventory!.inventory.find(item=>item.def===247)!;
  const drop=stock.originalInventory!.inventory.find(item=>item.def===248)!;
  assert.equal(xp.boundToCharacter,id);
  assert.equal(drop.boundToCharacter,id);
  await assert.rejects(act('items.use-xp-boost',{itemId:drop.id}),{code:'item_protected'});
  await act('items.use-xp-boost',{itemId:xp.id});
  await act('items.use-drop-boost',{itemId:drop.id});
  const boosted=await read();
  assert.equal(boosted.originalInventory!.inventory.filter(item=>[247,248].includes(item.def)).length,0);
  assert(Math.abs(boosted.contracts!.xpBoostUntil!-boosted.kairosekiShop!.serverNow-3_600_000)<10_000);
  assert(Math.abs(boosted.kairosekiShop!.dropBoostUntil-boosted.kairosekiShop!.serverNow-3_600_000)<10_000);
  assert.equal(boosted.state.gold,stock.state.gold);

  const client=await pool.connect();
  try{
    assert.deepEqual(await rewardBoosts(client,id),{xp:50,drop:true,vip:true});
    assert.equal(await boostXp(client,id,100n),180n);
    await client.query('BEGIN');
    const kill={id:randomUUID(),area:'beach',monster:{type:'crab',level:1},reward:{xp:100,gold:0,potionChance:.12,potions:1}};
    const award=await awardWorldLoot(client,id,randomUUID(),boosted.state,[kill],undefined,0,{rng:()=>.18});
    assert.equal(award.xpBySpawn.get(kill.id),180n);
    const awarded=(await client.query('SELECT potions,inventory FROM mare_game.game_inventory WHERE character_id=$1',[id])).rows[0];
    assert.equal(awarded.potions,boosted.originalInventory!.potions+1);
    assert.equal(awarded.inventory.length,boosted.originalInventory!.inventory.length+1);
  }finally{await client.query('ROLLBACK');client.release();}
  assert.equal((await read()).state.experience,boosted.state.experience);

  await pool.query(`UPDATE mare_game.account_kairoseki SET balance=9 WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)`,[id]);
  await assert.rejects(act('crew.create',crew),{code:'kairoseki_insufficient'});
  assert.equal((await read()).kairoseki,'9');
  await pool.query(`UPDATE mare_game.account_kairoseki SET balance=10 WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)`,[id]);
  const creation=await prepare('crew.create',crew);
  assert.deepEqual(await send(creation),await send(creation));
  assert.equal((await read()).kairoseki,'0');
  assert.equal((await service.crewState(token,id,'')).crew?.group?.name,crew.name);
  await assert.rejects(act('kairoseki.buy',{product:'xp-1h'}),{code:'kairoseki_insufficient'});
  await pool.query(`UPDATE mare_game.account_kairoseki SET vip_until=statement_timestamp()-interval '1 second'
   WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)`,[id]);
  await pool.query("UPDATE mare_game.character_progression SET drop_boost_until=statement_timestamp()-interval '1 second' WHERE character_id=$1",[id]);
  const expired=await pool.connect();
  try{
    assert.deepEqual(await rewardBoosts(expired,id),{xp:50,drop:false,vip:false});
    assert.equal(await boostXp(expired,id,100n),150n);
    await expired.query("UPDATE mare_game.character_progression SET xp_boost_until=statement_timestamp()-interval '1 second' WHERE character_id=$1",[id]);
    assert.equal(await boostXp(expired,id,100n),100n);
    const legacy={id:randomUUID(),def:186,level:1,plus:0,rarity:'epic',locked:false,obtainedAt:Date.now()};
    await expired.query('UPDATE mare_game.game_inventory SET inventory=inventory||$2::jsonb WHERE character_id=$1',[id,JSON.stringify([legacy])]);
    await act('items.use-xp-boost',{itemId:legacy.id});
    assert.equal(await boostXp(expired,id,100n),200n);
  }
  finally{expired.release();}
}));
