import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const c=await f.service.createCharacter(login.token,{name:'Weekly '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'});
 const lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(v:any)=>f.service.command(login.token,c.id,v),doit=async(action:string,payload:any={})=>send(await input(action,payload));
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 return {c,login,lease,read,input,send,doit,event:(p:any)=>doit('weeklyBoss.execute',p)};
}
async function operator(f:any,a:any,slot:number){
 const r=await f.pool.query("SELECT to_regclass('mare_game.weekly_boss_operators') present");assert(r.rows[0].present,'weekly boss operator storage must exist');
 const account=(await f.service.me(a.login.token)).account.id;
 await f.pool.query('INSERT INTO mare_game.weekly_boss_operators(account_id,slot) VALUES($1,$2)',[account,slot]);return account;
}
const config={mapId:'marineford',spawn:{x:600,y:600},entry:{x:760,y:600},maxPlayers:4,minLevel:1,durationMinutes:60,balanceApproved:true,profile:{hp:10000,attack:50,defense:0,magicDefense:0,speed:80,reach:65,attackSec:2,aoeCooldown:8,aoeRadius:120,aoeWindup:1,aoeMultiplier:1.6,level:50,leash:480}};
test('weekly boss is disabled and ordinary accounts cannot activate or test it',async()=>authDatabase(async f=>{
 const a=await actor(f),v=await a.read();assert(v.weeklyBoss,'weekly boss projection must exist');assert.equal(v.weeklyBoss.canManage,false);assert.equal(v.weeklyBoss.current,null);assert.equal(v.weeklyBoss.events.length,0);assert(!v.battle.mobs.some((m:any)=>m.weeklyBossId));
 await assert.rejects(a.event({op:'test'}),{code:'weekly_boss_operator_required'});
 await assert.rejects(a.event({op:'activate',revision:1}),{code:'weekly_boss_operator_required'});
}));
test('official activation remains blocked without Marineford even for an authorized operator',async()=>authDatabase(async f=>{
 const a=await actor(f);await operator(f,a,1);const r=await a.event({op:'configure',revision:1,config});assert.equal(r.weeklyBoss.revision,2);
 await assert.rejects(a.event({op:'activate',revision:2}),{code:'weekly_boss_map_unavailable'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_events')).rows[0].n,0);
}));
test('two operators share one private test boss, public users cannot see it, cancel restores the original port',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),outsider=await actor(f);await operator(f,a,1);await operator(f,b,2);
 const command=await a.input('weeklyBoss.execute',{op:'test'}),first=await a.send(command);await a.send(command);const id=first.weeklyBoss.eventId;assert(id);
 await b.event({op:'join',eventId:id});const av=await a.read(),bv=await b.read();assert.equal(av.battle.weeklyBossInstanceId,id);assert.equal(bv.battle.weeklyBossInstanceId,id);assert.equal(av.battle.mobs.length,1);assert.deepEqual(av.battle.mobs,bv.battle.mobs);
 assert.equal((await outsider.read()).weeklyBoss.events.length,0);await assert.rejects(outsider.event({op:'join',eventId:id}),{code:'weekly_boss_event_unavailable'});
 await a.event({op:'cancel',eventId:id,version:1});for(const who of [a,b]){const v=await who.read();assert.equal(v.world.mapId,'lobby');assert.equal(v.battle.weeklyBossInstanceId,undefined);assert.equal(v.weeklyBoss.current,null);}
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_victories')).rows[0].n,0);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_events')).rows[0].n,1);
}));
test('operator authority and controller leases are checked before replaying administrative receipts',async()=>authDatabase(async f=>{
 const a=await actor(f),account=await operator(f,a,1),command=await a.input('weeklyBoss.execute',{op:'test'});await a.send(command);
 await f.pool.query('DELETE FROM mare_game.weekly_boss_operators WHERE account_id=$1',[account]);await assert.rejects(a.send(command),{code:'weekly_boss_operator_required'});
}));
test('private boss victory cannot mint XP, Berry, profession progress or weekly reward rights',async()=>authDatabase(async f=>{
 const a=await actor(f);await operator(f,a,1);const before=await a.read(),r=await a.event({op:'test'}),id=r.weeklyBoss.eventId;
 const row=(await f.pool.query('SELECT simulation FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0],room=row.simulation,m=room.mobs[0];m.hp=1;m.nextPunchAt=Date.now()+1e8;m.nextAoeAt=Date.now()+1e8;
 await f.pool.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[id,JSON.stringify(room)]);
 const v=await a.read();v.battle.auto=false;v.battle.autoSkills=false;v.battle.pending={targetId:m.id,remaining:0};await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(v.battle)]);
 await f.pool.query("UPDATE mare_game.character_world SET x=$2,y=$3,path='[]',speed=0 WHERE character_id=$1",[a.c.id,m.x-20,m.y]);
 await f.pool.query("UPDATE mare_game.weekly_boss_events SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[id]);
 const {tickWeeklyBosses}=await import('../../apps/game-server/src/characters/weekly-boss-worker.js');await tickWeeklyBosses(f.pool);
 assert.equal((await f.pool.query('SELECT status FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0].status,'won');
 const after=await a.read();assert.equal(after.state.gold,before.state.gold);assert.equal(after.state.experience,before.state.experience);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_victories')).rows[0].n,0);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.weekly_boss_entitlements')).rows[0].n,0);
}));
