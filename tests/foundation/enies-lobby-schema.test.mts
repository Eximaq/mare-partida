import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {characterCommandSchema} from '../../packages/shared/src/schemas/character-command.js';
import {dungeonStateSchema} from '../../packages/shared/src/schemas/dungeons.js';

test('Lucci and Moria accept server-owned dungeon entry without accepting client rewards',()=>{
 const envelope={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'a'.repeat(43)},action:'dungeon.enter'};
 for(const dungeonId of ['rob-lucci','gecko-moria']){
  assert(characterCommandSchema.safeParse({...envelope,payload:{dungeonId}}).success,dungeonId);
  for(const extra of [{level:110},{reward:1000},{victory:true},{monster:'dungeon-'+dungeonId}])
   assert(!characterCommandSchema.safeParse({...envelope,payload:{dungeonId,...extra}}).success);
 }
 assert(!characterCommandSchema.safeParse({...envelope,payload:{dungeonId:'unregistered-boss'}}).success);
});

test('pending victories for the two new bosses survive JSON with no invented reward',()=>{
 const ownerId=randomUUID(),records=Object.fromEntries(['rob-lucci','gecko-moria'].map(id=>[id,{
  phase:'pending',runId:randomUUID(),encounterId:'encounter-'+id,spawnId:randomUUID(),ownerId,
  startedAt:1000,berryReward:0,defeatedAt:2000,reward:null
 }]));
 const saved={version:3,seq:2,records,reveal:null};
 const result=dungeonStateSchema.safeParse(JSON.parse(JSON.stringify(saved)));
 assert(result.success,JSON.stringify(result.error));
 assert.deepEqual(result.data,saved);
 assert(!dungeonStateSchema.safeParse({...saved,records:{'unregistered-boss':records['rob-lucci']}}).success);
});
