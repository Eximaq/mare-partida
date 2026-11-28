import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {authDatabase} from './auth-support.mjs';
import {readCrewPower} from '../../apps/game-server/src/characters/crew.js';

test('Bounty uses current crew membership and returns only its displayed value',()=>authDatabase(async({service,pool})=>{
  const session=await service.login(randomUUID()+'@example.invalid','fixture');
  const character=await service.createCharacter(session.token,{name:'Bounty',classId:'sword',factionId:'pirate'});
  const lease=await service.acquireControl(session.token,character.id);
  const act=async(action:string,payload:object={})=>{
    const state=await service.characterState(session.token,character.id);
    return service.command(session.token,character.id,{action,payload,expectedVersion:state.version,
      requestId:randomUUID(),control:{epoch:lease.epoch,token:lease.token}} as any);
  };
  await act('items.initialize');
  const viewerSession=await service.login(randomUUID()+'@example.invalid','fixture');
  const viewer=await service.createCharacter(viewerSession.token,{name:'Navegante Recompensa',classId:'gunner',factionId:'marine'});
  const profile=()=>service.socialState(viewerSession.token,viewer.id,{view:'profile',targetId:character.id});
  const before=await service.onlineState(session.token,character.id);
  assert.equal(typeof before.bounty,'number');
  const publicView=await profile();
  assert('character' in publicView);
  assert.deepEqual(publicView.character.publicProfile,{title:before.hierarchy?.title,power:before.hierarchy?.power,equipmentHidden:false,bounty:String(before.bounty)});
  assert.equal('state' in publicView.character,false);
  assert.equal('gold' in publicView.character,false);
  await act('crew.create',{name:'Marés',tag:'MAR',flag:'1'+'0'.repeat(1023),policy:'open',minLevel:1});
  const withCrew=await service.onlineState(session.token,character.id);
  assert(withCrew.bounty!>before.bounty!);
  const publicWithCrew=await profile();
  assert('character' in publicWithCrew);
  assert.equal(publicWithCrew.character.publicProfile?.bounty,String(withCrew.bounty));
  const client=await pool.connect();
  try{assert((await readCrewPower(client,character.id))>0);}finally{client.release();}
  await act('crew.dissolve',{confirmed:true});
  const after=await service.onlineState(session.token,character.id);
  assert.equal(after.bounty,before.bounty);
  assert.equal(after.state.gold,before.state.gold);
  assert.equal((await service.onlineState(session.token,character.id)).bounty,after.bounty);
  await act('contact.block',{targetId:viewer.id,blocked:true});
  await assert.rejects(profile(),{code:'contact_blocked'});
  await assert.rejects(service.socialState(session.token,character.id,{view:'profile',targetId:viewer.id}),{code:'contact_blocked'});
}));

test('reserved official credits reject invalid, duplicated, same-account and repeated results',()=>authDatabase(async({pool,service})=>{
  const make=async()=>{
    const session=await service.login(randomUUID()+'@example.invalid','fixture');
    return service.createCharacter(session.token,{name:'Combatente',classId:'sword',factionId:'pirate'});
  };
  const winner=await make(),opponent=await make(),match=randomUUID(),rivalCrew=randomUUID();
  const credit=async(mode:string,target:string,id:string,outcome='win',official=true,eligible=true)=>
    (await pool.query('SELECT mare_game.credit_bounty_victory($1,$2,$3,$4,$5,$6,$7) AS accepted',
      [winner.id,mode,id,target,outcome,official,eligible])).rows[0].accepted;
  assert.equal(await credit('duels',winner.id,randomUUID()),false);
  for(const outcome of ['loss','draw','canceled','void'])assert.equal(await credit('duels',opponent.id,randomUUID(),outcome),false);
  assert.equal(await credit('duels',opponent.id,randomUUID(),'win',false),false);
  assert.equal(await credit('gvg',rivalCrew,randomUUID(),'win',true,false),false);
  assert.equal(await credit('gvg',rivalCrew,match),true);
  assert.equal(await credit('gvg',rivalCrew,match),false);
  const duel=randomUUID();
  const duplicate=await Promise.all([credit('duels',opponent.id,duel),credit('duels',opponent.id,duel)]);
  assert.equal(duplicate.filter(Boolean).length,1);
  assert.equal(await credit('duels',opponent.id,randomUUID()),true);
  assert.equal(await credit('duels',opponent.id,randomUUID()),true);
  assert.equal(await credit('duels',opponent.id,randomUUID()),false);
  assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.bounty_victories WHERE character_id=$1',[winner.id])).rows[0].n,4);
}));
