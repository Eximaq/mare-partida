import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { applyMigrations } from "../../apps/game-server/src/db/migrations.js";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { Vault } from "../../apps/game-server/src/auth/vault.js";
import type {
  AuthProvider,
  ProviderSession,
} from "../../apps/game-server/src/auth/provider.js";

export class FakeProvider implements AuthProvider {
  refreshes = 0;
  resets = 0;
  logouts = 0;
  unavailable = false;
  users = new Map<string, { subject: string; sessionId: string }>();
  sessions = new Map<string, ProviderSession>();
  async login(email: string, _password: string): Promise<ProviderSession> {
    let user = this.users.get(email);
    if (!user) {
      user = { subject: randomUUID(), sessionId: randomUUID() };
      this.users.set(email, user);
    }
    const session = {
      provider: "test-provider",
      subject: user.subject,
      providerSessionId: randomUUID(),
      accessToken: "access-fixture",
      refreshToken: "fixture-" + randomUUID(),
      expiresAt: Date.now() + 60000,
    };
    this.sessions.set(session.refreshToken, session);
    return session;
  }
  async refresh(token: string) {
    this.refreshes++;
    if (this.unavailable) throw new Error("unavailable");
    await new Promise((resolve) => setTimeout(resolve, 30));
    const session = this.sessions.get(token);
    assert.ok(session, "Known fixture refresh token");
    return {
      ...session,
      expiresAt: Date.now() + 60000,
    };
  }
  async start(
    _kind: "signup" | "recovery",
    email: string,
    _password: string | undefined,
    _redirect: string,
  ) {
    return { email };
  }
  async exchange(state: Record<string, string>, _code: string) {
    return this.login(state.email!, "");
  }
  async logout(_session: ProviderSession, _scope: "local" | "all") {
    this.logouts++;
  }
  async reset(_session: ProviderSession, _password: string) {
    this.resets++;
  }
}

export async function authDatabase(
  run: (context: {
    pool: pg.Pool;
    service: AuthService;
    provider: FakeProvider;
    vault: Vault;
  }) => Promise<void>,
  migrationsDirectory?: string,
) {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Configure isolated loopback PostgreSQL",
  );
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  const admin = new pg.Pool({ connectionString: url.toString(), max: 1 });
  const name = "mare_test_" + randomUUID().replaceAll("-", "");
  let created = false;
  let pool: pg.Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    url.pathname = "/" + name;
    pool = new pg.Pool({ connectionString: url.toString(), max: 12 });
    await applyMigrations(pool, migrationsDirectory);
    const provider = new FakeProvider(),
      vault = new Vault(Buffer.alloc(32, 9));
    const service = new AuthService({
      pool,
      provider,
      vault,
      policy: { absoluteMs: 3600000, idleMs: 300000, recheckMs: 60000 },
      origin: "https://localhost:9443",
    });
    await run({ pool, provider, vault, service });
  } finally {
    await pool?.end();
    if (created) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
}

// Migration fixture only: seed a previously committed 3G hunt before the level tables exist.
export async function seedPreLevelHuntReward(pool:pg.Pool,characterId:string) {
  assert.match(new URL(pool.options.connectionString!).pathname,/^\/mare_test_[a-f0-9]{32}$/);
  const requestId=randomUUID();
  await pool.query("INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,repeat('a',64),'{}')",[characterId,requestId]);
  await pool.query("INSERT INTO mare_game.character_hunt_rewards(character_id,request_id,version_before,experience_before,gold_before) VALUES($1,$2,2,0,0)",[characterId,requestId]);
  await pool.query("UPDATE mare_game.character_progression SET experience=20,gold=8 WHERE character_id=$1",[characterId]);
  await pool.query("UPDATE mare_game.characters SET state_version=3 WHERE id=$1",[characterId]);
}
