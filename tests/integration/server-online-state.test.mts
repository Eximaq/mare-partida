import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";

test("online state reports the ledger milestone, never infers it from version, and restricts reads to the owner", async () =>
  authDatabase(async ({ service, pool, vault }) => {
    const a = await service.login("online-a@example.invalid", "fixture");
    const b = await service.login("online-b@example.invalid", "fixture");
    const character = await service.createCharacter(a.token, { name: "Online", classId: "sword", factionId: "pirate" });
    await pool.query("UPDATE mare_game.characters SET state_version=7");
    const server = createHttpServer({ isReady: async () => true,
      handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 3600 }) });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const path = `/v1/characters/${character.id}/online-state`;
    const get = (token = a.token, url = path) => fetch(base + url, { headers: { cookie: `__Host-mare_session=${token}` } });
    try {
      const response = await get(); assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const initial = await response.json();
      assert.equal(initial.hunt.status,"locked");
      assert.deepEqual({state:initial.state,journey:initial.journey}, { state: { characterId: character.id, version: 7, level: 1, experience: "0", gold: "0" }, journey: { started: false } });
      for (const extra of ["ownerId", "accountId", "characterId", "gold"])
        assert.equal((await get(a.token, path + `?${extra}=forged`)).status, 400);
      const cross = await get(b.token), absent = await get(b.token, `/v1/characters/${randomUUID()}/online-state`);
      assert.equal(cross.status, 404); assert.equal(absent.status, 404); assert.deepEqual(await cross.json(), await absent.json());
      for (const method of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await fetch(base + path, { method })).status, 405);
      const control = await service.acquireControl(a.token, character.id);
      await service.command(a.token, character.id, { requestId: randomUUID(), action: "journey.begin", expectedVersion: 7,
        control: { epoch: control.epoch, token: control.token }, payload: {} });
      const started = await (await get()).json(); assert.equal(started.journey.started, true); assert.equal(started.state.version, 8);
      const flow = await service.startFlow("recovery", "online-a@example.invalid", undefined, "fixture");
      const recovery = await service.callback(flow.token, "fixture", "fixture-code");
      assert.equal((await get(recovery.token)).status, 401);
      await service.logout(a.token, "all"); assert.equal((await get()).status, 401);
    } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
  }));
