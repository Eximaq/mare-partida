import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { authDatabase } from "./auth-support.mjs";

test("login, control and journey work with minimum grants, with narrow economic columns and immutable hunt ledgers", async () => {
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
      // Simulate the column privileges already installed by 3F before upgrading.
      await pool.query(`GRANT INSERT (character_id,begin_request_id,last_request_id), UPDATE (player_hp,enemy_hp,phase,turn,next_attack_at,last_request_id) ON mare_game.character_combats TO "${role}";
        GRANT INSERT (character_id,request_id,turn,version_before,player_before,enemy_before,player_damage,enemy_damage) ON mare_game.character_combat_rounds TO "${role}";
        GRANT INSERT (character_id,request_id,version_before,experience_before,gold_before) ON mare_game.character_combat_rewards TO "${role}"`);
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
          "UPDATE mare_game.character_attribute_ledger SET strength=0",
          "DELETE FROM mare_game.character_attribute_ledger",
          "INSERT INTO mare_game.character_attribute_ledger(character_id,request_id,version_before,strength,dexterity,vitality,intelligence,spirit,catalog_id) VALUES(gen_random_uuid(),gen_random_uuid(),0,1,0,0,0,0,'online-attributes-v1')",
          "INSERT INTO mare_game.character_attribute_ledger(character_id,request_id,version_before,strength,dexterity,vitality,intelligence,spirit,occurred_at) VALUES(gen_random_uuid(),gen_random_uuid(),0,1,0,0,0,0,now())",
          "UPDATE mare_game.progression_levels SET required_experience=0",
          "DELETE FROM mare_game.progression_levels",
          "UPDATE mare_game.character_level_ledger SET experience_total=0",
          "DELETE FROM mare_game.character_level_ledger",
          "INSERT INTO mare_game.character_level_ledger(character_id,level,source,experience_total,version_before) VALUES(gen_random_uuid(),2,'migration',80,0)",
          "INSERT INTO mare_game.character_level_ledger(character_id,level,source,experience_total,version_before,occurred_at) VALUES(gen_random_uuid(),2,'migration',80,0,now())",
          "UPDATE mare_game.combat_encounters SET ordinal=2",
          "UPDATE mare_game.combat_encounters SET encounter_id=gen_random_uuid()",
          "SELECT * FROM mare_game.character_combats",
          "UPDATE mare_game.character_combats SET player_hp=30",
          "DELETE FROM mare_game.combat_encounters",
          "UPDATE mare_game.combat_encounters SET started_at=now()",
          "UPDATE mare_game.combat_encounters SET begin_request_id=gen_random_uuid()",
          "UPDATE mare_game.combat_encounters SET catalog_id='forged'",
          "INSERT INTO mare_game.combat_encounters(character_id,begin_request_id,last_request_id,player_hp) VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),30)",
          "UPDATE mare_game.combat_rounds SET player_damage=10",
          "DELETE FROM mare_game.combat_rounds",
          "DELETE FROM mare_game.combat_rewards",
          "UPDATE mare_game.combat_rewards SET gold_before=0",
          "UPDATE mare_game.character_hunts SET begun_at=now()",
          "UPDATE mare_game.character_hunts SET catalog_id='forged'",
          "DELETE FROM mare_game.character_hunts",
          "UPDATE mare_game.character_hunt_rewards SET gold_before=0",
          "DELETE FROM mare_game.character_hunt_rewards",
          "INSERT INTO mare_game.character_hunts(character_id,request_id,version_before,begun_at) VALUES(gen_random_uuid(),gen_random_uuid(),0,now())",
          "INSERT INTO mare_game.character_hunt_rewards(character_id,request_id,version_before,experience_before,gold_before,occurred_at) VALUES(gen_random_uuid(),gen_random_uuid(),0,0,0,now())",
          "DELETE FROM mare_game.character_progression",
          `INSERT INTO mare_game.character_progression(character_id,gold) VALUES('${character.id}',1)`,
          "CREATE SCHEMA forbidden",
          "SELECT * FROM pg_authid",
        ])
          await assert.rejects(runtime.query(sql), { code: "42501" });
        await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"hunt.begin",expectedVersion:1});
        // Only the owner of this disposable test database can advance the fixture timestamp.
        await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds'");
        const reward=await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"hunt.claim",expectedVersion:2});
        assert.equal(reward.state.gold,"8"); assert.equal(reward.state.experience,"20");
        assert.equal((await service.onlineState(login.token,character.id)).hunt.status,"claimed");
        await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"combat.begin",expectedVersion:3});
        await pool.query("UPDATE mare_game.combat_encounters SET enemy_hp=1,next_attack_at=clock_timestamp()-interval '1 second'");
        const won=await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"combat.attack",expectedVersion:4});
        assert.equal(won.combat!.status,"won");
        await pool.query("UPDATE mare_game.character_progression SET experience=50");
        const prize=await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"combat.claim",expectedVersion:5});
        assert.equal(prize.state.gold,"20");assert.equal(prize.state.experience,"80");assert.equal(prize.state.level,2);
        const allocated=await service.command(login.token,character.id,{...command,requestId:randomUUID(),action:"attributes.allocate",expectedVersion:6,payload:{allocation:{strength:2,dexterity:0,vitality:3,intelligence:0,spirit:0}}});
        assert.equal(allocated.attributes!.available,0);assert.equal(allocated.attributes!.spent,5);
        assert.equal((await service.onlineState(login.token,character.id)).attributes.allocated.vitality,3);
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
