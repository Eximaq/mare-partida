import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,readdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {once} from 'node:events';
import pg from 'pg';
import {recordContractKills,contracts} from '../../apps/game-server/src/characters/contracts.js';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
async function actor(service:any){
 const login=await service.login(randomUUID()+'@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'Contracts',classId:'sword',factionId:'pirate'});
 let lease=await service.acquireControl(login.token,c.id);
 const read=()=>service.onlineState(login.token,c.id),input=async(contractId:string)=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action:'contract.claim',payload:{contractId},control:{epoch:lease.epoch,token:lease.token}});
 return {login,c,read,input,send:(v:any)=>service.command(login.token,c.id,v),setLease:(v:any)=>lease=v};
}
test('contracts begin empty, cannot be claimed early and reads never award or mutate progress',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),o=await a.read();
 assert.equal(o.contracts.rulesetId,'original-contracts-v1');assert.deepEqual(o.contracts.claimed,[]);
 assert(Object.values(o.contracts.progress).every(n=>n===0));
 await assert.rejects(a.send(await a.input('crab')),{code:'contract_incomplete'});
 assert.deepEqual((await a.read()).state,o.state);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.contract_claims')).rows[0].n,0);
}));
async function complete(pool:any,id:string,contractId='crab',progress=6){
 await pool.query('INSERT INTO mare_game.contract_progress VALUES($1,$2,$3) ON CONFLICT(character_id,contract_id) DO UPDATE SET progress=$3',[id,contractId,progress]);
}
test('concurrent replay pays once, independent attempts conflict and fresh requests cannot reclaim',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await complete(pool,a.c.id);const before=await a.read(),input=await a.input('crab');
 const [x,y]=await Promise.all([a.send(input),a.send(input)]);assert.deepEqual(x,y);
 assert.equal(x.state.gold,String(BigInt(before.state.gold)+85n));assert.equal(x.state.experience,'65');
 await assert.rejects(a.send(await a.input('crab')),{code:'contract_already_claimed'});
 await assert.rejects(a.send({...input,payload:{contractId:'boss'}}),{code:'idempotency_conflict'});
 await complete(pool,a.c.id,'bandit',5);const one=await a.input('bandit'),two={...one,requestId:randomUUID()};
 const results=await Promise.allSettled([a.send(one),a.send(two)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected')!.reason.code,'state_version_conflict');
 assert.equal((await a.read()).state.gold,String(BigInt(before.state.gold)+210n));
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.contract_claims')).rows[0].n,2);
 assert.equal((await a.read()).contracts.progress.crab,6);
}));
test('all original rewards and capped counters persist without recurring resets or a final reward',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),before=await a.read();let xp=0n,gold=0n;
 for(const q of contracts.quests){await complete(pool,a.c.id,q.id,q.target);await a.send(await a.input(q.id));xp+=BigInt(q.xp);gold+=BigInt(q.gold);}
 const after=await a.read();assert.equal(after.contracts.claimed.length,10);assert.equal(after.state.experience,xp.toString());assert.equal(after.state.gold,(BigInt(before.state.gold)+gold).toString());
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_commands')).rows[0].n,10);
 await pool.query("UPDATE mare_game.contract_claims SET claimed_at=claimed_at-interval '60 days'");
 const c=await pool.connect();try{await c.query('BEGIN');for(let i=0;i<50;i++)await recordContractKills(c,a.c.id,[{area:'beach',monster:{type:'crab'}}]);await c.query('COMMIT');}finally{c.release();}
 assert.deepEqual((await a.read()).state,after.state);assert.deepEqual((await a.read()).contracts,after.contracts);
 for(const q of contracts.quests)await assert.rejects(a.send(await a.input(q.id)),{code:'contract_already_claimed'});
}));
test('failed receipt storage and overflow roll back reward, level, version and claim entitlement',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await complete(pool,a.c.id,'rare-patrol',20);const before=await a.read(),request=await a.input('rare-patrol');
 await pool.query('ALTER TABLE mare_game.character_commands ADD CONSTRAINT fail_contract_receipt CHECK(false) NOT VALID');
 await assert.rejects(a.send(request),{code:'23514'});assert.deepEqual((await a.read()).state,before.state);assert.deepEqual((await a.read()).contracts,before.contracts);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_level_ledger')).rows[0].n,0);
 await pool.query('ALTER TABLE mare_game.character_commands DROP CONSTRAINT fail_contract_receipt');
 await pool.query('UPDATE mare_game.character_progression SET gold=9223372036854775807 WHERE character_id=$1',[a.c.id]);await assert.rejects(a.send(request),{code:'progression_limit'});
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.contract_claims')).rows[0].n,0);
 await pool.query('UPDATE mare_game.character_progression SET gold=$2 WHERE character_id=$1',[a.c.id,before.state.gold]);
 const paid=await a.send(request);assert.equal(paid.state.experience,'2200');assert(paid.state.level>1);assert.deepEqual(await a.send(request),paid,'lost response replays after completed transaction');
}));
test('contract level-up uses original derived stats and restores persisted battle HP and energy',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);
 for(const action of ['items.initialize','world.initialize','battle.start']){const input=await a.input('crab');await a.send({...input,action,payload:{}});}
 await pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(jsonb_set(simulation,'{hp}','1'),'{energy}','0') WHERE character_id=$1",[a.c.id]);
 await complete(pool,a.c.id,'rare-patrol',20);await a.send(await a.input('rare-patrol'));
 const after=await a.read();assert(after.state.level>1);assert.equal(after.battle.hp,after.combatPreview.stats.maxHP);assert.equal(after.battle.energy,after.combatPreview.stats.maxEnergy);
}));
test('HTTP rejects foreign identities, extra fields, missing CSRF and stale controllers without exposing progress',async()=>authDatabase(async({service,pool,vault})=>{
 const a=await actor(service),b=await actor(service);await complete(pool,a.c.id);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('crab');assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['gold','xp','progress','ownerId','accountId','characterId'])assert.equal((await send({...input,payload:{...input.payload,[key]:a.c.id}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(await b.input('crab'),b.login.token,id),{status:404,body:{error:'character_not_found'}});
  await assert.rejects(service.onlineState(b.login.token,a.c.id),{code:'character_not_found'});
  assert.equal((await send(input)).status,200);
  a.setLease(await service.acquireControl(a.login.token,a.c.id,input.control.epoch));assert.deepEqual(await send(input),{status:409,body:{error:'control_conflict'}});
  await service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
  assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.contract_claims')).rows[0].n,1);assert.deepEqual((await b.read()).contracts.claimed,[]);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
test('least-privilege runtime can count and claim, but cannot rewrite claims, identity or remove progress',async()=>authDatabase(async(f)=>{
 const role='contracts_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');let runtime:pg.Pool|undefined;
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
  const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;runtime=new pg.Pool({connectionString:url.toString(),max:2});
  const service=new AuthService({pool:runtime,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);
  const c=await runtime.connect();try{await c.query('BEGIN');for(let i=0;i<6;i++)await recordContractKills(c,a.c.id,[{area:'beach',monster:{type:'crab'}}]);await c.query('COMMIT');}finally{c.release();}
  await a.send(await a.input('crab'));
  for(const sql of ['DELETE FROM mare_game.contract_progress','UPDATE mare_game.contract_progress SET character_id=gen_random_uuid()',"UPDATE mare_game.contract_progress SET contract_id='boss'",'UPDATE mare_game.contract_claims SET gold_delta=999','DELETE FROM mare_game.contract_claims','UPDATE mare_game.contract_claims SET claimed_at=now()'])await assert.rejects(runtime.query(sql),{code:'42501'});
 }finally{await runtime?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));
test('versioned migration backfills only existing server kills and upgrades only the known equivalent battle hash',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-contract-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0018'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async({service,pool})=>{
   const a=await actor(service),b=await actor(service),before=(await a.read()).state;
   const engine=createRequire(import.meta.url)('../../world-battle.cjs');const sim=engine.create(null,{maxHP:100,maxEnergy:50},0,()=>.5);sim.hp=37;sim.rulesHash='562bfa13620d2bc08aebcc96590bfeee5fdd3ebab4be31832e28046c31de235f';
   await pool.query('INSERT INTO mare_game.character_battles(character_id,simulation,control_epoch) VALUES($1,$2,1),($3,$4,1)',[a.c.id,JSON.stringify(sim),b.c.id,JSON.stringify({...sim,rulesHash:'unknown'})]);
   for(let i=0;i<8;i++){const r=randomUUID();await pool.query("INSERT INTO mare_game.character_commands VALUES($1,$2,$3,$4)",[a.c.id,r,'0'.repeat(64),JSON.stringify({action:'battle.reward'})]);await pool.query('INSERT INTO mare_game.world_battle_rewards(character_id,spawn_id,request_id,area,monster,experience_delta,gold_delta,rules_hash) VALUES($1,$2,$3,$4,$5,0,0,$6)',[a.c.id,randomUUID(),r,'beach','crab',sim.rulesHash]);}
   for(const name of ['0018_battle_profile_compatibility.sql','0019_original_contracts.sql'])await copyFile(new URL(name,source),join(dir,name));
   assert.deepEqual(await applyMigrations(pool,dir),['0018_battle_profile_compatibility.sql','0019_original_contracts.sql']);
   assert.equal((await a.read()).battle.rulesHash,'e8c783982e814f1ea67b0ce8fa11e072c47c3a1f5746e77a9ca2de10a0eedce1');
   assert.deepEqual(await applyMigrations(pool),['0020_restore_stable_battle_hash.sql','0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql']);assert.deepEqual(await applyMigrations(pool),[]);
   const after=await a.read();assert.deepEqual(after.state,before);assert.equal(after.contracts.progress.crab,6);assert.equal(after.contracts.progress['dawn-patrol'],8);assert.deepEqual(after.contracts.claimed,[]);
   assert.deepEqual(after.battle,{...sim,rulesHash:engine.rulesHash});assert.equal((await b.read()).battle.rulesHash,'unknown');assert.equal((await b.read()).contracts.progress.crab,0);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-contract-migrations-')));await rm(dir,{recursive:true,force:true});}
});
