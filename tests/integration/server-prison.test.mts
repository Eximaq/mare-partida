import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {once} from 'node:events';
import {mkdtemp,readdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {characterCommandSchema} from '@mare/shared';
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

test('prison only accepts bounded intentions and never caller-supplied victories or rewards',()=>{
 const e={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)},action:'prison.enter',payload:{floor:1}};assert(characterCommandSchema.safeParse(e).success);
 for(const payload of [{floor:0},{floor:101},{floor:1,win:true},{floor:1,monster:'crab'},{floor:1,ownerId:'a'},{floor:1,reward:999}])assert(!characterCommandSchema.safeParse({...e,payload}).success);
});

test('prison preparation and entry preserve the original encounter across reload and cannot skip floors',async()=>authDatabase(async({service})=>{
 const a=await actor(service),initial=await a.read();assert.equal(initial.prison.cleared,0);assert(!initial.prison.encounter);
 await assert.rejects(a.doit('prison.enter',{floor:2}),{code:'prison_floor_locked'});await a.doit('prison.prepare',{floor:1});const p=(await a.read()).prison;await a.doit('prison.prepare',{floor:1});assert.deepEqual((await a.read()).prison,p);
 const input=await a.input('prison.enter',{floor:1});await Promise.all([a.send(input),a.send(input)]);let o=await a.read();assert.equal(o.world.mapId,'impel-down');assert.equal(o.battle.mobs.length,1);assert.equal(o.battle.prison.token,p.encounter.token);assert.equal(o.battle.mobs[0].id,p.encounter.spawnId);assert.equal(o.state.gold,initial.state.gold);
 await a.doit('world.return');await a.doit('prison.enter',{floor:1});o=await a.read();assert.equal(o.battle.mobs[0].id,p.encounter.spawnId);assert.equal(o.prison.cleared,0);
}));

const require=createRequire(import.meta.url),P=require('../../prison-system.js');
async function kill(f:any,a:any){
 let o=await a.read();const b=o.battle,m=b.mobs[0];Object.assign(m,{hp:1,defense:0,attackClock:999});b.pending={targetId:m.id,remaining:0};b.auto=false;b.autoSkills=false;
 await f.pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-20,m.y]);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 for(let i=0;i<10;i++){
  const result=await tickWorldBattles(f.pool);
  if((await a.read()).prison.cleared>o.prison.cleared)return result;
  await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify({targetId:m.id,remaining:0})]);
 }
 throw Error('Fixture did not land a hit');
}
async function seedFloor(f:any,a:any,floor:number){
 const p=P.migrate({}).impelDown;p.cleared=floor-1;
 await f.pool.query('INSERT INTO mare_game.character_prison(character_id,state) VALUES($1,$2) ON CONFLICT(character_id) DO UPDATE SET state=EXCLUDED.state',[a.c.id,JSON.stringify(p)]);
 await a.doit('prison.enter',{floor});
}

test('worker victory credits a floor and one box atomically, never XP/loot/regional contracts; next floor advances on server time',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service);await seedFloor(f,a,5);const before=await a.read();await kill(f,a);let after=await a.read();assert.equal(after.prison.cleared,5);assert.deepEqual(after.prison.claimed,[5]);assert.equal(after.state.experience,before.state.experience);assert.equal(after.state.gold,before.state.gold);assert.deepEqual(after.contracts,before.contracts);assert.deepEqual(after.battle.hunts,before.battle.hunts);assert.equal(after.achievements.kills,before.achievements.kills+1);
 assert.equal(after.originalInventory.inventory.filter((i:any)=>i.id==='impel-milestone-5').length,1);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.prison_floors')).rows[0].n,1);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{prison,transitionAt}',to_jsonb((extract(epoch from clock_timestamp())*1000-1)::bigint)),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id]);assert((await tickWorldBattles(f.pool))>=1);
 after=await a.read();assert.equal(after.battle.prison.floor,6);assert.equal(after.battle.mobs.length,1);assert.equal(after.prison.cleared,5);assert.equal(after.originalInventory.inventory.filter((i:any)=>i.id==='impel-milestone-5').length,1);assert.equal(after.world.position.x,480);
}));

test('full bag preserves the floor reward entitlement; claim and box opening each apply only once under concurrency',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service);await seedFloor(f,a,5);const o=await a.read(),item=o.originalInventory.inventory[0];
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(Array.from({length:120},(_,i)=>({...item,id:'fixture-'+i})))]);
 await kill(f,a);let after=await a.read();assert.equal(after.prison.cleared,5);assert.deepEqual(after.prison.claimed,[]);assert.equal(after.originalInventory.inventory.length,120);await assert.rejects(a.doit('prison.claim',{floor:5}),{code:'inventory_full'});
 await a.doit('world.return');await a.doit('items.sell',{itemId:'fixture-0'});const claim=await a.input('prison.claim',{floor:5});assert.deepEqual(...await Promise.all([a.send(claim),a.send(claim)]));after=await a.read();assert.deepEqual(after.prison.claimed,[5]);assert.equal(after.originalInventory.inventory.length,120);
 const id='impel-milestone-5';await a.doit('items.lock',{itemId:id,locked:true});await assert.rejects(a.doit('items.open-box',{itemId:id}),{code:'item_protected'});await a.doit('items.lock',{itemId:id,locked:false});
 const open=await a.input('items.open-box',{itemId:id});assert.deepEqual(...await Promise.all([a.send(open),a.send(open)]));after=await a.read();assert.equal(after.originalInventory.inventory.length,120);assert(!after.originalInventory.inventory.some((i:any)=>i.id===id));assert.equal(after.originalInventory.inventory.filter((i:any)=>i.id==='pearl-from-'+id).length,1);await assert.rejects(a.doit('items.open-box',{itemId:id}),{code:'item_not_found'});
}));

test('receipt failure rolls back the entire prison victory, box, counters and monster death',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service);await seedFloor(f,a,5);const before=await a.read();await f.pool.query("CREATE FUNCTION mare_game.reject_prison_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$; CREATE TRIGGER reject_prison_receipt BEFORE INSERT ON mare_game.character_commands FOR EACH ROW EXECUTE FUNCTION mare_game.reject_prison_receipt()");
 await assert.rejects(kill(f,a),{code:'battle_tick_failed'});const after=await a.read();assert.deepEqual(after.prison,before.prison);assert.deepEqual(after.state,before.state);assert.deepEqual(after.achievements,before.achievements);assert.deepEqual(after.originalInventory,before.originalInventory);assert(after.battle.mobs[0].alive);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.prison_floors')).rows[0].n,0);
}));

test('floor ten unlocks the original achievement through server progress and floor100 exits without an invented reward',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service);await seedFloor(f,a,10);await kill(f,a);assert((await a.read()).achievements.entries.find((x:any)=>x.id==='floors-0').ready);await a.doit('achievement.claim',{achievementId:'floors-0'});assert.equal((await a.read()).talents.earned,1);
 await a.doit('world.return');await seedFloor(f,a,100);const before=await a.read();await kill(f,a);assert.equal((await a.read()).prison.cleared,100);assert.deepEqual((await a.read()).originalInventory,before.originalInventory);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{prison,transitionAt}',to_jsonb((extract(epoch from clock_timestamp())*1000-1)::bigint)),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id]);await tickWorldBattles(f.pool);assert.equal((await a.read()).world.mapId,'lobby');assert(!(await a.read()).battle.prison);
}));

test('runtime role can enter and win but cannot alter immutable floor/milestone history or prison ownership',async()=>authDatabase(async(f)=>{
 const role='prison_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');let pool:pg.Pool|undefined;
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));const u=new URL(f.pool.options.connectionString!);u.username=role;u.password=password;pool=new pg.Pool({connectionString:u.toString(),max:2});
  const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);await seedFloor(f,a,5);await kill({...f,pool},a);assert.equal((await a.read()).prison.cleared,5);
  for(const sql of ['DELETE FROM mare_game.character_prison','UPDATE mare_game.character_prison SET character_id=gen_random_uuid()','DELETE FROM mare_game.prison_floors','UPDATE mare_game.prison_floors SET floor=99','DELETE FROM mare_game.prison_milestones','UPDATE mare_game.prison_milestones SET item_id=item_id'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));


test('prison and box commands reject foreign identity, extras, missing CSRF and obsolete controllers even during replay',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service),other=await actor(f.service);const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':f.vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('prison.enter',{floor:1});assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['victory','cleared','claimed','hp','points','monster','loot','ownerId','accountId','characterId'])assert.equal((await send({...input,payload:{...input.payload,[key]:999}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(input,other.login.token,id),{status:404,body:{error:'character_not_found'}});
  assert.equal((await send(input)).status,200);await f.service.acquireControl(a.login.token,a.c.id,input.control.epoch);assert.equal((await send(input)).status,409);await f.service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
  const open=await other.input('items.open-box',{itemId:'impel-milestone-5'});assert.equal((await send(open,other.login.token,other.c.id)).status,404);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('leaving and restarting the same prison encounter cannot reset its persistent steal budget',async()=>authDatabase(async(f)=>{
 const a=await actor(f.service);await a.doit('prison.enter',{floor:1});const id=(await a.read()).battle.mobs[0].id;
 await f.pool.query('INSERT INTO mare_game.battle_talent_steals(character_id,spawn_id,total) VALUES($1,$2,6)',[a.c.id,id]);await a.doit('world.return');await a.doit('prison.enter',{floor:1});assert.equal((await a.read()).battle.mobs[0].id,id);assert.equal((await a.read()).battle.mobs[0].talentStolen,6);
}));

test('prison migration preserves prior data and only upgrades the known engine hash; repeat application grants nothing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-prison-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0024'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async(f)=>{
   const a=await actor(f.service);await a.doit('world.travel',{islandId:'dawn'});const before=await a.read();
   const previous='c6f28ee5b9d8ce36d1df33e560675ddab0038e6186a5691483238bb25c9c91bf';await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[a.c.id,previous]);
   assert.deepEqual(await applyMigrations(f.pool),['0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_daily_contracts.sql', '0041_progression_hud_balance.sql', '0042_crews.sql', '0043_crew_professions.sql', '0044_social_contacts.sql', '0045_social_mail.sql', '0046_social_trade.sql', '0047_market.sql', '0048_merchant_potions.sql', '0049_market_wallet_grants.sql', '0050_detach_claimed_dungeon_members.sql', '0051_fruit_rework_compatibility.sql']);assert.deepEqual(await applyMigrations(f.pool),[]);const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,{...before.originalInventory,manaPotions:before.originalInventory.manaPotions??0});assert.deepEqual(after.battle,before.battle);assert.deepEqual({...after.world,serverNow:null},{...before.world,serverNow:null});assert.deepEqual(after.talents,before.talents);assert.equal(after.prison.cleared,0);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.prison_floors')).rows[0].n,0);assert.equal(after.achievements.bonus,before.achievements.bonus);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-prison-migrations-')));await rm(dir,{recursive:true,force:true});}
});
