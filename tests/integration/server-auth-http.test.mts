import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { authDatabase } from "./auth-support.mjs";

test("HTTP requires exact Origin and cookie-bound CSRF, hides secrets and rejects client ownership/economy", async () =>
  authDatabase(async ({ service, vault }) => {
    const origin = "https://localhost:9443";
    const server = createHttpServer({
      isReady: async () => true,
      handle: createAuthHandler({
        service,
        vault,
        origin,
        cookieSeconds: 3600,
      }),
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const context = await fetch(base + "/v1/auth/csrf");
      const csrf = (await context.json()).csrfToken;
      const cookie = context.headers.getSetCookie()[0]!.split(";")[0]!;
      const post = (
        path: string,
        body: unknown,
        headers: Record<string, string> = {},
      ) =>
        fetch(base + path, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin,
            cookie,
            "x-csrf-token": csrf,
            ...headers,
          },
          body: JSON.stringify(body),
        });
      const credentials = {
        email: "alice@example.invalid",
        password: "Long safe fixture password",
      };
      assert.equal(
        (
          await post("/v1/auth/login", credentials, {
            origin: "https://attacker.invalid",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await post("/v1/auth/login", credentials, {
            "x-csrf-token": "forged",
          })
        ).status,
        403,
      );
      assert.equal(
        (await post("/v1/auth/login", { ...credentials, accountId: "admin" }))
          .status,
        400,
      );
      assert.equal(
        (
          await post("/v1/auth/login", {
            ...credentials,
            password: "x".repeat(9000),
          })
        ).status,
        413,
      );
      const login = await post("/v1/auth/login", credentials);
      assert.equal(login.status, 200);
      const headers = login.headers.getSetCookie();
      const session = headers.find((c) =>
        c.startsWith("__Host-mare_session="),
      )!;
      assert.match(session, /; Secure; HttpOnly; SameSite=Lax; Path=\//);
      assert.ok(!session.includes("Domain="));
      const body = await login.text();
      assert.ok(
        !body.includes("access-fixture") &&
          !body.includes("refresh") &&
          !body.includes("token"),
      );
      const sessionCookie = session.split(";")[0]!;
      assert.equal((await fetch(base + "/v1/me")).status, 401);
      assert.equal(
        (
          await post(
            "/v1/characters",
            { name: "Alice", classId: "sword", factionId: "pirate" },
            { cookie: sessionCookie },
          )
        ).status,
        403,
      );
      const sessionContext = await fetch(base + "/v1/auth/csrf", {
        headers: { cookie: sessionCookie },
      });
      const sessionCsrf = (await sessionContext.json()).csrfToken;
      const authHeaders = {
        cookie: sessionCookie,
        "x-csrf-token": sessionCsrf,
      };
      assert.equal(
        (
          await post(
            "/v1/characters",
            { name: "Alice", classId: "sword", factionId: "pirate", gold: 999 },
            authHeaders,
          )
        ).status,
        400,
      );
      const created = await post(
        "/v1/characters",
        { name: "Alice", classId: "sword", factionId: "pirate" },
        authHeaders,
      );
      assert.equal(created.status, 201);
      const character = await created.json();
      assert.ok(character.id);
      const out = await post(
        "/v1/auth/logout",
        { scope: "local" },
        authHeaders,
      );
      assert.equal(out.status, 204);
      assert.equal(
        (await fetch(base + "/v1/me", { headers: { cookie: sessionCookie } }))
          .status,
        401,
      );
      for (const route of ["/api/save", "/v1/economy", "/.env", "/ws"])
        assert.equal((await fetch(base + route)).status, 404);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }));
test("signup/recovery replies do not reveal provider account existence and rate limits apply before repeated sends", async () =>
  authDatabase(async ({ service, vault, provider }) => {
    const origin = "https://localhost:9443";
    const server = createHttpServer({
      isReady: async () => true,
      handle: createAuthHandler({
        service,
        vault,
        origin,
        cookieSeconds: 3600,
      }),
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const context = await fetch(base + "/v1/auth/csrf");
      const csrf = (await context.json()).csrfToken;
      const cookie = context.headers.getSetCookie()[0]!.split(";")[0]!;
      const post = () =>
        fetch(base + "/v1/auth/recover", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin,
            cookie,
            "x-csrf-token": csrf,
          },
          body: JSON.stringify({ email: "alice@example.invalid" }),
        });
      const known = await post();
      const knownBody = await known.text();
      assert.equal(known.status, 202);
      provider.start = async () => {
        throw new Error("private-account-detail");
      };
      const unknown = await post();
      assert.equal(unknown.status, 202);
      assert.equal(await unknown.text(), knownBody);
      await post();
      assert.equal((await post()).status, 429);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }));
