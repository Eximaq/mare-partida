import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyMigrations } from "../../apps/game-server/src/db/migrations.js";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { test } from "node:test";
import { authDatabase,seedPreLevelHuntReward } from "./auth-support.mjs";

async function fixture(service:any,pool:any,email="encounter@example.invalid",legacy=false) {
  const session=await service.login(email,"fixture");
  const character=await service.createCharacter(session.token,{name:"Encounters",classId:"sword",factionId:"pirate"});
  const lease=await service.acquireControl(session.token,character.id);
  const input=(action:"combat.begin"|"combat.attack"|"combat.claim"|"hunt.begin"|"hunt.claim"|"journey.begin",version:number)=>({requestId:randomUUID(),action,expectedVersion:version,control:{epoch:lease.epoch,token:lease.token},payload:{}});
  const send=(command:any)=>service.command(session.token,character.id,command);
  await send(input("journey.begin",0));await send(input("hunt.begin",1));
  await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");if(legacy) await seedPreLevelHuntReward(pool,character.id); else await send(input("hunt.claim",2));
  return {session,character,input,send};
}

test("a completed combat exposes a server-owned encounter identity and allows a new run only after rest",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool),begin=f.input("combat.begin",3);
  const first=await f.send(begin);
  assert.match(first.combat.encounterId,/^[a-f0-9-]{36}$/,"encounter identity is required for independent history");
  await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1,next_attack_at=clock_timestamp()-interval '1 second'");
  const win=await f.send(f.input("combat.attack",4));assert.equal(win.combat.status,"won");
  await assert.rejects(f.send(f.input("combat.begin",5)),{code:"combat_reward_pending"});
  const claim=f.input("combat.claim",5),paid=await f.send(claim);
  await assert.rejects(f.send(f.input("combat.begin",6)),{code:"combat_rest"});
  assert.equal((await service.onlineState(f.session.token,f.character.id)).combat.canBegin,false);
  const old=(await pool.query("SELECT * FROM mare_game.combat_encounters")).rows[0];
  await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds'");
  const saved=(await pool.query("SELECT * FROM mare_game.combat_encounters")).rows;
  const second=await f.send(f.input("combat.begin",6));
  assert.notEqual(second.combat.encounterId,first.combat.encounterId);assert.equal(second.combat.encounterNumber,2);
  assert.equal(second.combat.playerHp,30);assert.equal(second.combat.enemyHp,36);assert.equal(second.combat.turn,0);
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.combat_encounters WHERE encounter_id=$1",[old.encounter_id])).rows,saved);
  // Old begin/claim retries remain historical; they cannot restart, heal or pay this new run.
  assert.deepEqual(await f.send(begin),first);assert.deepEqual(await f.send(claim),paid);
  assert.equal((await service.onlineState(f.session.token,f.character.id)).combat.encounterId,second.combat.encounterId);
  assert.equal((await service.characterState(f.session.token,f.character.id)).gold,"20");
  await assert.rejects(f.send(f.input("combat.attack",5)),{code:"state_version_conflict"});
}));

test("defeat permits a fresh encounter after rest, preserving lost HP and rounds in the old history",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));
  await pool.query("UPDATE mare_game.combat_encounters SET player_hp=1,next_attack_at=clock_timestamp()-interval '1 second'");
  const loss=await f.send(f.input("combat.attack",4));assert.equal(loss.combat.status,"lost");
  await assert.rejects(f.send(f.input("combat.begin",5)),{code:"combat_rest"});
  await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds'");
  const results=await Promise.allSettled(Array.from({length:8},()=>f.send(f.input("combat.begin",5))));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  for(const result of results) if(result.status==="rejected") assert.equal(result.reason.code,"state_version_conflict");
  const rows=(await pool.query("SELECT phase,player_hp,turn FROM mare_game.combat_encounters ORDER BY ordinal")).rows;
  assert.deepEqual(rows,[{phase:"lost",player_hp:0,turn:1},{phase:"active",player_hp:30,turn:0}]);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rounds")).rows[0].n,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,0);
}));

test("multiple victories have separate immutable rewards and no cross-run duplicate credit",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);let version=3;const ids:string[]=[],claims:any[]=[],replies:any[]=[];
  for(let run=0;run<3;run++) {
    const start=await f.send(f.input("combat.begin",version++));ids.push(start.combat.encounterId);
    await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1,next_attack_at=clock_timestamp()-interval '1 second' WHERE encounter_id=$1",[start.combat.encounterId]);
    await f.send(f.input("combat.attack",version++));
    const claim=f.input("combat.claim",version++);claims.push(claim);replies.push(await f.send(claim));
    await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds' WHERE encounter_id=$1",[start.combat.encounterId]);
  }
  assert.equal(new Set(ids).size,3);
  for(let i=0;i<3;i++) assert.deepEqual(await f.send(claims[i]),replies[i]);
  const state=await service.characterState(f.session.token,f.character.id);assert.equal(state.gold,"44");assert.equal(state.experience,"110");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,3);
}));

test("rolling start budget is atomic across service instances and expires by database time",async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service,pool);let version=3;let original:any,reply:any;
  for(let n=0;n<10;n++) {
    const start=f.input("combat.begin",version++);const result=await f.send(start);if(n===0){original=start;reply=result;}
    await pool.query("UPDATE mare_game.combat_encounters SET player_hp=1,next_attack_at=clock_timestamp()-interval '1 second' WHERE phase='active'");
    await f.send(f.input("combat.attack",version++));
    await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds' WHERE ordinal=$1",[n+1]);
  }
  const snapshot=await service.onlineState(f.session.token,f.character.id);assert.equal(snapshot.combat.startsRemaining,0);assert.equal(snapshot.combat.canBegin,false);
  await assert.rejects(f.send(f.input("combat.begin",version)),{code:"combat_daily_limit"});assert.deepEqual(await f.send(original),reply);
  // Fixture-only clock data: exactly one rolling slot becomes available.
  await pool.query("UPDATE mare_game.combat_encounters SET started_at=clock_timestamp()-interval '25 hours' WHERE ordinal=1");
  const second=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  const outcomes=await Promise.allSettled([f.send(f.input("combat.begin",version)),second.command(f.session.token,f.character.id,f.input("combat.begin",version))]);
  assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,1);assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_encounters")).rows[0].n,11);
}));

test("100-encounter pilot history fails closed without deleting receipts or historical rewards",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));
  await pool.query("UPDATE mare_game.combat_encounters SET player_hp=1,next_attack_at=clock_timestamp()-interval '1 second'");
  await f.send(f.input("combat.attack",4));
  await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds',started_at=clock_timestamp()-interval '25 hours'");
  // Owner seeds only this disposable database to exercise the storage boundary without 200 requests.
  await pool.query(`WITH receipts AS (INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result,created_at)
    SELECT $1,gen_random_uuid(),repeat('a',64),'{}'::jsonb,clock_timestamp()-interval '25 hours' FROM generate_series(2,100) RETURNING request_id)
    INSERT INTO mare_game.combat_encounters(character_id,begin_request_id,last_request_id,ordinal,phase,player_hp,enemy_hp,turn,closed_at,started_at)
    SELECT $1,request_id,request_id,row_number() OVER()+1,'lost',0,25,1,clock_timestamp()-interval '61 seconds',clock_timestamp()-interval '25 hours' FROM receipts`,[f.character.id]);
  const before=(await pool.query("SELECT * FROM mare_game.combat_encounters ORDER BY ordinal")).rows;
  await assert.rejects(f.send(f.input("combat.begin",5)),{code:"combat_history_full"});
  const state=await service.onlineState(f.session.token,f.character.id);assert.equal(state.combat.historyFull,true);assert.equal(state.combat.canBegin,false);
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.combat_encounters ORDER BY ordinal")).rows,before);
  assert.equal(state.state.gold,"8");
}));

test("3F upgrade preserves active, won, lost and claimed histories and never recredits old rewards",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"mare-pre-encounters-"));
  for(const name of ["0001_foundation.sql","0002_auth_sessions.sql","0003_character_progression.sql","0004_character_commands.sql","0005_character_journey.sql","0006_first_hunt.sql","0007_first_combat.sql"])
    await copyFile(new URL(`../../apps/game-server/migrations/${name}`,import.meta.url),join(directory,name));
  await authDatabase(async({service,pool})=>{
    for(const phase of ["active","won","lost","claimed"]) {
      const f=await fixture(service,pool,phase+"@example.invalid",true),ids=[randomUUID(),randomUUID(),randomUUID()];
      for(const requestId of ids) await pool.query("INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,repeat('a',64),'{}')",[f.character.id,requestId]);
      const won=["won","claimed"].includes(phase),active=phase==="active";
      await pool.query("INSERT INTO mare_game.character_combats(character_id,begin_request_id,last_request_id,phase,player_hp,enemy_hp,turn) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [f.character.id,ids[0],ids[phase==="claimed"?2:active?0:1],phase,phase==="lost"?0:30,won?0:active?36:25,active?0:1]);
      if(!active) await pool.query("INSERT INTO mare_game.character_combat_rounds(character_id,request_id,turn,version_before,player_before,enemy_before,player_damage,enemy_damage) VALUES($1,$2,1,4,$3,$4,$5,$6)",[f.character.id,ids[1],won?30:1,won?1:36,won?1:11,won?0:1]);
      if(phase==="claimed") {
        await pool.query("INSERT INTO mare_game.character_combat_rewards(character_id,request_id,version_before,experience_before,gold_before) VALUES($1,$2,5,20,8)",[f.character.id,ids[2]]);
        await pool.query("UPDATE mare_game.character_progression SET experience=50,gold=20 WHERE character_id=$1",[f.character.id]);
      }
    }
    const names=["characters","character_progression","character_commands","character_combats","character_combat_rounds","character_combat_rewards"];
    const before=await Promise.all(names.map(t=>pool.query(`SELECT to_jsonb(t) AS row FROM mare_game.${t} t ORDER BY to_jsonb(t)::text`)));
    assert.deepEqual(await applyMigrations(pool),["0008_repeatable_encounters.sql", "0009_level_progression.sql", "0010_attribute_allocation.sql"]);assert.deepEqual(await applyMigrations(pool),[]);
    for(const [i,t] of names.entries()) assert.deepEqual((await pool.query(`SELECT to_jsonb(t) AS row FROM mare_game.${t} t ORDER BY to_jsonb(t)::text`)).rows,before[i]!.rows);
    for(const [old,current,extras] of [["character_combats","combat_encounters",["encounter_id","ordinal","closed_at"]],["character_combat_rounds","combat_rounds",["encounter_id"]],["character_combat_rewards","combat_rewards",["encounter_id"]]] as const) {
      const copied=await pool.query(`SELECT to_jsonb(t)-$1::text[] AS row FROM mare_game.${current} t ORDER BY (to_jsonb(t)-$1::text[])::text`,[extras]);
      assert.deepEqual(copied.rows,before[names.indexOf(old)]!.rows);
    }
    assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_encounters WHERE ordinal=1 AND ((phase IN ('lost','claimed'))=(closed_at IS NOT NULL))")).rows[0].n,4);
  },directory);
});

test("failed second begin receipt rolls back new encounter, ordinal and version while keeping previous history",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));
  await pool.query("UPDATE mare_game.combat_encounters SET player_hp=1,next_attack_at=clock_timestamp()-interval '1 second'");
  await f.send(f.input("combat.attack",4));await pool.query("UPDATE mare_game.combat_encounters SET closed_at=clock_timestamp()-interval '61 seconds'");
  const before=(await pool.query("SELECT * FROM mare_game.combat_encounters")).rows;
  await pool.query("ALTER TABLE mare_game.character_commands ADD CONSTRAINT fail_test_write CHECK(false) NOT VALID");
  const command=f.input("combat.begin",5);await assert.rejects(f.send(command),{code:"23514"});
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.combat_encounters")).rows,before);
  assert.equal((await service.characterState(f.session.token,f.character.id)).version,5);
  await pool.query("ALTER TABLE mare_game.character_commands DROP CONSTRAINT fail_test_write");
  const accepted=await f.send(command);assert.equal(accepted.combat.encounterNumber,2);assert.equal(accepted.state.version,6);
}));
