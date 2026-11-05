import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {authDatabase} from './auth-support.mjs';

async function actor(f:any){
 const s=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Snapshot',classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
 for(const action of ['items.initialize','world.initialize','battle.start'])await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(s.token,c.id)).version,control:lease,action,payload:{}});
 return {s,c};
}
// Pause after a real query; all concurrent operations use real independent PG connections.
async function afterState(run:()=>Promise<any>,barrier:()=>Promise<void>){
 const query=pg.Client.prototype.query;let paused=false;
 pg.Client.prototype.query=function(this:pg.Client,...args:any[]){
  const sql=typeof args[0]==='string'?args[0]:args[0].text,result=(query as any).apply(this,args);
  if(!paused&&sql.includes('p.character_id AS "characterId"')){paused=true;return Promise.resolve(result).then(async r=>{await barrier();return r;});}return result;
 } as any;
 try{const value=await run();assert(paused);return value;}finally{pg.Client.prototype.query=query;}
}

for(const method of ['onlineState','onlineFrame'] as const)test(`${method} releases authorization and simulation locks before projecting`,async()=>authDatabase(async f=>{
 const a=await actor(f);let available=false;
 await afterState(()=>f.service[method](a.s.token,a.c.id),async()=>{
  const c=await f.pool.connect();try{
   await c.query('BEGIN');
   const lock=(await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1296126533)) ok',[a.c.id])).rows[0].ok;
   try{await c.query('SELECT id FROM mare_game.app_sessions WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1) FOR UPDATE NOWAIT',[a.c.id]);await c.query('SELECT id FROM mare_game.accounts WHERE id=(SELECT account_id FROM mare_game.characters WHERE id=$1) FOR UPDATE NOWAIT',[a.c.id]);available=lock;}catch(e){assert.equal((e as any).code,'55P03');}
  }finally{await c.query('ROLLBACK');c.release();}
 });assert.equal(available,true,'presentation must not stall the simulation or logout');
}));

test('full presentation never mixes balances/version with inventory from another commit',async()=>authDatabase(async f=>{
 const a=await actor(f),before=await f.service.onlineState(a.s.token,a.c.id);
 const full=await afterState(()=>f.service.onlineState(a.s.token,a.c.id),async()=>{
  const c=await f.pool.connect();try{await c.query('BEGIN');await c.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[a.c.id]);await c.query('UPDATE mare_game.game_inventory SET potions=potions+1 WHERE character_id=$1',[a.c.id]);await c.query('COMMIT');}finally{c.release();}
 });
 assert.equal(full.state.version,before.state.version);assert.equal(full.originalInventory!.potions,before.originalInventory!.potions);
 const next=await f.service.onlineState(a.s.token,a.c.id);assert.equal(next.state.version,before.state.version+1);assert.equal(next.originalInventory!.potions,before.originalInventory!.potions+1);
}));

for(const method of ['onlineState','onlineFrame'] as const)for(const change of ['localLogout','globalLogout','rotation','accountEpoch','providerExpiry','idleExpiry','absoluteExpiry'] as const)test(`${method} discards its snapshot after concurrent ${change}`,async()=>authDatabase(async f=>{
 const a=await actor(f);
 await assert.rejects(afterState(()=>f.service[method](a.s.token,a.c.id),async()=>{
  if(change==='localLogout')await f.service.logout(a.s.token,'local');
  else if(change==='globalLogout')await f.service.logout(a.s.token,'all');
  else if(change==='rotation')await f.service.rotate(a.s.token);
  else if(change==='accountEpoch')await f.pool.query('UPDATE mare_game.accounts SET auth_epoch=auth_epoch+1 WHERE id=(SELECT account_id FROM mare_game.characters WHERE id=$1)',[a.c.id]);
  else {const column={providerExpiry:'provider_valid_until',idleExpiry:'idle_expires_at',absoluteExpiry:'expires_at'}[change];await f.pool.query(`UPDATE mare_game.app_sessions SET ${column}=clock_timestamp()-interval '1 second' WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)`,[a.c.id]);}
 }),{status:401});
}));

test('concurrent presentation refresh consumes the provider rotation once and keeps owner checks',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await f.service.login(randomUUID()+'@example.invalid','fixture');
 await f.pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
 const frames=await Promise.all(Array.from({length:8},()=>f.service.onlineFrame(a.s.token,a.c.id)));
 assert.equal(f.provider.refreshes,1);for(const frame of frames)assert.equal(frame.characterId,a.c.id);
 await assert.rejects(f.service.onlineFrame(b.token,a.c.id),{code:'character_not_found'});
}));

test('a valid presentation can read the last commit while the simulation owns authorization locks',async()=>authDatabase(async f=>{
 const a=await actor(f),c=await f.pool.connect();let settled=false,reading:Promise<any>|undefined;
 try{
  await c.query('BEGIN');await c.query('SELECT id FROM mare_game.app_sessions WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1) FOR UPDATE',[a.c.id]);await c.query('SELECT id FROM mare_game.accounts WHERE id=(SELECT account_id FROM mare_game.characters WHERE id=$1) FOR UPDATE',[a.c.id]);await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,1296126533))',[a.c.id]);
  reading=f.service.onlineFrame(a.s.token,a.c.id).then(value=>{settled=true;return value;});
  // Wait on observable database completion with a generous bound, not a frame delay.
  await Promise.race([reading,new Promise(resolve=>setTimeout(resolve,1000))]);
  assert.equal(settled,true,'a simulation row lock must not stall read-only presentation');
 }finally{await c.query('ROLLBACK');c.release();await reading;}
}));
