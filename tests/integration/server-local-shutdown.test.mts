import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { once } from "node:events";
import { authDatabase } from "./auth-support.mjs";
for(const auth of [false,true])test(`private parent IPC shuts down actual API and workers with auth=${auth} while PostgreSQL persists`, async () =>
  authDatabase(async ({ pool, service }) => {
    const login = await service.login("shutdown@example.invalid", "fixture");
    const c = await service.createCharacter(login.token, {
      name: "Shutdown",
      classId: "sword",
      factionId: "pirate",
    });
    const reserve = createServer();
    reserve.listen(0, "127.0.0.1");
    await once(reserve, "listening");
    const port = (reserve.address() as AddressInfo).port;
    await new Promise<void>((r) => reserve.close(() => r()));
    const child = fork("apps/game-server/dist/main.js", [], {
      env: {
        PATH: process.env.PATH!,
        SystemRoot: process.env.SystemRoot ?? "",
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: String(port),
        DATABASE_URL: pool.options.connectionString!,
        AUTH_ENABLED: String(auth),
        AUTH_PUBLIC_ORIGIN:'https://localhost:9443',SUPABASE_URL:'https://fixture-not-hosted.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_no_network',AUTH_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64'),SESSION_ABSOLUTE_SECONDS:'86400',SESSION_IDLE_SECONDS:'7200',PROVIDER_RECHECK_SECONDS:'900',
        SIMULATION_SOLO_WORKERS:'1',SIMULATION_PARTY_WORKERS:'1',
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const exit = once(child, "exit");
    try {
      let ready = false;
      for (let i = 0; i < (auth?600:100); i++) {
        try {
          ready = (
            await fetch(`http://127.0.0.1:${port}/health/ready`, {
              signal: AbortSignal.timeout(500),
            })
          ).ok;
        } catch {}
        if (ready) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.ok(ready, "Actual API must become ready");
      child.send("local-stop");
      const timeout = setTimeout(() => child.kill(), 12000);
      const [code] = await exit;
      clearTimeout(timeout);
      assert.equal(code, 0, "Graceful close must not require termination");
      assert.equal(
        (
          await pool.query("SELECT id FROM mare_game.characters WHERE id=$1", [
            c.id,
          ])
        ).rowCount,
        1,
      );
      await assert.rejects(
        fetch(`http://127.0.0.1:${port}/health/ready`, {
          signal: AbortSignal.timeout(500),
        }),
      );
    } finally {
      if (child.exitCode === null) child.kill();
    }
  }));
