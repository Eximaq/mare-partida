import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { CharacterCreate } from "@mare/shared";
import { AuthFault, unauthorized } from "./errors.js";
import {
  providerSessionSchema,
  type AuthProvider,
  type ProviderSession,
} from "./provider.js";
import { digest, opaque, Vault } from "./vault.js";
import type { SessionPolicy } from "./config.js";
import { initializeCharacterState, readCharacterState } from "../characters/state.js";
type SessionRow = {
  id: string;
  account_id: string;
  account_epoch: string;
  provider_session_id: string;
  token_ciphertext: string;
  kind: "play" | "recovery";
  expires_at: Date;
  idle_expires_at: Date;
  provider_valid_until: Date;
  revoked_at: Date | null;
  now: Date;
};
type Character = {
  id: string;
  name: string;
  classId: string;
  factionId: string;
};
const columns = 'id,name,class_id AS "classId",faction_id AS "factionId"';
export class AuthService {
  constructor(
    private readonly options: {
      pool: Pool;
      provider: AuthProvider;
      vault: Vault;
      policy: SessionPolicy;
      origin: string;
    },
  ) {}
  private async tx<T>(
    run: (client: PoolClient) => Promise<T | AuthFault>,
  ): Promise<T> {
    const client = await this.options.pool.connect();
    let result: T | AuthFault;
    try {
      await client.query("BEGIN");
      await client.query(
        "SET LOCAL lock_timeout='3s'; SET LOCAL idle_in_transaction_session_timeout='10s'",
      );
      result = await run(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (result instanceof AuthFault) throw result;
    return result;
  }
  private tokens(row: SessionRow) {
    return providerSessionSchema.parse(
      this.options.vault.open(row.token_ciphertext, "session:" + row.id),
    );
  }
  private async queue(
    client: PoolClient,
    tokens: ProviderSession,
    scope: "local" | "all",
  ) {
    const id = randomUUID();
    await client.query(
      "INSERT INTO mare_game.provider_revocations(id,payload_ciphertext,scope) VALUES($1,$2,$3)",
      [id, this.options.vault.seal(tokens, "revoke:" + id), scope],
    );
  }
  private async makeSession(
    client: PoolClient,
    tokens: ProviderSession,
    kind: "play" | "recovery",
  ) {
    if (tokens.expiresAt <= Date.now()) return unauthorized();
    await client.query(
      "INSERT INTO mare_game.accounts(id,provider,subject) VALUES($1,$2,$3) ON CONFLICT(provider,subject) DO NOTHING",
      [randomUUID(), tokens.provider, tokens.subject],
    );
    const account = (
      await client.query<{ id: string; auth_epoch: string }>(
        "SELECT id,auth_epoch FROM mare_game.accounts WHERE provider=$1 AND subject=$2 FOR UPDATE",
        [tokens.provider, tokens.subject],
      )
    ).rows[0]!;
    const id = randomUUID(),
      token = opaque();
    const ttl = kind === "recovery" ? 600000 : this.options.policy.absoluteMs;
    await client.query(
      `INSERT INTO mare_game.app_sessions(id,account_id,account_epoch,token_hash,provider_session_id,token_ciphertext,kind,
      expires_at,idle_expires_at,provider_valid_until) VALUES($1,$2,$3,$4,$5,$6,$7,
      clock_timestamp()+$8::bigint*interval '1 millisecond',clock_timestamp()+$9::bigint*interval '1 millisecond',
      LEAST($10::timestamptz,clock_timestamp()+$11::bigint*interval '1 millisecond'))`,
      [
        id,
        account.id,
        account.auth_epoch,
        digest(token),
        tokens.providerSessionId,
        this.options.vault.seal(tokens, "session:" + id),
        kind,
        ttl,
        Math.min(ttl, this.options.policy.idleMs),
        new Date(tokens.expiresAt),
        this.options.policy.recheckMs,
      ],
    );
    return { token, kind };
  }
  private async withSession<T>(
    token: string,
    kind: "play" | "recovery",
    run: (client: PoolClient, row: SessionRow) => Promise<T | AuthFault>,
  ): Promise<T> {
    const outcome = await this.tx<{ ok: true; value: T } | { ok: false; error: unknown }>(async (client) => {
      const row = (
        await client.query<SessionRow>(
          `SELECT s.*,clock_timestamp() AS now FROM mare_game.app_sessions s
        JOIN mare_game.accounts a ON a.id=s.account_id AND a.auth_epoch=s.account_epoch
        WHERE s.token_hash=$1 FOR UPDATE OF s`,
          [digest(token)],
        )
      ).rows[0];
      if (
        !row ||
        row.revoked_at ||
        row.kind !== kind ||
        row.expires_at <= row.now ||
        row.idle_expires_at <= row.now
      )
        return unauthorized();
      if (row.provider_valid_until <= row.now) {
        const previous = this.tokens(row);
        let refreshed: ProviderSession;
        try {
          refreshed = await this.options.provider.refresh(
            previous.refreshToken,
          );
        } catch (error) {
          if (error instanceof AuthFault && error.status === 401) {
            await client.query(
              "UPDATE mare_game.app_sessions SET revoked_at=now() WHERE id=$1",
              [row.id],
            );
            return unauthorized();
          }
          return new AuthFault(503, "authentication_unavailable");
        }
        if (
          refreshed.subject !== previous.subject ||
          refreshed.provider !== previous.provider ||
          refreshed.providerSessionId !== row.provider_session_id ||
          refreshed.expiresAt <= Date.now()
        ) {
          await client.query(
            "UPDATE mare_game.app_sessions SET revoked_at=now() WHERE id=$1",
            [row.id],
          );
          return unauthorized();
        }
        row.token_ciphertext = this.options.vault.seal(
          refreshed,
          "session:" + row.id,
        );
        await client.query(
          `UPDATE mare_game.app_sessions SET token_ciphertext=$2,provider_valid_until=LEAST($3::timestamptz,
          clock_timestamp()+$4::bigint*interval '1 millisecond') WHERE id=$1`,
          [
            row.id,
            row.token_ciphertext,
            new Date(refreshed.expiresAt),
            this.options.policy.recheckMs,
          ],
        );
      }
      // Serialize the authorization/write boundary with global logout and recovery.
      // Acquire after external refresh so revocation can proceed during provider I/O.
      await client.query(
        "SELECT id FROM mare_game.accounts WHERE id=$1 FOR UPDATE",
        [row.account_id],
      );
      const valid = await client.query(
        `UPDATE mare_game.app_sessions s SET idle_expires_at=LEAST(expires_at,clock_timestamp()+$2::bigint*interval '1 millisecond')
        WHERE id=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp()
        AND account_epoch=(SELECT auth_epoch FROM mare_game.accounts WHERE id=s.account_id) RETURNING id`,
        [row.id, this.options.policy.idleMs],
      );
      if (!valid.rowCount) return unauthorized();
      // A provider refresh may already have consumed its old token. Domain errors
      // must roll back only the operation, not the accepted session rotation.
      await client.query("SAVEPOINT authorized_operation");
      try {
        const value = await run(client, row);
        return value instanceof AuthFault ? value : { ok: true, value };
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT authorized_operation");
        return { ok: false, error };
      }
    });
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }
  async login(email: string, password: string, oldToken?: string) {
    const tokens = await this.options.provider.login(email, password);
    return this.tx(async (client) => {
      if (oldToken) {
        const old = (
          await client.query<SessionRow>(
            "SELECT * FROM mare_game.app_sessions WHERE token_hash=$1 FOR UPDATE",
            [digest(oldToken)],
          )
        ).rows[0];
        if (old && !old.revoked_at) {
          await client.query(
            "UPDATE mare_game.app_sessions SET revoked_at=now() WHERE id=$1",
            [old.id],
          );
          await this.queue(client, this.tokens(old), "local");
        }
      }
      return this.makeSession(client, tokens, "play");
    });
  }
  async me(token: string) {
    return this.withSession(token, "play", async (client, row) => ({
      account: { id: row.account_id },
      character:
        (
          await client.query<Character>(
            `SELECT ${columns} FROM mare_game.characters WHERE account_id=$1`,
            [row.account_id],
          )
        ).rows[0] ?? null,
    }));
  }
  async character(token: string, id: string) {
    return this.withSession(token, "play", async (client, row) => {
      const character = await this.owned(client, row.account_id, id);
      const control = (
        await client.query<{ epoch: string; active: boolean }>(
          "SELECT epoch,expires_at>clock_timestamp() AS active FROM mare_game.character_control WHERE character_id=$1",
          [id],
        )
      ).rows[0];
      return {
        ...character,
        control: {
          epoch: Number(control?.epoch ?? 0),
          active: control?.active ?? false,
        },
      };
    });
  }
  async characterState(token: string, id: string) {
    return this.withSession(token, "play", async (client, row) => {
      await this.owned(client, row.account_id, id);
      return readCharacterState(client, id);
    });
  }
  private async owned(
    client: PoolClient,
    account: string,
    id: string,
    lock = false,
  ) {
    const character = (
      await client.query<Character>(
        `SELECT ${columns} FROM mare_game.characters WHERE id=$1 AND account_id=$2`,
        [id, account],
      )
    ).rows[0];
    if (!character) throw new AuthFault(404, "character_not_found");
    // Character identity is immutable to runtime. Serialize lease changes without granting character UPDATE.
    if (lock)
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,1296126533))",
        [id],
      );
    return character;
  }
  async createCharacter(token: string, input: CharacterCreate) {
    return this.withSession(token, "play", async (client, row) => {
      const created = await client.query(
        `INSERT INTO mare_game.characters(id,account_id,name,class_id,faction_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id) DO NOTHING RETURNING id`,
        [
          randomUUID(),
          row.account_id,
          input.name,
          input.classId,
          input.factionId,
        ],
      );
      const character = (
        await client.query<Character>(
          `SELECT ${columns} FROM mare_game.characters WHERE account_id=$1`,
          [row.account_id],
        )
      ).rows[0]!;
      if (
        character.name !== input.name ||
        character.classId !== input.classId ||
        character.factionId !== input.factionId
      )
        return new AuthFault(409, "character_exists");
      if (created.rowCount) await initializeCharacterState(client, character.id);
      return character;
    });
  }
  async rotate(token: string) {
    return this.withSession(token, "play", async (client, row) => {
      const next = opaque();
      await client.query(
        "UPDATE mare_game.app_sessions SET token_hash=$2 WHERE id=$1",
        [row.id, digest(next)],
      );
      return { token: next };
    });
  }
  async acquireControl(token: string, id: string, expectedEpoch?: number) {
    return this.withSession(token, "play", async (client, row) => {
      await this.owned(client, row.account_id, id, true);
      const current = (
        await client.query<{ epoch: string; active: boolean }>(
          `SELECT c.epoch,(c.expires_at>clock_timestamp() AND s.revoked_at IS NULL
      AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.account_epoch=a.auth_epoch) AS active
      FROM mare_game.character_control c JOIN mare_game.app_sessions s ON s.id=c.session_id JOIN mare_game.accounts a ON a.id=s.account_id
      WHERE c.character_id=$1`,
          [id],
        )
      ).rows[0];
      const epoch = Number(current?.epoch ?? 0);
      if (
        (current?.active && expectedEpoch === undefined) ||
        (expectedEpoch !== undefined && expectedEpoch !== epoch) ||
        epoch >= Number.MAX_SAFE_INTEGER
      )
        return new AuthFault(409, "control_conflict");
      const control = opaque();
      await client.query(
        `INSERT INTO mare_game.character_control(character_id,session_id,token_hash,epoch,expires_at)
      VALUES($1,$2,$3,$4,clock_timestamp()+interval '120 seconds') ON CONFLICT(character_id) DO UPDATE
      SET session_id=EXCLUDED.session_id,token_hash=EXCLUDED.token_hash,epoch=EXCLUDED.epoch,expires_at=EXCLUDED.expires_at`,
        [id, row.id, digest(control), epoch + 1],
      );
      return { epoch: epoch + 1, token: control, leaseSeconds: 120 };
    });
  }
  async renewControl(
    token: string,
    id: string,
    control: { epoch: number; token: string },
  ) {
    return this.withSession(token, "play", async (client, row) => {
      await this.owned(client, row.account_id, id, true);
      const result = await client.query(
        `UPDATE mare_game.character_control SET expires_at=clock_timestamp()+interval '120 seconds'
      WHERE character_id=$1 AND session_id=$2 AND token_hash=$3 AND epoch=$4 AND expires_at>clock_timestamp() RETURNING epoch`,
        [id, row.id, digest(control.token), control.epoch],
      );
      if (!result.rowCount) return new AuthFault(409, "control_conflict");
      return { epoch: control.epoch, leaseSeconds: 120 };
    });
  }
  async logout(token: string, scope: "local" | "all") {
    await this.tx(async (client) => {
      const row = (
        await client.query<SessionRow>(
          "SELECT * FROM mare_game.app_sessions WHERE token_hash=$1 FOR UPDATE",
          [digest(token)],
        )
      ).rows[0];
      if (!row || row.revoked_at) return;
      if (scope === "all")
        await client.query(
          "UPDATE mare_game.accounts SET auth_epoch=auth_epoch+1 WHERE id=$1",
          [row.account_id],
        );
      await client.query(
        "UPDATE mare_game.app_sessions SET revoked_at=now() WHERE id=$1",
        [row.id],
      );
      await client.query(
        "UPDATE mare_game.character_control SET expires_at=now() WHERE session_id=$1",
        [row.id],
      );
      await this.queue(client, this.tokens(row), scope);
    });
  }
  async startFlow(
    kind: "signup" | "recovery",
    email: string,
    password: string | undefined,
    binding: string,
  ) {
    const token = opaque();
    let state: Record<string, string> = {};
    try {
      state = await this.options.provider.start(
        kind,
        email,
        password,
        this.options.origin + "/v1/auth/callback",
      );
    } catch {
      /* Same response for unknown/existing/unavailable accounts. */
    }
    await this.options.pool.query(
      `INSERT INTO mare_game.auth_flows(token_hash,binding_hash,kind,payload_ciphertext,expires_at)
      VALUES($1,$2,$3,$4,clock_timestamp()+interval '10 minutes')`,
      [
        digest(token),
        digest(binding),
        kind,
        this.options.vault.seal(state, "flow:" + digest(token)),
      ],
    );
    return { token };
  }
  async callback(token: string, binding: string, code: string) {
    return this.tx(async (client) => {
      const flow = (
        await client.query<{
          kind: "signup" | "recovery";
          payload_ciphertext: string;
        }>(
          `DELETE FROM mare_game.auth_flows WHERE token_hash=$1 AND binding_hash=$2
      AND expires_at>clock_timestamp() RETURNING kind,payload_ciphertext`,
          [digest(token), digest(binding)],
        )
      ).rows[0];
      if (!flow) return new AuthFault(400, "invalid_auth_flow");
      try {
        const state = z
          .record(z.string(), z.string())
          .parse(
            this.options.vault.open(
              flow.payload_ciphertext,
              "flow:" + digest(token),
            ),
          );
        const session = await this.options.provider.exchange(state, code);
        return this.makeSession(
          client,
          session,
          flow.kind === "recovery" ? "recovery" : "play",
        );
      } catch {
        return new AuthFault(400, "invalid_auth_flow");
      }
    });
  }
  async reset(token: string, password: string) {
    return this.withSession(token, "recovery", async (client, row) => {
      // Consume recovery and revoke local sessions even when the provider response is lost.
      let changed = false;
      try {
        await this.options.provider.reset(this.tokens(row), password);
        changed = true;
      } catch {
        /* outcome may be unknown */
      }
      await client.query(
        "UPDATE mare_game.accounts SET auth_epoch=auth_epoch+1 WHERE id=$1",
        [row.account_id],
      );
      await client.query(
        "UPDATE mare_game.app_sessions SET revoked_at=now() WHERE id=$1",
        [row.id],
      );
      await this.queue(client, this.tokens(row), "all");
      if (!changed) return new AuthFault(503, "password_reset_unconfirmed");
      return { reset: true };
    });
  }
  async rateLimit(key: string, limit: number, seconds: number) {
    const result = await this.options.pool.query<{ count: number }>(
      `INSERT INTO mare_game.auth_rate_limits(key,bucket,count,expires_at)
      VALUES($1,floor(extract(epoch FROM clock_timestamp())/$2)::bigint,1,clock_timestamp()+$2::int*interval '1 second')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_rate_limits.bucket=EXCLUDED.bucket THEN LEAST(auth_rate_limits.count+1,100000) ELSE 1 END,
      bucket=EXCLUDED.bucket,expires_at=EXCLUDED.expires_at RETURNING count`,
      [this.options.vault.rateKey(key), seconds],
    );
    if (result.rows[0]!.count > limit) throw new AuthFault(429, "rate_limited");
  }
  async drainRevocations() {
    for (let i = 0; i < 5; i++) {
      const found = await this.tx(async (client) => {
        const row = (
          await client.query<{
            id: string;
            payload_ciphertext: string;
            scope: "local" | "all";
          }>(
            "SELECT * FROM mare_game.provider_revocations WHERE retry_at<=now() ORDER BY retry_at LIMIT 1 FOR UPDATE SKIP LOCKED",
          )
        ).rows[0];
        if (!row) return false;
        try {
          let tokens = providerSessionSchema.parse(
            this.options.vault.open(row.payload_ciphertext, "revoke:" + row.id),
          );
          if (tokens.expiresAt <= Date.now()) {
            tokens = await this.options.provider.refresh(tokens.refreshToken);
            // Persist rotation before attempting logout, including its retry path.
            await client.query(
              "UPDATE mare_game.provider_revocations SET payload_ciphertext=$1 WHERE id=$2",
              [this.options.vault.seal(tokens, "revoke:" + row.id), row.id],
            );
          }
          await this.options.provider.logout(tokens, row.scope);
          await client.query(
            "DELETE FROM mare_game.provider_revocations WHERE id=$1",
            [row.id],
          );
        } catch (error) {
          if (error instanceof AuthFault && error.status === 401)
            await client.query(
              "DELETE FROM mare_game.provider_revocations WHERE id=$1",
              [row.id],
            );
          else
            await client.query(
              "UPDATE mare_game.provider_revocations SET retry_at=now()+interval '1 minute' WHERE id=$1",
              [row.id],
            );
        }
        return true;
      });
      if (!found) break;
    }
    await this.options.pool.query(
      "DELETE FROM mare_game.auth_flows WHERE token_hash IN (SELECT token_hash FROM mare_game.auth_flows WHERE expires_at<now() LIMIT 1000)",
    );
    await this.options.pool.query(
      "DELETE FROM mare_game.auth_rate_limits WHERE key IN (SELECT key FROM mare_game.auth_rate_limits WHERE expires_at<now() LIMIT 1000)",
    );
    await this.options.pool
      .query(`UPDATE mare_game.app_sessions SET token_ciphertext='',revoked_at=COALESCE(revoked_at,now())
      WHERE id IN (SELECT s.id FROM mare_game.app_sessions s JOIN mare_game.accounts a ON a.id=s.account_id
      WHERE token_ciphertext<>'' AND (revoked_at IS NOT NULL OR expires_at<now() OR idle_expires_at<now()
      OR account_epoch<>a.auth_epoch) LIMIT 1000 FOR UPDATE OF s SKIP LOCKED)`);
  }
}
