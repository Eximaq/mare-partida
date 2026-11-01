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

async function fixture(service: AuthService) {
  const session = await service.login("hunt@example.invalid", "fixture");
  const character = await service.createCharacter(session.token, { name: "Hunter", classId: "sword", factionId: "pirate" });
  const control = await service.acquireControl(session.token, character.id);
  const input = (action: "journey.begin" | "hunt.begin" | "hunt.claim", expectedVersion: number) =>
    ({ requestId: randomUUID(), action, expectedVersion, control: { epoch: control.epoch, token: control.token }, payload: {} });
  return { session, character, input, send: (command: ReturnType<typeof input>) => service.command(session.token, character.id, command) };
}
// Time manipulation below belongs ONLY to the UUID disposable database fixture.
const mature = (pool: any) => pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");

test("first hunt HTTP accepts only intentions, waits for database time and rewards exactly once", async () => authDatabase(async ({service,pool,vault}) => {
  const f = await fixture(service);
  await f.send(f.input("journey.begin",0));
  const server = createHttpServer({ isReady: async()=>true, handle:createAuthHandler({service,vault,origin:"https://localhost:9443",cookieSeconds:3600}) });
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const send=(command: any,token=f.session.token,id=f.character.id,headers={})=>fetch(`${base}/v1/characters/${id}/commands`,{
    method:"POST",headers:{"content-type":"application/json",origin:"https://localhost:9443",cookie:`__Host-mare_session=${token}`,"x-csrf-token":vault.csrf(token),...headers},body:JSON.stringify(command)});
  try {
    const start=f.input("hunt.begin",1), response=await send(start);
    assert.equal(response.status,200,"new hunt intention must be accepted");
    assert.equal((await response.json()).state.version,2);
    assert.equal((await service.characterState(f.session.token,f.character.id)).gold,"0");
    const current:any=await service.onlineState(f.session.token,f.character.id);
    assert.equal(current.hunt.status,"active");
    assert.equal(Date.parse(current.hunt.readyAt)-Date.parse(current.hunt.startedAt),30000);
    const claim=f.input("hunt.claim",2);
    assert.deepEqual(await (await send(claim)).json(),{error:"hunt_not_ready"});
    for(const action of ["hunt.begin","hunt.claim"]) for(const field of ["gold","experience","reward","accountId","ownerId","characterId","duration","readyAt","huntId"]) {
      assert.equal((await send({...claim,action,[field]:999})).status,400);
      assert.equal((await send({...claim,action,payload:{[field]:999}})).status,400);
    }
    const foreign=await service.login("other-hunt@example.invalid","fixture");
    const denied=await send(claim,foreign.token), missing=await send(claim,foreign.token,randomUUID());
    assert.equal(denied.status,404); assert.equal(missing.status,404); assert.deepEqual(await denied.json(),await missing.json());
    assert.equal((await send(claim,f.session.token,f.character.id,{"x-csrf-token":"forged"})).status,403);
    await mature(pool);
    const accepted=await send(claim); assert.equal(accepted.status,200);
    const result=await accepted.json();
    assert.deepEqual(result.state,{characterId:f.character.id,version:3,level:1,experience:"20",gold:"8"});
    assert.deepEqual(await (await send(claim)).json(),result);
    assert.equal((await send({...claim,action:"hunt.begin"})).status,409);
    assert.deepEqual(await (await send(f.input("hunt.claim",3))).json(),{error:"hunt_already_claimed"});
    assert.deepEqual(await (await send(f.input("hunt.begin",3))).json(),{error:"hunt_already_started"});
    assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_hunt_rewards")).rows[0].n,1);
    await service.logout(f.session.token,"all"); assert.equal((await send(claim)).status,401);
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test("hunt requires a journey and an existing unclaimed run; no credit on premature claims",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service);
  await assert.rejects(f.send(f.input("hunt.begin",0)),{code:"journey_required"});
  await assert.rejects(f.send(f.input("hunt.claim",0)),{code:"hunt_not_started"});
  await f.send(f.input("journey.begin",0)); await f.send(f.input("hunt.begin",1));
  await assert.rejects(f.send(f.input("hunt.claim",2)),{code:"hunt_not_ready"});
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_hunt_rewards")).rows[0].n,0);
  assert.deepEqual(await service.characterState(f.session.token,f.character.id),{characterId:f.character.id,version:2,level:1,experience:"0",gold:"0"});
}));

for(const sameId of [true,false]) test(`concurrent hunt starts and claims with ${sameId?"same":"different"} IDs persist one run and reward`,async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service); await f.send(f.input("journey.begin",0));
  const other=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  for(const [action,version] of [["hunt.begin",1],["hunt.claim",2]] as const) {
    const input=f.input(action,version);
    const results=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?other:service).command(f.session.token,f.character.id,{...input,requestId:sameId?input.requestId:randomUUID()})));
    assert.equal(results.filter(r=>r.status==="fulfilled").length,sameId?8:1);
    for(const result of results) if(result.status==="rejected") assert.equal(result.reason.code,"state_version_conflict");
    await mature(pool);
  }
  assert.equal((await service.characterState(f.session.token,f.character.id)).gold,"8");
  for(const table of ["character_hunts","character_hunt_rewards"]) assert.equal((await pool.query(`SELECT count(*)::int n FROM mare_game.${table}`)).rows[0].n,1);
}));

for(const table of ["character_hunt_rewards","character_commands"]) test(`claim failure in ${table} rolls back economy/version/ledger but preserves provider refresh`,async()=>authDatabase(async({service,pool,provider})=>{
  const f=await fixture(service); await f.send(f.input("journey.begin",0)); await f.send(f.input("hunt.begin",1)); await mature(pool);
  // NOT VALID preserves old receipts while rejecting this new write in the disposable database.
  await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT fail_test_write CHECK(false) NOT VALID`);
  await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
  const claim=f.input("hunt.claim",2);
  await assert.rejects(f.send(claim),{code:"23514"});
  assert.equal(provider.refreshes,1);
  assert.equal((await service.characterState(f.session.token,f.character.id)).experience,"0");
  assert.equal((await service.characterState(f.session.token,f.character.id)).version,2);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_hunt_rewards")).rows[0].n,0);
  await pool.query(`ALTER TABLE mare_game.${table} DROP CONSTRAINT fail_test_write`);
  assert.equal((await f.send(claim)).state.gold,"8");
}));

test("hunt rejects overflow, recovery sessions and superseded controllers; a fresh controller can replay a committed reward",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service); await f.send(f.input("journey.begin",0)); await f.send(f.input("hunt.begin",1)); await mature(pool);
  const claim=f.input("hunt.claim",2);
  for(const field of ["experience","gold"]) {
    await pool.query(`UPDATE mare_game.character_progression SET ${field}=9223372036854775807`);
    await assert.rejects(f.send(claim),{code:"progression_limit"});
    await pool.query(`UPDATE mare_game.character_progression SET ${field}=0`);
  }
  await pool.query("UPDATE mare_game.characters SET state_version=9007199254740991");
  await assert.rejects(f.send({...claim,expectedVersion:Number.MAX_SAFE_INTEGER}),{code:"state_version_exhausted"});
  await pool.query("UPDATE mare_game.characters SET state_version=2");
  const flow=await service.startFlow("recovery","hunt@example.invalid",undefined,"fixture");
  const recovery=await service.callback(flow.token,"fixture","fixture-code");
  await assert.rejects(service.command(recovery.token,f.character.id,claim),{code:"authentication_required"});
  const accepted=await f.send(claim);
  const second=await service.login("hunt@example.invalid","fixture");
  const lease=await service.acquireControl(second.token,f.character.id,claim.control.epoch);
  await assert.rejects(f.send(claim),{code:"control_conflict"});
  assert.deepEqual(await service.command(second.token,f.character.id,{...claim,control:{epoch:lease.epoch,token:lease.token}}),accepted);
  assert.equal((await service.characterState(second.token,f.character.id)).gold,"8");
}));

test("real socket loss after reward commit and service restart never duplicate XP or gold", async () =>
  authDatabase(async ({ service, pool, provider, vault }) => {
    const session = await service.login("journey-disconnect@example.invalid", "fixture");
    const character = await service.createCharacter(session.token, { name: "Reconnect", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(session.token, character.id);
    await service.command(session.token,character.id,{requestId:randomUUID(),action:"journey.begin",expectedVersion:0,control:{epoch:control.epoch,token:control.token},payload:{}});
    await service.command(session.token,character.id,{requestId:randomUUID(),action:"hunt.begin",expectedVersion:1,control:{epoch:control.epoch,token:control.token},payload:{}});
    await mature(pool);
    const command = { requestId: randomUUID(), action: "hunt.claim" as const, expectedVersion: 2,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
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
      assert.equal((await service.characterState(session.token, character.id)).version, 3);
      const retry = await send(); assert.equal(retry.status, 200);
      const accepted = await retry.json(); assert.equal(accepted.state.gold,"8"); assert.equal(accepted.state.experience,"20");
      const restarted = new AuthService({ pool, provider, vault, origin: "https://localhost:9443",
        policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 } });
      assert.deepEqual(await restarted.command(session.token, character.id, command), accepted);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_hunt_rewards")).rows[0].n, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 3);
    } finally {
      proxy.closeAllConnections(); backend.closeAllConnections();
      await Promise.all([new Promise<void>(r => proxy.close(() => r())), new Promise<void>(r => backend.close(() => r()))]);
    }
  }));


test("hunt migration is additive and repeatable, preserving old account, character, progress and receipt data",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"mare-pre-hunt-"));
  for(const name of ["0001_foundation.sql","0002_auth_sessions.sql","0003_character_progression.sql","0004_character_commands.sql","0005_character_journey.sql"])
    await copyFile(new URL(`../../apps/game-server/migrations/${name}`,import.meta.url),join(directory,name));
  await authDatabase(async({service,pool})=>{
    const f=await fixture(service);await f.send(f.input("journey.begin",0));
    await pool.query("UPDATE mare_game.character_progression SET gold=9007199254740993,experience=567");
    const tables=["accounts","characters","character_progression","character_commands","character_journey_ledger"];
    const before=await Promise.all(tables.map(t=>pool.query(`SELECT * FROM mare_game.${t}`)));
    assert.deepEqual(await applyMigrations(pool),["0006_first_hunt.sql"]);assert.deepEqual(await applyMigrations(pool),[]);
    for(const [i,t] of tables.entries()) assert.deepEqual((await pool.query(`SELECT * FROM mare_game.${t}`)).rows,before[i]!.rows);
    await f.send(f.input("hunt.begin",1));await mature(pool);
    const accepted=await f.send(f.input("hunt.claim",2));
    assert.equal(accepted.state.gold,"9007199254741001");assert.equal(accepted.state.experience,"587");
    const ledger=(await pool.query("SELECT gold_before,gold_after,experience_before,experience_after FROM mare_game.character_hunt_rewards")).rows[0];
    assert.deepEqual(ledger,{gold_before:"9007199254740993",gold_after:"9007199254741001",experience_before:"567",experience_after:"587"});
  },directory);
});

test("failed hunt start rolls back its version and requires a matching committed receipt",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service);await f.send(f.input("journey.begin",0));
  await pool.query("ALTER TABLE mare_game.character_hunts ADD CONSTRAINT fail_test_write CHECK(false)");
  await assert.rejects(f.send(f.input("hunt.begin",1)),{code:"23514"});
  assert.equal((await service.characterState(f.session.token,f.character.id)).version,1);
  await pool.query("ALTER TABLE mare_game.character_hunts DROP CONSTRAINT fail_test_write");
  await assert.rejects(pool.query("INSERT INTO mare_game.character_hunts(character_id,request_id,version_before) VALUES($1,$2,1)",[f.character.id,randomUUID()]),{code:"23503"});
  await f.send(f.input("hunt.begin",1));
  await assert.rejects(pool.query("INSERT INTO mare_game.character_hunt_rewards(character_id,request_id,version_before,experience_before,gold_before) VALUES($1,$2,2,0,0)",[f.character.id,randomUUID()]),{code:"23503"});
}));
