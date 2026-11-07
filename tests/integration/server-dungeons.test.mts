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
import {readSocialMail,sendOfficialMail} from '../../apps/game-server/src/characters/mail.js';
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

const require=createRequire(import.meta.url),D=require('../../boss-dungeon-system.js'),maps=require('../../world-catalog.cjs').load();
const chest=maps.maps['quest-dungeons'].interactions[0];
async function level(f:any,a:any,n=20){await f.pool.query('UPDATE mare_game.character_progression SET level=$2,gold=10000 WHERE character_id=$1',[a.c.id,n]);}
async function near(f:any,a:any){await f.pool.query("UPDATE mare_game.character_world SET x=$2,y=$3,path='[]',speed=0 WHERE character_id=$1",[a.c.id,chest.x,chest.y+56]);}
async function inbox(f:any,a:any,tab:'pending'|'claimed'='pending'){
 const client=await f.pool.connect();try{return await readSocialMail(client,a.c.id,tab);}finally{client.release();}
}
async function redeem(a:any,dungeonId:string){const state=await a.read();return a.doit('mail.claim',{mailId:state.dungeons.records[dungeonId].mailId});}
async function kill(f:any,a:any){
 const o=await a.read(),b=o.battle,m=b.mobs[0];Object.assign(m,{hp:1,defense:0,attackClock:999});b.pending={targetId:m.id,remaining:0};b.auto=false;b.autoSkills=false;
 await f.pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-20,m.y]);
 await f.pool.query("UPDATE mare_game.character_battles SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify(b)]);
 for(let i=0;i<10;i++){await tickWorldBattles(f.pool);if((await a.read()).dungeons.records[b.dungeon.id].phase==='pending')return;await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2),tick_at=clock_timestamp()-interval '150 milliseconds' WHERE character_id=$1",[a.c.id,JSON.stringify({targetId:m.id,remaining:0})]);}
 throw Error('Fixture did not defeat boss');
}
test('dungeons require original levels, accept no client authority and keep a stable encounter on retry',async()=>authDatabase(async f=>{
 const a=await actor(f.service),input=await a.input('dungeon.enter',{dungeonId:'alvida'});assert(characterCommandSchema.safeParse(input).success);
 for(const payload of [{dungeonId:'other'},{dungeonId:'alvida',win:true},{dungeonId:'alvida',reward:999},{dungeonId:'alvida',ownerId:a.c.id}])assert(!characterCommandSchema.safeParse({...input,payload}).success);
 await assert.rejects(a.send(input),{code:'dungeon_level_required'});await level(f,a);await a.doit('dungeon.enter',{dungeonId:'alvida'});const o=await a.read();assert.equal(o.world.mapId,'quest-dungeons');assert.equal(o.battle.mobs[0].type,'dungeon-alvida');assert.equal(o.dungeons.records.alvida.berryReward,100);
 await f.pool.query('INSERT INTO mare_game.battle_talent_steals(character_id,spawn_id,total) VALUES($1,$2,6)',[a.c.id,o.battle.mobs[0].id]);await a.doit('world.return');await a.doit('dungeon.enter',{dungeonId:'alvida'});assert.equal((await a.read()).battle.mobs[0].id,o.battle.mobs[0].id);assert.equal((await a.read()).battle.mobs[0].talentStolen,6);
}));
test('only a nearby chest sends official mail and grants XP and Berry once',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await level(f,a);await a.doit('dungeon.enter',{dungeonId:'alvida'});const before=await a.read();await kill(f,a);let o=await a.read();assert.equal(o.dungeons.records.alvida.phase,'pending');assert.deepEqual(o.state,before.state.version===o.state.version?before.state:{...before.state,version:before.state.version+1});assert.deepEqual(o.originalInventory,before.originalInventory);assert.equal(o.achievements.kills,before.achievements.kills);assert.deepEqual(o.contracts,before.contracts);
 await assert.rejects(a.doit('dungeon.claim',{dungeonId:'alvida'}),{code:'dungeon_chest_out_of_range'});await a.doit('world.return');await a.doit('dungeon.enter',{dungeonId:'alvida'});assert.equal((await a.read()).battle.mobs.length,0);await near(f,a);const input=await a.input('dungeon.claim',{dungeonId:'alvida'});assert.deepEqual(...await Promise.all([a.send(input),a.send(input)]));o=await a.read();assert.equal(o.dungeons.records.alvida.phase,'claimed');assert.equal(o.world.mapId,'lobby');assert.equal(o.world.area,null);assert(o.battle.dungeon==null);assert.deepEqual(o.world.position,{...maps.maps.lobby.spawn});assert.deepEqual(o.originalInventory,before.originalInventory);const letter=(await inbox(f,a)).letters[0]!;assert.equal(o.dungeons.records.alvida.mailId,letter.id);assert.equal(letter.attachments[0]?.quantity,5);assert.equal(letter.attachments[0]?.boundToCharacter,a.c.id);assert.equal(BigInt(o.state.gold)-BigInt(before.state.gold),100n);assert(BigInt(o.state.experience)>BigInt(before.state.experience));assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_claims')).rows[0].n,1);await assert.rejects(a.doit('dungeon.claim',{dungeonId:'alvida'}),{code:'dungeon_reward_unavailable'});
 const claim=await a.input('mail.claim',{mailId:letter.id});assert.deepEqual(...await Promise.all([a.send(claim),a.send(claim)]));const after=await a.read();
 assert.deepEqual(after.originalInventory.inventory.find((i:any)=>i.id===letter.attachments[0]?.id),letter.attachments[0]);assert(after.dungeons.records.alvida.mailClaimedAt);assert.equal(after.state.experience,o.state.experience);assert.equal(after.state.gold,o.state.gold);
}));

test('a full bag permits sending mail; separate exact fragment stacks still craft one original Rank E fruit',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await level(f,a);await a.doit('dungeon.enter',{dungeonId:'alvida'});await kill(f,a);await near(f,a);
 const original=(await a.read()).originalInventory,item=original.inventory[0];await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(Array.from({length:120},(_,i)=>({...item,id:'fixture-'+i})))]);
 const input=await a.input('dungeon.claim',{dungeonId:'alvida'}),results=await Promise.allSettled([a.send(input),a.send({...input,requestId:randomUUID()})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await a.read()).world.mapId,'lobby');assert.equal((await redeem(a,'alvida')).mail.reason,'inventory_full');assert.equal((await inbox(f,a)).pending,1);
 await a.doit('items.sell',{itemId:'fixture-0'});await redeem(a,'alvida');
 await a.doit('dungeon.enter',{dungeonId:'morgan'});await kill(f,a);await near(f,a);await a.doit('dungeon.claim',{dungeonId:'morgan'});
 assert.equal((await redeem(a,'morgan')).mail.reason,'inventory_full');await a.doit('items.sell',{itemId:'fixture-1'});await redeem(a,'morgan');
 let o=await a.read(),fragments=o.originalInventory.inventory.filter((i:any)=>i.materialId==='akuma_fragment_e'),fragment=fragments[0];assert.equal(fragments.length,2);assert(fragments.every((item:any)=>item.quantity===5&&item.boundToCharacter===a.c.id));assert.equal(o.originalInventory.inventory.length,120);
 await assert.rejects(a.doit('items.sell',{itemId:fragment.id}),{code:'item_protected'});await a.doit('items.lock',{itemId:fragment.id,locked:true});await assert.rejects(a.doit('dungeon.craft',{expectedSeq:(await a.read()).dungeons.seq}),{code:'dungeon_craft_unavailable'});await a.doit('items.lock',{itemId:fragment.id,locked:false});
 const craft=await a.input('dungeon.craft',{expectedSeq:(await a.read()).dungeons.seq});assert.deepEqual(...await Promise.all([a.send(craft),a.send(craft)]));o=await a.read();assert.equal(o.originalInventory.inventory.length,119);assert(!o.originalInventory.inventory.some((i:any)=>i.materialId==='akuma_fragment_e'));const fruit=o.originalInventory.inventory.find((i:any)=>i.type==='akuma_no_mi');assert(fruit);assert.equal(fruit.rank,'E');assert.equal(fruit.boundToCharacter,a.c.id);assert.equal(o.dungeons.reveal.itemId,fruit.id);assert.equal(require('../../akuma-system.js').byId(fruit.fruitId).rank,'E');
 await assert.rejects(a.doit('dungeon.craft',{expectedSeq:o.dungeons.seq}),{code:'dungeon_craft_unavailable'});await a.doit('dungeon.acknowledge',{itemId:fruit.id});assert.equal((await a.read()).dungeons.reveal,null);await assert.rejects(a.doit('dungeon.acknowledge',{itemId:fruit.id}),{code:'dungeon_reveal_unavailable'});
}));

test('undefined rewards of the four later bosses preserve victory without inventing XP, currency or fragments',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await level(f,a,90);
 for(const d of D.catalog.filter((d:any)=>!d.rewardConfigured)){
  await a.doit('dungeon.enter',{dungeonId:d.id});const before=await a.read();await kill(f,a);const after=await a.read();assert.equal(after.dungeons.records[d.id].phase,'pending');assert.equal(after.dungeons.records[d.id].reward,null);assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);assert.deepEqual(after.originalInventory,before.originalInventory);
  await near(f,a);await assert.rejects(a.doit('dungeon.claim',{dungeonId:d.id}),{code:'dungeon_reward_unavailable'});await a.doit('world.return');await a.doit('dungeon.enter',{dungeonId:d.id});assert.equal((await a.read()).battle.mobs.length,0);
 }
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_victories')).rows[0].n,4);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.dungeon_claims')).rows[0].n,0);
}));

test('failed victory and chest commits roll back combat, progression, inventory, ledgers and version',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await level(f,a);await a.doit('dungeon.enter',{dungeonId:'alvida'});const before=await a.read();
 await f.pool.query('ALTER TABLE mare_game.dungeon_victories ADD CONSTRAINT reject_fixture CHECK(false) NOT VALID');await assert.rejects(kill(f,a),{code:'battle_tick_failed'});let after=await a.read();assert.deepEqual(after.dungeons,before.dungeons);assert.deepEqual(after.state,before.state);assert(after.battle.mobs[0].alive);assert.deepEqual(after.originalInventory,before.originalInventory);await f.pool.query('ALTER TABLE mare_game.dungeon_victories DROP CONSTRAINT reject_fixture');
 await kill(f,a);await near(f,a);const pending=await a.read(),input=await a.input('dungeon.claim',{dungeonId:'alvida'});await f.pool.query('ALTER TABLE mare_game.dungeon_claims ADD CONSTRAINT reject_fixture CHECK(false) NOT VALID');await assert.rejects(a.send(input),{code:'23514'});after=await a.read();assert.deepEqual(after.state,pending.state);assert.deepEqual(after.originalInventory,pending.originalInventory);assert.deepEqual(after.dungeons,pending.dungeons);assert.equal((await inbox(f,a)).pending,0);assert.deepEqual({...after.world,serverNow:null},{...pending.world,serverNow:null});await f.pool.query('ALTER TABLE mare_game.dungeon_claims DROP CONSTRAINT reject_fixture');await a.send(input);assert.equal((await a.read()).dungeons.records.alvida.phase,'claimed');
}));

test('dungeon HTTP commands reject cross-account IDs, extra fields, CSRF omission and revoked controllers before replay',async()=>authDatabase(async f=>{
 const a=await actor(f.service),other=await actor(f.service);await level(f,a);const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':f.vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('dungeon.enter',{dungeonId:'alvida'});assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['victory','level','position','hp','points','monster','reward','ownerId','accountId','characterId'])assert.equal((await send({...input,payload:{...input.payload,[key]:999}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(input,other.login.token,id),{status:404,body:{error:'character_not_found'}});
  assert.equal((await send(input)).status,200);await f.service.acquireControl(a.login.token,a.c.id,input.control.epoch);assert.equal((await send(input)).status,409);await f.service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('runtime can win and claim but cannot remove dungeon state, change ownership or rewrite immutable rewards',async()=>authDatabase(async f=>{
 const role='dungeon_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');let pool:pg.Pool|undefined;
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));const u=new URL(f.pool.options.connectionString!);u.username=role;u.password=password;pool=new pg.Pool({connectionString:u.toString(),max:2});
  const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);await level(f,a);await a.doit('dungeon.enter',{dungeonId:'alvida'});await kill({...f,pool},a);await near(f,a);await a.doit('dungeon.claim',{dungeonId:'alvida'});await redeem(a,'alvida');
  await assert.rejects(pool.query('UPDATE mare_game.social_mail SET claimed_at=NULL,claimed_request_id=NULL'),{code:'23514'});
  for(const sql of ['DELETE FROM mare_game.character_dungeons','UPDATE mare_game.character_dungeons SET character_id=gen_random_uuid()','DELETE FROM mare_game.dungeon_victories','UPDATE mare_game.dungeon_victories SET reward=null','DELETE FROM mare_game.dungeon_claims','UPDATE mare_game.dungeon_claims SET gold_delta=0','DELETE FROM mare_game.social_mail',"UPDATE mare_game.social_mail SET attachments='[]'"])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('versioned dungeon upgrade preserves existing characters, inventory, worlds and compatible battle state',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-dungeon-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0025'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async f=>{
   const a=await actor(f.service);await a.doit('prison.enter',{floor:1});const before=await a.read();await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[a.c.id,'5f9f3b94bacc9b9da99edfeee01f0ce1bbec02dc4d9897c1247fc06e5ace4dd6']);
   assert.deepEqual(await applyMigrations(f.pool),['0025_original_dungeons.sql','0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_daily_contracts.sql', '0041_progression_hud_balance.sql', '0042_crews.sql', '0043_crew_professions.sql', '0044_social_contacts.sql', '0045_social_mail.sql', '0046_social_trade.sql', '0047_market.sql', '0048_merchant_potions.sql', '0049_market_wallet_grants.sql', '0050_detach_claimed_dungeon_members.sql']);assert.deepEqual(await applyMigrations(f.pool),[]);const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,{...before.originalInventory,manaPotions:before.originalInventory.manaPotions??0});assert.deepEqual(after.battle,before.battle);assert.deepEqual(after.prison,before.prison);assert.deepEqual(after.dungeons.records,{});
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-dungeon-migrations-')));await rm(dir,{recursive:true,force:true});}
});

test('Buggy and Kuro chests return to port and synthesize exactly one native tradable epic',async()=>authDatabase(async f=>{const a=await actor(f.service,'healer');await level(f,a,40);for(const id of ['buggy','kuro']){await a.doit('dungeon.enter',{dungeonId:id});await kill(f,a);await near(f,a);await a.doit('dungeon.claim',{dungeonId:id});assert.equal((await a.read()).world.mapId,'lobby');await redeem(a,id);}let o=await a.read();assert.equal(o.originalInventory.inventory.filter((i:any)=>i.materialId==='epic_weapon_fragment').reduce((sum:number,item:any)=>sum+item.quantity,0),20);const request=await a.input('forge.execute',{operation:{type:'formEpicWeapon',expectedSeq:o.originalInventory.forgeSeq}});assert.deepEqual(...await Promise.all([a.send(request),a.send(request)]));o=await a.read();const items=o.originalInventory.inventory.filter((i:any)=>i.generation?.source==='synthesis');assert.equal(items.length,1);assert.equal(items[0].rarity,'epic');assert.equal(items[0].generation.family,'native');assert.equal(items[0].boundToCharacter,undefined);assert.equal(items[0].level,40);assert(!o.originalInventory.inventory.some((i:any)=>i.materialId==='epic_weapon_fragment'));assert.notEqual(o.originalInventory.equipment.weapon?.id,items[0].id);await assert.rejects(a.doit('forge.execute',{operation:{type:'formEpicWeapon',expectedSeq:o.originalInventory.forgeSeq}}));}));

test('Krieg level 50 delivers exactly one will book and returns to port atomically',async()=>authDatabase(async f=>{const a=await actor(f.service);await level(f,a,50);await a.doit('dungeon.enter',{dungeonId:'krieg'});await kill(f,a);await near(f,a);const input=await a.input('dungeon.claim',{dungeonId:'krieg'});assert.deepEqual(...await Promise.all([a.send(input),a.send(input)]));assert.equal((await inbox(f,a)).pending,1);await redeem(a,'krieg');const o=await a.read(),defs=require('../../item-catalog.js').create({forge:require('../../forge-system.js'),prison:require('../../prison-system.js'),haki:require('../../haki-system.js'),akuma:require('../../akuma-system.js'),hakiProgression:require('../../haki-progression.js')}).items;assert.equal(o.world.mapId,'lobby');assert.equal(o.originalInventory.inventory.filter((i:any)=>defs[i.def].kind==='haki-book').length,1);assert.equal(o.dungeons.records.krieg.phase,'claimed');await assert.rejects(a.doit('dungeon.claim',{dungeonId:'krieg'}));}));

test('official event replay keeps exact attachments; bulk claim leaves a letter intact when full',async()=>authDatabase(async f=>{
 const a=await actor(f.service),b=await actor(f.service),before=await a.read(),stock=before.originalInventory,first=stock.inventory[0];
 const chosen={...first,id:randomUUID(),plus:4,potential:87,origin:'Evento aprovado',sockets:[null,null],obtainedAt:123};
 const second={...first,id:randomUUID()},small={...first,id:randomUUID()};
 let rolls=0;
 const reward={source:'event' as const,sourceId:'event-fixture',rewardId:'large',title:'Entrega do evento',message:'Itens da conclusão.',makeAttachments:()=>{rolls++;return [chosen,second];}};
 const client=await f.pool.connect();
 let bigId:string,smallId:string;
 try{
  await client.query('BEGIN');
  bigId=await sendOfficialMail(client,a.c.id,reward);
  assert.equal(await sendOfficialMail(client,a.c.id,reward),bigId);
  smallId=await sendOfficialMail(client,a.c.id,{...reward,rewardId:'small',makeAttachments:()=>[small]});
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 assert.equal(rolls,1);
 assert.deepEqual((await inbox(f,a)).letters.find(letter=>letter.id===bigId)?.attachments[0],chosen);
 assert.equal((await inbox(f,b)).pending,0);
 await assert.rejects(b.doit('mail.claim',{mailId:bigId}),{code:'mail_not_found'});
 await assert.rejects(a.doit('mail.archive',{mailId:bigId}),{code:'mail_reward_pending'});
 await a.doit('mail.read',{mailId:bigId});assert.equal((await inbox(f,a)).unread,1);assert.deepEqual((await a.read()).originalInventory,stock);
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(Array.from({length:119},(_,i)=>({...first,id:'fixture-'+i})))]);
 const request=await a.input('mail.claim-all'),bulk=await a.send(request);
 assert.deepEqual(bulk.mail,{claimed:[smallId],pending:[bigId],reason:'inventory_full'});
 assert.deepEqual(await a.send(request),bulk);
 assert.equal((await inbox(f,a)).pending,1);assert.equal((await inbox(f,a,'claimed')).letters[0]?.id,smallId);
 assert.equal((await inbox(f,a)).unread,1);
 let inventory=(await a.read()).originalInventory.inventory;
 assert.deepEqual(inventory.find((item:any)=>item.id===small.id),small);
 assert(!inventory.some((item:any)=>item.id===chosen.id||item.id===second.id));
 await a.doit('items.sell',{itemId:'fixture-0'});await a.doit('items.sell',{itemId:'fixture-1'});
 const beforeRetry=await a.read(),claim=await a.input('mail.claim',{mailId:bigId});
 await f.pool.query('ALTER TABLE mare_game.social_mail ADD CONSTRAINT reject_claim_fixture CHECK(claimed_at IS NULL) NOT VALID');
 await assert.rejects(a.send(claim),{code:'23514'});
 assert.deepEqual((await a.read()).originalInventory,beforeRetry.originalInventory);assert.equal((await inbox(f,a)).pending,1);
 await f.pool.query('ALTER TABLE mare_game.social_mail DROP CONSTRAINT reject_claim_fixture');
 await a.send(claim);
 inventory=(await a.read()).originalInventory.inventory;
 assert.deepEqual(inventory.find((item:any)=>item.id===chosen.id),chosen);
 assert.deepEqual(inventory.find((item:any)=>item.id===second.id),second);
 await a.doit('mail.archive-claimed');
 assert.equal((await inbox(f,a,'claimed')).letters.length,0);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.social_mail WHERE claimed_at IS NOT NULL AND archived_at IS NOT NULL')).rows[0].n,2);
 const retry=await f.pool.connect();
 try{await retry.query('BEGIN');assert.equal(await sendOfficialMail(retry,a.c.id,reward),bigId);await retry.query('COMMIT');}
 catch(error){await retry.query('ROLLBACK');throw error;}finally{retry.release();}
 assert.equal(rolls,1);
 assert.equal((await inbox(f,a)).pending,0);
}));
