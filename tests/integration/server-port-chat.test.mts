import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {authDatabase} from './auth-support.mjs';

test('two controlled characters exchange public chat, deduplicate retries and respect blocks',()=>authDatabase(async({service,pool})=>{
  async function sailor(name:string){
    const {token}=await service.login(randomUUID()+'@example.invalid','fixture');
    const {id}=await service.createCharacter(token,{name,classId:'sword',factionId:'pirate'});
    await service.acquireControl(token,id);
    return {id,token};
  }
  const a=await sailor('Coral'),b=await sailor('Farol');
  const first={requestId:randomUUID(),body:'Olá, porto!'};
  await service.sendPortChat(a.token,a.id,first);
  await service.sendPortChat(a.token,a.id,first);
  await service.sendPortChat(b.token,b.id,{requestId:randomUUID(),body:'Estou aqui'});
  for(const user of [a,b]){
    const {messages}=await service.portChat(user.token,user.id);
    assert.deepEqual(messages.map((m:{name:string;body:string})=>[m.name,m.body]),[['Coral','Olá, porto!'],['Farol','Estou aqui']]);
  }
  await assert.rejects(service.sendPortChat(b.token,a.id,first),{code:'character_not_found'});
  await pool.query('insert into mare_game.social_contact_blocks(blocker_id,target_id) values ($1,$2)',[a.id,b.id]);
  for(const user of [a,b])assert.deepEqual((await service.portChat(user.token,user.id)).messages.map((m:{senderId:string})=>m.senderId),[user.id]);
  await assert.rejects(service.sendPortChat(a.token,a.id,{...first,body:'changed'}),{code:'request_conflict'});
  for(let i=1;i<20;i++)await service.sendPortChat(a.token,a.id,{requestId:randomUUID(),body:'msg '+i});
  await assert.rejects(service.sendPortChat(a.token,a.id,{requestId:randomUUID(),body:'one too many'}),{code:'message_rate_limited'});
  await pool.query('update mare_game.character_control set expires_at=clock_timestamp() where character_id=$1',[a.id]);
  await assert.rejects(service.sendPortChat(a.token,a.id,{requestId:randomUUID(),body:'sem controle'}),{code:'control_required'});
}));
