import { spawn } from "node:child_process";
import { open, stat } from "node:fs/promises";
import { join } from "node:path";
// Password travels only in the child environment; stderr is deliberately not echoed.
export async function pgArchive(
  mode: "dump" | "restore",
  connection: string,
  file: string,
  bin = process.env.PG_BIN ?? "",
) {
  const url = new URL(connection);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.search
  )
    throw new Error("Archive requires an explicit loopback database");
  if (mode === "dump") {
    const fd = await open(file, "wx", 0o600);
    await fd.close();
  } else if (!(await stat(file)).isFile())
    throw new Error("Archive file required");
  const executable = join(bin, mode === "dump" ? "pg_dump" : "pg_restore");
  const env = {
    ...process.env,
    PGHOST: url.hostname.replace(/[\[\]]/g, ""),
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGCONNECT_TIMEOUT: "5",
    PGOPTIONS: "-c statement_timeout=300000",
  };
  const args =
    mode === "dump"
      ? ["--format=custom", "--no-owner", "--no-acl", "--file", file]
      : [
          "--exit-on-error",
          "--single-transaction",
          "--no-owner",
          "--no-acl",
          "--dbname",
          env.PGDATABASE,
          file,
        ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      env,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => reject(new Error("Archive tool unavailable")));
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Archive operation failed; inspect privately")),
    );
  });
}
