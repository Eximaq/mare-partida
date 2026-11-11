# Private rework synchronization — November 2026

This revision integrates main `69dac39e` (PRs #277–#281) with the private server foundation `8ac7a4c7`. PR #232 remains preserved and PR #282 (Akainu) is outside this integration. Publishing the branch does not merge main or deploy a public backend.

## Server adaptations

- Preserve main's Phoenix scheduler correction: the last energy impact and totem pulse still execute when a simulation step crosses their deadline. JSON persistence, five energy hits, seven nearby-ally heals and rejection outside the totem radius are covered through the server adapter.
- Serialize Jiki's actual server-measured charge duration as `assemblyAge`, bounded to six seconds. Presentation no longer substitutes six seconds for a short charge. Damage, energy and cooldown formulas are unchanged; the client cannot supply the duration.
- Emit Wolf impact feedback only after positive authoritative damage, for the charge and each of five bleed ticks. The original renderer consumes these events through its existing sequence fence. Repeated snapshots cannot replay the effect or apply damage.
- Migration `0051_fruit_rework_compatibility.sql` promotes only the audited private and public battle signatures. It preserves every other simulation field, including HP, cooldowns, pending actions and Party links. Unknown signatures remain rejected. Shared room data, reward ledgers and economy are not rewritten.

The resulting battle signature is `b672ad6a2dc8d1b947514a51985552813cbf96dc2b40fad2935275ef3d81a977`. Historical migration checksums are unchanged. The new migration is transactional and idempotent.

## Windows resource location

The original Node, PostgreSQL cluster and backups were found in the Codex Windows package's `LocalCache/Local/MarePartida`, while the launcher assumed `%LOCALAPPDATA%/MarePartida`. The cluster was stopped after an unclean shutdown. These observations do not establish deletion by the user or the exact event that changed path visibility.

The ignored `infra/local/continuous/settings.json` now supports an explicit absolute `resourceRoot`. It selects the existing portable Node and PostgreSQL data directory. A nonexistent configured directory fails closed; the launcher never initializes a replacement database. Its system-Node fallback selects one executable rather than concatenating multiple PATH matches. Node remains pinned to 24.22.2.

For relocated installations, also update the existing `pgBin` and `backupDirectory` settings to that same verified resource location. Keep credentials, certificates and these machine-specific settings outside Git. Start/stop commands remain:

```powershell
powershell.exe -NoProfile -File "<installation>\infra\local-server.ps1" -Action start
powershell.exe -NoProfile -File "<installation>\infra\local-server.ps1" -Action status
powershell.exe -NoProfile -File "<installation>\infra\local-server.ps1" -Action stop
```

Stopping the application preserves PostgreSQL and all persistent data. The environment file keeps `AUTH_ENABLED=false`; the authorized continuous-server launcher enables Auth only in its child process.

## Data preservation rehearsal

Before starting the recovered cluster, its complete stopped directory was copied without replacing any existing backup. PostgreSQL then performed its normal WAL recovery and accepted connections on loopback. No PID/lock file was removed and no repair/reset utility was used.

A new custom-format backup was restored into a uniquely named database on the separate QA cluster. All **82 tables** matched the source before migration. After migration, every original row still matched except the `rulesHash` of the two known battles and the additional migration receipt. Four characters and all inventory, progression and economic data were preserved. The disposable restored database was removed after comparison; the original remained untouched by the rehearsal.

Rollback material includes the old source archive, ignored configuration, stopped-cluster copy and the fresh logical backup. If rollback becomes necessary, stop only this installation and preserve a fresh backup of any subsequently played progress. Rehearse restoration into another empty database before selecting it; never overwrite newer progress with the older dump automatically.

## Static compatibility and limits

The reconstructed main build and integrated build each contain **4,939 files**, with no missing or additional file. All assets match. The only differing files are `game.js` (the online Wolf event adapter), `index.html` and `ui-preview.html` (their generated game-script cache hashes). This is source/build parity with main `69dac39e`, not a claim that the private frontend is byte-identical to the currently downloaded Pages artifact.

No gameplay save format, localStorage key, damage formula, tick cadence, session policy, two-second combat deadline or load acceptance threshold was changed. This synchronization does not certify the 50 Solo/48 Party acceptance or capacity for 3,000 players.

## Local verification

- Build, TypeScript checks, scope manifest and diff checks passed. `npm test` passed **248 foundation tests and 180 legacy test files**. The Windows launcher regression executes PowerShell 5.1 with a relocated resource directory; the Linux suite skips that Windows-only test.
- Full isolated-PostgreSQL suite: **299/302 passed initially**. The three failures were an obsolete expected migration list, missing `PG_BIN` in the test environment, and the four-player capacity smoke run while other validation was active. The affected attribute/lineage files then passed **16/16**, the native archive test passed, and the capacity smoke passed in an isolated repeat. This is not described as an initially clean full-suite run.
- The failed capacity smoke had four active characters, zero stopped-alive/dead actors, all HTTP responses 200, zero renewal failures and four `readBusy` slots. HTTP p95 was 616 ms and simulation age p95 935 ms. The isolated repeat retained all assertions: four active players, zero dropped slots, no unexpected transitions and successful renewals. This difference does not by itself prove a hardware cause or resolve the broader capacity investigation.
- Real Chromium: online fruit controls, server-to-renderer Wolf events and duplicate-snapshot suppression passed; 72 rework render cases in two viewports and 863 frame bounds passed; inventory passed nine viewports and persistence; Captain/profile passed seven responsive sizes, equipment decoding and settings persistence. The first inventory attempt timed out while using the basic preview server; it passed with the repository preview server. No runtime/game rule was changed for that repetition.
- Six production-package and three portal-build tests passed. Docker context/transitive-import tests passed locally; actual Docker execution belongs to the PR CI, not these Windows checks.
- Source/build comparison, backup restoration and credential-pattern review passed. No `.env`, private key, dump, local settings, account email or token is included in the commit.
