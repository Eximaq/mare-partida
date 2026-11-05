import {once} from 'node:events';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {authDatabase} from './auth-support.mjs';
import {characterCommandSchema} from '@mare/shared';
const require=createRequire(import.meta.url),A=require('../../character-appearance.js'),T=require('../../talent-system.js');
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),payload={name:'Navegante',classId:'sword' as const,factionId:'pirate' as const,appearance:{...A.defaults,hairColor:'blue'}},c=await f.service.createCharacter(login.token,payload);
 const lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>characterCommandSchema.parse({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(v:any)=>f.service.command(login.token,c.id,v),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 await doit('items.initialize');await doit('world.initialize');await doit('battle.start');return{login,c,lease,payload,read,input,send,doit};
}
test('profile creation and cosmetics survive reload without changing economy, ownership or another character',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),before=await a.read();assert.equal(before.profile.appearance.hairColor,'blue');
 await f.service.createCharacter(a.login.token,{...a.payload,appearance:{...A.defaults,hairColor:'pink'}});assert.equal((await a.read()).profile.appearance.hairColor,'blue');
 await a.doit('profile.appearance',{appearance:{...A.defaults,hairColor:'green',gender:'feminino'}});await a.doit('profile.preferences',{healThreshold:.9,hideHeadgear:true,hideItems:true});
 const after=await a.read();assert.equal(after.profile.appearance.gender,'feminino');assert.deepEqual(after.profile.preferences,{healThreshold:.9,hideHeadgear:true,hideItems:true});assert.deepEqual(after.originalInventory,before.originalInventory);assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);assert.deepEqual((await b.read()).profile.appearance,before.profile.appearance);
 const req=await a.input('profile.preferences',{hideItems:false});await assert.rejects(f.service.command(b.login.token,a.c.id,req),{code:'character_not_found'});await f.service.acquireControl(a.login.token,a.c.id,a.lease.epoch);await assert.rejects(a.send(req),{code:'control_conflict'});
}));
test('profile identity restores independent class builds and never farms starter weapons, heals or clears cooldowns',async()=>authDatabase(async f=>{
 const a=await actor(f);await f.pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[a.c.id]);const node=T.nodes('sword')[0].id,build={...T.empty(),nodes:{[node]:1}};await a.doit('talents.commit',{build});
 const before=await a.read(),b=before.battle;b.hp=9;b.energy=3;b.cooldowns=[10,20];b.talentCooldowns={shield:Date.now()+60000};await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);
 const edit=(classId:string)=>a.doit('profile.identity',{name:'Marinheiro',classId,factionId:'marine',appearance:A.defaults});
 await edit('healer');let now=await a.read();assert.equal(now.profile.identity.classId,'healer');assert.equal(now.originalInventory.equipment.weapon.def,31);assert.equal(now.talents.spent,0);assert.equal(now.battle.hp,9);assert.equal(now.battle.energy,3);assert.deepEqual(now.battle.cooldowns,[10,20]);assert.deepEqual(now.battle.talentCooldowns,b.talentCooldowns);
 await edit('sword');assert.deepEqual((await a.read()).talents.build,build);
 const count=(v:any)=>v.originalInventory.inventory.length+Object.values(v.originalInventory.equipment).filter(Boolean).length,n=count(await a.read());await edit('healer');await edit('sword');assert.equal(count(await a.read()),n);
 assert.equal((await a.read()).state.experience,before.state.experience);assert.equal((await a.read()).state.gold,before.state.gold);
 await a.doit('world.travel',{islandId:'dawn'});await assert.rejects(edit('healer'),{code:'profile_port_only'});
}));
test('profile retries are idempotent, concurrent edits serialize and failed audit rolls back every identity/item/build change',async()=>authDatabase(async f=>{
 const a=await actor(f),req=await a.input('profile.identity',{name:'Navegante Novo',classId:'healer',factionId:'marine',appearance:A.defaults});
 await f.pool.query("CREATE FUNCTION mare_game.fail_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER fail_profile BEFORE INSERT ON mare_game.profile_events FOR EACH ROW EXECUTE FUNCTION mare_game.fail_profile()");
 const before=await a.read();await assert.rejects(a.send(req));const after=await a.read();assert.deepEqual(after.profile,before.profile);assert.deepEqual(after.originalInventory,before.originalInventory);assert.deepEqual(after.battle,before.battle);assert.deepEqual(after.talents,before.talents);assert.deepEqual(after.state,before.state);
 await f.pool.query('DROP TRIGGER fail_profile ON mare_game.profile_events');assert.deepEqual(...await Promise.all([a.send(req),a.send(req)]));assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.profile_events WHERE character_id=$1',[a.c.id])).rows[0].n,1);
 const next=await a.input('profile.preferences',{hideItems:true}),both=await Promise.allSettled([a.send(next),a.send({...next,requestId:randomUUID(),payload:{hideItems:false}})]);assert.equal(both.filter(r=>r.status==='fulfilled').length,1);
}));
test('least privilege profile edits cannot reassign identity, delete progress or rewrite audits',async()=>authDatabase(async f=>{
 const role='profile_test_'+randomUUID().replaceAll('-',''),password=randomUUID();let pool:pg.Pool|undefined;
 try{await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime',`"${role}"`));const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;pool=new pg.Pool({connectionString:url.toString(),max:4});const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),a=await actor({...f,service});
 await a.doit('profile.identity',{name:'Outro Nome',classId:'healer',factionId:'marine',appearance:A.defaults});await a.doit('profile.preferences',{hideHeadgear:true});assert.equal((await a.read()).profile.identity.classId,'healer');
 for(const sql of ['UPDATE mare_game.characters SET account_id=gen_random_uuid()','UPDATE mare_game.characters SET id=gen_random_uuid()','DELETE FROM mare_game.character_profile','UPDATE mare_game.profile_events SET after_state=before_state','DELETE FROM mare_game.profile_events'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query(`DROP OWNED BY "${role}"; DROP ROLE "${role}"`);}
}));

test('profile HTTP rejects extra authority fields, foreign ownership, missing CSRF and revoked sessions',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const send=async(v:any,id=a.c.id,csrf=true)=>{const r=await fetch(base+`/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${a.login.token}`,...(csrf?{'x-csrf-token':f.vault.csrf(a.login.token)}:{})},body:JSON.stringify(v)});return r.status;};
 try{for(const [action,payload] of [['profile.appearance',{appearance:A.defaults}],['profile.preferences',{hideItems:true}],['profile.identity',{name:'Novo Nome',classId:'healer',factionId:'marine',appearance:A.defaults}]] as const){
 const v=await a.input(action,payload);assert.equal(await send(v,a.c.id,false),403);assert.equal(await send(v,b.c.id),404);
 for(const key of ['accountId','ownerId','characterId','gold','level','stats','starter_classes','class_builds','createdAt','totalPlay'])assert.equal(await send({...v,payload:{...payload,[key]:999}}),400);
 }
 const v=await a.input('profile.preferences',{hideItems:true});assert.equal(await send(v),200);assert.equal(await send(v),200);await f.service.logout(a.login.token,'all');assert.equal(await send(v),401);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
