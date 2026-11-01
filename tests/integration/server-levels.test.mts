import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdtemp,copyFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {applyMigrations} from "../../apps/game-server/src/db/migrations.js";
import {AuthService} from "../../apps/game-server/src/auth/service.js";
import {test} from "node:test";
import {authDatabase} from "./auth-support.mjs";

async function fixture(service:any,pool:any,initialXp=0) {
  const session=await service.login("levels@example.invalid","fixture");
  const character=await service.createCharacter(session.token,{name:"Levels",classId:"sword",factionId:"pirate"});
  const lease=await service.acquireControl(session.token,character.id);
  const input=(action:any,expectedVersion:number)=>({requestId:randomUUID(),action,expectedVersion,control:{epoch:lease.epoch,token:lease.token},payload:{}});
  const send=(command:any)=>service.command(session.token,character.id,command);
  await send(input("journey.begin",0));await send(input("hunt.begin",1));
  await pool.query("UPDATE mare_game.character_progression SET experience=$1",[initialXp]);
  await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");await send(input("hunt.claim",2));
  return {session,character,input,send};
}

test("two victories reach level two atomically and replay never grants a second level or points",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);let version=3;let claim:any,result:any;
  for(let i=0;i<2;i++) {
    const start=await f.send(f.input("combat.begin",version++));
    await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1,next_attack_at=clock_timestamp()-interval '1 second' WHERE encounter_id=$1",[start.combat.encounterId]);
    await f.send(f.input("combat.attack",version++));claim=f.input("combat.claim",version++);result=await f.send(claim);
    await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds' WHERE encounter_id=$1",[start.combat.encounterId]);
  }
  assert.equal(result.state.experience,"80");assert.equal(result.state.level,2);assert.equal(result.state.gold,"32");
  assert.deepEqual(await f.send(claim),result);
  const snapshot:any=await service.onlineState(f.session.token,f.character.id);
  assert.deepEqual(snapshot.progression,{catalogId:"online-levels-v1",maxLevel:20,earnedAttributePoints:5,xpIntoLevel:"0",xpForNextLevel:"105",xpToNextLevel:"105",atCap:false});
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_level_ledger")).rows[0].n,1);
  assert.equal(snapshot.combat.playerHp,30,"level advancement does not change combat HP");
}));

async function wonFixture(service:any,pool:any) {
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));
  await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1,player_hp=7,next_attack_at=clock_timestamp()-interval '1 second'");
  await f.send(f.input("combat.attack",4));
  await pool.query("UPDATE mare_game.character_progression SET experience=50");
  return f;
}
for(const table of ["character_level_ledger","character_commands"]) test(`level/reward/HP/version roll back together when ${table} rejects the claim`,async()=>authDatabase(async({service,pool})=>{
  const f=await wonFixture(service,pool),command=f.input("combat.claim",5);
  const before=await service.onlineState(f.session.token,f.character.id);
  await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT reject_fixture CHECK(false) NOT VALID`);
  await assert.rejects(f.send(command),{code:"23514"});
  const after=await service.onlineState(f.session.token,f.character.id);assert.deepEqual(after.state,before.state);assert.deepEqual(after.combat,before.combat);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_level_ledger")).rows[0].n,0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,0);
  await pool.query(`ALTER TABLE mare_game.${table} DROP CONSTRAINT reject_fixture`);
  const accepted=await f.send(command);assert.equal(accepted.state.level,2);assert.equal(accepted.combat.playerHp,7);
}));
for(const same of [true,false]) test(`concurrent claims ${same?"replay":"conflict"} across instances award level and points once`,async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await wonFixture(service,pool),command=f.input("combat.claim",5);
  const restarted=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  const outcomes=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?restarted:service).command(f.session.token,f.character.id,{...command,requestId:same?command.requestId:randomUUID()})));
  assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,same?8:1);
  for(const r of outcomes) if(r.status==="rejected") assert.equal(r.reason.code,"state_version_conflict"); else assert.equal(r.value.state.level,2);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_level_ledger")).rows[0].n,1);
  const read=await restarted.onlineState(f.session.token,f.character.id);assert.equal(read.progression.earnedAttributePoints,5);assert.equal(read.state.experience,"80");assert.equal(read.state.gold,"20");
}));

test("catalog follows the existing curve; exact thresholds and capped BIGINT progress never lose XP",async()=>authDatabase(async({service,pool})=>{
  const rows=(await pool.query("SELECT level,required_experience FROM mare_game.progression_levels ORDER BY level")).rows;
  let total=0;assert.equal(rows.length,20);
  for(const row of rows) {assert.equal(row.required_experience,String(total));total+=Math.round(80+25*Math.pow(row.level-1,1.55));}
  const f=await wonFixture(service,pool);
  await pool.query("UPDATE mare_game.character_progression SET level=20,experience=9223372036854775777");
  const paid=await f.send(f.input("combat.claim",5));assert.equal(paid.state.experience,"9223372036854775807");assert.equal(paid.state.level,20);
  const read=await service.onlineState(f.session.token,f.character.id);assert.equal(read.progression.atCap,true);assert.equal(read.progression.xpToNextLevel,null);assert.equal(read.progression.earnedAttributePoints,95);
  assert.equal(read.progression.xpIntoLevel,"9223372036854757598");assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_level_ledger")).rows[0].n,0);
}));

async function preLevelDirectory() {
  const directory=await mkdtemp(join(tmpdir(),"mare-pre-levels-"));
  const source=new URL("../../apps/game-server/migrations/",import.meta.url);
  for(const name of await readdir(source)) if(name.endsWith(".sql")&&name<"0009") await copyFile(new URL(name,source),join(directory,name));
  return directory;
}
test("3G upgrade preserves XP/gold/receipts, backfills each earned level once and fences old versions",async()=>{
  await authDatabase(async({service,pool})=>{
    const examples=[["0",1],["79",1],["80",2],["185",3],["9223372036854775807",20]] as const, fixtures:any[]=[];
    for(const [xp,level] of examples) {
      const session=await service.login(`level-${level}-${xp.length}@example.invalid`,"fixture");
      const character=await service.createCharacter(session.token,{name:"Legacy",classId:"sword",factionId:"pirate"});
      await pool.query("UPDATE mare_game.character_progression SET experience=$1,gold=12 WHERE character_id=$2",[xp,character.id]);
      const lease=await service.acquireControl(session.token,character.id);
      const command={requestId:randomUUID(),action:"state.sync" as const,expectedVersion:0,control:{epoch:lease.epoch,token:lease.token},payload:{}};
      const receipt=await service.command(session.token,character.id,command);fixtures.push({session,character,command,receipt,xp,level});
    }
    const receipts=(await pool.query("SELECT * FROM mare_game.character_commands ORDER BY request_id")).rows;
    assert.deepEqual(await applyMigrations(pool),["0009_level_progression.sql"]);assert.deepEqual(await applyMigrations(pool),[]);
    assert.deepEqual((await pool.query("SELECT * FROM mare_game.character_commands ORDER BY request_id")).rows,receipts);
    for(const f of fixtures) {
      const state=await service.characterState(f.session.token,f.character.id);assert.equal(state.level,f.level);assert.equal(state.experience,f.xp);assert.equal(state.gold,"12");assert.equal(state.version,f.level>1?1:0);
      assert.deepEqual(await service.command(f.session.token,f.character.id,f.command),f.receipt);
      const events=(await pool.query("SELECT level,source,earned_attribute_points FROM mare_game.character_level_ledger WHERE character_id=$1 ORDER BY level",[f.character.id])).rows;
      assert.equal(events.length,f.level-1);events.forEach((e,i)=>{assert.equal(e.level,i+2);assert.equal(e.source,"migration");assert.equal(e.earned_attribute_points,(i+1)*5);});
      if(f.level>1) await assert.rejects(service.command(f.session.token,f.character.id,{...f.command,requestId:randomUUID()}),{code:"state_version_conflict"});
    }
  },await preLevelDirectory());
});
for(const reason of ["unexpected-level","version-exhausted"]) test(`level upgrade rejects ${reason} atomically`,async()=>{
  await authDatabase(async({service,pool})=>{
    const session=await service.login("upgrade-block@example.invalid","fixture");await service.createCharacter(session.token,{name:"Preserved",classId:"sword",factionId:"pirate"});
    await pool.query("UPDATE mare_game.character_progression SET experience=80,level=$1",[reason==="unexpected-level"?2:1]);
    if(reason==="version-exhausted") await pool.query("UPDATE mare_game.characters SET state_version=9007199254740991");
    const before=(await pool.query("SELECT * FROM mare_game.character_progression")).rows;
    await assert.rejects(applyMigrations(pool),{code:reason==="unexpected-level"?"P0001":"23514"});
    assert.deepEqual((await pool.query("SELECT * FROM mare_game.character_progression")).rows,before);
    assert.equal((await pool.query("SELECT to_regclass('mare_game.progression_levels') AS present")).rows[0].present,null);
  },await preLevelDirectory());
});

test("hunt reward also advances level at the exact threshold and its read metadata has no side effects",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool,60);const state=await service.characterState(f.session.token,f.character.id);
  assert.equal(state.level,2);assert.equal(state.experience,"80");assert.equal(state.version,3);
  const before=(await pool.query("SELECT * FROM mare_game.character_level_ledger")).rows;
  for(let i=0;i<3;i++) assert.equal((await service.onlineState(f.session.token,f.character.id)).progression.earnedAttributePoints,5);
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.character_level_ledger")).rows,before);
  assert.deepEqual(await service.characterState(f.session.token,f.character.id),state);
}));
