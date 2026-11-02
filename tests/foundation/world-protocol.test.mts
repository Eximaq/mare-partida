import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {characterCommandSchema} from '@mare/shared';
const envelope={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'a'.repeat(43)}};
test('world intents permit destinations but never position, speed, time, account or damage supplied as authority',()=>{
 for(const [action,payload] of [['world.initialize',{}],['world.move',{x:1400,y:900}],['world.stop',{}],['world.travel',{islandId:'dawn'}],['world.return',{}]] as const){
  const command={...envelope,action,payload};assert.equal(characterCommandSchema.safeParse(command).success,true,action);
  for(const key of ['accountId','ownerId','characterId','speed','elapsed','timestamp','damage','gold','position'])assert.equal(characterCommandSchema.safeParse({...command,payload:{...payload,[key]:100}}).success,false,key);
 }
 for(const x of [NaN,Infinity,-1,100001])assert.equal(characterCommandSchema.safeParse({...envelope,action:'world.move',payload:{x,y:100}}).success,false);
});
