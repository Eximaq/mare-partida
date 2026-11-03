import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';import {mkdir,readdir,copyFile} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {authDatabase} from './auth-support.mjs';import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
const world=createRequire(import.meta.url)('../../world-catalog.cjs').load();
test('mask acceleration upgrade preserves all state and only promotes the audited world hash once',async()=>{
 const directory=resolve('infra/local/capacity/migrations-'+randomUUID());await mkdir(directory,{recursive:true});
 for(const name of await readdir('apps/game-server/migrations'))if(/^\d{4}_.+\.sql$/.test(name)&&name.slice(0,4)<='0033')await copyFile(join('apps/game-server/migrations',name),join(directory,name));
 await authDatabase(async f=>{
  const ids:string[]=[];for(let i=0;i<2;i++){const s=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Upgrade '+i,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:0,control:lease,action:'world.initialize',payload:{}});ids.push(c.id);}
  await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[ids[0],'2a2da1585a641e586ade3e544c858a3e630af3f93691fd00a84e7434bb7ce27c']);
  await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[ids[1],'a'.repeat(64)]);
  const read=async()=>({worlds:(await f.pool.query('SELECT character_id,x,y,path,speed,direction,started_at,motion_until FROM mare_game.character_world ORDER BY character_id')).rows,characters:(await f.pool.query('SELECT * FROM mare_game.characters ORDER BY id')).rows,progression:(await f.pool.query('SELECT * FROM mare_game.character_progression ORDER BY character_id')).rows});
  const before=await read();await applyMigrations(f.pool);
  const hashes=(await f.pool.query('SELECT character_id,rules_hash FROM mare_game.character_world')).rows;
  assert.equal(hashes.find(r=>r.character_id===ids[0]).rules_hash,world.rulesHash);assert.equal(hashes.find(r=>r.character_id===ids[1]).rules_hash,'a'.repeat(64));assert.deepEqual(await read(),before);
  await applyMigrations(f.pool);assert.deepEqual(await read(),before);
 },directory);
});
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
async function cycleActor(f:any){const s=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Budget '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);for(const action of ['items.initialize','world.initialize','battle.start'])await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(s.token,c.id)).version,control:lease,action,payload:{}});return {s,c,lease};}
test('time budget yields only between committed actors and the oldest remaining actor progresses next',async()=>authDatabase(async f=>{
 const a=await cycleActor(f),b=await cycleActor(f),ids=[a.c.id,b.c.id];
 await f.pool.query("CREATE FUNCTION mare_game.slow_tick() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.03); RETURN NEW; END $$; CREATE TRIGGER slow_tick BEFORE UPDATE OF simulation ON mare_game.character_battles FOR EACH ROW EXECUTE FUNCTION mare_game.slow_tick()");
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '300 milliseconds'");
 const read=async()=>(await f.pool.query('SELECT character_id,tick_at FROM mare_game.character_battles ORDER BY character_id')).rows;
 const before=await read();await tickWorldBattles(f.pool,undefined,10);const first=await read();
 assert.equal(first.filter((r:any,i:number)=>r.tick_at.getTime()!==before[i].tick_at.getTime()).length,1,'one over-budget transaction commits; another actor waits for the next cycle');
 await tickWorldBattles(f.pool,undefined,10);const second=await read();
 assert.equal(second.filter((r:any,i:number)=>r.tick_at.getTime()!==before[i].tick_at.getTime()).length,2,'oldest actor must not starve');
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.character_world WHERE character_id=ANY($1::uuid[])',[ids])).rows[0].n,2);
}));

test('Party time budget commits a complete room and every member before yielding',async()=>authDatabase(async f=>{

 for(let n=0;n<2;n++){
  const a=await cycleActor(f),b=await cycleActor(f),all=[a,b];
  const command=async(w:any,action:any,payload:any={})=>f.service.command(w.s.token,w.c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(w.s.token,w.c.id)).version,control:w.lease,action,payload});
  await command(a,'party.create');await command(a,'party.invite',{name:b.c.name});const pending=await f.service.onlineState(b.s.token,b.c.id);await command(b,'party.respond',{inviteId:pending.party!.invites[0]!.id,accept:true});
  await command(a,'party.prepare',{kind:'hunt',destination:'dawn'});const nonce=(await f.service.onlineState(a.s.token,a.c.id)).party!.group!.preparation.nonce;
  for(const w of all)await command(w,'party.ready',{nonce,ready:true});await command(a,'party.start',{nonce});
 }
 await f.pool.query("CREATE FUNCTION mare_game.slow_room() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.03); RETURN NEW; END $$; CREATE TRIGGER slow_room BEFORE UPDATE OF simulation ON mare_game.party_instances FOR EACH ROW EXECUTE FUNCTION mare_game.slow_room()");
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '300 milliseconds'");
 const rooms=async()=>(await f.pool.query('SELECT id,tick_at FROM mare_game.party_instances ORDER BY id')).rows;
 const members=async()=>(await f.pool.query('SELECT character_id,tick_at FROM mare_game.character_battles ORDER BY character_id')).rows;
 const before=await rooms(),personal=await members();await tickPartyBattles(f.pool,undefined,10);
 const after=await rooms(),changed=after.filter((r:any,i:number)=>r.tick_at.getTime()!==before[i].tick_at.getTime());
 assert.equal(changed.length,1);assert.equal((await members()).filter((r:any,i:number)=>r.tick_at.getTime()!==personal[i].tick_at.getTime()).length,2);
 await tickPartyBattles(f.pool,undefined,10);assert.equal((await rooms()).filter((r:any,i:number)=>r.tick_at.getTime()!==before[i].tick_at.getTime()).length,2);
 assert.equal((await members()).filter((r:any,i:number)=>r.tick_at.getTime()!==personal[i].tick_at.getTime()).length,4);
}));
