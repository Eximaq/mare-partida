import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import {
  characterCreateSchema,
  loginSchema,
  controlSchema,
} from "../../packages/shared/src/schemas/auth.js";
import { Vault, equal } from "../../apps/game-server/src/auth/vault.js";
import { readAuthConfig } from "../../apps/game-server/src/auth/config.js";

test("development template keeps Auth disabled and applies the approved 24h/2h BFF policy", () => {
  const example = parseEnv(
    readFileSync(new URL("../../.env.example", import.meta.url), "utf8"),
  );
  assert.equal(readAuthConfig(example), undefined);
  const enabled = readAuthConfig({
    ...example,
    AUTH_ENABLED: "true",
    SUPABASE_URL: "https://exampledev.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  });
  assert.deepEqual(enabled?.policy, {
    absoluteMs: 86400000,
    idleMs: 7200000,
    recheckMs: 900000,
  });
});
test("identity/economy overposting and unsafe character names cannot cross the online boundary", () => {
  const valid = { name: "Capitão Maré", classId: "sword", factionId: "pirate" };
  assert.deepEqual(characterCreateSchema.parse(valid), valid);
  for (const extra of [
    { accountId: "forged" },
    { ownerId: "forged" },
    { gold: 100 },
    { xp: 900 },
    { attributes: {} },
    { save: {} },
  ])
    assert.equal(
      characterCreateSchema.safeParse({ ...valid, ...extra }).success,
      false,
    );
  for (const name of [
    "",
    "x".repeat(41),
    "<script>",
    "Captain\u202eX",
    "Captain\nX",
  ])
    assert.equal(
      characterCreateSchema.safeParse({ ...valid, name }).success,
      false,
    );
  assert.equal(
    characterCreateSchema.safeParse({ ...valid, classId: "admin" }).success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: "invalid", password: "a long password" })
      .success,
    false,
  );
  assert.equal(
    controlSchema.safeParse({ expectedEpoch: Number.MAX_SAFE_INTEGER + 1 })
      .success,
    false,
  );
});
test("encrypted provider credentials are bound to their record and tampering fails closed", () => {
  assert.equal(equal("é", "a"), false);
  const vault = new Vault(Buffer.alloc(32, 7));
  const sealed = vault.seal({ refresh: "private-fixture" }, "session-A");
  assert.ok(!sealed.includes("private-fixture"));
  assert.deepEqual(vault.open(sealed, "session-A"), {
    refresh: "private-fixture",
  });
  assert.throws(() => vault.open(sealed, "session-B"));
  assert.throws(() => vault.open(sealed.slice(0, -5) + "AAAAA", "session-A"));
  const pre = vault.preauth(1000);
  assert.ok(vault.validPreauth(pre, 1001));
  assert.equal(vault.validPreauth(pre, 1000 + 600001), false);
  assert.equal(vault.validPreauth(pre + "x", 1001), false);
  assert.notEqual(vault.csrf("A"), vault.csrf("B"));
});
test("auth stays off without opt-in and refuses insecure origins, secret provider keys and missing TTL policy", () => {
  assert.equal(readAuthConfig({}), undefined);
  const base = {
    AUTH_ENABLED: "true",
    AUTH_PUBLIC_ORIGIN: "https://localhost:9443",
    SUPABASE_URL: "https://exampledev.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    SESSION_ABSOLUTE_SECONDS: "604800",
    SESSION_IDLE_SECONDS: "86400",
    PROVIDER_RECHECK_SECONDS: "900",
  };
  assert.equal(readAuthConfig(base)?.origin, base.AUTH_PUBLIC_ORIGIN);
  for (const bad of [
    { AUTH_PUBLIC_ORIGIN: "http://localhost:9443" },
    { AUTH_PUBLIC_ORIGIN: "https://user:secret@localhost:9443" },
    { SUPABASE_PUBLISHABLE_KEY: "sb_secret_private" },
    { SESSION_IDLE_SECONDS: "604801" },
    { SESSION_ABSOLUTE_SECONDS: "" },
    { AUTH_ENCRYPTION_KEY: "not-a-key" },
    { SUPABASE_URL: "https://attacker.invalid" },
  ]) {
    assert.throws(
      () => readAuthConfig({ ...base, ...bad }),
      (error) => error instanceof Error && !error.message.includes("private"),
    );
  }
});
