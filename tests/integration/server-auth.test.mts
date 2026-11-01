import assert from "node:assert/strict";
import { test } from "node:test";
import { authDatabase } from "./auth-support.mjs";
import { providerSessionSchema } from "../../apps/game-server/src/auth/provider.js";

test("global logout serializes with an already authorized character operation", async () =>
  authDatabase(async ({ service, pool }) => {
    const a = await service.login("alice@example.invalid", "fixture");
    const b = await service.login("alice@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, {
      name: "Alice",
      classId: "sword",
      factionId: "pirate",
    });
    const blocker = await pool.connect();
    let command: Promise<unknown> | undefined;
    let logout: Promise<unknown> | undefined;
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,1296126533))",
        [character.id],
      );
      command = service.acquireControl(a.token, character.id);
      let blocked = false;
      for (let i = 0; i < 100; i++) {
        blocked =
          (
            await pool.query(
              "SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())",
            )
          ).rowCount! > 0;
        if (blocked) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.ok(
        blocked,
        "character operation reached its serialized write boundary",
      );
      let finished = false;
      logout = service.logout(b.token, "all").then(() => {
        finished = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(
        finished,
        false,
        "logout waits for prior authorized work instead of allowing a write after revocation",
      );
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await Promise.all([command, logout]);
    }
    await assert.rejects(service.me(a.token), { status: 401 });
  }));

test("revocation retry preserves a rotated provider token when logout is temporarily unavailable", async () =>
  authDatabase(async ({ service, pool, provider, vault }) => {
    const login = await service.login("alice@example.invalid", "fixture");
    await service.logout(login.token, "local");
    const row = (
      await pool.query("SELECT * FROM mare_game.provider_revocations")
    ).rows[0];
    const tokens = providerSessionSchema.parse(
      vault.open(row.payload_ciphertext, "revoke:" + row.id),
    );
    tokens.expiresAt = Date.now() - 1000;
    await pool.query(
      "UPDATE mare_game.provider_revocations SET payload_ciphertext=$1 WHERE id=$2",
      [vault.seal(tokens, "revoke:" + row.id), row.id],
    );
    let attempts = 0;
    provider.logout = async () => {
      if (++attempts === 1) throw new Error("temporary outage");
    };
    await service.drainRevocations();
    assert.equal(provider.refreshes, 1);
    await pool.query(
      "UPDATE mare_game.provider_revocations SET retry_at=now()",
    );
    await service.drainRevocations();
    assert.equal(
      provider.refreshes,
      1,
      "retry uses the refreshed credentials already persisted",
    );
    assert.equal(
      (await pool.query("SELECT * FROM mare_game.provider_revocations"))
        .rowCount,
      0,
    );
  }));

test("accounts are provider-derived, characters are unique and another account cannot read or control them", async () =>
  authDatabase(async ({ service, pool }) => {
    const a = await service.login("alice@example.invalid", "fixture");
    const b = await service.login("bob@example.invalid", "fixture");
    const again = await service.login("alice@example.invalid", "fixture");
    assert.equal(
      (await service.me(a.token)).account.id,
      (await service.me(again.token)).account.id,
    );
    const input = {
      name: "Alice",
      classId: "sword" as const,
      factionId: "pirate" as const,
    };
    const chars = await Promise.all([
      service.createCharacter(a.token, input),
      service.createCharacter(again.token, input),
    ]);
    assert.equal(chars[0].id, chars[1].id);
    await assert.rejects(service.character(b.token, chars[0].id), {
      status: 404,
    });
    await assert.rejects(service.acquireControl(b.token, chars[0].id), {
      status: 404,
    });
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM mare_game.characters"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='mare_game' AND table_name<>'character_progression' AND column_name IN ('gold','experience','xp','inventory')",
        )
      ).rows[0].n,
      0,
    );
  }));
test("expired sessions and old cookies fail closed; concurrent rotation has one winner", async () =>
  authDatabase(async ({ service, pool }) => {
    const login = await service.login("alice@example.invalid", "fixture");
    const rotated = await Promise.allSettled([
      service.rotate(login.token),
      service.rotate(login.token),
    ]);
    assert.equal(rotated.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(service.me(login.token), { status: 401 });
    const winner = rotated.find((r) => r.status === "fulfilled");
    assert.ok(winner?.status === "fulfilled");
    await service.me(winner.value.token);
    await pool.query(
      "UPDATE mare_game.app_sessions SET idle_expires_at=now()-interval '1 second'",
    );
    await assert.rejects(service.me(winner.value.token), { status: 401 });
  }));
test("simultaneous tabs and devices cannot both control a character; takeover fences the previous lease", async () =>
  authDatabase(async ({ service }) => {
    const a = await service.login("alice@example.invalid", "fixture"),
      b = await service.login("alice@example.invalid", "fixture");
    const c = await service.createCharacter(a.token, {
      name: "Alice",
      classId: "sword",
      factionId: "pirate",
    });
    const attempts = await Promise.allSettled([
      service.acquireControl(a.token, c.id),
      service.acquireControl(b.token, c.id),
    ]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    const winner = attempts.findIndex((r) => r.status === "fulfilled");
    const result = attempts[winner];
    assert.ok(result?.status === "fulfilled");
    const first = winner === 0 ? a : b,
      other = winner === 0 ? b : a;
    await assert.rejects(service.acquireControl(first.token, c.id), {
      status: 409,
    });
    const second = await service.acquireControl(
      other.token,
      c.id,
      result.value.epoch,
    );
    assert.equal(second.epoch, result.value.epoch + 1);
    await assert.rejects(
      service.renewControl(first.token, c.id, result.value),
      { status: 409 },
    );
    await assert.rejects(
      service.acquireControl(first.token, c.id, result.value.epoch),
      { status: 409 },
    );
    await service.renewControl(other.token, c.id, second);
  }));
test("concurrent refresh across service requests runs once and does not extend absolute validity", async () =>
  authDatabase(async ({ service, pool, provider }) => {
    const a = await service.login("alice@example.invalid", "fixture");
    const before = (
      await pool.query(
        "SELECT expires_at,provider_session_id FROM mare_game.app_sessions",
      )
    ).rows[0];
    await pool.query(
      "UPDATE mare_game.app_sessions SET provider_valid_until=now()-interval '1 second'",
    );
    await Promise.all(Array.from({ length: 8 }, () => service.me(a.token)));
    assert.equal(provider.refreshes, 1);
    assert.deepEqual(
      (await pool.query("SELECT expires_at FROM mare_game.app_sessions"))
        .rows[0].expires_at,
      before.expires_at,
    );
    provider.unavailable = true;
    await pool.query(
      "UPDATE mare_game.app_sessions SET provider_valid_until=now()-interval '1 second'",
    );
    await assert.rejects(service.me(a.token), { status: 503 });
  }));
test("local logout leaves other devices active; global logout revokes all and drains provider revocations", async () =>
  authDatabase(async ({ service, provider }) => {
    const a = await service.login("alice@example.invalid", "fixture"),
      b = await service.login("alice@example.invalid", "fixture");
    await service.logout(a.token, "local");
    await assert.rejects(service.me(a.token), { status: 401 });
    await service.me(b.token);
    const c = await service.login("alice@example.invalid", "fixture");
    await service.logout(b.token, "all");
    await assert.rejects(service.me(c.token), { status: 401 });
    await service.drainRevocations();
    assert.equal(provider.logouts, 2);
  }));
test("recovery is browser-bound, single-use and cannot authorize gameplay; reset revokes old sessions", async () =>
  authDatabase(async ({ service, provider }) => {
    const before = await service.login("alice@example.invalid", "fixture");
    const flow = await service.startFlow(
      "recovery",
      "alice@example.invalid",
      undefined,
      "browser-binding",
    );
    await assert.rejects(
      service.callback(flow.token, "wrong-browser", "code"),
      { status: 400 },
    );
    const recovered = await service.callback(
      flow.token,
      "browser-binding",
      "code",
    );
    await assert.rejects(
      service.callback(flow.token, "browser-binding", "code"),
      { status: 400 },
    );
    await assert.rejects(service.me(recovered.token), { status: 401 });
    await service.reset(recovered.token, "New safe fixture password");
    assert.equal(provider.resets, 1);
    await assert.rejects(service.me(before.token), { status: 401 });
    await assert.rejects(service.me(recovered.token), { status: 401 });
  }));
test("global revocation occurring during provider refresh prevents the pending authorization from succeeding", async () =>
  authDatabase(async ({ service, pool, provider }) => {
    const login = await service.login("alice@example.invalid", "fixture");
    const refresh = provider.refresh.bind(provider);
    provider.refresh = async (token) => {
      await pool.query("UPDATE mare_game.accounts SET auth_epoch=auth_epoch+1");
      return refresh(token);
    };
    await pool.query(
      "UPDATE mare_game.app_sessions SET provider_valid_until=now()-interval '1 second'",
    );
    await assert.rejects(service.me(login.token), { status: 401 });
  }));
