import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { mkdtemp, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createServer as createProxy, request as forward } from "node:http";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";
import { applyMigrations } from "../../apps/game-server/src/db/migrations.js";

test("journey starts once through HTTP, versions state and records an atomic ledger without client rewards", async () =>
  authDatabase(async ({ service, pool, vault }) => {
    const a = await service.login("journey-a@example.invalid", "fixture");
    const b = await service.login("journey-b@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Journey", classId: "healer", factionId: "marine" });
    const lease = await service.acquireControl(a.token, character.id);
    const input = { requestId: randomUUID(), action: "journey.begin", expectedVersion: 0,
      control: { epoch: lease.epoch, token: lease.token }, payload: {} };
    const server = createHttpServer({ isReady: async () => true,
      handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 3600 }) });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const send = (value = input, token = a.token, id = character.id, headers = {}) => fetch(`${base}/v1/characters/${id}/commands`, {
      method: "POST", headers: { "content-type": "application/json", origin: "https://localhost:9443",
        cookie: `__Host-mare_session=${token}`, "x-csrf-token": vault.csrf(token), ...headers }, body: JSON.stringify(value),
    });
    try {
      const response = await send();
      assert.equal(response.status, 200, "the server must accept the first journey intention");
      const expected = { requestId: input.requestId, action: "journey.begin", state: {
        characterId: character.id, version: 1, level: 1, experience: "0", gold: "0" } };
      assert.deepEqual(await response.json(), expected);
      assert.deepEqual(await service.characterState(a.token, character.id), expected.state);
      assert.deepEqual(await (await send()).json(), expected);
      assert.deepEqual((await pool.query("SELECT character_id,request_id,version_before,version_after,event FROM mare_game.character_journey_ledger")).rows,
        [{ character_id: character.id, request_id: input.requestId, version_before: "0", version_after: "1", event: "journey.started" }]);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 1);
      assert.deepEqual(await (await send({ ...input, requestId: randomUUID(), expectedVersion: 1 })).json(), { error: "journey_already_started" });
      assert.deepEqual(await (await send({ ...input, action: "state.sync" })).json(), { error: "idempotency_conflict" });
      const cross = await send(input, b.token), missing = await send(input, b.token, randomUUID());
      assert.equal(cross.status, 404); assert.equal(missing.status, 404);
      assert.deepEqual(await cross.json(), await missing.json());
      assert.equal((await send(input, a.token, character.id, { "x-csrf-token": "forged" })).status, 403);
      for (const field of ["gold", "experience", "reward", "accountId", "ownerId", "characterId", "startedAt", "versionAfter"]) {
        assert.equal((await send({ ...input, [field]: 100 })).status, 400);
        assert.equal((await send({ ...input, payload: { [field]: 100 } })).status, 400);
      }
      await service.logout(a.token, "all");
      assert.equal((await send()).status, 401);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  }));

test("3B upgrade preserves characters, progress and receipts; ledger cannot persist without its matching receipt", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mare-3b-prefix-"));
  for (const name of ["0001_foundation.sql", "0002_auth_sessions.sql", "0003_character_progression.sql", "0004_character_commands.sql"])
    await copyFile(new URL(`../../apps/game-server/migrations/${name}`, import.meta.url), join(directory, name));
  await authDatabase(async ({ service, pool }) => {
    const session = await service.login("journey-upgrade@example.invalid", "fixture");
    const character = await service.createCharacter(session.token, { name: "Preserved", classId: "healer", factionId: "marine" });
    const lease = await service.acquireControl(session.token, character.id);
    await pool.query("UPDATE mare_game.characters SET state_version=9");
    await pool.query("UPDATE mare_game.character_progression SET gold=123,experience=456");
    const command = { requestId: randomUUID(), action: "state.sync" as const, expectedVersion: 9,
      control: { epoch: lease.epoch, token: lease.token }, payload: {} };
    const oldResult = await service.command(session.token, character.id, command);
    const tables = ["characters", "character_progression", "character_commands"];
    const before = await Promise.all(tables.map(table => pool.query(`SELECT * FROM mare_game.${table}`)));
    assert.deepEqual(await applyMigrations(pool), ["0005_character_journey.sql", "0006_first_hunt.sql", "0007_first_combat.sql", "0008_repeatable_encounters.sql"]);
    for (const [i, table] of tables.entries()) assert.deepEqual((await pool.query(`SELECT * FROM mare_game.${table}`)).rows, before[i]!.rows);
    assert.deepEqual(await applyMigrations(pool), []);
    assert.deepEqual(await service.command(session.token, character.id, command), oldResult);
    await assert.rejects(pool.query("INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before) VALUES($1,$2,9)",
      [character.id, randomUUID()]), { code: "23503" });
    for (const version of [-1, Number.MAX_SAFE_INTEGER])
      await assert.rejects(pool.query("INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before) VALUES($1,$2,$3)",
        [character.id, command.requestId, version]), { code: "23514" });
    const accepted = await service.command(session.token, character.id, { ...command, action: "journey.begin", requestId: randomUUID() });
    assert.deepEqual(accepted.state, { characterId: character.id, version: 10, level: 1, experience: "456", gold: "123" });
    await assert.rejects(pool.query("INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before) VALUES($1,$2,9)",
      [character.id, command.requestId]), { code: "23505" });
  }, directory);
});

for (const mode of ["takeover", "logout"] as const) test(`journey mutation racing ${mode} respects the serialized authorization boundary`, async () =>
  authDatabase(async ({ service, pool }) => {
    const a = await service.login("journey-revoke@example.invalid", "fixture");
    const b = await service.login("journey-revoke@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Boundary", classId: "sword", factionId: "pirate" });
    const lease = await service.acquireControl(a.token, character.id);
    const command = { requestId: randomUUID(), action: "journey.begin" as const, expectedVersion: 0,
      control: { epoch: lease.epoch, token: lease.token }, payload: {} };
    const [mutation, boundary] = await Promise.allSettled([
      service.command(a.token, character.id, command),
      mode === "takeover" ? service.acquireControl(b.token, character.id, lease.epoch) : service.logout(b.token, "all"),
    ]);
    assert.equal(boundary.status, "fulfilled");
    if (mutation.status === "rejected") assert.equal(mutation.reason.code, mode === "takeover" ? "control_conflict" : "authentication_required");
    const committed = Number(mutation.status === "fulfilled");
    assert.equal((await pool.query("SELECT state_version FROM mare_game.characters")).rows[0].state_version, String(committed));
    for (const table of ["character_journey_ledger", "character_commands"])
      assert.equal((await pool.query(`SELECT count(*)::int AS n FROM mare_game.${table}`)).rows[0].n, committed);
    await assert.rejects(service.command(a.token, character.id, command), { status: mode === "takeover" ? 409 : 401 });
  }));

for (const sameId of [true, false]) test(`concurrent journey intentions with ${sameId ? "one" : "different"} request IDs commit one mutation`, async () =>
  authDatabase(async ({ service, pool, vault, provider }) => {
    const session = await service.login("journey-race@example.invalid", "fixture");
    const character = await service.createCharacter(session.token, { name: "Race", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(session.token, character.id);
    const command = { requestId: randomUUID(), action: "journey.begin" as const, expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    const second = new AuthService({ pool, vault, provider, origin: "https://localhost:9443",
      policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 } });
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, (_, i) =>
      (i % 2 ? second : service).command(session.token, character.id, { ...command, requestId: sameId ? command.requestId : randomUUID() })));
    assert.equal(outcomes.filter(r => r.status === "fulfilled").length, sameId ? 8 : 1);
    for (const result of outcomes) {
      if (result.status === "rejected") assert.equal(result.reason.code, "state_version_conflict");
      else assert.equal(result.value.state.version, 1);
    }
    assert.equal((await service.characterState(session.token, character.id)).version, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_journey_ledger")).rows[0].n, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 1);
  }));

for (const table of ["character_journey_ledger", "character_commands"]) test(`failure writing ${table} rolls back version, ledger and receipt but keeps accepted refresh`, async () =>
  authDatabase(async ({ service, pool, provider }) => {
    const session = await service.login("journey-rollback@example.invalid", "fixture");
    const character = await service.createCharacter(session.token, { name: "Rollback", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(session.token, character.id);
    const command = { requestId: randomUUID(), action: "journey.begin" as const, expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    const refresh = provider.refresh.bind(provider);
    provider.refresh = async (token) => {
      const previous = await refresh(token); provider.sessions.delete(token);
      const next = { ...previous, refreshToken: "fixture-" + randomUUID() };
      provider.sessions.set(next.refreshToken, next); return next;
    };
    await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
    // Fixed test table names only, in a disposable UUID database.
    await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT fail_test_write CHECK(false)`);
    await assert.rejects(service.command(session.token, character.id, command), { code: "23514" });
    assert.equal((await service.characterState(session.token, character.id)).version, 0);
    for (const target of ["character_journey_ledger", "character_commands"])
      assert.equal((await pool.query(`SELECT count(*)::int AS n FROM mare_game.${target}`)).rows[0].n, 0);
    assert.equal(provider.refreshes, 1);
    await pool.query(`ALTER TABLE mare_game.${table} DROP CONSTRAINT fail_test_write`);
    assert.equal((await service.command(session.token, character.id, command)).state.version, 1);
  }));

test("socket loss after commit and a new service instance reconcile the original mutation without repeating it", async () =>
  authDatabase(async ({ service, pool, provider, vault }) => {
    const session = await service.login("journey-disconnect@example.invalid", "fixture");
    const character = await service.createCharacter(session.token, { name: "Reconnect", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(session.token, character.id);
    const command = { requestId: randomUUID(), action: "journey.begin" as const, expectedVersion: 0,
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
      assert.equal((await service.characterState(session.token, character.id)).version, 1);
      const retry = await send(); assert.equal(retry.status, 200);
      const accepted = await retry.json();
      const restarted = new AuthService({ pool, provider, vault, origin: "https://localhost:9443",
        policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 } });
      assert.deepEqual(await restarted.command(session.token, character.id, command), accepted);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_journey_ledger")).rows[0].n, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_commands")).rows[0].n, 1);
    } finally {
      proxy.closeAllConnections(); backend.closeAllConnections();
      await Promise.all([new Promise<void>(r => proxy.close(() => r())), new Promise<void>(r => backend.close(() => r()))]);
    }
  }));

test("journey denies stale/foreign control and recovery, preserves max version and supports authorized takeover replay", async () =>
  authDatabase(async ({ service, pool }) => {
    const a = await service.login("journey-control@example.invalid", "fixture");
    const second = await service.login("journey-control@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Control", classId: "sword", factionId: "pirate" });
    const control = await service.acquireControl(a.token, character.id);
    const command = { requestId: randomUUID(), action: "journey.begin" as const, expectedVersion: 0,
      control: { epoch: control.epoch, token: control.token }, payload: {} };
    await assert.rejects(service.command(second.token, character.id, command), { code: "control_conflict" });
    const next = await service.acquireControl(second.token, character.id, control.epoch);
    await assert.rejects(service.command(a.token, character.id, command), { code: "control_conflict" });
    const current = { ...command, control: { epoch: next.epoch, token: next.token } };
    const flow = await service.startFlow("recovery", "journey-control@example.invalid", undefined, "fixture");
    const recovery = await service.callback(flow.token, "fixture", "fixture-code");
    await assert.rejects(service.command(recovery.token, character.id, current), { status: 401 });
    await pool.query("UPDATE mare_game.characters SET state_version=9007199254740991");
    await assert.rejects(service.command(second.token, character.id, { ...current, expectedVersion: Number.MAX_SAFE_INTEGER }), { code: "state_version_exhausted" });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_journey_ledger")).rows[0].n, 0);
    await pool.query("UPDATE mare_game.characters SET state_version=0");
    const accepted = await service.command(second.token, character.id, current);
    const again = await service.acquireControl(a.token, character.id, next.epoch);
    assert.deepEqual(await service.command(a.token, character.id, { ...command, control: { epoch: again.epoch, token: again.token } }), accepted);
    await assert.rejects(service.command(second.token, character.id, current), { code: "control_conflict" });
    await pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second'");
    await assert.rejects(service.command(a.token, character.id, { ...command, control: { epoch: again.epoch, token: again.token } }), { code: "control_conflict" });
    assert.equal((await service.characterState(a.token, character.id)).version, 1);
  }));
