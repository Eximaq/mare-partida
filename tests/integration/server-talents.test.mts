import {once} from 'node:events';
import {readFile,mkdtemp,readdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import pg from 'pg';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {characterCommandSchema} from '@mare/shared';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {awardWorldLoot} from '../../apps/game-server/src/gameplay/inventory.js';

async function actor(service:any,classId='sword'){
 const login=await service.login(randomUUID()+'@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'Talents',classId,factionId:'pirate'});
 let lease=await service.acquireControl(login.token,c.id);
 const read=()=>service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(v:any)=>service.command(login.token,c.id,v),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {login,c,read,input,send,doit,setLease:(v:any)=>lease=v};
}
const build=(nodes:Record<string,number>={},keystone:string|null=null,ultimate:string|null=null)=>({nodes,keystone,ultimate});

test('talent intents accept a bounded build and never supplied points, identity, stats or cooldowns',()=>{
 const envelope={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)}};
 assert(characterCommandSchema.safeParse({...envelope,action:'talents.commit',payload:{build:build({'sword-0-0':1})}}).success);
 assert(characterCommandSchema.safeParse({...envelope,action:'talents.reset',payload:{}}).success);
 for(const key of ['level','points','gold','accountId','classId','ownerId','talentCooldowns','stats'])assert(!characterCommandSchema.safeParse({...envelope,action:'talents.commit',payload:{build:build(),[key]:999}}).success);
 for(const nodes of [{'sword-0-0':11},{'sword-0-0':-1},{'sword-0-0':.5},{'__proto__-0-0':1}])assert(!characterCommandSchema.safeParse({...envelope,action:'talents.commit',payload:{build:build(nodes)}}).success);
});

test('new characters start with zero PT; a single claimed achievement funds a single investment',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),before=await a.read();
 assert.deepEqual(before.talents,{rulesetId:'original-talents-v1',revision:0,earned:0,spent:0,available:0,build:build()});
 await assert.rejects(a.doit('talents.commit',{build:build({'sword-0-0':1})}),{code:'talent_build_invalid'});
 await pool.query('UPDATE mare_game.character_progression SET level=5 WHERE character_id=$1',[a.c.id]);assert.equal((await a.read()).talents.earned,0);
 await a.doit('achievement.claim',{achievementId:'level-0'});assert.equal((await a.read()).talents.earned,1);const funded=await a.read();
 const request=await a.input('talents.commit',{build:build({'sword-0-0':1})});
 const [x,y]=await Promise.all([a.send(request),a.send(request)]);assert.deepEqual(x,y);
 const after=await a.read();assert.equal(after.talents.spent,1);assert.equal(after.talents.available,0);assert.equal(after.talents.revision,2);
 assert(Math.abs(after.combatPreview.stats.crit-funded.combatPreview.stats.crit-.004)<1e-9);
 assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);
 await assert.rejects(a.doit('talents.commit',{build:build({'sword-0-0':2})}),{code:'talent_build_invalid'});
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_talent_events')).rows[0].n,1);
 assert.deepEqual((await a.read()).talents,after.talents);
}));

test('server validates class, branches, bridge and exclusive choices against its frozen allowance',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[a.c.id]);await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,100)',[a.c.id]);
 for(const b of [build({'rogue-0-0':1}),build({'sword-0-1':1}),build({'sword-0-0':5,'sword-0-1':5,'sword-0-2':1}),build({'sword-0-0':1,'sword-1-0':1,'sword-2-0':1}),build({},'wear'),build({'sword-0-0':10},'poison'),build({'sword-0-0':10},'wear','asura')])await assert.rejects(a.doit('talents.commit',{build:b}),{code:'talent_build_invalid'});
 const b=build(Object.fromEntries([0,1,2,3,4].map(n=>['sword-0-'+n,10])),'wear','asura');await a.doit('talents.commit',{build:b});
 assert.equal((await a.read()).talents.spent,54);
 await assert.rejects(a.doit('talents.commit',{build:{...b,keystone:'parry'}}),{code:'talent_build_invalid'});
 await assert.rejects(a.doit('talents.commit',{build:{...b,nodes:{...b.nodes,'sword-0-0':9}}}),{code:'talent_build_invalid'});
}));

test('reset is port-only, refunds only talent budget and preserves persistent cooldowns and old receipts',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[a.c.id]);await a.doit('talents.commit',{build:build({'sword-0-0':1})});
 await pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{talentCooldowns}','{\"immortalUntil\":9999999999999}') WHERE character_id=$1",[a.c.id]);
 await a.doit('world.travel',{islandId:'dawn'});
 await assert.rejects(a.doit('talents.reset'),{code:'talent_reset_port_only'});
 await a.doit('world.return');const before=await a.read(),request=await a.input('talents.reset');
 const [x,y]=await Promise.all([a.send(request),a.send(request)]);assert.deepEqual(x,y);
 const after=await a.read();assert.equal(after.talents.spent,0);assert.equal(after.talents.available,1);assert.equal(after.talents.revision,2);
 assert.equal(after.battle.talentCooldowns.immortalUntil,9999999999999);assert.deepEqual(after.originalInventory,before.originalInventory);assert.deepEqual(after.attributes,before.attributes);assert.equal(after.state.gold,before.state.gold);
}));

test('the real worker applies an earned poison build and persists its damage across transactions',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service,'rogue');await pool.query('UPDATE mare_game.character_progression SET level=30 WHERE character_id=$1',[a.c.id]);await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,30)',[a.c.id]);
 await a.doit('attributes.allocate',{allocation:{strength:0,dexterity:100,vitality:0,intelligence:0,spirit:0}});await a.doit('talents.commit',{build:build({'rogue-0-0':10,'rogue-2-0':10},'poison')});await a.doit('world.travel',{islandId:'dawn'});
 const o=await a.read();assert.equal(o.combatPreview.stats.accuracy,1);const b=o.battle,m=b.mobs[0];Object.assign(m,{hp:10000,maxHP:10000,defense:0,attackClock:999,patrolClock:999});b.mobs=[m];b.pending={targetId:m.id,remaining:0};b.autoSkills=false;
 await pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-20,m.y]);
 await pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 await tickWorldBattles(pool);let after=await a.read();assert(after.battle.mobs[0].talentPoison?.power>0);const hp=after.battle.mobs[0].hp;
 await pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[a.c.id]);await tickWorldBattles(pool);after=await a.read();
 assert(after.battle.mobs[0].hp<hp);assert.equal(after.battle.talents.procs.poison,1);
}));

test('server loot preserves special boxes and the six-gold cap without overriding fixed gear rarity',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service,'rogue'),before=await a.read(),spawnId=randomUUID(),client=await pool.connect();
 const reward={xp:2,gold:3,materials:1,materialChance:1,potions:1,potionChance:1,gearChance:1,gearLevel:1};
 try{
  await client.query('BEGIN');const requestId=randomUUID();
  await awardWorldLoot(client,a.c.id,requestId,before.state,[{id:spawnId,area:'beach',monster:{type:'bandit'},reward}],undefined,0,{build:build({},'lightHands','underworld'),steals:[{spawnId,amount:6}],rng:()=>0});
  await client.query('INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4)',[a.c.id,requestId,'0'.repeat(64),JSON.stringify({action:'battle.reward'})]);await client.query('COMMIT');
  const after=await a.read();assert.equal(BigInt(after.state.gold)-BigInt(before.state.gold),9n);assert.equal(after.originalInventory.inventory.length-before.originalInventory.inventory.length,2);
  assert(!after.originalInventory.inventory.some((i:any)=>i.origin==='Senhor do Submundo'&&i.rarity==='legendary'));
  assert(after.originalInventory.inventory.some((i:any)=>i.generation?.source==='map:beach'&&i.rarity==='common'&&i.potential===0));
  assert(after.originalInventory.inventory.some((i:any)=>i.origin==='Senhor do Submundo'));
  assert.equal((await pool.query('SELECT total FROM mare_game.battle_talent_steals WHERE character_id=$1 AND spawn_id=$2',[a.c.id,spawnId])).rows[0].total,6);
  await client.query('BEGIN');await assert.rejects(awardWorldLoot(client,a.c.id,randomUUID(),after.state,[],undefined,0,{build:build({},'lightHands'),steals:[{spawnId,amount:1}]}));await client.query('ROLLBACK');assert.deepEqual((await a.read()).state,after.state);
 }finally{await client.query('ROLLBACK');client.release();}
}));


test('HTTP talent writes reject foreign characters, extra authority, CSRF omission and replaced controllers',async()=>authDatabase(async({service,pool,vault})=>{
 const a=await actor(service),b=await actor(service);await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[a.c.id]);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('talents.commit',{build:build({'sword-0-0':1})});assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['points','level','ownerId','accountId','characterId','cooldowns'])assert.equal((await send({...input,payload:{...input.payload,[key]:a.c.id}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(await b.input('talents.reset'),b.login.token,id),{status:404,body:{error:'character_not_found'}});
  assert.equal((await send(input)).status,200);
  a.setLease(await service.acquireControl(a.login.token,a.c.id,input.control.epoch));assert.deepEqual(await send(input),{status:409,body:{error:'control_conflict'}});
  await service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
  assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_talent_events')).rows[0].n,1);assert.equal((await b.read()).talents.spent,0);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('different concurrent purchases cannot overspend, and persistence failure rolls back build, stats and receipt',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[a.c.id]);const first=await a.input('talents.commit',{build:build({'sword-0-0':1})}),other={...first,requestId:randomUUID(),payload:{build:build({'sword-1-0':1})}};
 const results=await Promise.allSettled([a.send(first),a.send(other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await a.read()).talents.spent,1);
 await a.doit('talents.reset');const before=await a.read(),request=await a.input('talents.commit',{build:build({'sword-0-0':1})});
 await pool.query("CREATE FUNCTION mare_game.fail_talent_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture receipt failure'; END $$; CREATE TRIGGER fail_talent_receipt BEFORE INSERT ON mare_game.character_commands FOR EACH ROW EXECUTE FUNCTION mare_game.fail_talent_receipt()");
 await assert.rejects(a.send(request));assert.deepEqual((await a.read()).talents,before.talents);assert.deepEqual((await a.read()).state,before.state);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_talent_events WHERE request_id=$1',[request.requestId])).rows[0].n,0);
}));

test('runtime role can commit and reset but cannot rewrite talent audit, identity or steal caps',async()=>authDatabase(async(f)=>{
 const role='talents_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');let runtime:pg.Pool|undefined;
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
  const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;runtime=new pg.Pool({connectionString:url.toString(),max:2});
  const service=new AuthService({pool:runtime,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);await f.pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[a.c.id]);
  await a.doit('talents.commit',{build:build({'sword-0-0':1})});await a.doit('talents.reset');
  for(const sql of ['UPDATE mare_game.talent_legacy_allowances SET budget=999','INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) SELECT id,999 FROM mare_game.characters','DELETE FROM mare_game.character_talents','UPDATE mare_game.character_talents SET character_id=gen_random_uuid()',"UPDATE mare_game.character_talent_events SET earned=999",'DELETE FROM mare_game.character_talent_events','UPDATE mare_game.battle_talent_steals SET spawn_id=gen_random_uuid()','DELETE FROM mare_game.battle_talent_steals'])await assert.rejects(runtime.query(sql),{code:'42501'});
 }finally{await runtime?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('talent migrations preserve existing worlds and battle payloads, upgrade only the known hash and are repeatable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-talent-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0021'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async({service,pool})=>{
   const a=await actor(service),b=await actor(service),before=await a.read(),engine=createRequire(import.meta.url)('../../world-battle.cjs');
   const old={...before.battle,hp:13,talentCooldowns:{immortalUntil:9999999999999},rulesHash:'562bfa13620d2bc08aebcc96590bfeee5fdd3ebab4be31832e28046c31de235f'};
   await pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(old)]);
   await pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[b.c.id,JSON.stringify({...old,rulesHash:'unknown'})]);
   assert.deepEqual(await applyMigrations(pool),['0021_original_talents.sql','0022_talent_battle_compatibility.sql','0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_detach_claimed_dungeon_members.sql']);assert.deepEqual(await applyMigrations(pool),[]);
   const after=await a.read();assert.deepEqual(after.battle,{...old,rulesHash:engine.rulesHash});assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,before.originalInventory);assert.deepEqual(after.world.position,before.world.position);assert.equal(after.talents.spent,0);assert.equal((await b.read()).battle.rulesHash,'unknown');
   assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_talents')).rows[0].n,0);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-talent-migrations-')));await rm(dir,{recursive:true,force:true});}
});
