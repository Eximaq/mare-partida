import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
import {readBattle,readBattleRows} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
import {tickWeeklyBosses} from '../../apps/game-server/src/characters/weekly-boss-worker.js';

const require=createRequire(import.meta.url),W=require('../../world-catalog.cjs').load(),E=require('../../world-battle.cjs'),B=require('../../monster-behavior.js'),A=require('../../akainu-combat.js'),R=require('../../weekly-boss-rules.cjs');
const priorWorld='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c';
const priorBattle='df87a9e7018eff5bcbee1d33a2d8ba3347ff3fc019133d6c0bdf86f8145e51cc';
const migration='0078_marineford_hd_map.sql',source=new URL('../../apps/game-server/migrations/',import.meta.url);
const areas=Array.from({length:6},(_,i)=>'marineford-0'+(i+1));
const oldSlots=[[3048,2408],[3496,2408],[3944,2408],[3048,3048],[3432,3208],[3944,3048]] as const;
const economicTables=['character_progression','game_inventory','character_dungeons','dungeon_claims','dungeon_victories','character_commands','social_mail','world_battle_rewards','weekly_boss_victories','weekly_boss_entitlements','weekly_boss_loot','weekly_boss_audit'];
async function beforeMarineford(run:(f:any)=>Promise<void>){
 const directory=await mkdtemp(join(tmpdir(),'mare-marineford-'));
 try{
  for(const name of await readdir(source))if(/^\d{4}_.+\.sql$/.test(name)&&name<'0078')await copyFile(new URL(name,source),join(directory,name));
  await authDatabase(run,directory);
 }finally{await rm(directory,{recursive:true,force:true});}
}
async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),name='Marine '+randomUUID().slice(0,8);
 const c=await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
 const read=()=>f.service.onlineState(login.token,c.id),doit=async(action:string,payload:any={})=>f.service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 for(const action of ['items.initialize','world.initialize','battle.start'])await doit(action);
 await f.pool.query('UPDATE mare_game.character_progression SET level=200 WHERE character_id=$1',[c.id]);
 return {c,name,login,lease,read,doit,event:(payload:any)=>doit('weeklyBoss.execute',payload)};
}
async function operator(f:any,a:any){const account=(await f.service.me(a.login.token)).account.id;await f.pool.query('INSERT INTO mare_game.weekly_boss_operators(account_id,slot) VALUES($1,1)',[account]);return account;}
async function rows(pool:any,table:string){return (await pool.query(`SELECT to_jsonb(t) data FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows.map((r:any)=>r.data);}
async function snapshot(pool:any,tables=economicTables){
 const result:any={};for(const table of tables)result[table]=await rows(pool,table);
 result.characters=(await pool.query('SELECT id,state_version::text FROM mare_game.characters ORDER BY id')).rows;return result;
}
async function oldWorld(pool:any,id:string,map:string,hash=priorWorld){
 await pool.query(`UPDATE mare_game.character_world SET rules_hash=$2,map_id=$3,area=CASE WHEN $3='lobby' THEN NULL ELSE $3 END,x=3592,y=2792,path='[{"x":3608,"y":2792}]',speed=120,
  direction='left',started_at='2026-11-01T12:00:00Z',motion_until='2026-11-01T12:00:30Z' WHERE character_id=$1`,[id,hash,map]);
}
function oldMobs(mobs:any[]){
 for(const [i,m] of mobs.entries()){
  const [x,y]=oldSlots[i]!;Object.assign(m,{x:x+8,y:y+8,anchorX:x,anchorY:y,hp:i===1?0:11,alive:i!==1,engaged:true,telegraph:{fixture:true},attackClock:2.25,corpseUntil:Date.now()+60000});
 }
}
function preserveMobs(area:string,actual:any[],before:any[]){
 const slots=new Map(B.slots(area).map((s:any)=>[s.id,s])),nav=W.navigation(area);
 for(const old of before){
  const m=actual.find(x=>x.id===old.id);assert(m,'retain every existing enemy');
  for(const key of ['id','spawnId','type','level','hp','maxHP','alive','corpseUntil','attackClock','attack','defense','balanceVersion'])assert.deepEqual(m[key],old[key],old.spawnId+' '+key);
  const slot:any=slots.get(m.spawnId);if(slot)assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[slot.x,slot.y,slot.x,slot.y,slot.sector]);
  assert(nav.walkable(m.x,m.y));assert(nav.path(W.maps[area].spawn,m).length);
 }
}
function config(radius:number,legacy=false){
 return {mapId:'marineford',spawn:legacy?{x:2560,y:1408}:{x:1536,y:1280},entry:legacy?{x:2560+radius+48,y:1408}:{x:1536,y:1280+radius+48},maxPlayers:4,minLevel:1,durationMinutes:60,balanceApproved:true,
  profile:{hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:radius,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:Math.max(304,radius+64)}};
}
async function legacyEvent(f:any,account:string,settings:any,status='active'){
 const id=randomUUID(),boss=A.create({id:randomUUID(),x:settings.spawn.x,y:settings.spawn.y,profile:settings.profile,now:Date.now()});boss.balanceVersion=E.balanceVersion;
 Object.assign(boss,{x:settings.spawn.x+24,y:settings.spawn.y+16,hp:status==='won'?0:12345,alive:status!=='won',action:{kind:'aoe',center:{x:settings.spawn.x+24,y:settings.spawn.y+16}},telegraph:{fixture:true},attackCount:7});
 const room={id,mapId:'marineford',config:settings,mode:'official',rulesVersion:1,mobs:[boss],contributions:{}};
 await f.pool.query(`INSERT INTO mare_game.weekly_boss_events(id,mode,status,map_id,cycle_key,config,simulation,created_by,opened_at,closes_at,tick_at,ended_at,version)
  VALUES($1,'official',$2,'marineford',CURRENT_DATE,$3,$4,$5,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '45 minutes',clock_timestamp(),CASE WHEN $2='active' THEN NULL ELSE clock_timestamp() END,7)`,[id,status,settings,room,account]);
 return (await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0];
}
async function legacyMember(f:any,a:any,event:any,worldHash=priorWorld){
 const original=await a.read(),returnWorld={...original.world,rulesHash:worldHash},returnBattle={...original.battle,rulesHash:priorBattle,hp:43,energy:37,cooldowns:[7,3]};
 await f.pool.query('INSERT INTO mare_game.weekly_boss_members(character_id,event_id,control_epoch,return_world,return_battle) VALUES($1,$2,$3,$4,$5)',[a.c.id,event.id,a.lease.epoch,returnWorld,returnBattle]);
 const b={...structuredClone(returnBattle),area:'marineford',weeklyBossInstanceId:event.id,weeklyBossTest:false,mobs:event.simulation.mobs,pending:{targetId:event.simulation.mobs[0].id,remaining:.4},projectiles:[{x:2560,y:1408}]};
 await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,b]);await oldWorld(f.pool,a.c.id,'marineford');
 return {returnWorld,returnBattle};
}
test('Marineford migration reanchors all six hunts once and preserves old progress, unrelated maps and unknown hashes',async()=>beforeMarineford(async f=>{
 await f.pool.query("UPDATE mare_game.weekly_boss_settings SET revision=5,config=$1 WHERE boss_id='akainu'",[config(120)]);
 const maps=[...areas,'quest-dungeons','alubarna-01','marineford-01'],people=[],originals=[];
 for(const [i,map] of maps.entries()){
  const a=await actor(f),b=E.create(i===6?null:map,{maxHP:100,maxEnergy:100},100000,()=>.5);people.push(a);
  b.rulesHash=priorBattle;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
  if(i<6){b.pending={targetId:b.mobs[0].id,remaining:.4};b.projectiles=[{x:3048,y:2408}];b.hunts.areas[map].kills=17;b.hunts.areas[map].respawns[b.mobs[1].spawnId]=Date.now()+600000;oldMobs(b.mobs);}
  originals.push(structuredClone(b));await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,b]);await oldWorld(f.pool,a.c.id,map,i===8?'f'.repeat(64):priorWorld);
 }
 const economic=await snapshot(f.pool),before=await rows(f.pool,'character_world');await applyMigrations(f.pool);
 const unchanged=(await f.pool.query("SELECT * FROM mare_game.weekly_boss_settings WHERE boss_id='akainu'")).rows[0];assert.equal(unchanged.revision,5,'coordinates already matching the scene must keep their CAS revision');assert.deepEqual(unchanged.config,config(120));assert.equal(unchanged.map_geometry_version,1);
 const after=await rows(f.pool,'character_world');
 for(const old of before){const expected=structuredClone(old);if(old.rules_hash===priorWorld){expected.rules_hash=W.rulesHash;if(areas.includes(old.map_id))Object.assign(expected,{x:1536,y:1824,path:[],speed:0,motion_until:old.started_at});}assert.deepEqual(after.find((r:any)=>r.character_id===old.character_id),expected);}
 assert.deepEqual(await snapshot(f.pool),economic);assert.deepEqual(await applyMigrations(f.pool),[]);
 await f.pool.query(await readFile(new URL(migration,source),'utf8'));assert.deepEqual(await rows(f.pool,'character_world'),after);
 for(const [i,a] of people.slice(0,6).entries()){
  const current=await a.read();assert.deepEqual(current.world.position,{x:1536,y:1824});assert.equal(current.battle.rulesHash,E.rulesHash);
  for(const key of ['hp','energy','cooldowns','hunts'])assert.deepEqual(current.battle[key],originals[i][key]);preserveMobs(areas[i]!,current.battle.mobs,originals[i].mobs);
  assert.equal(current.battle.pending,null);assert.deepEqual(current.battle.projectiles,[]);
 }
 await assert.rejects(people[8]!.read(),{code:'world_rules_changed'});assert.deepEqual(await snapshot(f.pool),economic);
}));
test('official settings, live and occupied finished rooms migrate without changing approvals, HP, clocks, receipts or saved port snapshots',async()=>beforeMarineford(async f=>{
 const people=[await actor(f),await actor(f),await actor(f)] as const,account=await operator(f,people[0]);
 const legacy=config(48,true);await f.pool.query("UPDATE mare_game.weekly_boss_settings SET revision=9,config=$1 WHERE boss_id='akainu'",[legacy]);
 const active=await legacyEvent(f,account,legacy),finished=await legacyEvent(f,account,config(120,true),'won'),archived=await legacyEvent(f,account,config(120,true),'cancelled');
 const returns=[await legacyMember(f,people[0],active,'7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4'),await legacyMember(f,people[1],active),await legacyMember(f,people[2],finished,'f'.repeat(64))];
 for(const a of people.slice(0,2))active.simulation.contributions[a.c.id]={damage:123,healing:45,combatMs:600,lastSeen:1000};
 await f.pool.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[active.id,active.simulation]);
 const economic=await snapshot(f.pool);await applyMigrations(f.pool);
 const settings=(await f.pool.query("SELECT * FROM mare_game.weekly_boss_settings WHERE boss_id='akainu'")).rows[0];
 assert.equal(settings.revision,10);assert.equal(settings.map_geometry_version,1);assert.deepEqual(settings.config,config(48));R.canActivate(settings.config,{map:(id:string)=>W.navigation(id)});
 for(const old of [active,finished]){
  const row=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[old.id])).rows[0],boss=row.simulation.mobs[0];
  assert.equal(row.map_geometry_version,1);assert.deepEqual(row.config,config(old.config.profile.aoeRadius));assert.deepEqual(row.simulation.config,row.config);assert.deepEqual(row.simulation.contributions,old.simulation.contributions);
  assert.deepEqual([boss.x,boss.y,boss.anchorX,boss.anchorY],[1536,1280,1536,1280]);assert.equal(boss.action,null);assert.equal(boss.telegraph,null);
  for(const key of ['id','spawnId','hp','maxHP','alive','attackCount','nextPunchAt','nextAoeAt','profile'])assert.deepEqual(boss[key],old.simulation.mobs[0][key],key);
  for(const key of ['status','version','cycle_key','opened_at','closes_at','tick_at','ended_at','created_by'])assert.deepEqual(row[key],old[key],key);
 }
 const archivedAfter=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[archived.id])).rows[0];assert.deepEqual(archivedAfter,{...archived,map_geometry_version:null},'unoccupied archive stays historical');
 for(const [i,a] of people.entries()){
  const member=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_members WHERE character_id=$1',[a.c.id])).rows[0];assert.deepEqual(member.return_world,i===2?returns[i]!.returnWorld:{...returns[i]!.returnWorld,rulesHash:W.rulesHash});assert.deepEqual(member.return_battle,returns[i]!.returnBattle);
  const current=await a.read();assert.deepEqual(current.world.position,config(i===2?120:48).entry);assert.equal(current.battle.rulesHash,E.rulesHash);assert.equal(current.battle.hp,43);assert.equal(current.battle.energy,37);
 }
 const once=await snapshot(f.pool,['weekly_boss_settings','weekly_boss_events','weekly_boss_members','character_world']);await f.pool.query(await readFile(new URL(migration,source),'utf8'));assert.deepEqual(await snapshot(f.pool,['weekly_boss_settings','weekly_boss_events','weekly_boss_members','character_world']),once);assert.deepEqual(await snapshot(f.pool),economic);
 // A live worker resumes the actual shared room with two actors at its new entry.
 await people[2].event({op:'leave'});await f.pool.query("UPDATE mare_game.weekly_boss_events SET tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[active.id]);await tickWeeklyBosses(f.pool);
 for(const a of people.slice(0,2)){const current=await a.read();assert.equal(current.world.mapId,'marineford');assert.equal(current.battle.mobs[0].id,active.simulation.mobs[0].id);assert.equal(current.battle.mobs[0].maxHP,20000);await a.event({op:'leave'});assert.equal((await a.read()).world.mapId,'lobby');}
 for(const table of ['weekly_boss_victories','weekly_boss_entitlements','weekly_boss_loot','dungeon_victories','dungeon_claims'])assert.equal((await rows(f.pool,table)).length,0,table);
}));
test('null settings remain disabled and replay never rewinds a new maximum-AoE event or an operator edit',async()=>beforeMarineford(async f=>{
 const a=await actor(f);await operator(f,a);await applyMigrations(f.pool);
 const disabled=(await f.pool.query("SELECT * FROM mare_game.weekly_boss_settings WHERE boss_id='akainu'")).rows[0];assert.equal(disabled.config,null);assert.equal(disabled.revision,1);assert.equal(disabled.map_geometry_version,1);
 await assert.rejects(a.event({op:'activate',revision:1}),{code:'weekly_boss_config_required'});
 for(const radius of [48,240])R.canActivate(config(radius),{map:(id:string)=>W.navigation(id)});
 const custom=config(240);custom.entry.y+=1;R.canActivate(custom,{map:(id:string)=>W.navigation(id)});
 await a.event({op:'configure',revision:1,config:custom});const configured=await rows(f.pool,'weekly_boss_settings');
 await f.pool.query(await readFile(new URL(migration,source),'utf8'));assert.deepEqual(await rows(f.pool,'weekly_boss_settings'),configured,'a new operator edit keeps its CAS revision and coordinates');
 await assert.rejects(a.event({op:'activate',revision:1}),{code:'weekly_boss_revision_conflict'});
 const id=(await a.event({op:'activate',revision:2})).weeklyBoss.eventId;await a.event({op:'join',eventId:id});
 const row=(await f.pool.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0];assert.equal(row.map_geometry_version,1,'new INSERT receives the schema default without extra runtime privilege');
 const boss=row.simulation.mobs[0];Object.assign(boss,{x:boss.x+24,hp:12345,action:{kind:'aoe',center:{x:boss.x+24,y:boss.y}},telegraph:{fixture:true}});
 await f.pool.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[id,row.simulation]);
 const moving=await snapshot(f.pool,['weekly_boss_events','weekly_boss_settings','character_world']);await f.pool.query(await readFile(new URL(migration,source),'utf8'));assert.deepEqual(await snapshot(f.pool,['weekly_boss_events','weekly_boss_settings','character_world']),moving,'replaying SQL must not teleport a moving current-layout boss or participant');
 boss.action=null;boss.telegraph=null;boss.nextPunchAt=Date.now()+1e8;boss.nextAoeAt=Date.now()+1e8;
 await f.pool.query("UPDATE mare_game.weekly_boss_events SET simulation=$2,tick_at=clock_timestamp()-interval '150 milliseconds' WHERE id=$1",[id,row.simulation]);await tickWeeklyBosses(f.pool);
 const current=await a.read();assert.equal(current.world.mapId,'marineford');assert.equal(current.battle.mobs[0].profile.aoeRadius,240);assert.equal(current.battle.mobs[0].maxHP,20000);
 await a.event({op:'leave'});assert.equal((await a.read()).world.mapId,'lobby');
}));
test('Marineford shared reads and worker reanchor stale canonical hunt rooms after personal hashes were already promoted',async()=>authDatabase(async f=>{
 const area='marineford-06',a=await actor(f),b=await actor(f),people=[a,b];
 await a.doit('party.create');await a.doit('party.invite',{name:b.name});const invite=(await b.read()).party.invites.find((i:any)=>i.status==='pending');await b.doit('party.respond',{inviteId:invite.id,accept:true});
 await a.doit('party.prepare',{kind:'hunt',destination:area});const nonce=(await a.read()).party.group.preparation.nonce;for(const p of people)await p.doit('party.ready',{nonce,ready:true});await a.doit('party.start',{nonce});
 const instance=(await a.read()).battle.partyInstanceId,room=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;
 oldMobs(room.mobs);const first=room.mobs[0];room.mobs.push({...structuredClone(first),id:'extra-marineford',spawnId:'party:'+instance+':fixture',partyExtra:true,x:first.anchorX+96,y:first.anchorY,anchorX:first.anchorX+96,anchorY:first.anchorY});
 room.respawns[room.mobs[1].spawnId]=Date.now()+600000;room.hunts.areas[area].kills=17;room.hunts.areas[area].respawns[room.mobs[1].spawnId]=room.respawns[room.mobs[1].spawnId];await f.pool.query('UPDATE mare_game.party_instances SET simulation=$2 WHERE id=$1',[instance,room]);
 for(const p of people){const personal=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[p.c.id])).rows[0].simulation;Object.assign(personal,{rulesHash:E.rulesHash,hp:43,energy:37,auto:false,cooldowns:[7,3],pending:{targetId:first.id,remaining:0},projectiles:[{x:3048,y:2408}]});await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[p.c.id,personal]);}
 const before=await snapshot(f.pool,['character_world','character_battles','party_instances',...economicTables]),client=await f.pool.connect();
 try{
  const single=await readBattle(client,a.c.id),batch=await readBattleRows(client,people.map(p=>p.c.id));
  for(const current of [single,...[...batch.values()].map(r=>r.simulation)]){preserveMobs(area,current.mobs,room.mobs);assert.equal(current.pending,null);assert.deepEqual(current.projectiles,[]);assert.equal(current.hp,43);assert.equal(current.energy,37);assert.deepEqual(current.cooldowns,[7,3]);}
 }finally{client.release();}
 assert.deepEqual(await snapshot(f.pool,['character_world','character_battles','party_instances',...economicTables]),before,'read projection cannot mutate shared saves or receipts');
 const economic=await snapshot(f.pool);await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '3 seconds' WHERE id=$1",[instance]);await tickPartyBattles(f.pool);
 const persisted=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[instance])).rows[0].simulation;preserveMobs(area,persisted.mobs,room.mobs);assert.deepEqual(persisted.respawns,room.respawns);assert.deepEqual(persisted.hunts,room.hunts);assert.deepEqual(await snapshot(f.pool),economic);
}));
