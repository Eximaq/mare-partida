import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { once } from "node:events";
import { authDatabase } from "./auth-support.mjs";
test("private Windows parent IPC shuts down the actual API gracefully while PostgreSQL and characters persist", async () =>
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
        AUTH_ENABLED: "false",
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const exit = once(child, "exit");
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
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
