import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { SupabaseProvider } from "../../apps/game-server/src/auth/supabase.js";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { createAuthHandler } from "../../apps/game-server/src/auth/routes.js";
import { createHttpServer } from "../../apps/game-server/src/http.js";
import { authDatabase } from "./auth-support.mjs";

// The provider is a loopback simulator, never hosted Supabase. Exercise the real
// adapter, transport deadline, HTTP boundary and disposable PostgreSQL migrations.
for (const loseReply of [false, true]) {
  test(`reset ${loseReply ? "commits remotely but loses its reply" : "returns normally"}: revoke, reject replay and reconcile login`, async () => {
    const keys = await generateKeyPair("ES256");
    const jwk = { ...(await exportJWK(keys.publicKey)), kid: "reset-fixture", alg: "ES256" };
    const subject = randomUUID(), otherSubject = randomUUID();
    const oldPassword = "Old fixture password only", newPassword = "New fixture password only";
    let password = oldPassword, origin = "", challenge = "";
    let sends = 0, resets = 0, exchanges = 0, logouts = 0;
    const sessions = new Map<string, { subject: string; sid: string; revoked: boolean }>();
    const access = new Map<string, string>();
    const faults: unknown[] = [];
    const issue = async (sub: string) => {
      const sid = randomUUID(), refresh = "fixture-" + randomUUID();
      const token = await new SignJWT({ session_id: sid, role: "authenticated" })
        .setProtectedHeader({ alg: "ES256", kid: jwk.kid }).setSubject(sub)
        .setIssuer(origin + "/auth/v1").setAudience("authenticated")
        .setIssuedAt().setExpirationTime("15m").sign(keys.privateKey);
      sessions.set(refresh, { subject: sub, sid, revoked: false });
      access.set(token, refresh);
      return { access_token: token, refresh_token: refresh, expires_in: 900,
        token_type: "bearer", user: { id: sub, email_confirmed_at: new Date().toISOString() } };
    };
    const remote = createServer((req, res) => {
      void (async () => {
        res.setHeader("content-type", "application/json");
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const input = raw ? JSON.parse(raw) : {};
        const url = new URL(req.url!, "http://localhost");
        const reply = (status: number, value: unknown) => res.writeHead(status).end(JSON.stringify(value));
        const refresh = access.get((req.headers.authorization ?? "").replace(/^Bearer /, ""));
        const actor = refresh ? sessions.get(refresh) : undefined;
        if (url.pathname.endsWith("/jwks.json")) return reply(200, { keys: [jwk] });
        if (url.pathname === "/auth/v1/recover") {
          sends++;
          challenge = input.code_challenge;
          assert.equal(input.code_challenge_method, "s256");
          return reply(200, {});
        }
        if (url.pathname === "/auth/v1/token") {
          if (url.searchParams.get("grant_type") === "pkce") {
            exchanges++;
            assert.equal(exchanges, 1);
            assert.equal(createHash("sha256").update(input.code_verifier).digest("base64url"), challenge);
            return reply(200, await issue(subject));
          }
          if (url.searchParams.get("grant_type") === "refresh_token") {
            const previous = sessions.get(input.refresh_token);
            if (!previous || previous.revoked) return reply(400, { message: "fixture revoked" });
            return reply(200, await issue(previous.subject));
          }
          const sub = input.email === "other@example.invalid" ? otherSubject : subject;
          if (input.password !== (sub === subject ? password : oldPassword))
            return reply(400, { message: "fixture invalid credentials" });
          return reply(200, await issue(sub));
        }
        if (!actor || actor.revoked) return reply(401, { message: "fixture unauthorized" });
        if (url.pathname === "/auth/v1/user" && req.method === "GET")
          return reply(200, { id: actor.subject, email_confirmed_at: new Date().toISOString() });
        if (url.pathname === "/auth/v1/user" && req.method === "PUT") {
          resets++;
          assert.equal(actor.subject, subject);
          password = input.password; // Simulated remote commit precedes the lost reply.
          if (loseReply) return; // Let the real adapter's unchanged 4s timeout fire.
          return reply(200, { id: subject });
        }
        if (url.pathname === "/auth/v1/logout") {
          logouts++;
          for (const s of sessions.values()) {
            if (s.subject === actor.subject && (url.searchParams.get("scope") === "global" || s.sid === actor.sid))
              s.revoked = true;
          }
          return res.writeHead(204).end();
        }
        return reply(404, {});
      })().catch(error => { faults.push(error); res.writeHead(500).end("{}"); });
    });
    let http: Server | undefined;
    try {
      remote.listen(0, "127.0.0.1"); await once(remote, "listening");
      origin = `http://127.0.0.1:${(remote.address() as AddressInfo).port}`;
      const provider = new SupabaseProvider({ url: origin, publishableKey: "fixture", algorithm: "ES256" });
      await authDatabase(async ({ pool, vault }) => {
        const service = new AuthService({ pool, vault, provider, origin: "https://localhost:9443",
          policy: { absoluteMs: 86400000, idleMs: 7200000, recheckMs: 900000 } });
        const first = await service.login("test@example.invalid", oldPassword);
        const second = await service.login("test@example.invalid", oldPassword);
        const other = await service.login("other@example.invalid", oldPassword);
        const oldRefreshes = [...sessions.keys()].filter(k => sessions.get(k)!.subject === subject);
        const flow = await service.startFlow("recovery", "test@example.invalid", undefined, "browser");
        const recovery = await service.callback(flow.token, "browser", "fixture-code");
        await assert.rejects(service.me(recovery.token), { status: 401 });
        http = createHttpServer({ isReady: async () => true,
          handle: createAuthHandler({ service, vault, origin: "https://localhost:9443", cookieSeconds: 86400 }) });
        http.listen(0, "127.0.0.1"); await once(http, "listening");
        const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
        const cookie = "__Host-mare_session=" + recovery.token;
        const csrfResponse = await fetch(base + "/v1/auth/csrf", { headers: { cookie } });
        const csrf = (await csrfResponse.json()).csrfToken;
        const reset = () => fetch(base + "/v1/auth/reset", { method: "POST",
          headers: { cookie, origin: "https://localhost:9443", "content-type": "application/json", "x-csrf-token": csrf },
          body: JSON.stringify({ password: newPassword }) });
        const start = Date.now(), result = await reset();
        const elapsed = Date.now() - start;
        assert.equal(result.status, loseReply ? 503 : 200);
        assert.deepEqual(await result.json(), loseReply ? { error: "password_reset_unconfirmed" } : { reset: true });
        assert.ok(result.headers.getSetCookie().some(c => c.startsWith("__Host-mare_session=;") && c.includes("Max-Age=0")));
        if (loseReply) assert.ok(elapsed >= 3500 && elapsed < 10000, "real transport deadline, bounded outcome");
        assert.equal(password, newPassword);
        assert.equal(resets, 1);
        assert.equal(sends, 1);
        for (const s of [first, second, recovery]) await assert.rejects(service.me(s.token), { status: 401 });
        await service.me(other.token);
        assert.equal((await reset()).status, 401);
        assert.equal(resets, 1, "recovery replay must not change the password again");
        assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.provider_revocations")).rows[0].n, 1);
        await service.drainRevocations();
        assert.equal(logouts, 1);
        assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.provider_revocations")).rows[0].n, 0);
        for (const token of oldRefreshes) await assert.rejects(provider.refresh(token), { status: 401 });
        await assert.rejects(service.login("test@example.invalid", oldPassword), { status: 401 });
        const reconciled = await service.login("test@example.invalid", newPassword);
        await service.me(reconciled.token);
        await service.me(other.token);
        await service.logout(reconciled.token, "local"); await service.drainRevocations();
        await assert.rejects(service.me(reconciled.token), { status: 401 });
        assert.equal(sends, 1);
        assert.equal(exchanges, 1);
        assert.deepEqual(faults, []);
      });
    } finally {
      for (const server of [http, remote]) {
        if (!server) continue;
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
      }
    }
  });
}
