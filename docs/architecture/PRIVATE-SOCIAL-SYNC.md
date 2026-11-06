# Private server synchronization with the current game

This integration combines the main game through `fb8f3493` with the unmerged PR #232 revision `857dded7`. It is intended for the owner's existing private two-player installation. It does not certify capacity or authorize a public backend deployment.

## Current feature coverage

| Main changes | Authoritative implementation retained | Verification |
| --- | --- | --- |
| Monster balance, level/XP curve and daily contracts | Existing versioned upgrades; server-generated daily objectives, claims and expiring XP bonus | Contract, progression, battle and reward integration suites |
| Crews, ship upgrades and weekly professions | Membership permissions, resource costs, activity receipts and server-derived bonuses | Crew and profession PostgreSQL suites; crew HUD browser test |
| Friends and private conversations | Owned identity, invitations, blocks and conversation access | Social contact integration suite; two-profile browser test with real API/PostgreSQL |
| Mercado dos Mares and merchant potions | Owned listings, reserved money, proposals, commissions, official mail delivery, HP/Mana consumables and shared cooldown | Market API/transaction suites, custom-role regression and market/inventory browser fixtures |
| Official mail and item trades | Durable entitlements, once-only claims, consent and offer-version checks | Mail/dungeon and trade integration suites |
| Nautical confirmations and revised windows | Main frontend files, without a separate alpha replacement | Official Pages artifact and browser checks |
| PR #232 simulation changes | Batched room simulation, canonical monsters, bounded transaction reads and authorized MVCC presentation | Simulation, Party, presentation and query-budget regressions |

## Integration defects fixed

### Historical migration 0040

The private branch already applied `0040_detach_claimed_dungeon_members.sql`. Main independently assigned 0040 to daily contracts. Replacing the old receipt or blindly accepting the sequence would undermine migration validation.

The repair is now catalogued as 0049. Main subsequently used 0047 for the market and 0048 for merchant potions. The intermediate private 0047 repair is also recognized, with the exact same audited checksum. Only the exact previously shipped SHA-256 is accepted as its legacy alias. The preceding canonical history must be complete; unknown, modified, duplicate and gapped receipts still fail closed. The old receipt is never rewritten. A main-only database at 0048 applies 0049 once; the original private lineage applies nine missing main migrations. The already restored private Social installation applies only the two market migrations. A database with both private aliases is rejected. Both paths and rejection cases use real PostgreSQL regression tests.

### Daily objectives in read-only presentation

Main's first daily-contract read can initialize the daily recipe. PR #232 runs presentation in a read-only MVCC transaction. Combining these directly produced PostgreSQL `25006`.

Preparation now detects a missing daily recipe and initializes it in a separately authorized, character-locked transaction. The presentation remains read-only and revalidates session revocation. Concurrent first reads persist a single recipe; subsequent reads leave it unchanged. A UTC day boundary between preparation and presentation produces a deterministic temporary projection, never a write inside the read-only snapshot.

### Repeated reward reads

The combined implementation initially exceeded existing budgets: 117 round trips for a four-member reward (limit 90), and 77 for a first full solo projection (limit 65). No limit was increased.

The Party worker now reuses inventory, identity and XP-boost status already read under the same transaction's character locks. The snapshot is internal, checked against character/version, and never accepted by a route. Boost status uses the PostgreSQL transaction clock, matching the original calculation. Post-reward achievement power still reads fresh state; unused crew bonuses are omitted from that calculation. No cache survives a transaction or tick.

The same diagnostic fixtures now measure **89** round trips for the reward and **61** for the first solo projection (previously 117 and 77). Limits remain 90 and 65. The entire affected combat-read, contract and database suites pass: 28 tests, including an active XP bonus on just one Party member.

Regressions cover the existing query budgets, exact boosted/unboosted XP receipts, late-failure rollback of every Party reward, stale/foreign snapshot rejection, and read-after-mutation power.

## Data and release precautions

Before activation, take a fresh custom-format PostgreSQL backup, restore it into an isolated database and compare all original table contents. Rehearse the official migrations and runtime grants there. Preserve original migration receipts, inventories, wallets and economic events. The official XP-curve migration preserves levels and transforms progress proportionally; compare that transformation independently rather than describing raw XP as unchanged.

Keep configuration, certificates and backup contents outside Git. Do not create accounts, send mail or change Supabase settings for these checks. Browser acceptance uses disposable local provider fixtures plus actual API and PostgreSQL; it does not claim new hosted-provider authentication validation.

The private frontend must match the successful Pages artifact byte for byte. Account-client and backend code are installed from the tested integration revision. Keep the public site and existing PR #232 unchanged, and retain a database-plus-code rollback path.

## Local verification

- Build, typecheck and scope check passed; 241 foundation tests and 168 legacy Node test files passed.
- The initial complete PostgreSQL run passed 286/290 tests. The four failures were the two query budgets, the migration-list expectation, and the four-player capacity smoke. After correction, the entire three affected integration files passed 28/28, all five migration-lineage tests passed, and the capacity smoke passed in an isolated repeat. This describes the actual runs, not a fictional clean full-suite run.
- Shared-lobby movement and real two-profile Social browser acceptance passed with disposable local identities. Crew and Social HUD browser fixtures also passed. A temporary static test server's small connection backlog initially refused asset requests; increasing only that disposable server's backlog resolved those harness failures without changing game files.
- The capacity smoke repeat covers one four-member Party, 32 seconds, real HTTP lease renewals and compiled workers. It is **not** the ten-minute 50 Solo / 48 Party acceptance or certification for 3,000 players; those remain a separate gate. No tick, timeout, gameplay, economy or benchmark threshold was relaxed.


## Market compatibility follow-up

Main advanced to fb8f3493 while the first integration was being validated. The final private frontend therefore uses that Pages artifact, including the Mercado dos Mares and merchant changes.

The market migration grants its conventional role, but private installations use a dedicated role. A real PostgreSQL regression reproduced permission denied with a custom role. The installation grant script now grants exactly the same read/execute surface to the substituted runtime role; it grants no direct market writes. The regression publishes, buys and replays through the authorized API and checks that direct table deletes are denied.

The market-adjusted wealth baseline initially added one query per Party member, pushing the four-member reward to 93 round trips. The baseline is now calculated once in a materialized CTE inside the existing achievement write, preserving its cap, numeric precision, transaction and lock. It emits only a fixed, internally selected SQL expression. Existing market wallet, XP receipt and rollback checks remain in place.

Merchant migration adds zero Mana potions to historical inventory. Upgrade assertions explicitly compare that new default and preserve every pre-existing field. Contract overflow tests cover both the new market wallet boundary and the existing BIGINT XP boundary, without changing either rule.

The two-profile Social test waits for command completion before the other profile reads a request or message; opening a thread also writes its read receipt. Artificial request latency exercises that ordering. A first remote run exposed a race in this test, and an earlier lobby-travel timeout passed on repeat; these attempts are retained in the validation evidence.

Local market integration initially passed 66/71. Four failures were missing custom-role grants and an outdated Mana-default expectation; the fifth seeded a wallet beyond the newly established market limit. The targeted correction run passed 28/28; the custom-role/achievement regression run passed 3/3. Market and original inventory/forge browser fixtures, the real API/PostgreSQL two-profile Social run, build and typecheck passed. The market rehearsal preserved all 77 original data tables, five accounts and four characters before live activation.


The complete Linux integration run also identified stale upgrade expectations (0049 and the zero Mana default), legacy fixtures above the newly introduced market-wallet ceiling, and the missing market action in the adversarial matrix. The corrected regressions pass locally. All 98 command actions now participate in 392 denied HTTP requests and 1,078 authority-field checks. Historical balances above the new market cap remain unchanged by migration; reward attempts fail atomically until balance headroom exists. No private account had to be clamped or altered. These are test/coverage updates, not relaxed gameplay or benchmark limits.

After the market integration, measured transaction counts are 89 for the four-member reward and 64 for a first solo projection, within the unchanged 90/65 budgets. The scope manifest now records all 34 implemented feature areas against fb8f3493, including Party, shared lobby, crews, professions, Social, mail/trade and market; it is functional coverage, not a load-capacity certificate.
