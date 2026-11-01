import { statfs } from "node:fs/promises";
import pg from "pg";
// Local timer/monitor only. No public metrics endpoint and no personal identifiers.
try {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new Error("Local database required");
  const pool = new pg.Pool({
    connectionString: url.toString(),
    max: 1,
    connectionTimeoutMillis: 2000,
    statement_timeout: 3000,
  });
  try {
    const row = (
      await pool.query(
        `SELECT pg_database_size(current_database())::text AS bytes,(SELECT count(*)::int FROM mare_game.provider_revocations) AS pending,(SELECT coalesce(extract(epoch FROM clock_timestamp()-min(created_at)),0)::int FROM mare_game.provider_revocations) AS oldest_seconds`,
      )
    ).rows[0];
    const fs = await statfs(
      process.env.PG_DATA_FILESYSTEM ?? "/var/lib/postgresql",
    );
    const diskFreePercent = (100 * fs.bavail) / fs.blocks;
    const port = Number(process.env.OPS_PORT ?? 8787);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("Invalid port");
    const started = performance.now(),
      ready = await fetch(`http://127.0.0.1:${port}/health/ready`, {
        signal: AbortSignal.timeout(2000),
      });
    const latencyMs = Math.round(performance.now() - started),
      ok =
        ready.ok &&
        diskFreePercent >= 20 &&
        row.oldest_seconds < 300 &&
        latencyMs < 1000;
    console.log(
      JSON.stringify({
        event: "ops_probe",
        ok,
        databaseBytes: row.bytes,
        pendingRevocations: row.pending,
        oldestRevocationSeconds: row.oldest_seconds,
        diskFreePercent: Math.round(diskFreePercent),
        readinessMs: latencyMs,
      }),
    );
    if (!ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
} catch {
  console.error(
    JSON.stringify({
      event: "ops_probe",
      ok: false,
      reason: "probe_unavailable",
    }),
  );
  process.exitCode = 1;
}
