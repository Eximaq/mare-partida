import { readFile, access } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(
    new URL("docs/architecture/FULL-SERVER-SCOPE.json", root),
    "utf8",
  ),
);
const ids = new Set<string>();
for (const feature of manifest.features) {
  if (
    ids.has(feature.id) ||
    !["implemented", "partial", "pending"].includes(feature.status) ||
    !feature.sources.length
  )
    throw new Error("Invalid completeness manifest");
  ids.add(feature.id);
  for (const source of feature.sources) await access(new URL(source, root));
}
const implemented = manifest.features.filter(
  (f: { status: string }) => f.status === "implemented",
).length;
const pending = manifest.features
  .filter((f: { status: string }) => f.status !== "implemented")
  .map((f: { id: string; status: string }) => ({ id: f.id, status: f.status }));
console.log(
  JSON.stringify(
    {
      scope: manifest.scope,
      baseline: manifest.baseline,
      ready: pending.length === 0,
      implemented,
      total: manifest.features.length,
      pending,
    },
    null,
    2,
  ),
);
// This gate must stay red until full original gameplay is actually delivered.
if (pending.length && process.argv[2] !== "--audit") process.exitCode = 1;
