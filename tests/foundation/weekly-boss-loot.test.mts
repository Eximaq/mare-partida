import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {grantWeeklyBossLoot} from '../../apps/game-server/src/characters/weekly-boss-loot.js';

test('each eligible player gets a separate persisted outcome; replay only repairs a missing letter',async()=>{
 const rows=new Map<string,any>(),letters=new Map<string,any[]>();
 const roster=['a','b','c'],draws=[.001,.002,.2,.9,.004,.8,.9,.9];
 let rolls=0;
 const client={async query(sql:string,values:unknown[]){
  const key=String(values?.[1]);
  if(sql.includes('SELECT rank_b,haki FROM mare_game.weekly_boss_loot'))return {rows:rows.has(key)?[rows.get(key)]:[]};
  if(sql.includes('INSERT INTO mare_game.weekly_boss_loot')){
   assert.equal(values.length,4,'one receipt per event and character');
   const result={rank_b:values[2],haki:values[3]};rows.set(key,result);return {rows:[result]};
  }
  if(sql.includes('SELECT id FROM mare_game.characters'))return {rowCount:1};
  if(sql.includes('SELECT id FROM mare_game.social_mail'))return {rows:letters.has(String(values[0]))?[{id:'existing'}]:[]};
  if(sql.includes('INSERT INTO mare_game.social_mail')){
   letters.set(String(values[0]),JSON.parse(String(values[6])));return {rows:[{id:'new'}]};
  }
  throw new Error(sql);
 }} as unknown as PoolClient;
 const rng=()=>{assert(rolls<draws.length,'receipt replay must not roll again');return draws[rolls++]!;};
 await grantWeeklyBossLoot(client,'event',roster,rng);
 assert.deepEqual([...rows.values()],[{rank_b:true,haki:'armament'},{rank_b:false,haki:'observation'},{rank_b:false,haki:null}]);
 assert.deepEqual([...letters.entries()].map(([id,items])=>[id,items.length]),[['a',2],['b',1]]);
 letters.delete('b');
 await grantWeeklyBossLoot(client,'event',[...roster,'a'],rng);
 assert.equal(rolls,8);assert.equal(letters.get('b')?.length,1);
});
