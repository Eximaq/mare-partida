import { readFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pgArchive } from "./pg-archive.mts";
const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const settings = JSON.parse(
    await readFile(join(root, "infra/local/continuous/settings.json"), "utf8"),
  );
  const env = parseEnv(await readFile(settings.ownerEnv, "utf8")),
    url = new URL(env.MIGRATION_DATABASE_URL!);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/mare_local_alpha")
    throw new Error("Unexpected owner configuration");
  await mkdir(settings.backupDirectory, { recursive: true });
  const file = join(
    settings.backupDirectory,
    "local-alpha-" + new Date().toISOString().replaceAll(":", "-") + ".dump",
  );
  await pgArchive("dump", url.toString(), file, settings.pgBin);
  console.log("Backup consistente criado em " + settings.backupDirectory);
} catch {
  console.error(
    "Backup nao concluido. Nenhum arquivo anterior foi sobrescrito.",
  );
  process.exitCode = 1;
}
