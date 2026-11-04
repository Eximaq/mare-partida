import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {authDatabase} from './auth-support.mjs';
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),name='Party '+randomUUID().slice(0,8),c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}}),send=(v:any)=>f.service.command(login.token,c.id,v),doit=async(a:string,p:any={})=>send(await input(a,p));
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,name,login,lease,read,input,send,doit,frame:()=>f.service.onlineFrame(login.token,c.id)};
}
async function join(a:any,b:any){await a.doit('party.invite',{name:b.name});const invite=(await b.read()).party.invites.find((i:any)=>i.status==='pending');await b.doit('party.respond',{inviteId:invite.id,accept:true});}
test('party acceptance, capacity, consent and same authoritative instance for 2/3/4 real sessions',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),c=await actor(f),d=await actor(f),e=await actor(f);
 await a.doit('party.create');await assert.rejects(a.doit('party.invite',{name:a.name}),{code:'party_self_invite'});
 await join(a,b);assert.equal((await b.read()).party.group.members.length,2);
 await assert.rejects(b.doit('party.kick',{memberId:a.c.id}),{code:'party_leader_required'});
 await join(a,c);await join(a,d);await assert.rejects(a.doit('party.invite',{name:e.name}),{code:'party_full'});
 await a.doit('party.prepare',{kind:'hunt',destination:'dawn'});const plan=(await a.read()).party.group.preparation;
 await assert.rejects(a.doit('party.start',{nonce:plan.nonce}),{code:'party_not_ready'});
 for(const who of [a,b,c,d])await who.doit('party.ready',{nonce:plan.nonce,ready:true});
 const command=await a.input('party.start',{nonce:plan.nonce});await a.send(command);await a.send(command);
 const views=await Promise.all([a,b,c,d].map(w=>w.read()));
 assert.equal(new Set(views.map(v=>v.battle.partyInstanceId)).size,1);assert(views[0].battle.partyInstanceId);
 for(const v of views){assert.deepEqual(v.battle.mobs,views[0].battle.mobs);assert.equal(v.world.mapId,'dawn');}
 await assert.rejects(b.doit('prison.enter',{floor:1}),{code:'party_prison_individual'});
 await b.doit('party.leave');assert.equal((await b.read()).party.group,null);assert.equal((await b.read()).world.mapId,'lobby');
 assert.equal((await a.read()).party.group.members.length,3);
}));

async function activity(a:any,all:any[],kind='hunt',destination='dawn'){
 await a.doit('party.prepare',{kind,destination});const nonce=(await a.read()).party.group.preparation.nonce;
 for(const w of all)await w.doit('party.ready',{nonce,ready:true});await a.doit('party.start',{nonce});
 for(const w of all){const full=await w.read(),frame=await (w as any).frame();assert.equal(frame.version,full.state.version);assert.deepEqual(frame.battle.mobs,full.battle.mobs);assert.deepEqual(frame.partyMotion.group.activity,full.party.group.activity);}

}
async function sharedKill(f:any,all:any[]){
 const before=await all[0].read(),instance=before.battle.partyInstanceId,row=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0],room=row.simulation,m=room.mobs.find((m:any)=>m.alive);
 Object.assign(m,{hp:1,defense:0,attackClock:999,engaged:false});
 await f.pool.query("UPDATE mare_game.party_instances SET simulation=$2 WHERE id=$1",[instance,JSON.stringify(room)]);
 for(const w of all){const o=await w.read();o.battle.auto=false;o.battle.autoSkills=false;o.battle.pending={targetId:m.id,remaining:0};await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[w.c.id,JSON.stringify(o.battle)]);await f.pool.query("UPDATE mare_game.character_world SET x=$2,y=$3,path='[]',speed=0 WHERE character_id=$1",[w.c.id,m.x-20,m.y]);}
 // Start the elapsed window after fixture setup; slow CI setup must not trigger reconnect cancellation.
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[instance]);
 await tickPartyBattles(f.pool);return {instance,m};
}
test('real shared worker conserves XP for two, three and four; one death and one personal loot owner',async()=>authDatabase(async f=>{
 for(const size of [2,3,4]){
  const all:Awaited<ReturnType<typeof actor>>[]=[];for(let n=0;n<size;n++)all.push(await actor(f));const a=all[0]!;await a.doit('party.create');for(const w of all.slice(1))await join(a,w);await activity(a,all);
  const before=await Promise.all(all.map(w=>w.read())),{instance,m}=await sharedKill(f,all),views=await Promise.all(all.map(w=>w.read()));
  const grants=(await f.pool.query('SELECT character_id,amount FROM mare_game.party_experience WHERE instance_id=$1 AND spawn_id=$2',[instance,m.id])).rows;
  assert.equal(grants.length,size);const values=grants.map((r:any)=>Number(r.amount));assert(Math.max(...values)-Math.min(...values)<=1);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_deaths WHERE instance_id=$1',[instance])).rows[0].n,1);
  for(let n=0;n<size;n++){assert.equal(BigInt(views[n].state.experience)-BigInt(before[n].state.experience),BigInt(grants.find((g:any)=>g.character_id===all[n]!.c.id).amount));assert.equal(views[n].battle.mobs.find((x:any)=>x.id===m.id).alive,false);}
  assert.equal(views.filter((v:any,n:number)=>BigInt(v.state.gold)>BigInt(before[n].state.gold)).length,1);
  await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[instance]);await tickPartyBattles(f.pool);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_deaths WHERE instance_id=$1',[instance])).rows[0].n,1);
 }
}));

test('shared dungeon keeps one scaled boss and each eligible character owns a once-only chest',async()=>authDatabase(async f=>{
 const all:[Awaited<ReturnType<typeof actor>>,Awaited<ReturnType<typeof actor>>]=[await actor(f),await actor(f)],a=all[0],b=all[1];
 for(const w of all)await f.pool.query('UPDATE mare_game.character_progression SET level=20,gold=10000 WHERE character_id=$1',[w.c.id]);
 await a.doit('party.create');await join(a,b);await activity(a,all,'dungeon','alvida');
 const initial=await a.read(),require=createRequire(import.meta.url),base=require('../../world-battle.cjs').prisonCatalog['dungeon-alvida'];
 assert.equal(initial.battle.mobs.length,1);assert.equal(initial.battle.mobs[0].maxHP,Math.round(base.hp*1.6));
 const {instance}=await sharedKill(f,all);
 for(const w of all)assert.equal((await w.read()).dungeons.records.alvida.phase,'pending');
 const map=require('../../world-catalog.cjs').load().maps['quest-dungeons'],chest=map.interactions[0];
 for(const w of all)await f.pool.query('UPDATE mare_game.character_world SET x=$2,y=$3 WHERE character_id=$1',[w.c.id,chest.x,chest.y+40]);
 await a.doit('dungeon.claim',{dungeonId:'alvida'});assert.equal((await b.read()).dungeons.records.alvida.phase,'pending');
 await b.doit('dungeon.claim',{dungeonId:'alvida'});
 for(const w of all){const o=await w.read();assert.equal(o.originalInventory.inventory.find((i:any)=>i.materialId==='akuma_fragment_e').quantity,5);await assert.rejects(w.doit('dungeon.claim',{dungeonId:'alvida'}),{code:'dungeon_reward_unavailable'});}
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_deaths WHERE instance_id=$1',[instance])).rows[0].n,1);
}));

test('explicit leader survives removing someone else; disconnected actors cannot stall shared combat',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),c=await actor(f);await a.doit('party.create');await join(a,b);await join(a,c);
 await a.doit('party.promote',{memberId:b.c.id});await b.doit('party.kick',{memberId:c.c.id});
 assert.equal((await a.read()).party.group.leaderId,b.c.id);
 await activity(b,[a,b]);const instance=(await b.read()).battle.partyInstanceId;
 await f.pool.query('DELETE FROM mare_game.character_control WHERE character_id=$1',[a.c.id]);
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '250 milliseconds' WHERE id=$1",[instance]);
 await tickPartyBattles(f.pool);assert.equal((await b.read()).battle.partyInstanceId,instance);
 await f.pool.query("UPDATE mare_game.party_members SET last_seen=clock_timestamp()-interval '61 seconds' WHERE character_id=$1",[a.c.id]);
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '250 milliseconds' WHERE id=$1",[instance]);await tickPartyBattles(f.pool);
 const offline=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].simulation;
 assert.equal(offline.partyInstanceId,undefined);assert.equal((await f.pool.query('SELECT map_id FROM mare_game.character_world WHERE character_id=$1',[a.c.id])).rows[0].map_id,'lobby');
 assert.equal((await b.read()).party.group.members.length,2);
}));
test('simultaneous acceptance of the last place admits one; restarting entry cannot duplicate the instance',async()=>authDatabase(async f=>{
 const [a,b,c,d,e]=await Promise.all([actor(f),actor(f),actor(f),actor(f),actor(f)] as const);await a.doit('party.create');await join(a,b);await join(a,c);
 for(const w of [d,e])await a.doit('party.invite',{name:w.name});
 const intents=await Promise.all([d,e].map(async w=>w.input('party.respond',{inviteId:(await w.read()).party.invites.find((i:any)=>i.status==='pending').id,accept:true})));
 const accepted=await Promise.allSettled([d.send(intents[0]),e.send(intents[1])]);assert.equal(accepted.filter(r=>r.status==='fulfilled').length,1);assert.equal((await a.read()).party.group.members.length,4);
 const current=[a,b,c,accepted[0].status==='fulfilled'?d:e];await a.doit('party.prepare',{kind:'hunt',destination:'dawn'});const nonce=(await a.read()).party.group.preparation.nonce;for(const w of current)await w.doit('party.ready',{nonce,ready:true});
 const command=await a.input('party.start',{nonce});const attempts=await Promise.allSettled([a.send(command),a.send(command)]);assert(attempts.some(r=>r.status==='fulfilled'));
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_instances')).rows[0].n,1);
}));

test('XP is shared before each recipients original overlevel modifier; offline members receive none',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f);await f.pool.query('UPDATE mare_game.character_progression SET level=40 WHERE character_id=$1',[a.c.id]);await a.doit('party.create');await join(a,b);await activity(a,[a,b]);
 const {instance}=await sharedKill(f,[a,b]),grants=(await f.pool.query('SELECT character_id,base_amount,amount FROM mare_game.party_experience WHERE instance_id=$1',[instance])).rows;
 assert.equal(grants.length,2);assert(Math.abs(Number(grants[0].base_amount)-Number(grants[1].base_amount))<=1);assert(Number(grants.find((r:any)=>r.character_id===a.c.id).amount)<Number(grants.find((r:any)=>r.character_id===b.c.id).amount));
 await f.pool.query('DELETE FROM mare_game.character_control WHERE character_id=$1',[b.c.id]);const offlineBefore=(await f.pool.query('SELECT experience FROM mare_game.character_progression WHERE character_id=$1',[b.c.id])).rows[0].experience;
 await sharedKill(f,[a]);assert.equal((await f.pool.query('SELECT experience FROM mare_game.character_progression WHERE character_id=$1',[b.c.id])).rows[0].experience,offlineBefore);
 await f.service.acquireControl(b.login.token,b.c.id);const returned=await b.read();assert.equal(returned.battle.partyInstanceId,instance);assert.equal(returned.party.group.members.length,2);
}));
test('failed XP ledger rolls back the shared death, rewards and every participant together',async()=>authDatabase(async f=>{
 const all:[Awaited<ReturnType<typeof actor>>,Awaited<ReturnType<typeof actor>>]=[await actor(f),await actor(f)],a=all[0];await a.doit('party.create');await join(a,all[1]);await activity(a,all);const before=await Promise.all(all.map(w=>w.read()));
 await f.pool.query("CREATE FUNCTION mare_game.reject_party_xp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER reject_party_xp BEFORE INSERT ON mare_game.party_experience FOR EACH ROW EXECUTE FUNCTION mare_game.reject_party_xp()");
 await assert.rejects(sharedKill(f,all),/party_tick_failed/);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_deaths')).rows[0].n,0);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.party_experience')).rows[0].n,0);
 for(let i=0;i<all.length;i++){const after=await all[i]!.read();assert.deepEqual(after.state,before[i].state);assert.deepEqual(after.originalInventory,before[i].originalInventory);}
}));
test('least-privilege runtime can run a Party but cannot rewrite its death or XP ledger',async()=>authDatabase(async f=>{
 const {readFile}=await import('node:fs/promises'),pg=(await import('pg')).default,{AuthService}=await import('../../apps/game-server/src/auth/service.js'),role='party_'+randomUUID().replaceAll('-',''),password=randomUUID();let pool:any;
 await f.pool.query('CREATE ROLE "'+role+'" LOGIN PASSWORD \''+password+'\' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
 try{await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime','"'+role+'"'));const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;pool=new pg.Pool({connectionString:url.toString(),max:8});
  const service=new AuthService({pool,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'}),runtime={...f,pool,service},a=await actor(runtime),b=await actor(runtime);await a.doit('party.create');await join(a,b);await activity(a,[a,b]);await sharedKill({...f,pool},[a,b]);
  for(const sql of ['DELETE FROM mare_game.party_deaths','UPDATE mare_game.party_deaths SET killer_id=gen_random_uuid()','DELETE FROM mare_game.party_experience','UPDATE mare_game.party_experience SET amount=0'])await assert.rejects(pool.query(sql),{code:'42501'});
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY "'+role+'"; DROP ROLE "'+role+'"');}
}));
