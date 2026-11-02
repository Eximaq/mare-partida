import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localEnvironment,
  stopRequestMatches,
} from "../../tools/local-server-policy.mjs";
test("continuous runtime keeps credentials separated, fixes loopback/origin/policy and enables auth only in the child", () => {
  const source = {
    DATABASE_URL:
      "postgresql://runtime:fixture@127.0.0.1:55432/mare_local_alpha",
    SUPABASE_URL: "https://dev.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture_local_only",
    AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    AUTH_ENABLED: "false",
    AUTH_PUBLIC_ORIGIN: "https://localhost:9443",
    SUPABASE_JWT_ALGORITHM: "ES256",
    SESSION_ABSOLUTE_SECONDS: "86400",
    SESSION_IDLE_SECONDS: "7200",
    PROVIDER_RECHECK_SECONDS: "900",
  };
  const env = localEnvironment(source, {
    PATH: "fixture-path",
    MIGRATION_DATABASE_URL: "must-not-inherit",
    TEST_DATABASE_URL: "must-not-inherit",
    AUTH_ENABLED: "false",
  });
  assert.equal(env.AUTH_ENABLED, "true");
  assert.equal(source.AUTH_ENABLED, "false");
  assert.equal(env.HOST, "127.0.0.1");
  assert.equal(env.PORT, "8788");
  assert.equal(env.NODE_ENV, "development");
  assert.equal(env.MIGRATION_DATABASE_URL, undefined);
  assert.equal(env.TEST_DATABASE_URL, undefined);
  for (const patch of [
    { DATABASE_URL: source.DATABASE_URL.replace("127.0.0.1", "example.com") },
    {
      DATABASE_URL: source.DATABASE_URL.replace("mare_local_alpha", "postgres"),
    },
    { AUTH_PUBLIC_ORIGIN: "https://elsewhere.invalid" },
    { SUPABASE_JWT_ALGORITHM: "HS256" },
    { SESSION_IDLE_SECONDS: "86400" },
  ])
    assert.throws(() => localEnvironment({ ...source, ...patch }, {}));
});
test("stop requests target only their installation instance and never an arbitrary process ID", () => {
  assert.equal(
    stopRequestMatches({ instance: "abc" }, { instance: "abc", pid: 123 }),
    true,
  );
  for (const value of [null, {}, { instance: "old" }, { pid: 123 }])
    assert.equal(
      stopRequestMatches(value, { instance: "abc", pid: 123 }),
      false,
    );
});
