import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { authDatabase } from "./auth-support.mjs";
import { pgArchive } from "../../tools/pg-archive.mjs";
import { isDatabaseReady } from "../../apps/game-server/src/db/migrations.js";
test("native archive restores every table and command receipt into a separate disposable database", async () =>
  authDatabase(async ({ pool, service }) => {
    const session = await service.login("archive@example.invalid", "fixture");
    const c = await service.createCharacter(session.token, {
        name: "Archive",
        classId: "sword",
        factionId: "pirate",
      }),
      lease = await service.acquireControl(session.token, c.id);
    const command = {
      requestId: randomUUID(),
      action: "journey.begin" as const,
      payload: {},
      expectedVersion: 0,
      control: { epoch: lease.epoch, token: lease.token },
    };
    const receipt = await service.command(session.token, c.id, command);
    const source = pool.options.connectionString!,
      url = new URL(source),
      name = "mare_restore_" + randomUUID().replaceAll("-", "");
    assert.match(url.pathname, /^\/mare_test_[a-f0-9]{32}$/);
    const file = join(
      await mkdtemp(join(tmpdir(), "mare-archive-")),
      "fixture.dump",
    );
    await pgArchive("dump", source, file);
    const tables = (
      await pool.query(
        "SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('mare_game','mare_meta') ORDER BY 1,2",
      )
    ).rows;
    await pool.query(`CREATE DATABASE "${name}"`);
    url.pathname = "/" + name;
    const restored = new pg.Pool({ connectionString: url.toString() });
    try {
      await pgArchive("restore", url.toString(), file);
      assert.equal(await isDatabaseReady(restored), true);
      for (const t of tables) {
        const sql = `SELECT to_jsonb(t) row FROM "${t.schemaname}"."${t.tablename}" t ORDER BY to_jsonb(t)::text`;
        assert.deepEqual(
          (await restored.query(sql)).rows,
          (await pool.query(sql)).rows,
        );
      }
      assert.deepEqual(
        (
          await restored.query(
            "SELECT result FROM mare_game.character_commands WHERE character_id=$1 AND request_id=$2",
            [c.id, command.requestId],
          )
        ).rows[0].result,
        receipt,
      );
    } finally {
      await restored.end();
      await pool.query(`DROP DATABASE "${name}"`);
    }
  }));
