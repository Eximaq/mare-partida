import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import {AuthService} from "../../apps/game-server/src/auth/service.js";
import {characterCommandSchema} from "@mare/shared";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),T=require("../../talent-system.js"),A=require("../../character-appearance.js");
import { authDatabase } from "./auth-support.mjs";
import { pgArchive } from "../../tools/pg-archive.mjs";
import { isDatabaseReady } from "../../apps/game-server/src/db/migrations.js";
test("native archive restores every table and command receipt into a separate disposable database", async () =>
  authDatabase(async ({ pool, service, provider, vault }) => {
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
    await pool.query('UPDATE mare_game.character_progression SET gold=100 WHERE character_id=$1',[c.id]);
    await service.command(session.token,c.id,{...command,requestId:randomUUID(),action:'inventory.buy',expectedVersion:1,payload:{itemId:'training-weapon-v1',quantity:1}});
    await service.command(session.token,c.id,{...command,requestId:randomUUID(),action:'equipment.equip',expectedVersion:2,payload:{itemId:'training-weapon-v1'}});

    // Migrate the existing alpha character into every original persistent aggregate.
    const read=()=>service.onlineState(session.token,c.id),
      input=async(action:string,payload:any={})=>characterCommandSchema.parse({...command,requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload}),
      send=async(action:string,payload:any={})=>service.command(session.token,c.id,await input(action,payload));
    await send('items.initialize');await send('world.initialize');await send('battle.start');
    await send('profile.appearance',{appearance:{...A.defaults,hairColor:'blue'}});
    await send('profile.preferences',{hideHeadgear:true,hideItems:true,healThreshold:.8});
    await pool.query('INSERT INTO mare_game.talent_legacy_allowances(character_id,budget) VALUES($1,1)',[c.id]);
    await send('talents.commit',{build:{...T.empty(),nodes:{[T.nodes('sword')[0].id]:1}}});
    const purchase=await input('potions.buy'),purchaseReceipt=await service.command(session.token,c.id,purchase);
    const original=await read();assert(original.profile&&original.talents&&original.battle&&original.world&&original.originalInventory);
    assert.equal(original.talents.spent,1);assert.equal(original.profile.appearance.hairColor,'blue');

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
      // A new process/service reads the restored state and resolves an already committed
      // request without charging again; all immutable receipts remain intact.
      const restarted=new AuthService({pool:restored,provider,vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'});
      assert.deepEqual(await restarted.command(session.token,c.id,purchase),purchaseReceipt);
      const recovered=await restarted.onlineState(session.token,c.id);
      for(const key of ['state','originalInventory','profile','talents','battle','achievements','hierarchy','fruits','haki','prison','dungeons'] as const)assert.deepEqual(recovered[key],original[key],key);
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
