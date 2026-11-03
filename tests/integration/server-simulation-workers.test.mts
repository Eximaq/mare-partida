import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
test('solo partitions are disjoint, cover all actors and preserve per-character transactions',async()=>authDatabase(async f=>{
 const ids=[];for(let i=0;i<8;i++){const s=await f.service.login(`shard-${i}@example.invalid`,'fixture'),c=await f.service.createCharacter(s.token,{name:'Partition '+i,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);let version=0;for(const action of ['items.initialize','world.initialize','battle.start'])await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:version++,action:action as any,payload:{},control:lease});ids.push(c.id);}
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '300 milliseconds'");
 const before=(await f.pool.query("SELECT character_id,tick_at,mod(hashtextextended(character_id::text,34001)&2147483647,2)::int shard FROM mare_game.character_battles")).rows;
 await tickWorldBattles(f.pool,{index:0,count:2});const mid=(await f.pool.query('SELECT character_id,tick_at FROM mare_game.character_battles')).rows;
 for(const row of before){const changed=mid.find(m=>m.character_id===row.character_id).tick_at.getTime()>row.tick_at.getTime();assert.equal(changed,row.shard===0);}
 await tickWorldBattles(f.pool,{index:1,count:2});const after=(await f.pool.query('SELECT character_id,tick_at FROM mare_game.character_battles')).rows;
 assert.ok(after.every(r=>r.tick_at>before.find(b=>b.character_id===r.character_id).tick_at));assert.equal(ids.length,8);
 await assert.rejects(tickWorldBattles(f.pool,{index:2,count:2}));
}));
import {createSimulationPool} from '../../apps/game-server/src/simulation-pool.js';
import {Worker} from 'node:worker_threads';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

test('real workers use minimum grants, recover after crash and stop without changing other accounts',async()=>{
 const role='mare_test_worker_'+randomUUID().replaceAll('-',''),password=randomBytes(32).toString('hex');let created=false;
 try{await authDatabase(async f=>{
  await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);created=true;
  await f.pool.query((await readFile('infra/postgres/grant-auth.sql','utf8')).replaceAll('mare_runtime','"'+role+'"'));
  const s=await f.service.login('worker@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Worker',classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
  let version=0;for(const action of ['items.initialize','world.initialize','battle.start'])await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:version++,control:lease,action:action as any,payload:{}});
  const before=await f.service.characterState(s.token,c.id),url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;
  const owned:Worker[]=[],workers=createSimulationPool({databaseUrl:url.toString(),counts:{solo:2,party:1},workerUrl:new URL('../../apps/game-server/dist/simulation-worker.js',import.meta.url),restartDelayMs:50,spawn:(u,o)=>{const w=new Worker(u,o);owned.push(w);return w;}});
  try{await workers.start();const original=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[c.id])).rows[0].tick_at;
   const wait=async(check:()=>Promise<boolean>)=>{for(let n=0;n<120;n++){if(await check())return;await new Promise(r=>setTimeout(r,50));}throw Error('Worker condition timed out');};
   await wait(async()=> (await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[c.id])).rows[0].tick_at>original);
   await owned[0]!.terminate();await wait(async()=>owned.length===4&&workers.healthy());assert.equal(workers.report().restarts,1);
   await f.service.logout(s.token,'all');await new Promise(r=>setTimeout(r,400));const ended=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[c.id])).rows[0].tick_at;
   await new Promise(r=>setTimeout(r,500));assert.equal((await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[c.id])).rows[0].tick_at.getTime(),ended.getTime(),'revoked sessions must not advance');
   assert.deepEqual((await f.pool.query('SELECT level,experience::text,gold::text FROM mare_game.character_progression WHERE character_id=$1',[c.id])).rows[0],{level:before.level,experience:before.experience,gold:before.gold});
  }finally{await workers.stop();}assert.ok(owned.every(w=>w.threadId===-1));
 });}finally{if(created){const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:1});try{await admin.query('DROP ROLE "'+role+'"');}finally{await admin.end();}}}
});
