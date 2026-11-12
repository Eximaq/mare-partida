import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import type pg from 'pg';
import type {AuthService} from '../../apps/game-server/src/auth/service.js';
import {creditCrewActivities,readCrew,readCrewIdentity,readCrewRankings} from '../../apps/game-server/src/characters/crew.js';
import {crewMissionRules,crewWeek,seaWar} from '../../apps/game-server/src/characters/crew-config.js';
import {itemTradeRestriction} from '../../apps/game-server/src/characters/item-negotiability.js';
import {authDatabase} from './auth-support.mjs';

const flag='1'+'0'.repeat(1023);
type CrewPayload=Parameters<AuthService['command']>[2];

async function transaction<T>(pool:pg.Pool,run:(client:pg.PoolClient)=>Promise<T>) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await run(client);
    await client.query('COMMIT');
    return result;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function actor(service:AuthService,pool:pg.Pool,name:string,factionId:'pirate'|'marine'='pirate') {
  const session=await service.login(randomUUID()+'@example.invalid','fixture');
  const character=await service.createCharacter(session.token,{name,classId:'sword',factionId});
  const id=character.id;
  const lease=await service.acquireControl(session.token,id);
  const state=()=>service.characterState(session.token,id);
  const input=async(action:string,payload:object):Promise<CrewPayload>=>({
    action,payload,requestId:randomUUID(),expectedVersion:(await state()).version,
    control:{epoch:lease.epoch,token:lease.token},
  } as CrewPayload);
  const send=(command:CrewPayload)=>service.command(session.token,id,command);
  return {id,name,state,input,send,
    act:async(action:string,payload:object={})=>send(await input(action,payload)),
    crew:(search='')=>transaction(pool,client=>readCrew(client,id,search)),
    identity:()=>transaction(pool,client=>readCrewIdentity(client,id)),
  };
}

test('crew identity is immutable and recruitment revalidates roles and the two persisted entry blocks',()=>authDatabase(async({service,pool})=>{
  const leader=await actor(service,pool,'Capitã Azul');
  const applicant=await actor(service,pool,'Navegante','marine');
  const second=await actor(service,pool,'Capitão Sul');
  const extra=await actor(service,pool,'Mestre');
  const identity={name:'  Maré   Azul ',tag:'MAR',flag,policy:'approval',minLevel:1};
  await leader.act('crew.create',identity);
  const crew=(await leader.crew()).group!;
  assert.equal(crew.name,'Maré Azul');
  assert.equal(crew.capacity,12);
  assert.deepEqual(crew.members.map(m=>[m.id,m.role]),[[leader.id,'captain']]);
  assert.equal((await applicant.crew('mArÉ   AZUL')).listing[0]!.id,crew.id);
  assert.equal((await applicant.crew('mar')).listing.length,1);
  await assert.rejects(second.act('crew.create',{...identity,name:'maré azul',tag:'BLUE'}),{code:'crew_identity_taken'});
  await assert.rejects(pool.query("UPDATE mare_game.crews SET flag=repeat('2',1024) WHERE id=$1",[crew.id]),{code:'23514'});
  await assert.rejects(applicant.act('crew.join',{crewId:crew.id}),{code:'crew_requires_approval'});
  await applicant.act('crew.apply',{crewId:crew.id});
  await applicant.act('crew.apply',{crewId:crew.id});
  const requests=(await leader.crew()).applications;
  assert.equal(requests.length,1);
  await assert.rejects(extra.act('crew.respond',{requestId:requests[0]!.id,accept:true}),{code:'crew_request_missing'});
  await leader.act('crew.respond',{requestId:requests[0]!.id,accept:true});
  assert.equal((await applicant.identity())?.tag,'MAR');
  assert.equal((await applicant.crew()).group?.members.length,2);
  assert.equal(await applicant.state().then(s=>s.characterId),applicant.id);
  await assert.rejects(applicant.act('crew.invite',{name:extra.name}),{code:'crew_officer_required'});
  await applicant.act('crew.leave');
  assert.equal(await applicant.identity(),null);
  const blocked=await applicant.crew();
  assert(blocked.blockedUntil&&blocked.blockedUntil.getTime()-blocked.serverNow.getTime()>11.9*3600000);
  await second.act('crew.create',{...identity,name:'Mar do Sul',tag:'SUL',policy:'open'});
  const secondId=(await second.crew()).group!.id;
  await second.act('crew.invite',{name:applicant.name});
  const invite=(await applicant.crew()).invites[0]!;
  await assert.rejects(applicant.act('crew.respond',{requestId:invite.id,accept:true}),{code:'crew_entry_blocked'});
  await assert.rejects(applicant.act('crew.join',{crewId:secondId}),{code:'crew_entry_blocked'});
  await assert.rejects(applicant.act('crew.create',{...identity,name:'Rio Verde',tag:'RIO'}),{code:'crew_entry_blocked'});
  await pool.query("UPDATE mare_game.crew_entry_blocks SET until_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[applicant.id]);
  await applicant.act('crew.respond',{requestId:invite.id,accept:true});
  await second.act('crew.transfer',{memberId:applicant.id});
  await assert.rejects(second.act('crew.dissolve',{confirmed:true}),{code:'crew_captain_required'});
  await assert.rejects(applicant.act('crew.leave'),{code:'crew_transfer_or_dissolve'});
  await applicant.act('crew.dissolve',{confirmed:true});
  const after=await applicant.crew();
  assert(after.blockedUntil&&after.blockedUntil.getTime()-after.serverNow.getTime()>23.9*3600000);
  assert.equal((await second.crew()).blockedUntil,null);
  assert.equal(await second.identity(),null);
  assert.equal((await extra.crew('sul')).listing.length,0);
}));

test('last berth is atomic and treasury, donated Berry and weekly rewards are each credited once',()=>authDatabase(async({service,pool})=>{
  const captain=await actor(service,pool,'Almirante');
  const crewName={name:'Mar de Aço',tag:'ACO',flag,policy:'open',minLevel:1};
  await captain.act('crew.create',crewName);
  const crew=(await captain.crew()).group!;
  const crewId=crew.id;
  for(let i=0;i<10;i++) {
    const member=await actor(service,pool,'Teste '+i);
    await member.act('crew.join',{crewId});
  }
  const a=await actor(service,pool,'Primeiro','marine'),b=await actor(service,pool,'Segundo');
  const candidates=[a,b];
  const entrants=await Promise.allSettled(candidates.map(c=>c.act('crew.join',{crewId})));
  const index=entrants.findIndex(result=>result.status==='fulfilled');
  const rejected=entrants.find(result=>result.status==='rejected');
  assert.equal(entrants.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(rejected?.reason.code,'crew_full');
  assert.equal((await captain.crew()).group?.memberCount,12);
  const member=candidates[index]!;
  await pool.query('UPDATE mare_game.character_progression SET gold=2000 WHERE character_id=$1',[member.id]);
  const donation=await member.input('crew.donate',{amount:1000});
  const first=await member.send(donation);
  assert.deepEqual(await member.send(donation),first);
  assert.equal((await member.state()).gold,'1000');
  assert.equal((await captain.crew()).group?.treasury,1000);
  await assert.rejects(member.act('crew.donate',{amount:1}),{code:'crew_donation_limit'});

  const active=(await captain.crew()).group!.missions.find(m=>m.type==='kills')!;
  assert.equal(active.target,12*crewMissionRules.kills.perMember);
  await pool.query('UPDATE mare_game.crew_missions SET progress=target-1 WHERE id=$1',[active.id]);
  const event={characterId:captain.id,kind:'kills' as const,eventId:'crew-monster-test-1'};
  await transaction(pool,client=>creditCrewActivities(client,[event,event]));
  await transaction(pool,client=>creditCrewActivities(client,[event]));
  const bossId=randomUUID();
  await transaction(pool,async client=>{
    const {now:occurredAt}=(await client.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!;
    await creditCrewActivities(client,[{characterId:captain.id,kind:'bosses',eventId:bossId,occurredAt},
      {characterId:member.id,kind:'bosses',eventId:bossId,occurredAt}]);
  });
  const reward=(await captain.crew()).group!;
  assert.equal(reward.missions.find(m=>m.type==='bosses')?.progress,1);
  assert.equal(reward.xp,crewMissionRules.kills.xp);
  assert.equal(reward.missions.find(m=>m.type==='kills')?.progress,active.target);
  assert(seaWar.xp>Math.max(...Object.values(crewMissionRules).map(m=>m.xp)));
  assert.equal(seaWar.active,false);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.crew_missions WHERE kind='sea-war'")).rows[0].n,0);

  await pool.query('UPDATE mare_game.crews SET treasury=100000 WHERE id=$1',[crewId]);
  await captain.act('crew.upgrade',{facility:'hull',expectedLevel:1});
  await assert.rejects(captain.act('crew.upgrade',{facility:'hull',expectedLevel:1}),{code:'crew_project_conflict'});
  const expanded=(await captain.crew()).group!;
  assert.equal(expanded.capacity,16);
  assert.equal(expanded.treasury,76000);
  assert.equal(expanded.missions.find(m=>m.type==='kills')?.capacity,12);
  assert.equal(expanded.missions.find(m=>m.type==='kills')?.target,active.target);
  const later=crewWeek(expanded.missions[0]!.endsAt);
  assert(later.startsAt>=expanded.missions[0]!.endsAt);

  await member.act('crew.leave');
  const ranking=await transaction(pool,client=>readCrewRankings(client));
  assert.equal(ranking[0]!.id,crewId);
  assert.equal(ranking[0]!.memberCount,11);
  assert.equal(ranking[0]!.capacity,16);
  assert.equal((await captain.crew()).group!.history.filter(row=>row.kind==='donation').length,1);
}));

test('one week of personal crew claims buys one tradable Rank C fragment and preserves history',()=>authDatabase(async({service,pool})=>{
  const captain=await actor(service,pool,'Capitão das Moedas');
  const member=await actor(service,pool,'Navegante das Moedas');
  const outsider=await actor(service,pool,'Observador do Convés');
  await captain.act('crew.create',{name:'Rota da Contribuição',tag:'MOED',flag,policy:'open',minLevel:1});
  const {id:crewId}=(await captain.crew()).group!;
  await member.act('crew.join',{crewId});
  await member.act('items.initialize');
  await assert.rejects(member.act('crew.buy-fragment'),{code:'crew_coin_insufficient'});
  await transaction(pool,c=>creditCrewActivities(c,[
    {characterId:member.id,kind:'kills',eventId:'weekly-hunt',quantity:crewMissionRules.kills.perMember*12},
    {characterId:member.id,kind:'bosses',eventId:'weekly-bosses',quantity:crewMissionRules.bosses.perMember*12},
  ]));
  const donation=(await member.crew()).group!.missions.find(m=>m.type==='donations')!;
  await pool.query('UPDATE mare_game.crew_missions SET progress=target-1 WHERE id=$1',[donation.id]);
  await pool.query('UPDATE mare_game.character_progression SET gold=10 WHERE character_id=$1',[member.id]);
  await member.act('crew.donate',{amount:1});
  const eligible=(await member.crew()).coins;
  assert.deepEqual(eligible.claims.map(m=>m.coins).sort((a,b)=>a-b),[25,35,40]);
  await assert.rejects(outsider.act('crew.claim-coins',{missionId:eligible.claims[0]!.id}),{code:'crew_coin_ineligible'});
  for(const mission of eligible.claims)await member.act('crew.claim-coins',{missionId:mission.id});
  await member.act('crew.claim-coins',{missionId:eligible.claims[0]!.id});
  const earned=(await member.crew()).coins;
  assert.equal(earned.balance,earned.price);
  assert.equal(earned.earned,100);
  const buy=await member.input('crew.buy-fragment',{});
  const receipt=await member.send(buy);
  assert.deepEqual(await member.send(buy),receipt);
  const {readOriginalInventory}=await import('../../apps/game-server/src/gameplay/inventory.js');
  const bag=await transaction(pool,c=>readOriginalInventory(c,member.id));
  const fragments=bag!.inventory.filter(item=>item.materialId==='akuma_fragment_c');
  assert.equal(fragments.length,1);
  assert.equal(fragments[0]!.quantity,1);
  assert.equal(fragments[0]!.origin,'Loja da Tripulação');
  assert.equal(itemTradeRestriction(fragments[0]!),null);
  await member.act('crew.leave');
  const coins=(await member.crew()).coins;
  assert.deepEqual([coins.balance,coins.earned,coins.bought,coins.claims.length],[0,100,1,0]);
}));
