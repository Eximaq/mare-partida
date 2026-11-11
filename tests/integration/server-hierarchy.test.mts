import {mkdtemp,readdir,copyFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import pg from 'pg';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {authDatabase} from './auth-support.mjs';
import {characterCommandSchema} from '@mare/shared';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
async function actor(f:any,factionId='pirate'){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(login.token,{name:'Navegante',classId:'sword',factionId});
 const lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(v:any)=>f.service.command(login.token,c.id,v),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 await doit('items.initialize');return{login,c,lease,read,input,send,doit};
}
test('hierarchy uses owned level, advances one tier atomically and preserves original late gates',async()=>authDatabase(async f=>{
 const a=await actor(f);assert.equal((await a.read()).hierarchy.tier,1);
 await assert.rejects(a.doit('hierarchy.promote',{expectedTier:1}),{code:'hierarchy_level_required'});
 for(const [tier,level] of [[1,20],[2,50],[3,75],[4,100]] as const){
  await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,level]);
  const request=await a.input('hierarchy.promote',{expectedTier:tier});assert(characterCommandSchema.safeParse(request).success);
  assert.deepEqual(...await Promise.all([a.send(request),a.send(request)]));assert.equal((await a.read()).hierarchy.tier,tier+1);
  await assert.rejects(a.doit('hierarchy.promote',{expectedTier:tier}),{code:'hierarchy_tier_conflict'});
 }
 await f.pool.query('UPDATE mare_game.character_progression SET level=200 WHERE character_id=$1',[a.c.id]);
 await assert.rejects(a.doit('hierarchy.promote',{expectedTier:5}),{code:'hierarchy_locked'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.hierarchy_promotions WHERE character_id=$1',[a.c.id])).rows[0].n,4);
 assert.equal((await a.read()).hierarchy.title,'Shichibukai');
}));
test('hierarchy rejects fabricated ownership/stats and concurrent requests never skip a tier',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f,'marine');await f.pool.query('UPDATE mare_game.character_progression SET level=200 WHERE character_id=$1',[a.c.id]);
 const input=await a.input('hierarchy.promote',{expectedTier:1});
 for(const key of ['accountId','ownerId','characterId','player_id','level','power','tier','faction','portrait'])assert(!characterCommandSchema.safeParse({...input,payload:{...input.payload,[key]:999}}).success);
 await assert.rejects(f.service.command(b.login.token,a.c.id,characterCommandSchema.parse(input)),{code:'character_not_found'});
 const results=await Promise.allSettled([a.send(input),a.send({...input,requestId:randomUUID()})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await a.read()).hierarchy.tier,2);assert.equal((await b.read()).hierarchy.tier,1);
 await f.service.acquireControl(a.login.token,a.c.id,a.lease.epoch);await assert.rejects(a.send(input),{code:'control_conflict'});
}));
test('ranking is authenticated, strict, bounded, stable, public-only and uses current permanent server power',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f,'marine');await f.pool.query('UPDATE mare_game.character_progression SET level=20 WHERE character_id=$1',[a.c.id]);await a.doit('hierarchy.promote',{expectedTier:1});
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function get(query='',token=a.login.token){const r=await fetch(base+'/v1/hierarchy/ranking'+query,{headers:token?{cookie:`__Host-mare_session=${token}`}:{}});return {status:r.status,body:await r.json()};}
 try{
  assert.equal((await get('','')).status,401);
  const intent=await a.input('hierarchy.promote',{expectedTier:2}),headers={'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${a.login.token}`};
  assert.equal((await fetch(base+`/v1/characters/${a.c.id}/commands`,{method:'POST',headers,body:JSON.stringify(intent)})).status,403);
  assert.equal((await fetch(base+`/v1/characters/${a.c.id}/commands`,{method:'POST',headers:{...headers,'x-csrf-token':f.vault.csrf(a.login.token)},body:JSON.stringify({...intent,payload:{...intent.payload,power:999999}})})).status,400);

  for(const q of ['?faction=invalid','?ownerId=x','?limit=100','?faction=marine&faction=pirate'])assert.equal((await get(q)).status,400);
  const all=await get();assert.equal(all.status,200);assert.equal(all.body.faction,null);assert.equal(all.body.leaderboard.length,2);assert.equal(all.body.leaderboard[0].player_id,a.c.id);
  assert.deepEqual(Object.keys(all.body.leaderboard[0]).sort(),['class_id','faction','level','name','player_id','portrait','power','rank_title','tier']);assert(all.body.leaderboard[0].power>0);
  assert.deepEqual(await get(),all);const marine=await get('?faction=marine');assert.equal(marine.body.leaderboard.length,1);assert.equal(marine.body.leaderboard[0].player_id,b.c.id);
  // Forging/equipping updates the projection in the same transaction; never accepts a submitted power.
  const before=all.body.leaderboard[0].power;await a.doit('attributes.allocate',{allocation:{strength:5,dexterity:0,vitality:0,intelligence:0,spirit:0}});assert((await get()).body.leaderboard[0].power>before);
  for(let i=0;i<10;i++)await actor(f);assert.equal((await get()).body.leaderboard.length,10);
  await f.service.logout(a.login.token,'all');assert.equal((await get()).status,401);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
test('promotion audit failure rolls back title/version and leaves request retryable',async()=>authDatabase(async f=>{
 const a=await actor(f);await f.pool.query('UPDATE mare_game.character_progression SET level=20 WHERE character_id=$1',[a.c.id]);const before=await a.read(),input=await a.input('hierarchy.promote',{expectedTier:1});
 await f.pool.query("CREATE FUNCTION mare_game.fail_hierarchy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER fail_hierarchy BEFORE INSERT ON mare_game.hierarchy_promotions FOR EACH ROW EXECUTE FUNCTION mare_game.fail_hierarchy()");
 await assert.rejects(a.send(input));const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.hierarchy,before.hierarchy);
 await f.pool.query('DROP TRIGGER fail_hierarchy ON mare_game.hierarchy_promotions');await a.send(input);assert.equal((await a.read()).hierarchy.tier,2);
}));

test('hierarchy runtime can promote but cannot rewrite the immutable audit or character ownership',async()=>authDatabase(async f=>{
 const role='hierarchy_test_'+randomUUID().replaceAll('-',''),password=randomUUID();let pool:pg.Pool|undefined;
 try{await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
 const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;pool=new pg.Pool({connectionString:url.toString(),max:4});const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor({...f,service});await f.pool.query('UPDATE mare_game.character_progression SET level=20 WHERE character_id=$1',[a.c.id]);await a.doit('hierarchy.promote',{expectedTier:1});assert.equal((await a.read()).hierarchy.tier,2);
 for(const sql of ['DELETE FROM mare_game.character_hierarchy','UPDATE mare_game.character_hierarchy SET character_id=gen_random_uuid()','DELETE FROM mare_game.hierarchy_promotions','UPDATE mare_game.hierarchy_promotions SET tier_after=tier_after','CREATE TABLE mare_game.forbidden(id int)'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('hierarchy migration preserves existing state, inventory and battle without granting promotions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-hierarchy-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0027'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async f=>{
   const a=await actor(f),before=await a.read();
   assert.deepEqual(await applyMigrations(f.pool),['0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_daily_contracts.sql', '0041_progression_hud_balance.sql', '0042_crews.sql', '0043_crew_professions.sql', '0044_social_contacts.sql', '0045_social_mail.sql', '0046_social_trade.sql', '0047_market.sql', '0048_merchant_potions.sql', '0049_market_wallet_grants.sql', '0050_character_xp_curve.sql', '0051_bounty_victories.sql', '0052_world_map_exports.sql','0053_detach_claimed_dungeon_members.sql','0054_fruit_rework_compatibility.sql','0055_akainu_weekly_boss.sql','0056_skypiea_achievement_visit.sql']);assert.deepEqual(await applyMigrations(f.pool),[]);const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,{...before.originalInventory,manaPotions:0});assert.deepEqual(after.battle,before.battle);assert.equal(after.hierarchy.tier,1);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.hierarchy_promotions')).rows[0].n,0);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-hierarchy-migrations-')));await rm(dir,{recursive:true,force:true});}
});
