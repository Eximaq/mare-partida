import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {characterCommandSchema} from '@mare/shared';
import {authDatabase} from './auth-support.mjs';

test('cosmetic ownership persists separately from functional equipment and is private by default',()=>authDatabase(async({service,pool})=>{
  const player=async(name:string)=>{
    const {token}=await service.login(randomUUID()+'@example.invalid','fixture');
    const {id}=await service.createCharacter(token,{name,classId:'sword',factionId:'pirate'});
    const lease=await service.acquireControl(token,id);
    const read=()=>service.onlineState(token,id);
    const input=async(action:string,payload:unknown={})=>({
      action,payload,requestId:randomUUID(),expectedVersion:(await service.characterState(token,id)).version,
      control:{epoch:lease.epoch,token:lease.token},
    });
    const send=(command:unknown)=>service.command(token,id,characterCommandSchema.parse(command));
    const act=async(action:string,payload:unknown={})=>send(await input(action,payload));
    await act('items.initialize');
    await act('world.initialize');
    return {id,token,read,input,send,act};
  };
  const owner=await player('Corsário Cosmético'),visitor=await player('Vigia do Porto');
  const hat='east-blue-hat';
  await pool.query(`UPDATE mare_game.game_inventory SET inventory=(
    SELECT jsonb_agg(jsonb_set(equipment->'coat','{id}',to_jsonb('cosmetics-test-'||n)))
    FROM generate_series(1,118) AS n
  ) || $2::jsonb WHERE character_id=$1`,[owner.id,JSON.stringify([
    {id:'legacy-visual',def:187,level:1,plus:0,locked:false,obtainedAt:1},
    {id:'bound-visual',def:187,level:1,plus:0,locked:false,obtainedAt:2,binding:'character',boundToCharacter:owner.id},
  ])]);
  const before=await owner.read();
  assert.equal(before.originalInventory?.inventory.length,120);
  assert.deepEqual(before.cosmetics,{owned:[],equipped:{},demoClaimed:false});
  await assert.rejects(owner.act('cosmetics.equip',{cosmeticId:hat}),{code:'cosmetic_not_owned'});
  await assert.rejects(owner.act('cosmetics.equip',{cosmeticId:'not-in-catalog'}),{code:'cosmetic_unknown'});
  const invalid=await owner.input('cosmetics.equip',{cosmeticId:hat,owner:visitor.id,attack:100});
  assert.equal(characterCommandSchema.safeParse(invalid).success,false);
  const claim=await owner.input('cosmetics.claim-demo');
  const receipt=await owner.send(claim);
  assert.deepEqual(await owner.send(claim),receipt);
  const {cosmetics,originalInventory,hierarchy}=await owner.read();
  assert.equal(cosmetics?.demoClaimed,true);
  assert.deepEqual([...(cosmetics?.owned??[])].sort(),['east-blue-hat','east-blue-sandals','east-blue-shorts','east-blue-vest']);
  assert.deepEqual(originalInventory,before.originalInventory);
  assert.equal(hierarchy?.power,before.hierarchy?.power);
  assert.equal((await visitor.read()).cosmetics?.owned.length,0);
  const trades=await service.socialState(owner.token,owner.id,{view:'trade'});
  assert('eligibleItems' in trades);
  assert.deepEqual(trades.eligibleItems.filter(item=>item.def===187).map(item=>item.id),['legacy-visual']);
  const market=await service.marketState(owner.token,owner.id,{view:'inventory',sort:'newest',page:1,category:'other'});
  assert('entries' in market);
  assert.deepEqual(market.entries.map(item=>(item as {instanceId:string}).instanceId),['legacy-visual']);
  await owner.act('cosmetics.equip',{cosmeticId:hat});
  await owner.act('cosmetics.equip',{cosmeticId:'east-blue-vest'});
  const equipped={head:hat,coat:'east-blue-vest'};
  const locker=await owner.read();
  assert.deepEqual(locker.cosmetics?.equipped,equipped);
  assert.deepEqual(locker.originalInventory,before.originalInventory);
  assert.equal(locker.hierarchy?.power,before.hierarchy?.power);

  const profile=async()=>{
    const response=await service.socialState(visitor.token,visitor.id,{view:'profile',targetId:owner.id});
    assert('character' in response);
    return response.character;
  };
  const publicPlayer=(await visitor.read()).lobby.players.find(p=>p.id===owner.id)!;
  assert.deepEqual(publicPlayer.cosmetics,equipped);
  assert(!('owned' in (publicPlayer.cosmetics??{})));
  assert.deepEqual((await profile()).cosmetics,equipped);
  await owner.act('profile.preferences',{hideItems:true});
  assert.deepEqual((await profile()).cosmetics,{});
  assert.deepEqual((await visitor.read()).lobby.players.find(p=>p.id===owner.id)?.cosmetics,{});
  assert.deepEqual((await owner.read()).cosmetics?.equipped,equipped);
  await owner.act('profile.preferences',{hideItems:false});
  await owner.act('cosmetics.unequip',{slot:'head'});
  assert.deepEqual((await owner.read()).cosmetics?.equipped,{coat:'east-blue-vest'});
  assert.deepEqual((await profile()).cosmetics,{coat:'east-blue-vest'});
  await owner.act('contact.block',{targetId:visitor.id,blocked:true});
  await assert.rejects(profile(),{code:'contact_blocked'});

  // Female creation remains locked; use a stored historical female profile.
  await pool.query("UPDATE mare_game.character_profile SET appearance=jsonb_set(appearance,'{gender}',to_jsonb('feminino'::text)) WHERE character_id=$1",[visitor.id]);
  const historical=await visitor.read();
  assert.equal(historical.profile?.appearance.gender,'feminino');
  await visitor.act('cosmetics.claim-demo');
  await visitor.act('cosmetics.equip',{cosmeticId:'east-blue-vest'});
  const dressed=await visitor.read();
  assert.equal(dressed.cosmetics?.owned.length,4);
  assert.deepEqual(dressed.cosmetics?.equipped,{coat:'east-blue-vest'});
  assert.deepEqual(dressed.profile,historical.profile);
  await visitor.act('cosmetics.unequip',{slot:'coat'});
  const cleaned=await visitor.read();
  assert.deepEqual(cleaned.cosmetics,{...dressed.cosmetics,equipped:{}});
  assert.deepEqual(cleaned.profile,historical.profile);
  assert.deepEqual(cleaned.originalInventory,historical.originalInventory);
}));
