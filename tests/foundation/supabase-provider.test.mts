import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { SupabaseProvider } from "../../apps/game-server/src/auth/supabase.js";

test("real Auth SDK adapter validates JWT signature/issuer/audience/expiry and confirmed user; PKCE verifier stays server-side", async (t) => {
  const keys = await generateKeyPair("ES256");
  const jwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: "development-key",
    alg: "ES256",
  };
  const subject = randomUUID(),
    sid = randomUUID();
  let origin = "";
  let mode = "valid";
  let requests = 0;
  let challenge = "";
  let verifier = "";
  const mock = createServer((req, res) => {
    void (async () => {
      requests++;
      res.setHeader("Content-Type", "application/json");
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const input = raw ? JSON.parse(raw) : {};
      if (mode === "limited") {
        res
          .writeHead(429)
          .end(
            JSON.stringify({
              code: "over_request_rate_limit",
              message: "Slow down",
            }),
          );
        return;
      }
      if (req.url?.includes("jwks")) {
        res.end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      if (req.url?.startsWith("/auth/v1/recover")) {
        challenge = input.code_challenge;
        assert.equal(input.code_challenge_method, "s256");
        res.end("{}");
        return;
      }
      if (req.url === "/auth/v1/user") {
        res.end(
          JSON.stringify({
            id: subject,
            email_confirmed_at:
              mode === "unconfirmed" ? null : new Date().toISOString(),
          }),
        );
        return;
      }
      if (req.url?.includes("grant_type=pkce")) verifier = input.code_verifier;
      const token = await new SignJWT({
        session_id: sid,
        role: "authenticated",
      })
        .setProtectedHeader({ alg: "ES256", kid: "development-key" })
        .setSubject(subject)
        .setIssuer(
          mode === "issuer"
            ? "https://other.invalid/auth/v1"
            : origin + "/auth/v1",
        )
        .setAudience(mode === "audience" ? "other" : "authenticated")
        .setIssuedAt()
        .setExpirationTime(mode === "expired" ? "0s" : "15m")
        .sign(keys.privateKey);
      res.end(
        JSON.stringify({
          access_token:
            mode === "signature" ? token.slice(0, -8) + "AAAAAAAA" : token,
          refresh_token: "fixture-refresh",
          expires_in: 900,
          token_type: "bearer",
          user: { id: subject, email_confirmed_at: new Date().toISOString() },
        }),
      );
    })().catch(() => {
      res.writeHead(500).end("{}");
    });
  });
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  origin = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
  t.after(() => {
    mock.closeAllConnections();
    mock.close();
  });
  // Loopback fake provider is injected only in tests; runtime configuration requires Supabase HTTPS.
  const provider = new SupabaseProvider({
    url: origin,
    publishableKey: "test-publishable",
    algorithm: "ES256",
  });
  assert.equal(
    (await provider.login("alice@example.invalid", "fixture")).subject,
    subject,
  );
  for (const invalid of [
    "signature",
    "issuer",
    "audience",
    "expired",
    "unconfirmed",
  ]) {
    mode = invalid;
    await assert.rejects(provider.login("alice@example.invalid", "fixture"), {
      status: 401,
    });
  }
  mode = "valid";
  const state = await provider.start(
    "recovery",
    "alice@example.invalid",
    undefined,
    "https://localhost:9443/v1/auth/callback",
  );
  assert.ok(challenge.length >= 43);
  assert.ok(Object.keys(state).length > 0);
  assert.equal(
    (await provider.exchange(state, "one-use-code")).subject,
    subject,
  );
  assert.ok(verifier.length >= 43);
  assert.notEqual(verifier, challenge);
  mode = "limited";
  await assert.rejects(provider.refresh("fixture-refresh"), { status: 503 });
  await assert.rejects(provider.login("alice@example.invalid", "fixture"), {
    status: 503,
  });
  assert.ok(requests > 5);
});
