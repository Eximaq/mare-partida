import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
const require=createRequire(import.meta.url),engine=require('../../world-battle.cjs'),snapshot=require('../fixtures/dungeon-server-rules.json');
test('a persisted battle from before the dungeon update can pause without losing its monsters or HP',async()=>{
 const b=engine.create('beach',{maxHP:200,maxEnergy:90},1000,()=>.5);b.rulesHash=snapshot.rulesHash;b.auto=true;const before=structuredClone(b);let stored:any=null;const commands:string[]=[];
 const client={release(){},async query(sql:string,args:any[]=[]){commands.push(sql);
  if(sql.startsWith('SELECT id,account_id'))return {rows:[{id:'session',account_id:'account'}]};
  if(sql.startsWith('SELECT id FROM mare_game.accounts'))return {rowCount:1,rows:[{id:'account'}]};
  if(sql.includes('pg_try_advisory_xact_lock'))return {rows:[{locked:true}]};
  if(sql.startsWith('SELECT b.simulation'))return {rows:[{simulation:b,tick_at:new Date(1000),now:new Date(4000),control_epoch:1,epoch:1}]};
  if(sql.startsWith('UPDATE mare_game.character_battles SET simulation=')){stored=JSON.parse(args[1]);return {rows:[]};}
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.startsWith('SET LOCAL')||sql.startsWith('UPDATE mare_game.character_battles SET tick_at='))return {rows:[]};
  throw Error('Unexpected query: '+sql);
 }};
 const pool={async query(){return {rows:[{character_id:'character',session_id:'session'}]}},async connect(){return client}};
 assert.equal(await tickWorldBattles(pool as any),1);assert(stored);assert.equal(stored.auto,false);assert.equal(stored.hp,before.hp);assert.deepEqual(stored.mobs,before.mobs);assert.equal(stored.rulesHash,before.rulesHash);assert(commands.includes('COMMIT'));assert(!commands.includes('ROLLBACK'));
});
