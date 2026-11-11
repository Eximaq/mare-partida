import pg from 'pg';
import {once} from 'node:events';
import {readFile,mkdtemp,readdir,copyFile,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {authDatabase} from './auth-support.mjs';
import {characterCommandSchema} from '@mare/shared';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
const require=createRequire(import.meta.url),A=require('../../akuma-system.js'),P=require('../../akuma-passives.js'),F=require('../../forge-system.js'),C=require('../../character-system.js'),birth=require('../../character-catalog.js').create({characters:C});
const defs=require('../../item-catalog.js').create({forge:F,prison:require('../../prison-system.js'),haki:require('../../haki-system.js'),akuma:A,hakiProgression:require('../../haki-progression.js')}).items;
async function actor(f:any,classId='sword'){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(login.token,{name:'Navegante',classId,factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}}),send=(v:any)=>f.service.command(login.token,c.id,v),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 await doit('items.initialize');return{login,c,read,input,send,doit};
}
async function seed(f:any,a:any,fruitId:string){
 const o=(await a.read()).originalInventory,def=defs.findIndex((d:any)=>d.fruitId===fruitId),item={...o.inventory[0],id:randomUUID(),def,type:'akuma_no_mi',fruitId,binding:'character',boundToCharacter:a.c.id};o.inventory.push(item);await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(o.inventory)]);return item.id;
}
test('online compendium requires an owned fruit, never grants a copy or trusts an ID as ownership',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f);assert.deepEqual((await a.read()).fruits.registered,[]);
 const request=await a.input('fruit.register',{itemId:'missing'});assert(characterCommandSchema.safeParse(request).success);await assert.rejects(a.send(request),{code:'item_not_found'});
 for(const p of [{fruitId:'akuma_yami_yami'},{itemId:'x',ownerId:a.c.id},{itemId:'x',power:9999}])assert(!characterCommandSchema.safeParse({...request,payload:p}).success);
 const id=await seed(f,a,A.catalog[0].id),before=await a.read();await assert.rejects(b.doit('fruit.register',{itemId:id}),{code:'item_not_found'});
 const input=await a.input('fruit.register',{itemId:id});assert.deepEqual(...await Promise.all([a.send(input),a.send(input)]));const after=await a.read();assert.deepEqual(after.fruits.registered,[A.catalog[0].id]);assert.deepEqual(after.originalInventory,before.originalInventory);assert.equal(after.state.gold,before.state.gold);assert(after.combatPreview.maxHp>=before.combatPreview.maxHp);
 await assert.rejects(a.doit('fruit.register',{itemId:id}),{code:'fruit_already_registered'});const item=(await a.read()).originalInventory.inventory[0];await assert.rejects(a.doit('fruit.register',{itemId:item.id}),{code:'fruit_required'});
}));
test('fruit intents persist once, reject authority fields and award one worker kill under concurrent ticks',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),id=await seed(f,a,'akuma_supa_supa');await a.doit('items.equip',{itemId:id});await a.doit('world.initialize');await a.doit('battle.start');await a.doit('world.travel',{islandId:'dawn'});
 const o=await a.read(),m=o.battle.mobs[0];o.battle.mobs=[m];m.hp=1;m.patrolClock=100;o.battle.energy=100;await f.pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[a.c.id,m.x-25,m.y]);await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(o.battle)]);
 const input=await a.input('fruit.cast',{key:'1'});assert(characterCommandSchema.safeParse(input).success);for(const extra of ['damage','fruitId','accountId','now','energy','cooldown'])assert(!characterCommandSchema.safeParse({...input,payload:{...input.payload,[extra]:100}}).success);
 await assert.rejects(f.service.command(b.login.token,a.c.id,input as any),{code:'character_not_found'});const receipt=await a.send(input);assert.deepEqual(await a.send(input),receipt);assert.equal((await a.read()).battle.energy,80);assert.equal((await a.read()).state.experience,'0');
 // Wait for the accepted human punch to reach its release frame before ticking its native effect.
 assert((await a.read()).battle.fruit.job);await new Promise(resolve=>setTimeout(resolve,300));
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '250 milliseconds' WHERE character_id=$1",[a.c.id]);await Promise.all([tickWorldBattles(f.pool),tickWorldBattles(f.pool)]);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.world_battle_rewards WHERE character_id=$1',[a.c.id])).rows[0].n,1);
 await assert.rejects(a.doit('fruit.cast',{key:'1'}),{code:'fruit_cast_unavailable'});await a.doit('world.return');const after=await a.read();assert(after.battle.fruit.cooldowns['akuma_supa_supa:1']>Date.now());
}));
test('all30 equipped fruit passives match the original formulas and permanent compendium survives unequip',async()=>authDatabase(async f=>{
 const a=await actor(f,'strategist');
 // Equipment/registration are distinct server intents, no client calculated bonuses.
 for(const fruit of A.catalog){const id=await seed(f,a,fruit.id);await a.doit('fruit.register',{itemId:id});await a.doit('items.equip',{itemId:id});const o=await a.read(),gear=A.applyGear(F.aggregate(o.originalInventory.equipment,defs),o.originalInventory.equipment.akuma_no_mi,defs);gear.akumaRegistered=o.fruits.registered.length;
  const expected=P.apply(C.derive({classId:'strategist',level:o.state.level,attributes:o.attributes.allocated},birth.classes.strategist,birth.factions.pirate,gear),fruit.id,{magic:true,healer:false});
  for(const k of ['physical','elemental','maxHP','defense','power'])assert.equal(o.combatPreview.stats[k],expected[k],fruit.id+':'+k);
  // Avoid unrelated rate limits in this disposable fixture, never in the live game.
  await f.pool.query("UPDATE mare_game.character_commands SET created_at=created_at-interval '1 minute' WHERE character_id=$1",[a.c.id]);
 }
 await a.doit('items.unequip',{slot:'akuma_no_mi'});const o=await a.read();assert.equal(o.fruits.registered.length,30);assert.equal(o.originalInventory.equipment.akuma_no_mi,null);assert(o.achievements.entries.find((x:any)=>x.id==='fruits-1').ready);
}));

test('fruit HTTP surface denies all ownership overrides, CSRF omissions and stale controller replays',async()=>authDatabase(async f=>{
 const a=await actor(f),other=await actor(f),itemId=await seed(f,a,'akuma_supa_supa');
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':f.vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  for(const [action,payload] of [['fruit.register',{itemId}],['fruit.cast',{key:'1'}],['fruit.transform',{enabled:true}],['fruit.move',{x:100,y:100}]] as const){
   const input=await a.input(action,payload);assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
   for(const key of ['ownerId','characterId','accountId','damage','now','fruitId','cooldown','energy','position'])assert.equal((await send({...input,payload:{...payload,[key]:999}})).status,400);
   for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(input,other.login.token,id),{status:404,body:{error:'character_not_found'}});
  }
  const input=await a.input('fruit.register',{itemId});assert.equal((await send(input)).status,200);await f.service.acquireControl(a.login.token,a.c.id,input.control.epoch);assert.equal((await send(input)).status,409);await f.service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
test('failed receipt rolls back fruit registration and version; exactly one registration wins concurrent distinct requests',async()=>authDatabase(async f=>{
 const a=await actor(f),itemId=await seed(f,a,'akuma_supa_supa'),before=await a.read(),input=await a.input('fruit.register',{itemId});
 await f.pool.query("CREATE FUNCTION mare_game.fail_fruit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='fruit.register' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_fruit BEFORE INSERT ON mare_game.character_commands FOR EACH ROW EXECUTE FUNCTION mare_game.fail_fruit()");
 await assert.rejects(a.send(input));const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.fruits,before.fruits);assert.deepEqual(after.originalInventory,before.originalInventory);
 await f.pool.query('DROP TRIGGER fail_fruit ON mare_game.character_commands');const results=await Promise.allSettled([a.send(input),a.send({...input,requestId:randomUUID()})]);assert.equal(results.filter(v=>v.status==='fulfilled').length,1);assert.equal((await a.read()).fruits.registered.length,1);
}));
test('least privilege runtime can register fruit but cannot rewrite immutable ledger or ownership',async()=>authDatabase(async f=>{
 const role='fruit_test_'+randomUUID().replaceAll('-',''),password=randomUUID();let pool:pg.Pool|undefined;
 try{await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
 const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;pool=new pg.Pool({connectionString:url.toString(),max:4});const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor({...f,service}),itemId=await seed(f,a,'akuma_supa_supa');await a.doit('fruit.register',{itemId});assert.equal((await a.read()).fruits.registered.length,1);
 for(const sql of ['DELETE FROM mare_game.fruit_registrations','UPDATE mare_game.fruit_registrations SET fruit_id=fruit_id','UPDATE mare_game.character_battles SET character_id=gen_random_uuid()','CREATE TABLE mare_game.forbidden(id int)'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));
test('fruit migration changes only known battle hash, preserving stock, state and unknown simulations',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-fruit-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{for(const name of (await readdir(source)).filter(n=>n<'0028'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async f=>{
   const a=await actor(f),b=await actor(f);for(const v of [a,b]){await v.doit('world.initialize');await v.doit('battle.start');}
   const before=await a.read();await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[a.c.id,'dda97ea842c4df922f59eecda3fa8ea09c62d915ed74fc2033af719a12df52ce']);
   await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('unknown-version'::text)) WHERE character_id=$1",[b.c.id]);
   assert.deepEqual(await applyMigrations(f.pool),['0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0032_parties.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0037_achievement_only_talent_points.sql','0038_combat_action_compatibility.sql','0039_equipment_potential_compatibility.sql','0040_daily_contracts.sql', '0041_progression_hud_balance.sql', '0042_crews.sql', '0043_crew_professions.sql', '0044_social_contacts.sql', '0045_social_mail.sql', '0046_social_trade.sql', '0047_market.sql', '0048_merchant_potions.sql', '0049_market_wallet_grants.sql', '0050_detach_claimed_dungeon_members.sql', '0051_fruit_rework_compatibility.sql']);assert.deepEqual(await applyMigrations(f.pool),[]);const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,{...before.originalInventory,manaPotions:before.originalInventory.manaPotions??0});assert.deepEqual(after.battle,before.battle);assert.deepEqual(after.fruits.registered,[]);
   assert.equal((await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[b.c.id])).rows[0].simulation.rulesHash,'unknown-version');await assert.rejects(b.doit('battle.auto',{enabled:true}),{code:'battle_rules_changed'});
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-fruit-migrations-')));await rm(dir,{recursive:true,force:true});}
});
