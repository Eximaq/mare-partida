# Private synchronization with main d1b6f1fd

Integrates merged PRs #283, #284, #285 and #286 with private revision `75ffa2e2`. The public portal includes the collaborator plans, Pix dialog/copy action and Discord receipt link. No payment, message, privileged provider action or public backend deployment is performed by this integration.

The original progression and Bounty implementation from main remains the source of rules: XP curve version 3, Caesar damage adjustment and world monster defense scaling at level 45+. Bounty is calculated from authoritative state. Competitive credits remain disabled for normal clients; their SQL function is not granted to the runtime. The online snapshot retains the PR #232 MVCC reads and read-only hierarchy/contracts projection.

## Migration conflict and resolution

The public branch allocated 0050/0051 to XP and Bounty. Private installations had already used those numbers for the dungeon repair and fruit compatibility. Combining the files unchanged causes a duplicate migration-prefix error; renaming them without recognizing existing receipts causes a history mismatch. Neither failure is a reason to recreate the database or edit its receipts.

The two private SQL files are now named 0052/0053 with identical normalized contents and checksums. The runner recognizes only the exact audited private names and checksums, validates their predecessors, rejects duplicate aliases, and leaves every stored receipt untouched. Public installations keep their original 0050/0051 receipts. Fresh installations apply 53 scripts in order. A private installation at `75ffa2e2` applies only the two missing public migrations.

Regression fixtures cover both histories, earlier private lineages, tampered checksums, duplicate aliases and missing predecessors. An original character with 120 XP at level 1 advances to level 3 with a level-start total of 71, preserving all 120 XP, 73 gold and inventory. The two new level receipts appear once; repeating migrations changes nothing.

## Saved battles

The audited private `b672ad6a...` and public `af7565fe...` signatures are accepted by the existing balance upgrader. A regression first reproduced rejection of the private signature, then verified conversion of wounded monsters without relocation or cooldown reset. Unknown signatures remain rejected. Historical SQL still targets its original intermediate signature, which the current engine upgrades on load; its checksum was not rewritten.

## Verification and installation

The existing four-member reward regression reproduced 97 database round trips after the upstream XP-curve selection added two discovery reads per actor. Workers now reuse their already validated original-inventory classification inside the same locked transaction; tutorial callers retain discovery. The 90-query assertion, progression formulas, ledger writes and transaction boundaries are unchanged. No cross-tick cache was introduced.

Run the foundation/legacy suites, full isolated PostgreSQL suite, typecheck, build and scope check. Exercise the updated HUD and portal in Chromium. Keep capacity failures explicit: a functional synchronization is not certification of 50 Solo/48 Party or 3,000 players.

Before activating this revision, stop only the private API/gateways, preserve its current source/build/configuration and make a new consistent database backup. Restore that backup into a separate QA database and compare all original tables. The only permitted migration differences are level/start/version projections, new level receipts, the new empty Bounty table and the two migration receipts. Total XP, gold, inventories, rewards, accounts and battle JSON remain preserved. Verify runtime SELECT on the Bounty table and denial of INSERT and official-credit execution. Restart only after this rehearsal passes.

Reversal must preserve any progress played after the update. Restore the previous backup into another database and validate it before selecting it; do not run an old engine against an incompatible migrated database or overwrite newer progress automatically. Machine-specific evidence and backups remain outside Git.

## Observed local results

Build, typecheck, scope and diff checks passed. The final foundation run passed 248 tests and the legacy runner passed 181 files. The full PostgreSQL run initially passed 305/307: the reward-query regression above and one readBusy slot in the four-player smoke failed. The complete affected read/reward file then passed 13/13, with the reward measuring 89 rather than 97 queries. Two isolated smoke repetitions passed unchanged zero-drop, renewal and uninterrupted-actor assertions. This does not attribute the initial readBusy slot to hardware or certify a larger population.

HUD Chromium checks passed eight viewports including Bounty, keyboard, touch and reload. Portal Chromium checks passed five viewports in both builds, including Pix modal/copy, links and cache handling; four portal build tests passed. A fresh private backup restored into QA preserved all 82 original tables except the explicitly allowed migration projections. The four existing characters needed no level promotion; total XP, gold, inventories, rewards, historical receipts and both saved battles stayed unchanged. CI and activation results are recorded on PR #271 and in the private operational report.
