import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";
import { AuthService } from "../../apps/game-server/src/auth/service.js";

test("command HTTP boundary authenticates, fences controllers and deduplicates concurrent requests without economic writes", async () =>
  authDatabase(async ({ service, vault, pool }) => {
    const a = await service.login("command-a@example.invalid", "fixture");
    const a2 = await service.login("command-a@example.invalid", "fixture");
    const b = await service.login("command-b@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Command", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(a.token, character.id);
    const input = { requestId: randomUUID(), action: "state.sync", expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    const server = createHttpServer({ isReady: async () => true,
      handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 3600 }) });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const path = `/v1/characters/${character.id}/commands`;
    const send = (value: unknown = input, token = a.token, suffix = path, extra: Record<string,string> = {}) => fetch(base + suffix, {
      method: "POST", headers: { "content-type": "application/json", origin: "https://localhost:9443",
        cookie: `__Host-mare_session=${token}`, "x-csrf-token": vault.csrf(token), ...extra }, body: JSON.stringify(value),
    });
    const count = async () => (await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n;
    try {
      const [first, ...initialRace] = await Promise.all(Array.from({ length: 8 }, () => send()));
      assert.ok(first);
      assert.equal(first.status, 200, "the authorized command endpoint must exist");
      assert.equal(first.headers.get("cache-control"), "no-store");
      const expected = { requestId: input.requestId, action: "state.sync", state: {
        characterId: character.id, version: 0, level: 1, experience: "0", gold: "0" } };
      assert.deepEqual(await first.json(), expected);
      for (const response of initialRace) { assert.equal(response.status, 200); assert.deepEqual(await response.json(), expected); }
      const duplicates = await Promise.all(Array.from({ length: 8 }, () => send()));
      for (const response of duplicates) { assert.equal(response.status, 200); assert.deepEqual(await response.json(), expected); }
      assert.equal(await count(), 1);
      // Changing the current state in the disposable DB proves replay returns the stored result.
      await pool.query("UPDATE mare_game.characters SET state_version=1 WHERE id=$1", [character.id]);
      assert.deepEqual(await (await send()).json(), expected);
      assert.equal((await send({ ...input, expectedVersion: 1 })).status, 409);
      assert.deepEqual(await (await send({ ...input, requestId: randomUUID() })).json(), { error: "state_version_conflict" });
      for (const field of ["accountId", "ownerId", "characterId", "gold", "experience"]) {
        assert.equal((await send({ ...input, [field]: randomUUID() })).status, 400);
        assert.equal((await send({ ...input, payload: { [field]: 100 } })).status, 400);
        assert.equal((await send(input, a.token, path + `?${field}=forged`)).status, 400);
      }
      assert.equal((await send({ ...input, action: "gold.grant" })).status, 400);
      assert.equal((await send({ ...input, expectedVersion: -1 })).status, 400);
      assert.equal((await send(input, a.token, path, { origin: "https://foreign.invalid" })).status, 403);
      assert.equal((await send(input, a.token, path, { "x-csrf-token": "invalid" })).status, 403);
      assert.equal((await send(input, a.token, path, { "sec-fetch-site": "cross-site" })).status, 403);
      assert.equal((await send(input, "unknown-token")).status, 401);
      for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
        const response = await fetch(base + path, { method });
        assert.equal(response.status, 405); assert.equal(response.headers.get("allow"), "POST");
      }
      const cross = await send(input, b.token);
      const missing = await send(input, b.token, `/v1/characters/${randomUUID()}/commands`);
      assert.equal(cross.status, 404); assert.equal(missing.status, 404);
      assert.deepEqual(await cross.json(), await missing.json());
      assert.equal((await send(input, a2.token)).status, 409, "lease is bound to the BFF session");
      assert.equal((await send({ ...input, control: { ...input.control, token: "x".repeat(43) } })).status, 409);
      const next = await service.acquireControl(a2.token, character.id, control.epoch);
      assert.equal((await send()).status, 409, "even cached requests require the current controller");
      const rebound = { ...input, control: { epoch: next.epoch, token: next.token } };
      assert.deepEqual(await (await send(rebound, a2.token)).json(), expected, "new controller may reconcile an existing request");
      const flow = await service.startFlow("recovery", "command-a@example.invalid", undefined, "fixture-binding");
      const recovery = await service.callback(flow.token, "fixture-binding", "fixture-code");
      assert.equal((await send(rebound, recovery.token)).status, 401);
      await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second'");
      assert.equal((await send(rebound, a2.token)).status, 409);
      await service.logout(a2.token, "all");
      assert.equal((await send(rebound, a2.token)).status, 401);
      assert.equal(await count(), 1, "rejections must not consume idempotency entries");
      assert.deepEqual((await pool.query("SELECT level,experience,gold FROM mare_game.character_progression")).rows,
        [{ level: 1, experience: "0", gold: "0" }]);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  }));

test("takeover and global logout serialize with commands across sessions", async () =>
  authDatabase(async ({ service, pool }) => {
    const a = await service.login("command-race@example.invalid", "fixture");
    const b = await service.login("command-race@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Race", classId: "sword", factionId: "pirate" });
    const old = await service.acquireControl(a.token, character.id);
    const input = { requestId: randomUUID(), action: "state.sync" as const, expectedVersion: 0,
      control: { epoch: old.epoch, token: old.token }, payload: {} };
    const [command, takeover] = await Promise.allSettled([
      service.command(a.token, character.id, input), service.acquireControl(b.token, character.id, old.epoch),
    ]);
    assert.equal(takeover.status, "fulfilled");
    if (command.status === "rejected") assert.equal(command.reason.code, "control_conflict");
    await assert.rejects(service.command(a.token, character.id, input), { code: "control_conflict" });
    assert.ok(takeover.status === "fulfilled");
    const current = { ...input, requestId: randomUUID(), control: { epoch: takeover.value.epoch, token: takeover.value.token } };
    const [pending, logout] = await Promise.allSettled([
      service.command(b.token, character.id, current), service.logout(a.token, "all"),
    ]);
    assert.equal(logout.status, "fulfilled");
    if (pending.status === "rejected") assert.equal(pending.reason.status, 401);
    await assert.rejects(service.command(b.token, character.id, current), { status: 401 });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n,
      Number(command.status === "fulfilled") + Number(pending.status === "fulfilled"));
  }));

test("command receipts survive restart, SQL failures roll back, and retries retain successful single-use refresh", async () =>
  authDatabase(async ({ service, pool, provider, vault }) => {
    const login = await service.login("command-restart@example.invalid", "fixture");
    const character = await service.createCharacter(login.token, { name: "Restart", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(login.token, character.id);
    const input = { requestId: randomUUID(), action: "state.sync" as const, expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    const refresh = provider.refresh.bind(provider);
    provider.refresh = async (token) => {
      const result = await refresh(token);
      provider.sessions.delete(token);
      const next = { ...result, refreshToken: "fixture-" + randomUUID() };
      provider.sessions.set(next.refreshToken, next);
      return next;
    };
    await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
    await pool.query("ALTER TABLE mare_game.character_commands ADD CONSTRAINT force_failure CHECK(false)");
    await assert.rejects(service.command(login.token, character.id, input), { code: "23514" });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 0);
    await assert.doesNotReject(service.me(login.token));
    assert.equal(provider.refreshes, 1);
    await pool.query("ALTER TABLE mare_game.character_commands DROP CONSTRAINT force_failure");
    const accepted = await service.command(login.token, character.id, input);
    const restarted = new AuthService({ pool, provider, vault, origin: "https://localhost:9443",
      policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 } });
    await pool.query("UPDATE mare_game.characters SET state_version=2");
    await pool.query("UPDATE mare_game.character_progression SET gold=7");
    const replies = await Promise.all([service.command(login.token, character.id, input), restarted.command(login.token, character.id, input)]);
    for (const reply of replies) assert.deepEqual(reply, accepted);
    const fresh = await restarted.command(login.token, character.id, { ...input, requestId: randomUUID(), expectedVersion: 2 });
    assert.equal(fresh.state.gold, "7");
    assert.equal(fresh.state.version, 2);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 2);
    const storage = JSON.stringify((await pool.query("SELECT * FROM mare_game.character_commands")).rows);
    assert.equal(storage.includes(control.token), false); assert.equal(storage.includes(login.token), false);
  }));

test("command rate limits preserve retry while old receipts never impose a lifetime stop", async () =>
  authDatabase(async ({ service, pool }) => {
    const login = await service.login("command-budget@example.invalid", "fixture");
    const character = await service.createCharacter(login.token, { name: "Budget", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(login.token, character.id);
    const input = { requestId: randomUUID(), action: "state.sync" as const, expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    const result = await service.command(login.token, character.id, input);
    await pool.query(`INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result)
      SELECT $1,gen_random_uuid(),repeat('a',64),$2::jsonb FROM generate_series(1,58)`, [character.id, JSON.stringify(result)]);
    const attempts = await Promise.allSettled(Array.from({length: 2}, () =>
      service.command(login.token, character.id, { ...input, requestId: randomUUID() })));
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = attempts.find((r) => r.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected"); assert.equal(rejected.reason.code, "command_rate_limited");
    assert.deepEqual(await service.command(login.token, character.id, input), result);
    // Only this disposable fixture's clock columns are changed; no real account/provider clocks.
    await assert.rejects(service.command(login.token, character.id, { ...input, requestId: randomUUID(), action: "journey.begin" }), { code: "command_rate_limited" });
    await pool.query("UPDATE mare_game.character_commands SET created_at=clock_timestamp()-interval '2 minutes'");
    await pool.query(`INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result,created_at)
      SELECT $1,gen_random_uuid(),repeat('b',64),$2::jsonb,clock_timestamp()-interval '2 minutes' FROM generate_series(1,9940)`,
      [character.id, JSON.stringify(result)]);
    await service.command(login.token, character.id, { ...input, requestId: randomUUID() });
    await service.command(login.token, character.id, { ...input, requestId: randomUUID(), action: "journey.begin" });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_journey_ledger")).rows[0].n, 1);
    assert.equal((await service.characterState(login.token, character.id)).version, 1);
    assert.deepEqual(await service.command(login.token, character.id, input), result);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 10002);
  }));
test("sustained movement does not exhaust a minute budget or spend the action budget", async () =>
  authDatabase(async ({ service, pool }) => {
    const login = await service.login("movement-budget@example.invalid", "fixture");
    const character = await service.createCharacter(login.token, { name: "Mover", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(login.token, character.id);
    const envelope = { control: { epoch: control.epoch, token: control.token }, payload: {} };
    const initialize = await service.command(login.token, character.id, {
      ...envelope, requestId: randomUUID(), action: "world.initialize", expectedVersion: 0,
    });
    const expectedVersion = initialize.state.version;
    const seed = (action: string, count: number, age = '0 seconds') => pool.query(
      "INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result,created_at) SELECT $1,gen_random_uuid(),repeat('a',64),$2::jsonb,clock_timestamp()-$4::interval FROM generate_series(1,$3::int)",
      [character.id, JSON.stringify({ ...initialize, action }), count, age],
    );
    await seed("world.move", 240, '2 seconds');
    await service.command(login.token, character.id, {
      ...envelope, requestId: randomUUID(), action: "state.sync", expectedVersion,
    });
    await seed("state.sync", 58);
    const stop = { ...envelope, requestId: randomUUID(), action: "world.stop" as const, expectedVersion };
    const accepted = await service.command(login.token, character.id, stop);
    assert.equal(accepted.state.version, expectedVersion + 1);
    await seed("world.move", 11);
    await assert.rejects(service.command(login.token, character.id, {
      ...stop, requestId: randomUUID(), expectedVersion: accepted.state.version,
    }), { code: "command_rate_limited" });
    await assert.rejects(service.command(login.token, character.id, {
      ...envelope, requestId: randomUUID(), action: "state.sync", expectedVersion: accepted.state.version,
    }), { code: "command_rate_limited" });
    assert.deepEqual(await service.command(login.token, character.id, stop), accepted);
  }));

test('movement burst rejection has a short retry hint and cannot bypass control or replay',async()=>authDatabase(async({service,pool,vault})=>{
 const login=await service.login('movement-burst@example.invalid','fixture');
 const c=await service.createCharacter(login.token,{name:'Burst',classId:'sword',factionId:'pirate'}),control=await service.acquireControl(login.token,c.id);
 const input={requestId:randomUUID(),expectedVersion:0,action:'world.initialize' as const,payload:{},control:{epoch:control.epoch,token:control.token}};
 const initialized=await service.command(login.token,c.id,input);
 await pool.query("INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) SELECT $1,gen_random_uuid(),repeat('a',64),$2::jsonb FROM generate_series(1,12)",[c.id,JSON.stringify({...initialized,action:'world.move'})]);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');
 const send=(command:any)=>fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/characters/${c.id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${login.token}`,'x-csrf-token':vault.csrf(login.token)},body:JSON.stringify(command)});
 try{
  const stop={...input,requestId:randomUUID(),action:'world.stop',expectedVersion:initialized.state.version};
  const rejected=await send(stop);assert.equal(rejected.status,429);assert.equal(rejected.headers.get('retry-after'),'1');assert.deepEqual(await rejected.json(),{error:'command_rate_limited'});
  assert.equal((await send({...stop,control:{...stop.control,epoch:control.epoch+1}})).status,409);
  assert.deepEqual(await (await send(input)).json(),initialized,'authorized idempotent replay still succeeds at quota');
  assert.equal((await service.characterState(login.token,c.id)).version,initialized.state.version);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('command ingress does not spend the read budget shared by players behind one IP',async()=>authDatabase(async({service,vault})=>{
 const login=await service.login('ingress@example.invalid','fixture'),c=await service.createCharacter(login.token,{name:'Ingress',classId:'sword',factionId:'pirate'}),control=await service.acquireControl(login.token,c.id);
 const input={requestId:randomUUID(),expectedVersion:0,action:'state.sync' as const,payload:{},control:{epoch:control.epoch,token:control.token}};
 const limited=service.rateLimit.bind(service);await limited('game-ip:127.0.0.1',1,60);
 service.rateLimit=async(key,limit,seconds)=>limited(key,key==='game-ip:127.0.0.1'?1:limit,seconds);
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`,headers={cookie:`__Host-mare_session=${login.token}`};
 try{
  const result=await fetch(base+`/v1/characters/${c.id}/commands`,{method:'POST',headers:{...headers,'content-type':'application/json',origin:'https://localhost:9443','x-csrf-token':vault.csrf(login.token)},body:JSON.stringify(input)});
  assert.equal(result.status,200,'command traffic has an independently bounded ingress budget');
  assert.equal((await fetch(base+'/v1/me',{headers})).status,429,'read budget remains enforced');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
