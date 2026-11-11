import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {once} from 'node:events';
import {readFile,mkdtemp,readdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import pg from 'pg';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase,placeAtMerchant} from './auth-support.mjs';
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

test('achievement protocol accepts only a canonical ID with the existing authenticated envelope',()=>{
 const envelope={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)},action:'achievement.claim'};
 assert(characterCommandSchema.safeParse({...envelope,payload:{achievementId:'level-0'}}).success);
 for(const key of ['points','level','progress','coins','power','ownerId','accountId','characterId'])assert(!characterCommandSchema.safeParse({...envelope,payload:{achievementId:'level-0',[key]:999}}).success);
 for(const id of ['level-9','kills-10','__proto__',"level-0' OR 1=1"])assert(!characterCommandSchema.safeParse({...envelope,payload:{achievementId:id}}).success);
});

test('achievement claims add talent points once, survive replay and reset without changing XP or gold',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=5 WHERE character_id=$1',[a.c.id]);
 const before=await a.read();assert.equal(before.achievements.entries.length,31);assert.equal(before.achievements.entries.filter((x:any)=>x.enabled).length,29);assert.equal(before.achievements.entries.filter((x:any)=>x.enabled).reduce((n:number,x:any)=>n+x.points,0),67);assert.equal(before.achievements.bonus,0);
 assert(before.achievements.entries.find((x:any)=>x.id==='level-0').ready);
 const request=await a.input('achievement.claim',{achievementId:'level-0'});const results=await Promise.all([a.send(request),a.send(request)]);assert.deepEqual(results[0],results[1]);
 const after=await a.read();assert.equal(after.achievements.bonus,1);assert.equal(after.talents.earned,1);assert.equal(after.talents.revision,before.talents.revision+1);assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);
 await assert.rejects(a.doit('achievement.claim',{achievementId:'level-0'}),{code:'achievement_already_claimed'});
 await a.doit('talents.commit',{build:{nodes:{'sword-0-0':1},keystone:null,ultimate:null}});await a.doit('talents.reset');assert.equal((await a.read()).talents.available,1);assert.deepEqual(await a.send(request),results[0]);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.achievement_claims')).rows[0].n,1);
}));

test('unearned and unmigrated achievements fail closed; reads never create progress or claims',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('DELETE FROM mare_game.achievement_progress WHERE character_id=$1',[a.c.id]);
 for(let i=0;i<3;i++){const o=await a.read();assert.equal(o.achievements.bonus,0);assert(o.achievements.entries.filter((x:any)=>x.feature&&!['prison','haki','fruit'].includes(x.feature)).every((x:any)=>!x.ready&&!x.enabled));}
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.achievement_progress')).rows[0].n,0);
 await assert.rejects(a.doit('achievement.claim',{achievementId:'kills-0'}),{code:'achievement_incomplete'});
 await assert.rejects(a.doit('achievement.claim',{achievementId:'observation-0'}),{code:'achievement_incomplete'});
 await assert.rejects(a.doit('achievement.claim',{achievementId:'fruits-0'}),{code:'achievement_incomplete'});for(const id of ['fastTravel-0'])await assert.rejects(a.doit('achievement.claim',{achievementId:id}),{code:'achievement_unavailable'});
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.achievement_claims')).rows[0].n,0);
}));

test('distinct simultaneous claims cannot pay twice and SQL failure rolls back bonus, revision and receipts',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=10 WHERE character_id=$1',[a.c.id]);const input=await a.input('achievement.claim',{achievementId:'level-0'});
 const both=await Promise.allSettled([a.send(input),a.send({...input,requestId:randomUUID()})]);assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
 const before=await a.read(),next=await a.input('achievement.claim',{achievementId:'level-1'});
 await pool.query("CREATE FUNCTION mare_game.fail_achievement_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture receipt failure'; END $$; CREATE TRIGGER fail_achievement_receipt BEFORE INSERT ON mare_game.character_commands FOR EACH ROW EXECUTE FUNCTION mare_game.fail_achievement_receipt()");
 await assert.rejects(a.send(next));const after=await a.read();assert.deepEqual(after.achievements,before.achievements);assert.deepEqual(after.talents,before.talents);assert.deepEqual(after.state,before.state);
}));


test('wealth counts positive earned gold once after spending, sales, contracts and replay',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET gold=9998 WHERE character_id=$1',[a.c.id]);await placeAtMerchant(pool,a.c.id);await a.doit('potions.buy');
 const before=await a.read();assert.equal(before.achievements.records.coins,9998);const input=await a.input('items.sell',{itemId:before.originalInventory.inventory[0].id});await a.send(input);const sold=await a.read(),delta=BigInt(sold.state.gold)-BigInt(before.state.gold);
 assert(delta>0n);assert.equal(sold.achievements.records.coins,9998+Number(delta));assert(BigInt(sold.state.gold)<10000n);assert(sold.achievements.entries.find((x:any)=>x.id==='coins-0').ready);
 await a.send(input);assert.equal((await a.read()).achievements.records.coins,sold.achievements.records.coins);
 await pool.query("INSERT INTO mare_game.contract_progress(character_id,contract_id,progress) VALUES($1,'bandit',5)",[a.c.id]);await a.doit('contract.claim',{contractId:'bandit'});const reward=await a.read();assert.equal(reward.achievements.records.coins,sold.achievements.records.coins+125);
 await a.doit('achievement.claim',{achievementId:'coins-0'});assert.equal((await a.read()).achievements.bonus,1);
}));

test('visits use successful canonical travel, count unique destinations and cannot be gained by reads or movement',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[a.c.id]);
 for(const islandId of ['dawn','conchas','orange-town','animais-raros','syrup','syrup'])await a.doit('world.travel',{islandId});
 const view=await a.read();assert.equal(view.achievements.records.islands.length,5);assert(view.achievements.entries.find((x:any)=>x.id==='islands-0').ready);
 await a.doit('world.stop');await a.read();assert.equal((await a.read()).achievements.records.islands.length,5);
 await assert.rejects(a.doit('world.travel',{islandId:'forged'}),{code:'world_destination_unknown'});assert.equal((await a.read()).achievements.records.islands.length,5);
 await a.doit('achievement.claim',{achievementId:'islands-0'});assert.equal((await a.read()).achievements.bonus,1);
}));

test('peak power uses committed permanent stats, ignores temporary blessing and survives lowering equipment',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service,'healer');await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,100)',[a.c.id]);await pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=$1',[a.c.id]);await a.doit('attributes.allocate',{allocation:{strength:0,dexterity:0,vitality:0,intelligence:495,spirit:0}});
 await a.doit('talents.commit',{build:{nodes:Object.fromEntries([0,1,2,3,4].map(i=>['healer-0-'+i,10])),keystone:'chain',ultimate:'eternalBlessing'}});
 const before=await a.read(),require=createRequire(import.meta.url),runtime=require('../../talent-runtime.cjs'),b=before.battle,rt=runtime.load(b);rt.ultimate.holyHP=5000;rt.ultimate.holyAttack=1000;runtime.save(b,rt);
 await pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
 const buffed=await a.read();assert(buffed.combatPreview.stats.power>before.combatPreview.stats.power);assert.equal(buffed.achievements.records.peakPower,before.achievements.records.peakPower);
 await a.doit('items.unequip',{slot:'weapon'});const after=await a.read();assert.equal(after.achievements.records.peakPower,before.achievements.records.peakPower);
 const rows=await pool.query('SELECT * FROM mare_game.achievement_progress WHERE character_id=$1',[a.c.id]);await a.doit('state.sync');await a.read();assert.deepEqual((await pool.query('SELECT * FROM mare_game.achievement_progress WHERE character_id=$1',[a.c.id])).rows,rows.rows);
}));

test('real worker records a lethal hit once and replays cannot farm achievement progress',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.doit('world.travel',{islandId:'dawn'});const before=await a.read(),b=before.battle,m=b.mobs[0];Object.assign(m,{hp:1,maxHP:100,defense:0,attackClock:999});b.mobs=[m];b.pending={targetId:m.id,remaining:0};b.autoSkills=false;
 await pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-20,m.y]);await pool.query('UPDATE mare_game.achievement_progress SET kills=99 WHERE character_id=$1',[a.c.id]);
 await pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 // Accuracy is validated independently; retry only when the actual server RNG misses.
 for(let n=0;n<10&&(await a.read()).achievements.kills<100;n++){await tickWorldBattles(pool);if((await a.read()).achievements.kills<100){await pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2::jsonb),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify({targetId:m.id,remaining:0})]);}}
 const after=await a.read();assert.equal(after.achievements.kills,100);assert(after.achievements.records.coins>before.achievements.records.coins);assert(after.achievements.entries.find((x:any)=>x.id==='kills-0').ready);
 await a.doit('achievement.claim',{achievementId:'kills-0'});await pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id]);await tickWorldBattles(pool);assert.equal((await a.read()).achievements.kills,100);
}));

test('HTTP achievement writes enforce CSRF, ownership, strict payload, controller and logout even on replay',async()=>authDatabase(async({service,pool,vault})=>{
 const a=await actor(service),b=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=5 WHERE character_id=$1',[a.c.id]);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('achievement.claim',{achievementId:'level-0'});assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['points','progress','power','coins','ownerId','accountId','characterId'])assert.equal((await send({...input,payload:{...input.payload,[key]:999}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(input,b.login.token,id),{status:404,body:{error:'character_not_found'}});
  assert.equal((await send(input)).status,200);a.setLease(await service.acquireControl(a.login.token,a.c.id,input.control.epoch));assert.deepEqual(await send(input),{status:409,body:{error:'control_conflict'}});
  await service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);assert.equal((await b.read()).achievements.bonus,0);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('runtime can observe and claim achievements but cannot rewrite reward history, visits or identity',async()=>authDatabase(async(f)=>{
 const role='achievements_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');let runtime:pg.Pool|undefined;
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
  const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;runtime=new pg.Pool({connectionString:url.toString(),max:2});
  const service=new AuthService({pool:runtime,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);await f.pool.query('UPDATE mare_game.character_progression SET level=5 WHERE character_id=$1',[a.c.id]);await a.doit('achievement.claim',{achievementId:'level-0'});await a.doit('world.travel',{islandId:'dawn'});
  for(const sql of ['DELETE FROM mare_game.achievement_progress','UPDATE mare_game.achievement_progress SET character_id=gen_random_uuid()','UPDATE mare_game.achievement_claims SET points=5','DELETE FROM mare_game.achievement_claims',"UPDATE mare_game.achievement_visits SET island_id='dawn'",'DELETE FROM mare_game.achievement_visits'])await assert.rejects(runtime.query(sql),{code:'42501'});
 }finally{await runtime?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('migration reconstructs only authoritative receipts, visits and wealth without importing claims or changing prior state',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-achievement-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0023'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async({service,pool})=>{
   const a=await actor(service);await pool.query('UPDATE mare_game.character_progression SET level=100,gold=10000 WHERE character_id=$1',[a.c.id]);
   for(const islandId of ['dawn','orange-town','orange-town','animais-raros'])await a.doit('world.travel',{islandId});await a.doit('world.return');
   await a.doit('items.sell',{itemId:(await a.read()).originalInventory.inventory[0].id});await pool.query("INSERT INTO mare_game.contract_progress(character_id,contract_id,progress) VALUES($1,'bandit',5)",[a.c.id]);await a.doit('contract.claim',{contractId:'bandit'});
   await pool.query('UPDATE mare_game.character_progression SET gold=0 WHERE character_id=$1',[a.c.id]);const before=await a.read();
   const income=(await pool.query('SELECT COALESCE(sum(GREATEST(0,gold_delta)),0)::int n FROM mare_game.game_inventory_events WHERE character_id=$1',[a.c.id])).rows[0].n+125;
   assert.deepEqual(await applyMigrations(pool),['0023_original_achievements.sql','0024_original_prison.sql','0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_daily_contracts.sql', '0041_progression_hud_balance.sql', '0042_crews.sql', '0043_crew_professions.sql', '0044_social_contacts.sql', '0045_social_mail.sql', '0046_social_trade.sql', '0047_market.sql', '0048_merchant_potions.sql', '0049_market_wallet_grants.sql', '0050_character_xp_curve.sql', '0051_bounty_victories.sql']);assert.deepEqual(await applyMigrations(pool),[]);const after=await a.read();assert.deepEqual(after.state,{...before.state,version:before.state.version+1,experience:"19036"});assert.deepEqual(after.originalInventory,{...before.originalInventory,manaPotions:0});assert.deepEqual(after.battle,before.battle);assert.deepEqual(after.talents,before.talents);
   assert.deepEqual(after.achievements.records.islands,['animais-raros','dawn','orange-town']);assert.equal(after.achievements.records.coins,income);assert.equal(after.achievements.bonus,0);assert.equal(after.achievements.claimed.length,0);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-achievement-migrations-')));await rm(dir,{recursive:true,force:true});}
});

test('SQL refuses a claim whose stored progress does not meet the catalog target',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service),input=await a.input('state.sync');await a.send(input);
 await assert.rejects(pool.query("INSERT INTO mare_game.achievement_claims(character_id,achievement_id,request_id,points,progress,version_before,rules_hash) VALUES($1,'level-0',$2,1,0,3,$3)",[a.c.id,input.requestId,'0'.repeat(64)]),{code:'23514'});
 await assert.rejects(pool.query("INSERT INTO mare_game.achievement_claims(character_id,achievement_id,request_id,points,progress,version_before,rules_hash) VALUES($1,'invented',$2,-1,-1,3,$3)",[a.c.id,input.requestId,'0'.repeat(64)]),{code:'23514'});
}));
