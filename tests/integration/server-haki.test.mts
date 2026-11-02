import {awardWorldLoot} from '../../apps/game-server/src/gameplay/inventory.js';
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

const require=createRequire(import.meta.url),H=require('../../haki-system.js'),E=require('../../world-battle.cjs');
const defs=require('../../item-catalog.js').create({forge:require('../../forge-system.js'),prison:require('../../prison-system.js'),haki:H,akuma:require('../../akuma-system.js'),hakiProgression:H.progression}).items;
async function seed(f:any,a:any,level=50){
 await f.pool.query('UPDATE mare_game.character_progression SET level=$2 WHERE character_id=$1',[a.c.id,level]);
 const i=(await a.read()).originalInventory,template=i.inventory[0];i.inventory.push({...template,id:'will-book-fixture',def:defs.findIndex((d:any)=>d.kind==='haki-book')});
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(i.inventory)]);
}
async function field(f:any,a:any){
 const b=(await a.read()).battle;E.changeArea(b,'beach',Date.now(),()=>.5);b.auto=false;b.autoSkills=false;b.mobs=[];
 await f.pool.query("UPDATE mare_game.character_world SET map_id='dawn',area='beach',x=872,y=1608,path='[]' WHERE character_id=$1",[a.c.id]);
 await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
}
test('Haki unlock consumes only the owned unlocked book at50, rejects supplied authority, and replays once',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await seed(f,a,49);const input=await a.input('haki.unlock',{itemId:'will-book-fixture'});assert(characterCommandSchema.safeParse(input).success);
 for(const extra of [{unlocked:true},{ownerId:a.c.id},{current:100},{mastery:{}}])assert(!characterCommandSchema.safeParse({...input,payload:{...input.payload,...extra}}).success);
 await assert.rejects(a.send(input),{code:'haki_unlock_unavailable'});await f.pool.query('UPDATE mare_game.character_progression SET level=50 WHERE character_id=$1',[a.c.id]);
 await a.doit('items.lock',{itemId:'will-book-fixture',locked:true});await assert.rejects(a.doit('haki.unlock',input.payload),{code:'haki_unlock_unavailable'});await a.doit('items.lock',{itemId:'will-book-fixture',locked:false});
 const request=await a.input('haki.unlock',input.payload);assert.deepEqual(...await Promise.all([a.send(request),a.send(request)]));const o=await a.read();assert.equal(o.haki.state.unlocked,true);assert.equal(o.haki.state.current,100);assert.deepEqual(o.haki.state.mastery.ranks,{});assert.equal(o.haki.state.mastery.migration,null);assert(!o.originalInventory.inventory.some((i:any)=>i.id==='will-book-fixture'));await assert.rejects(a.doit('haki.unlock',input.payload),{code:'haki_unlock_unavailable'});
 await assert.rejects(a.doit('haki.configure',{branch:'armament',enabled:true}),{code:'haki_unlearned'});
}));
test('Haki investment consumes original costs once under concurrency, respects locked stacks and learns only full branches',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await seed(f,a);await a.doit('haki.unlock',{itemId:'will-book-fixture'});
 await assert.rejects(a.doit('haki.invest',{nodeId:'coating',expectedSeq:0}),{code:'haki_invest_unavailable'});
 const stock=(await a.read()).originalInventory,t=stock.inventory[0];stock.inventory.push(...H.progression.ids.map((branch:string)=>({...t,id:'fragment-'+branch,def:defs.findIndex((d:any)=>d.kind==='haki-fragment'&&d.branch===branch),qty:100})));
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(stock.inventory)]);
 await a.doit('items.lock',{itemId:'fragment-armament',locked:true});await assert.rejects(a.doit('haki.invest',{nodeId:'coating',expectedSeq:0}),{code:'haki_invest_unavailable'});await a.doit('items.lock',{itemId:'fragment-armament',locked:false});
 await assert.rejects(a.doit('haki.invest',{nodeId:'presence',expectedSeq:0}),{code:'haki_invest_unavailable'});
 const request=await a.input('haki.invest',{nodeId:'coating',expectedSeq:0}),results=await Promise.allSettled([a.send(request),a.send({...request,requestId:randomUUID()})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 let o=await a.read();assert.equal(o.haki.state.mastery.ranks.coating,1);assert.equal(o.originalInventory.inventory.find((i:any)=>i.id==='fragment-armament').qty,99);
 for(const n of H.progression.nodes){o=await a.read();for(let rank=o.haki.state.mastery.ranks[n.id]||0;rank<n.max;rank++){o=await a.read();await a.doit('haki.invest',{nodeId:n.id,expectedSeq:o.haki.state.mastery.seq});}}
 o=await a.read();for(const branch of H.progression.ids)assert.equal(o.haki.state.mastery.completedVersions[branch],1);assert(o.achievements.entries.find((e:any)=>e.id==='conqueror-0').ready);assert.equal(o.achievements.entries.find((e:any)=>e.id==='hakiMastery-0').progress,0);
 await a.doit('achievement.claim',{achievementId:'conqueror-0'});assert.equal((await a.read()).achievements.bonus,3);
 await assert.rejects(a.doit('items.sell',{itemId:'fragment-armament'}),{code:'item_protected'});
}));
test('Haki worker persists reserve, stops effects on controller loss/gap and cannot regenerate offline',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await seed(f,a);await a.doit('haki.unlock',{itemId:'will-book-fixture'});await field(f,a);
 const b=(await a.read()).battle;b.haki.mastery.completedVersions={armament:1,observation:1,conqueror:1};b.haki.current=80;
 await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);await a.doit('haki.toggle',{branch:'armament'});
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '500 milliseconds' WHERE character_id=$1",[a.c.id]);assert.equal(await tickWorldBattles(f.pool),1);let o=await a.read();assert(o.haki.state.current<80);assert(o.haki.state.current>74);const current=o.haki.state.current;
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '1 hour' WHERE character_id=$1",[a.c.id]);assert.equal(await tickWorldBattles(f.pool),1);o=await a.read();assert.equal(o.haki.state.current,current);assert.equal(o.haki.runtime.active,null);
 await a.doit('haki.cast');o=await a.read();assert(o.haki.state.kingReadyAt>Date.now());const expires=o.haki.state.kingReadyAt;await assert.rejects(a.doit('haki.cast'),{code:'haki_cast_unavailable'});await a.doit('world.return');assert.equal((await a.read()).haki.state.kingReadyAt,expires);
 await f.service.logout(a.login.token,'all');assert.equal(await tickWorldBattles(f.pool),0);
}));

test('Haki HTTP commands reject cross-account identity, extra state, absent CSRF, stale control and revoked sessions',async()=>authDatabase(async f=>{
 const a=await actor(f.service),other=await actor(f.service);await seed(f,a);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function send(body:any,token=a.login.token,id=a.c.id,csrf=true){const r=await fetch(`${base}/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${token}`,...(csrf?{'x-csrf-token':f.vault.csrf(token)}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
  const input=await a.input('haki.unlock',{itemId:'will-book-fixture'});assert.equal((await send(input,a.login.token,a.c.id,false)).status,403);
  for(const key of ['current','unlocked','ranks','completedVersions','targets','damage','now','ownerId','accountId','characterId'])assert.equal((await send({...input,payload:{...input.payload,[key]:999}})).status,400);
  for(const id of [a.c.id,randomUUID()])assert.deepEqual(await send(input,other.login.token,id),{status:404,body:{error:'character_not_found'}});
  assert.equal((await send(input)).status,200);await f.service.acquireControl(a.login.token,a.c.id,input.control.epoch);assert.equal((await send(input)).status,409);await f.service.logout(a.login.token,'all');assert.equal((await send(input)).status,401);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
test('failed Haki inventory event rolls back book and unlock together, leaving the same request retryable',async()=>authDatabase(async f=>{
 const a=await actor(f.service);await seed(f,a);const before=await a.read(),input=await a.input('haki.unlock',{itemId:'will-book-fixture'});
 await f.pool.query("CREATE FUNCTION mare_game.fail_haki() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='haki.unlock' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_haki BEFORE INSERT ON mare_game.game_inventory_events FOR EACH ROW EXECUTE FUNCTION mare_game.fail_haki()");
 await assert.rejects(a.send(input));const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.haki,before.haki);assert.deepEqual(after.originalInventory,before.originalInventory);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.character_commands WHERE request_id=$1',[input.requestId])).rows[0].n,0);
 await f.pool.query('DROP TRIGGER fail_haki ON mare_game.game_inventory_events');await a.send(input);assert.equal((await a.read()).haki.state.unlocked,true);
}));
test('book drop is fixed5 percent for world bosses30+, no fragment grant and no capacity overflow',async()=>authDatabase(async f=>{
 const a=await actor(f.service),o=await a.read();
 for(const [type,source,level,roll,full,wanted] of [['boss',undefined,30,0,false,true],['boss','world',30,0,false,true],['boss','world',30,.05,false,false],['boss','world',29,0,false,false],['bandit','world',99,0,false,false],['boss','impel-down',99,0,false,false],['boss','boss-dungeon',99,0,false,false],['boss','world',30,0,true,false]] as const){
  const c=await f.pool.connect();try{await c.query('BEGIN');if(full)await c.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(Array.from({length:120},(_,i)=>({...o.originalInventory.inventory[0],id:'full-'+i})))]);
   await awardWorldLoot(c,a.c.id,randomUUID(),o.state,[{id:randomUUID(),area:'beach',monster:{type,source,level},reward:{xp:0,gold:0,materialChance:0,gearChance:0,potionChance:0,materials:0,potions:0}}],undefined,0,{rng:()=>roll});
   const items=(await c.query('SELECT inventory FROM mare_game.game_inventory WHERE character_id=$1',[a.c.id])).rows[0].inventory;assert.equal(items.some((i:any)=>defs[i.def].kind==='haki-book'),wanted);assert(items.length<=120);assert(!items.some((i:any)=>defs[i.def].kind==='haki-fragment'));
  }finally{await c.query('ROLLBACK');c.release();}
 }
}));
test('runtime role can unlock through its own session without acquiring schema or ownership privileges',async()=>authDatabase(async f=>{
 const role='haki_test_'+randomUUID().replaceAll('-',''),password=randomUUID();let pool:pg.Pool|undefined;
 try{await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));
 const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;pool=new pg.Pool({connectionString:url.toString(),max:4});const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor(service);await seed(f,a);await a.doit('haki.unlock',{itemId:'will-book-fixture'});assert.equal((await a.read()).haki.state.unlocked,true);
 for(const sql of ['DELETE FROM mare_game.character_battles','UPDATE mare_game.character_battles SET character_id=gen_random_uuid()','DELETE FROM mare_game.game_inventory_events','UPDATE mare_game.game_inventory_events SET action=action','CREATE TABLE mare_game.forbidden(id int)'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('Haki upgrade preserves original stock and character state while only upgrading the known battle hash',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mare-haki-migrations-')),source=new URL('../../apps/game-server/migrations/',import.meta.url);
 try{
  for(const name of (await readdir(source)).filter(n=>n<'0026'))await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async f=>{
   const a=await actor(f.service),before=await a.read();await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb($2::text)) WHERE character_id=$1",[a.c.id,'11d7e176c6e0b3c8ed5fb1f6ddf43f0b023bedfba5c042fb2bb5621771871679']);
   assert.deepEqual(await applyMigrations(f.pool),['0026_original_haki.sql','0027_original_hierarchy.sql','0028_original_fruits.sql','0029_original_profile.sql','0030_navigation_broadphase.sql']);assert.deepEqual(await applyMigrations(f.pool),[]);const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,before.originalInventory);assert.deepEqual(after.battle,before.battle);assert.equal(after.haki.state.unlocked,false);
  },dir);
 }finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert(resolve(dir).startsWith(join(resolve(tmpdir()),'mare-haki-migrations-')));await rm(dir,{recursive:true,force:true});}
});
