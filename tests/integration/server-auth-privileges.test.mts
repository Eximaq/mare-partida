import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { authDatabase } from "./auth-support.mjs";

test("login, control and journey work with minimum grants, without identity or economic UPDATE privileges", async () => {
  const role = "mare_test_role_" + randomUUID().replaceAll("-", "");
  assert.match(role, /^mare_test_role_[a-f0-9]{32}$/);
  const password = randomBytes(32).toString("hex");
  let created = false;
  try {
    await authDatabase(async ({ pool, provider, vault }) => {
      // Generated hex/UUID only; PostgreSQL utility statements do not bind PASSWORD parameters.
      await pool.query(
        `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
      );
      created = true;
      const grants = await readFile(
        new URL("../../infra/postgres/grant-auth.sql", import.meta.url),
        "utf8",
      );
      await pool.query(grants.replaceAll("mare_runtime", `"${role}"`));
      const url = new URL(pool.options.connectionString!);
      url.username = role;
      url.password = password;
      const runtime = new pg.Pool({ connectionString: url.toString(), max: 4 });
      try {
        const service = new AuthService({
          pool: runtime,
          provider,
          vault,
          policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 },
          origin: "https://localhost:9443",
        });
        const login = await service.login("alice@example.invalid", "fixture");
        const character = await service.createCharacter(login.token, {
          name: "Alice",
          classId: "sword",
          factionId: "pirate",
        });
        const control = await service.acquireControl(login.token, character.id);
        assert.deepEqual(await service.characterState(login.token, character.id), {
          characterId: character.id, version: 0, level: 1, experience: "0", gold: "0",
        });
        await service.renewControl(login.token, character.id, control);
        const command = { requestId: randomUUID(), action: "state.sync" as const, expectedVersion: 0,
          control: { epoch: control.epoch, token: control.token }, payload: {} };
        const accepted = await service.command(login.token, character.id, command);
        assert.equal(accepted.state.gold, "0");
        assert.deepEqual(await service.command(login.token, character.id, command), accepted);
        const started = await service.command(login.token, character.id, { ...command, requestId: randomUUID(), action: "journey.begin" });
        assert.equal(started.state.version, 1);
        assert.equal((await runtime.query("SELECT version_after FROM mare_game.character_journey_ledger")).rows[0].version_after, "1");
        const restarted = new AuthService({
          pool: runtime,
          provider,
          vault,
          policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 },
          origin: "https://localhost:9443",
        });
        assert.equal(
          (await restarted.me(login.token)).character?.id,
          character.id,
        );
        assert.equal((await restarted.characterState(login.token, character.id)).gold, "0");
        for (const sql of [
          "UPDATE mare_game.accounts SET subject='forged'",
          "UPDATE mare_game.characters SET name='forged'",
          "UPDATE mare_game.characters SET account_id=gen_random_uuid()",
          "DELETE FROM mare_game.characters",
          "UPDATE mare_game.character_commands SET result='{}'::jsonb",
          "DELETE FROM mare_game.character_commands",
          "UPDATE mare_game.character_journey_ledger SET version_before=2",
          "DELETE FROM mare_game.character_journey_ledger",
          "INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before,occurred_at) VALUES(gen_random_uuid(),gen_random_uuid(),0,now())",
          "INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before,event) VALUES(gen_random_uuid(),gen_random_uuid(),0,'forged')",
          "INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result,created_at) VALUES(gen_random_uuid(),gen_random_uuid(),repeat('a',64),'{}',now())",
          "UPDATE mare_game.character_progression SET gold=1",
          "DELETE FROM mare_game.character_progression",
          `INSERT INTO mare_game.character_progression(character_id,gold) VALUES('${character.id}',1)`,
          "CREATE SCHEMA forbidden",
          "SELECT * FROM pg_authid",
        ])
          await assert.rejects(runtime.query(sql), { code: "42501" });
        await service.logout(login.token, "all");
        await service.drainRevocations();
      } finally {
        await runtime.end();
      }
    });
  } finally {
    if (created) {
      const admin = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        max: 1,
      });
      try {
        await admin.query(`DROP ROLE "${role}"`);
      } finally {
        await admin.end();
      }
    }
  }
});
