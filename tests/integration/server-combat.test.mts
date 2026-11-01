import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createProxy, request as forward } from "node:http";
import { applyMigrations } from "../../apps/game-server/src/db/migrations.js";
import { once } from "node:events";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";

async function fixture(service: AuthService, pool: any, ready=true) {
  const session=await service.login("combat@example.invalid","fixture");
  const character=await service.createCharacter(session.token,{name:"Combat",classId:"sword",factionId:"pirate"});
  const lease=await service.acquireControl(session.token,character.id);
  const input=(action:any,expectedVersion:number)=>({requestId:randomUUID(),action,expectedVersion,control:{epoch:lease.epoch,token:lease.token},payload:{}});
  const send=(command:ReturnType<typeof input>)=>service.command(session.token,character.id,command);
  if(ready) {
    await send(input("journey.begin",0));await send(input("hunt.begin",1));
    await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");
    await send(input("hunt.claim",2));
  }
  return {session,character,input,send};
}
// Only test-owner writes inside the disposable UUID database; never hosted provider data.
const readyAttack=(pool:any)=>pool.query("UPDATE mare_game.combat_encounters SET next_attack_at=clock_timestamp()-interval '1 second'");

test("combat HTTP accepts intentions only, enforces cooldown and credits a won encounter once",async()=>authDatabase(async({service,pool,vault})=>{
  const f=await fixture(service,pool);
  const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:"https://localhost:9443",cookieSeconds:3600})});
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const send=(value:any,token=f.session.token,id=f.character.id,headers={})=>fetch(`${base}/v1/characters/${id}/commands`,{method:"POST",headers:{"content-type":"application/json",origin:"https://localhost:9443",cookie:`__Host-mare_session=${token}`,"x-csrf-token":vault.csrf(token),...headers},body:JSON.stringify(value)});
  try {
    const begin=f.input("combat.begin",3), response=await send(begin);
    assert.equal(response.status,200,"combat.begin must be accepted after the hunt");
    const begun=await response.json();assert.equal(begun.state.version,4);assert.equal(begun.combat.playerHp,30);assert.equal(begun.combat.enemyHp,36);
    assert.deepEqual(await (await send(begin)).json(),begun);
    const timing=(await pool.query("SELECT extract(epoch FROM next_attack_at-started_at)::float8 AS delay FROM mare_game.combat_encounters")).rows[0];
    assert.ok(timing.delay>=2&&timing.delay<3);
    await pool.query("UPDATE mare_game.combat_encounters SET next_attack_at=clock_timestamp()+interval '1 hour'");
    const attack=f.input("combat.attack",4);
    assert.deepEqual(await (await send(attack)).json(),{error:"combat_cooldown"});
    for(const field of ["damage","playerHp","enemyHp","reward","gold","experience","ownerId","accountId","characterId","roll","seed","turn","nextAttackAt"]) {
      assert.equal((await send({...attack,[field]:999})).status,400);
      assert.equal((await send({...attack,payload:{[field]:999}})).status,400);
    }
    const foreign=await service.login("combat-other@example.invalid","fixture");
    const cross=await send(attack,foreign.token),missing=await send(attack,foreign.token,randomUUID());
    assert.equal(cross.status,404);assert.equal(missing.status,404);assert.deepEqual(await cross.json(),await missing.json());
    assert.equal((await send(attack,f.session.token,f.character.id,{"x-csrf-token":"forged"})).status,403);
    await readyAttack(pool);
    const hit=await (await send(attack)).json();assert.equal(hit.combat.turn,1);assert.ok(hit.combat.enemyHp>=22&&hit.combat.enemyHp<=26);assert.ok(hit.combat.playerHp>=19&&hit.combat.playerHp<=23);
    assert.deepEqual(await (await send(attack)).json(),hit);
    // Fixture a lethal remaining HP, without replacing the runtime RNG or damage calculation.
    await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1");await readyAttack(pool);
    const win=await (await send(f.input("combat.attack",5))).json();assert.equal(win.combat.status,"won");assert.equal(win.combat.playerHp,hit.combat.playerHp);
    assert.equal(win.combat.lastAttack.enemyDamage,0);
    const claim=f.input("combat.claim",6), reward=await (await send(claim)).json();
    assert.deepEqual(reward.state,{characterId:f.character.id,version:7,level:1,experience:"50",gold:"20"});assert.equal(reward.combat.status,"claimed");
    assert.deepEqual(await (await send(claim)).json(),reward);
    assert.deepEqual(await (await send({...claim,action:"combat.attack"})).json(),{error:"idempotency_conflict"});
    assert.deepEqual(await (await send(f.input("combat.claim",7))).json(),{error:"combat_already_claimed"});
    assert.deepEqual(await (await send(f.input("combat.begin",7))).json(),{error:"combat_rest"});
    await service.logout(f.session.token,"all");assert.equal((await send(claim)).status,401);
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test("combat requires completed hunt; defeat persists across reload/restart and never grants rewards or restores HP",async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service,pool,false);
  await assert.rejects(f.send(f.input("combat.begin",0)),{code:"hunt_required"});
  await assert.rejects(f.send(f.input("combat.attack",0)),{code:"combat_not_started"});
  await f.send(f.input("journey.begin",0));await f.send(f.input("hunt.begin",1));
  await assert.rejects(f.send(f.input("combat.begin",2)),{code:"hunt_required"});
  await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");await f.send(f.input("hunt.claim",2));await f.send(f.input("combat.begin",3));
  await assert.rejects(f.send(f.input("combat.claim",4)),{code:"combat_not_won"});
  await pool.query("UPDATE mare_game.combat_encounters SET player_hp=1");await readyAttack(pool);
  const loss=await f.send(f.input("combat.attack",4));assert.equal(loss.combat!.status,"lost");assert.equal(loss.combat!.playerHp,0);
  const restarted=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  assert.equal((await restarted.onlineState(f.session.token,f.character.id)).combat.status,"lost");
  await assert.rejects(f.send(f.input("combat.attack",5)),{code:"combat_finished"});
  await assert.rejects(f.send(f.input("combat.claim",5)),{code:"combat_not_won"});
  await assert.rejects(f.send(f.input("combat.begin",5)),{code:"combat_rest"});
  assert.equal((await service.characterState(f.session.token,f.character.id)).gold,"8");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,0);
}));

for(const sameId of [true,false]) test(`concurrent combat attacks ${sameId?"replay":"conflict"} across instances without extra damage or RNG rerolls`,async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));await readyAttack(pool);
  const other=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  const command=f.input("combat.attack",4);
  const outcomes=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?other:service).command(f.session.token,f.character.id,{...command,requestId:sameId?command.requestId:randomUUID()})));
  const accepted=outcomes.filter(r=>r.status==="fulfilled");assert.equal(accepted.length,sameId?8:1);
  for(const result of outcomes) if(result.status==="rejected") assert.equal(result.reason.code,"state_version_conflict");else assert.deepEqual(result.value,accepted[0]!.value);
  const snapshot=await service.onlineState(f.session.token,f.character.id);assert.equal(snapshot.combat.turn,1);assert.equal(snapshot.state.version,5);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rounds")).rows[0].n,1);
  const second=await service.login("combat@example.invalid","fixture"),lease=await service.acquireControl(second.token,f.character.id,command.control.epoch);
  await assert.rejects(f.send(command),{code:"control_conflict"});
  if(sameId) assert.deepEqual(await service.command(second.token,f.character.id,{...command,control:{epoch:lease.epoch,token:lease.token}}),accepted[0]!.value);
}));

for(const table of ["combat_rounds","character_commands"]) test(`failed ${table} write rolls back HP, cooldown, turn and version`,async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));await readyAttack(pool);
  const before=(await pool.query("SELECT * FROM mare_game.combat_encounters")).rows;
  await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT fail_test_write CHECK(false) NOT VALID`);
  await assert.rejects(f.send(f.input("combat.attack",4)),{code:"23514"});
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.combat_encounters")).rows,before);
  assert.equal((await service.characterState(f.session.token,f.character.id)).version,4);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rounds")).rows[0].n,0);
}));


async function wonFixture(service:AuthService,pool:any) {
  const f=await fixture(service,pool);await f.send(f.input("combat.begin",3));
  await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1");await readyAttack(pool);
  await f.send(f.input("combat.attack",4));return f;
}
for(const sameId of [true,false]) test(`concurrent victory claims with ${sameId?"same":"different"} IDs credit exactly once`,async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await wonFixture(service,pool),command=f.input("combat.claim",5);
  const other=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  const results=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?other:service).command(f.session.token,f.character.id,{...command,requestId:sameId?command.requestId:randomUUID()})));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,sameId?8:1);
  for(const result of results) if(result.status==="rejected") assert.equal(result.reason.code,"state_version_conflict");
  assert.equal((await service.characterState(f.session.token,f.character.id)).gold,"20");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,1);
}));
for(const table of ["combat_rewards","character_commands"]) test(`failed combat credit in ${table} rolls back balances/phase/version while retaining accepted refresh`,async()=>authDatabase(async({service,pool,provider})=>{
  const f=await wonFixture(service,pool),command=f.input("combat.claim",5);
  const before=(await pool.query("SELECT * FROM mare_game.combat_encounters")).rows;
  await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT fail_test_write CHECK(false) NOT VALID`);
  await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
  await assert.rejects(f.send(command),{code:"23514"});assert.equal(provider.refreshes,1);
  assert.deepEqual((await pool.query("SELECT * FROM mare_game.combat_encounters")).rows,before);
  const state=await service.characterState(f.session.token,f.character.id);assert.equal(state.version,5);assert.equal(state.experience,"20");assert.equal(state.gold,"8");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.combat_rewards")).rows[0].n,0);
  await pool.query(`ALTER TABLE mare_game.${table} DROP CONSTRAINT fail_test_write`);assert.equal((await f.send(command)).state.gold,"20");
}));

test("combat refuses reward overflow, exhausted version, recovery sessions and expired control without consuming victory",async()=>authDatabase(async({service,pool})=>{
  const f=await wonFixture(service,pool),command=f.input("combat.claim",5);
  for(const field of ["experience","gold"]) {
    await pool.query(`UPDATE mare_game.character_progression SET ${field}=9223372036854775807`);
    await assert.rejects(f.send(command),{code:"progression_limit"});
    await pool.query(`UPDATE mare_game.character_progression SET ${field}=$1`,[field==="gold"?"8":"20"]);
  }
  await pool.query("UPDATE mare_game.characters SET state_version=9007199254740991");
  await assert.rejects(f.send({...command,expectedVersion:Number.MAX_SAFE_INTEGER}),{code:"state_version_exhausted"});
  await pool.query("UPDATE mare_game.characters SET state_version=5");
  const flow=await service.startFlow("recovery","combat@example.invalid",undefined,"fixture"),recovery=await service.callback(flow.token,"fixture","fixture-code");
  await assert.rejects(service.command(recovery.token,f.character.id,command),{code:"authentication_required"});
  await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second'");
  await assert.rejects(f.send(command),{code:"control_conflict"});
  const lease=await service.acquireControl(f.session.token,f.character.id);
  assert.equal((await f.send({...command,control:{epoch:lease.epoch,token:lease.token}})).state.gold,"20");
}));

test("combat migration preserves the completed hunt, old receipts and existing balances",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"mare-pre-combat-"));
  for(const name of ["0001_foundation.sql","0002_auth_sessions.sql","0003_character_progression.sql","0004_character_commands.sql","0005_character_journey.sql","0006_first_hunt.sql"])
    await copyFile(new URL(`../../apps/game-server/migrations/${name}`,import.meta.url),join(directory,name));
  await authDatabase(async({service,pool})=>{
    const f=await fixture(service,pool);
    const tables=["accounts","characters","character_progression","character_commands","character_hunts","character_hunt_rewards"];
    const before=await Promise.all(tables.map(t=>pool.query(`SELECT * FROM mare_game.${t}`)));
    assert.deepEqual(await applyMigrations(pool),["0007_first_combat.sql", "0008_repeatable_encounters.sql"]);assert.deepEqual(await applyMigrations(pool),[]);
    for(const [i,t] of tables.entries()) assert.deepEqual((await pool.query(`SELECT * FROM mare_game.${t}`)).rows,before[i]!.rows);
    await assert.rejects(pool.query("INSERT INTO mare_game.combat_encounters(character_id,begin_request_id,last_request_id) VALUES($1,$2,$2)",[f.character.id,randomUUID()]),{code:"23503"});
    await f.send(f.input("combat.begin",3));
    await assert.rejects(pool.query("UPDATE mare_game.combat_encounters SET phase='won'"),{code:"23514"});
  },directory);
});

test("combat reward survives real socket loss after commit and restart without a second credit", async () =>
  authDatabase(async ({ service, pool, provider, vault }) => {
    const f=await wonFixture(service,pool),session=f.session,character=f.character;
    const command=f.input("combat.claim",5);
    const backend = createHttpServer({ isReady: async () => true,
      handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 3600 }) });
    backend.listen(0, "127.0.0.1"); await once(backend, "listening");
    let drop = true, dropped = 0;
    const proxy = createProxy((request, response) => {
      const upstream = forward({ hostname: "127.0.0.1", port: (backend.address() as AddressInfo).port,
        path: request.url, method: request.method, headers: request.headers }, (reply) => {
        if (drop) { drop = false; dropped++; reply.resume(); response.destroy(); return; }
        response.writeHead(reply.statusCode!, reply.headers); reply.pipe(response);
      });
      upstream.on("error", () => response.destroy()); request.pipe(upstream);
    });
    proxy.listen(0, "127.0.0.1"); await once(proxy, "listening");
    const send = () => fetch(`http://127.0.0.1:${(proxy.address() as AddressInfo).port}/v1/characters/${character.id}/commands`, {
      method: "POST", headers: { "content-type": "application/json", origin: "https://localhost:9443",
        cookie: `__Host-mare_session=${session.token}`, "x-csrf-token": vault.csrf(session.token) }, body: JSON.stringify(command),
    });
    try {
      await assert.rejects(send(), TypeError);
      assert.equal(dropped, 1);
      assert.equal((await service.characterState(session.token, character.id)).version, 6);
      const retry = await send(); assert.equal(retry.status, 200);
      const accepted = await retry.json(); assert.equal(accepted.state.gold,"20"); assert.equal(accepted.state.experience,"50");
      const restarted = new AuthService({ pool, provider, vault, origin: "https://localhost:9443",
        policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 } });
      assert.deepEqual(await restarted.command(session.token, character.id, command), accepted);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.combat_rewards")).rows[0].n, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 6);
    } finally {
      proxy.closeAllConnections(); backend.closeAllConnections();
      await Promise.all([new Promise<void>(r => proxy.close(() => r())), new Promise<void>(r => backend.close(() => r()))]);
    }
  }));
