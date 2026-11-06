import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {authDatabase} from './auth-support.mjs';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';

async function actor(f:any){
 const s=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const c=await f.service.createCharacter(s.token,{name:'Queue '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'});
 const lease=await f.service.acquireControl(s.token,c.id);
 const command=async(action:string,payload:any={})=>f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(s.token,c.id)).version,control:lease,action,payload});
 for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
 return {s,c,command};
}
async function until(check:()=>Promise<boolean>,ms=700){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){if(await check())return true;await new Promise(r=>setTimeout(r,10));}
 return false;
}
for(const kind of ['solo','party'] as const)for(const rollback of [false,true])test(`${kind}: independent transaction commits while the oldest room waits, then ${rollback?'rolls back':'commits'}`,async()=>authDatabase(async f=>{
 const ids:string[]=[],members:string[][]=[];
 for(let i=0;i<2;i++){
  const a=await actor(f);members.push([a.c.id]);
  if(kind==='solo'){ids.push(a.c.id);continue;}
  const b=await actor(f);members[i]!.push(b.c.id);
  await a.command('party.create');await a.command('party.invite',{name:b.c.name});
  await b.command('party.respond',{inviteId:(await f.service.onlineState(b.s.token,b.c.id)).party!.invites[0]!.id,accept:true});
  await a.command('party.prepare',{kind:'hunt',destination:'dawn'});
  const nonce=(await f.service.onlineState(a.s.token,a.c.id)).party!.group!.preparation.nonce;
  await a.command('party.ready',{nonce,ready:true});await b.command('party.ready',{nonce,ready:true});await a.command('party.start',{nonce});
  ids.push((await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].simulation.partyInstanceId);
 }
 const table=kind==='solo'?'character_battles':'party_instances',column=kind==='solo'?'character_id':'id';
 await f.pool.query(`UPDATE mare_game.${table} SET tick_at=clock_timestamp()-CASE WHEN ${column}=$1 THEN interval '400 milliseconds' ELSE interval '300 milliseconds' END`,[ids[0]]);
 const read=async()=>(await f.pool.query('SELECT character_id,simulation,tick_at FROM mare_game.character_battles ORDER BY character_id')).rows;
 const before=await read(),roomsBefore=(await f.pool.query(`SELECT ${column} id,tick_at FROM mare_game.${table}`)).rows;
 // A test-only barrier holds the first transaction at its final persistence.
 // Normal 100ms lock timeout stays unchanged outside this isolated trigger.
 await f.pool.query(`CREATE FUNCTION mare_game.queue_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.${column}='${ids[0]}'::uuid THEN SET LOCAL lock_timeout='2s'; PERFORM pg_advisory_xact_lock(73412001); ${rollback?"RAISE EXCEPTION 'fixture persistence failure';":''} END IF; RETURN NEW; END $$; CREATE TRIGGER queue_barrier BEFORE UPDATE OF simulation ON mare_game.${table} FOR EACH ROW EXECUTE FUNCTION mare_game.queue_barrier()`);
 const barrier=await f.pool.connect(),workers=new pg.Pool({connectionString:f.pool.options.connectionString,max:2});
 let batch:Promise<unknown>|undefined;
 try{
  await barrier.query('SELECT pg_advisory_lock(73412001)');
  const tick=kind==='solo'?tickWorldBattles:tickPartyBattles;
  batch=tick(workers,undefined,200,2);
  assert.ok(await until(async()=>(await f.pool.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'")).rows[0].n>0),'first transaction reached barrier');
  const progressed=await until(async()=>{
   const row=(await f.pool.query(`SELECT tick_at FROM mare_game.${table} WHERE ${column}=$1`,[ids[1]])).rows[0];
   return row.tick_at.getTime()!==roomsBefore.find(r=>r.id===ids[1]).tick_at.getTime();
  });
  const during=await read();
  assert.deepEqual(during.filter(r=>members[0]!.includes(r.character_id)),before.filter(r=>members[0]!.includes(r.character_id)),'blocked room exposes no partial member state');
  assert.ok(progressed,'second independent room must commit before releasing the first');
 }finally{
  await barrier.query('SELECT pg_advisory_unlock(73412001)');barrier.release();
  try{if(rollback)await assert.rejects(batch!,/tick_failed/);else await batch;}finally{await workers.end();}
 }
 const after=await read();
 if(rollback)assert.deepEqual(after.filter(r=>members[0]!.includes(r.character_id)),before.filter(r=>members[0]!.includes(r.character_id)),'failed transaction rolls back every member');
 assert.equal(after.filter((r,i)=>r.tick_at.getTime()!==before[i].tick_at.getTime()).length,rollback?members[1]!.length:members.flat().length,'only complete transactions persist');
}));
