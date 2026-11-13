import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {characterCommandSchema} from '@mare/shared';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),{validIntent}=require('../../apps/account-client/game-session.js');
test('channel selection carries only the destination, never a position or proof of ownership',()=>{
 const envelope={requestId:randomUUID(),expectedVersion:1,action:'lobby.channel',control:{epoch:1,token:'a'.repeat(43)}};
 assert(validIntent('lobby.channel',{channelId:2}));
 assert(characterCommandSchema.safeParse({...envelope,payload:{channelId:2}}).success);
 for(const payload of [{channelId:0},{channelId:4097},{channelId:1.5},{channelId:'2'},{channelId:2,ownerId:randomUUID()},{channelId:2,x:44,y:55},{channelId:2,characterId:randomUUID()}]){
  assert.equal(validIntent('lobby.channel',payload),false);
  assert.equal(characterCommandSchema.safeParse({...envelope,payload}).success,false);
 }
});
