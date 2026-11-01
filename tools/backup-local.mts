import { pgArchive } from "./pg-archive.mts";
const file = process.argv[2];
try {
  if (!file || !process.env.BACKUP_DATABASE_URL)
    throw new Error("Configuration required");
  await pgArchive("dump", process.env.BACKUP_DATABASE_URL, file);
  console.log(JSON.stringify({ event: "backup_complete" }));
} catch {
  console.error(JSON.stringify({ event: "backup_failed" }));
  process.exitCode = 1;
}
