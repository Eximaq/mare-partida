import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdtemp, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase, type FakeProvider } from "./auth-support.mjs";
import { applyMigrations } from "../../apps/game-server/src/db/migrations.js";

function singleUseRefresh(provider: FakeProvider) {
  const refresh = provider.refresh.bind(provider);
  provider.refresh = async (token) => {
    const session = await refresh(token);
    provider.sessions.delete(token);
    const rotated = { ...session, refreshToken: "rotated-fixture-" + randomUUID() };
    provider.sessions.set(rotated.refreshToken, rotated);
    return rotated;
  };
}

test("owned state starts clean, survives reload, denies cross-account reads and exposes no client economic writes", async () =>
  authDatabase(async ({ service, vault, pool }) => {
    const a = await service.login("state-a@example.invalid", "fixture");
    const b = await service.login("state-b@example.invalid", "fixture");
    const input = { name: "State A", classId: "sword", factionId: "pirate" } as const;
    const [character, retry] = await Promise.all([
      service.createCharacter(a.token, input), service.createCharacter(a.token, input),
    ]);
    assert.equal(character.id, retry.id);
    const server = createHttpServer({ isReady: async () => true,
      handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 3600 }) });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const path = `/v1/characters/${character.id}/state`;
    const get = (suffix = path, token = a.token) => fetch(base + suffix, {
      headers: token ? { cookie: `__Host-mare_session=${token}` } : {},
    });
    try {
      const first = await get();
      assert.equal(first.status, 200, "state endpoint must exist for the authenticated owner");
      assert.equal(first.headers.get("cache-control"), "no-store");
      const initial = { characterId: character.id, version: 0, level: 1, experience: "0", gold: "0" };
      assert.deepEqual(await first.json(), initial);
      const reads = await Promise.all(Array.from({ length: 3 }, () => get()));
      for (const response of reads) assert.deepEqual(await response.json(), initial);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_progression")).rows[0].n, 1);
      assert.equal((await get(path, "")).status, 401);
      const flow = await service.startFlow("recovery", "state-a@example.invalid", undefined, "fixture-binding");
      const recovery = await service.callback(flow.token, "fixture-binding", "fixture-code");
      assert.equal((await get(path, recovery.token)).status, 401, "recovery session cannot access gameplay state");
      const cross = await get(path, b.token);
      const absent = await get(`/v1/characters/${randomUUID()}/state`, b.token);
      assert.equal(cross.status, 404);
      assert.equal(absent.status, 404);
      assert.deepEqual(await cross.json(), await absent.json());
      for (const field of ["accountId", "ownerId", "characterId", "experience", "gold", "version"]) {
        assert.equal((await get(path + `?${field}=999`)).status, 400);
      }
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await fetch(base + path, { method, headers: {
          cookie: `__Host-mare_session=${a.token}`, origin: "https://localhost:9443",
          "x-csrf-token": vault.csrf(a.token), "content-type": "application/json",
        }, body: JSON.stringify({ accountId: "forged", gold: 999, experience: 999 }) });
        assert.equal(response.status, 405);
        assert.equal(response.headers.get("allow"), "GET");
      }
      assert.deepEqual(await (await get()).json(), initial);
      // Only the disposable database owner sets this fixture; there is no HTTP write path.
      await pool.query("UPDATE mare_game.character_progression SET experience=$1,gold=$2 WHERE character_id=$3",
        ["9007199254740993", "9223372036854775807", character.id]);
      const stored = { ...initial, experience: "9007199254740993", gold: "9223372036854775807" };
      assert.deepEqual(await (await get()).json(), stored, "BIGINT must not lose precision in JSON");
      await service.createCharacter(a.token, input);
      assert.deepEqual(await (await get()).json(), stored, "retry must never reset existing progression");
      for (const sql of ["UPDATE mare_game.character_progression SET experience=-1",
        "UPDATE mare_game.character_progression SET gold=-1", "UPDATE mare_game.character_progression SET level=0"]) {
        await assert.rejects(pool.query(sql), { code: "23514" });
      }
      await assert.rejects(pool.query("INSERT INTO mare_game.character_progression(character_id) VALUES($1)", [randomUUID()]), { code: "23503" });
      await pool.query("DELETE FROM mare_game.character_progression WHERE character_id=$1", [character.id]);
      assert.equal((await get()).status, 503, "missing persisted state must fail closed");
      await service.createCharacter(a.token, input);
      assert.equal((await get()).status, 503, "creation retry cannot silently reset missing progression");
      await service.logout(a.token, "all");
      assert.equal((await get()).status, 401);
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  }));

test("Phase 2 upgrade backfills clean state once without changing identities or their version", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mare-phase2-prefix-"));
  for (const name of ["0001_foundation.sql", "0002_auth_sessions.sql"])
    await copyFile(new URL(`../../apps/game-server/migrations/${name}`, import.meta.url), join(directory, name));
  await authDatabase(async ({ pool }) => {
    const account = randomUUID(), character = randomUUID();
    await pool.query("INSERT INTO mare_game.accounts(id,provider,subject) VALUES($1,'test','legacy-online')", [account]);
    await pool.query("INSERT INTO mare_game.characters(id,account_id,name,class_id,faction_id,state_version) VALUES($1,$2,'Preserved','healer','marine',7)", [character, account]);
    const before = (await pool.query("SELECT * FROM mare_game.characters")).rows;
    assert.deepEqual(await applyMigrations(pool), ["0003_character_progression.sql", "0004_character_commands.sql", "0005_character_journey.sql", "0006_first_hunt.sql", "0007_first_combat.sql", "0008_repeatable_encounters.sql", "0009_level_progression.sql", "0010_attribute_allocation.sql", "0011_battle_profiles.sql", "0012_inventory_economy.sql", "0013_continuous_play.sql"]);
    assert.deepEqual((await pool.query("SELECT * FROM mare_game.characters")).rows, before);
    assert.deepEqual((await pool.query("SELECT * FROM mare_game.character_progression")).rows,
      [{ character_id: character, level: 1, experience: "0", gold: "0" }]);
    await pool.query("UPDATE mare_game.character_progression SET gold=12");
    assert.deepEqual(await applyMigrations(pool), []);
    assert.equal((await pool.query("SELECT gold FROM mare_game.character_progression")).rows[0].gold, "12");
  }, directory);
});

test("failed progression initialization rolls back the new character in the same transaction", async () =>
  authDatabase(async ({ service, pool, provider }) => {
    const session = await service.login("rollback@example.invalid", "fixture");
    singleUseRefresh(provider);
    await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
    await pool.query("ALTER TABLE mare_game.character_progression ADD CONSTRAINT reject_test_default CHECK(level=99)");
    await assert.rejects(service.createCharacter(session.token,
      { name: "Rollback", classId: "sword", factionId: "pirate" }), { code: "23514" });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.characters")).rows[0].n, 0);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.character_progression")).rows[0].n, 0);
    await assert.doesNotReject(service.me(session.token), "SQL operation failure must preserve the accepted refresh");
    assert.equal(provider.refreshes, 1);
  }));

test("a denied state read preserves a successful single-use provider refresh", async () =>
  authDatabase(async ({ service, pool, provider }) => {
    const login = await service.login("refresh-state@example.invalid", "fixture");
    singleUseRefresh(provider);
    await pool.query("UPDATE mare_game.app_sessions SET provider_valid_until=clock_timestamp()-interval '1 second'");
    await assert.rejects(service.characterState(login.token, randomUUID()), { status: 404 });
    await assert.doesNotReject(service.me(login.token), "a rejected character request must not corrupt the BFF session");
    assert.equal(provider.refreshes, 1, "accepted refresh stays committed despite the rejected gameplay operation");
  }));
