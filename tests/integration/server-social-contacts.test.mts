import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import type pg from 'pg';
import type {AuthService} from '../../apps/game-server/src/auth/service.js';
import {readCrew} from '../../apps/game-server/src/characters/crew.js';
import {readParty} from '../../apps/game-server/src/characters/party.js';
import {
  isSocialCharacterOnline,readPrivateMessages,readSocialContactBadge,readSocialContacts,
} from '../../apps/game-server/src/characters/social-contacts.js';
import {authDatabase} from './auth-support.mjs';

async function read<T>(pool:pg.Pool,run:(client:pg.PoolClient)=>Promise<T>) {
  const client=await pool.connect();
  try{return await run(client);}
  finally{client.release();}
}

async function actor(service:AuthService,pool:pg.Pool,name:string) {
  const email=randomUUID()+'@example.invalid';
  const session=await service.login(email,'fixture');
  const {id}=await service.createCharacter(session.token,{name,classId:'sword',factionId:'pirate'});
  const lease=await service.acquireControl(session.token,id);
  const state=()=>service.characterState(session.token,id);
  const input=async(action:string,payload:object)=>({
    action,payload,requestId:randomUUID(),expectedVersion:(await state()).version,
    control:{epoch:lease.epoch,token:lease.token},
  } as Parameters<AuthService['command']>[2]);
  const send=(command:Parameters<AuthService['command']>[2])=>service.command(session.token,id,command);
  const heartbeat=()=>service.socialState(session.token,id,{view:'badge'});
  await heartbeat();
  return {
    id,name,email,token:session.token,state,heartbeat,input,send,
    act:async(action:string,payload:object={})=>send(await input(action,payload)),
    contacts:(search='')=>read(pool,c=>readSocialContacts(c,id,{search})),
    badge:()=>read(pool,c=>readSocialContactBadge(c,id)),
    thread:(peer:string,cursor?:{before?:string;after?:string})=>read(pool,c=>readPrivateMessages(c,id,peer,cursor)),
    online:()=>read(pool,c=>isSocialCharacterOnline(c,id)),
    party:()=>read(pool,c=>readParty(c,id)),
    crew:()=>read(pool,c=>readCrew(c,id)),
  };
}

test('amizade cruzada exige aceite, mensagens são privadas e bloqueio protege convites existentes',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,pool,'Navegante Coral');
  const b=await actor(service,pool,'Coral do Norte');
  const outsider=await actor(service,pool,'Marinheiro Teste');
  assert.deepEqual((await a.contacts('coral')).matches.map(person=>person.id),[b.id]);
  await assert.rejects(a.act('friend.request',{targetId:a.id}),{code:'contact_self'});
  await assert.rejects(a.act('friend.request',{targetId:randomUUID()}),{code:'contact_missing'});
  await assert.rejects(a.act('message.send',{targetId:b.id,body:'Olá'}),{code:'message_friend_required'});
  const results=await Promise.allSettled([
    a.act('friend.request',{targetId:b.id}),b.act('friend.request',{targetId:a.id}),
  ]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected')?.reason.code,'friend_request_received');
  const [sender,target]=results[0]!.status==='fulfilled'?[a,b]:[b,a];
  const request=(await target.contacts()).incoming[0]!;
  assert.equal((await sender.contacts()).friends.length,0);
  assert.equal((await target.badge()).friendRequests,1);
  await assert.rejects(outsider.act('friend.respond',{requestId:request.id,accept:true}),{code:'friend_request_missing'});
  await target.act('friend.respond',{requestId:request.id,accept:true});
  await assert.rejects(target.act('friend.respond',{requestId:request.id,accept:true}),{code:'friend_request_closed'});
  assert.equal((await sender.contacts()).friends[0]?.id,target.id);
  assert.equal((await target.contacts()).onlineCount,1);
  assert.equal((await target.badge()).friendRequests,0);
  const secondTab=await service.login(target.email,'fixture');
  await service.logout(secondTab.token,'local');
  assert.equal(await target.online(),true);

  await pool.query("UPDATE mare_game.social_presence SET last_seen=clock_timestamp()-interval '30 seconds' WHERE character_id=$1",[target.id]);
  assert.equal(await target.online(),false);
  const offlineFriend=(await sender.contacts()).friends[0]!;
  assert(offlineFriend.lastActivity);
  assert.equal(offlineFriend.online,false);
  const body='<b>Mensagem que deve chegar como texto</b>';
  const command=await sender.input('message.send',{targetId:target.id,body});
  const first=await sender.send(command);
  assert.deepEqual(await sender.send(command),first);
  assert.equal((await sender.state()).version,command.expectedVersion);
  assert.equal((await target.badge()).unreadMessages,1);
  const thread=await target.thread(sender.id);
  assert.deepEqual(thread.messages.map(message=>message.body),[body]);
  assert.equal((await target.badge()).unreadMessages,1);
  await assert.rejects(outsider.thread(target.id),{code:'message_missing'});
  await assert.rejects(service.socialState(outsider.token,target.id,{view:'messages',targetId:sender.id}),{code:'character_not_found'});
  await assert.rejects(target.act('message.read',{targetId:outsider.id,throughId:thread.messages[0]!.id}),{code:'message_missing'});
  await target.act('message.read',{targetId:sender.id,throughId:thread.messages[0]!.id});
  assert.equal((await target.badge()).unreadMessages,0);

  await target.heartbeat();
  await sender.act('party.create');
  await sender.act('crew.create',{name:'Tripulação Coral',tag:'CRL',flag:'1'+'0'.repeat(1023),policy:'approval',minLevel:1});
  const activeFriend=(await sender.contacts()).friends[0]!;
  assert.equal(activeFriend.actions.party,null);
  assert.equal(activeFriend.actions.crew,null);
  await sender.act('party.invite',{targetId:target.id});
  await sender.act('crew.invite',{targetId:target.id});
  const pendingFriend=(await sender.contacts()).friends[0]!;
  assert.equal(pendingFriend.actions.party,'party_invite_pending');
  assert.equal(pendingFriend.actions.crew,'crew_invite_pending');
  const partyInvite=(await target.party())!.invites[0]!;
  const crewInvite=(await target.crew()).invites[0]!;
  await target.act('contact.block',{targetId:sender.id,blocked:true});
  await assert.rejects(sender.act('party.invite',{name:target.name}),{code:'contact_blocked'});
  await assert.rejects(sender.act('crew.invite',{name:target.name}),{code:'contact_blocked'});
  await assert.rejects(target.act('party.respond',{inviteId:partyInvite.id,accept:true}),{code:'contact_blocked'});
  await assert.rejects(target.act('crew.respond',{requestId:crewInvite.id,accept:true}),{code:'contact_blocked'});
  await assert.rejects(sender.act('message.send',{targetId:target.id,body:'Bloqueado'}),{code:'contact_blocked'});
  assert.equal((await sender.thread(target.id)).character.lastActivity,null);
  assert.equal((await target.contacts()).blocked[0]?.id,sender.id);
  await target.act('contact.block',{targetId:sender.id,blocked:false});
  await sender.act('friend.remove',{targetId:target.id});
  assert.equal((await target.contacts()).friends.length,0);
  assert.equal((await target.thread(sender.id)).messages.length,1);
}));

test('limites de mensagens e paginação mantêm uma sequência estável',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,pool,'Cartógrafo');
  const b=await actor(service,pool,'Timoneira');
  await a.act('friend.request',{targetId:b.id});
  await b.act('friend.respond',{requestId:(await b.contacts()).incoming[0]!.id,accept:true});
  await assert.rejects(a.act('message.send',{targetId:b.id,body:'  '}),{code:'message_invalid'});
  await assert.rejects(a.act('message.send',{targetId:b.id,body:'x'.repeat(501)}),{code:'message_invalid'});
  for(let i=1;i<=42;i++){
    if(i===21){
      await assert.rejects(a.act('message.send',{targetId:b.id,body:'Limite excedido'}),{code:'message_rate_limited'});
    }
    if(i===21||i===41)await pool.query("UPDATE mare_game.social_private_messages SET sent_at=sent_at-interval '2 minutes'");
    await a.act('message.send',{targetId:b.id,body:String(i)});
  }
  const recent=await b.thread(a.id);
  assert.equal(recent.messages.length,40);
  assert.equal(recent.messages[0]?.body,'3');
  assert.equal(recent.messages.at(-1)?.body,'42');
  assert.equal(recent.hasMore,true);
  const older=await b.thread(a.id,{before:recent.messages[0]!.id});
  assert.deepEqual(older.messages.map(message=>message.body),['1','2']);
  assert.equal(older.hasMore,false);
  const after=await b.thread(a.id,{after:older.messages.at(-1)!.id});
  assert.deepEqual(after.messages,recent.messages);
  assert.equal(after.hasMore,false);
  await b.act('message.read',{targetId:a.id,throughId:recent.messages.at(-1)!.id});
  await b.act('message.read',{targetId:a.id,throughId:older.messages[0]!.id});
  assert.equal((await b.badge()).unreadMessages,0);
}));
