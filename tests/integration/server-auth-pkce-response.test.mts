import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { SupabaseProvider } from "../../apps/game-server/src/auth/supabase.js";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { authDatabase } from "./auth-support.mjs";

// Real SDK, service, crypto and disposable PostgreSQL; only the external
// provider is replaced. These tests send no email and use no hosted accounts.
for (const kind of ["signup", "recovery"] as const) {
  test(`${kind}: a lost provider reply preserves browser-bound PKCE without sending twice`, async (t) => {
    const keys = await generateKeyPair("ES256");
    const jwk = { ...(await exportJWK(keys.publicKey)), kid: "fixture", alg: "ES256" };
    const subject = randomUUID(), sid = randomUUID();
    let origin = "", challenge = "";
    let sends = 0, exchanges = 0;
    let rejection = 0;
    const server = createServer((req, res) => {
      void (async () => {
        res.setHeader("Content-Type", "application/json");
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const input = raw ? JSON.parse(raw) : {};
        const path = new URL(req.url!, "http://localhost").pathname;
        if (path === "/auth/v1/signup" || path === "/auth/v1/recover") {
          sends++;
          if (rejection) {
            res.writeHead(rejection).end(JSON.stringify({ message: "fixture rejection" }));
            return;
          }
          challenge = input.code_challenge;
          assert.equal(input.code_challenge_method, "s256");
          // The remote side accepted the challenge, but its response never
          // arrives. Exercise the unchanged real 4-second transport deadline.
          return;
        }
        if (path.endsWith("/jwks.json")) {
          res.end(JSON.stringify({ keys: [jwk] }));
          return;
        }
        if (path === "/auth/v1/user") {
          res.end(JSON.stringify({ id: subject, email_confirmed_at: new Date().toISOString() }));
          return;
        }
        if (path === "/auth/v1/token") {
          exchanges++;
          const matches = typeof input.code_verifier === "string" &&
            createHash("sha256").update(input.code_verifier).digest("base64url") === challenge;
          if (!matches || exchanges !== 1 || input.auth_code !== "fixture-one-use-code") {
            res.writeHead(400).end(JSON.stringify({ message: "invalid flow" }));
            return;
          }
          const jwt = await new SignJWT({ session_id: sid, role: "authenticated" })
            .setProtectedHeader({ alg: "ES256", kid: "fixture" })
            .setSubject(subject).setIssuer(origin + "/auth/v1").setAudience("authenticated")
            .setIssuedAt().setExpirationTime("15m").sign(keys.privateKey);
          res.end(JSON.stringify({ access_token: jwt, refresh_token: "fixture-refresh",
            expires_in: 900, token_type: "bearer",
            user: { id: subject, email_confirmed_at: new Date().toISOString() } }));
          return;
        }
        res.writeHead(404).end("{}");
      })().catch(() => res.writeHead(500).end("{}"));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    t.after(() => { server.closeAllConnections(); server.close(); });
    const provider = new SupabaseProvider({ url: origin, publishableKey: "fixture", algorithm: "ES256" });
    await authDatabase(async ({ pool, vault }) => {
      const service = new AuthService({ pool, vault, provider, origin: "https://localhost:9443",
        policy: { absoluteMs: 86400000, idleMs: 7200000, recheckMs: 900000 } });
      const flow = await service.startFlow(kind, "test@example.invalid", "fixture-password", "original-browser");
      assert.equal(sends, 1, "an ambiguous outcome must never trigger another email request");
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.app_sessions")).rows[0].n, 0);
      await assert.rejects(service.callback(flow.token, "other-browser", "fixture-one-use-code"), { status: 400 });
      assert.equal(exchanges, 0, "wrong binding must not consume the provider code");
      const result = await service.callback(flow.token, "original-browser", "fixture-one-use-code");
      if (kind === "signup") {
        await service.me(result.token);
      } else {
        await assert.rejects(service.me(result.token), { status: 401 });
      }
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.app_sessions")).rows[0].n, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM mare_game.auth_flows")).rows[0].n, 0);
      await assert.rejects(service.callback(flow.token, "original-browser", "fixture-one-use-code"), { status: 400 });
      assert.equal(exchanges, 1, "replay must not reach the provider");
      for (const status of [400, 429]) {
        rejection = status;
        await assert.rejects(provider.start(kind, "test@example.invalid", "fixture-password",
          "https://localhost:9443/v1/auth/callback"), { status: status === 400 ? 401 : 503 });
      }
    });
  });
}
