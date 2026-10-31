# Authoritative server — Phase 1

Base: `main` at `7b14fa74dabd51d2efd51021dc6304e3f9bdfa9b`.
Branch: `refactor/authoritative-server`. The final Phase 1 review authorizes branch
publication and a remote Draft PR. No merge, DNS change or production deployment.
Phase 2 implementation awaits presentation of the review and pending decisions.

## Decision and boundary

Use a modular Node.js/strict TypeScript server with PostgreSQL. Preserve the Canvas
client, native96 renderer, transformations, itemDefs indices and local saves.
The legacy Python service remains a local prototype and is not exposed by this server.

Phase 1 adds workspaces/builds, message schemas, health endpoints, versioned migrations,
an initial identity/character schema, tests and local operating instructions.
Authentication, WebSocket transport, authorization, economy, combat and multiplayer
belong to subsequent phases. No browser save is imported. The database starts empty.
600 active users and production suitability remain unverified.

| Location | Responsibility |
|---|---|
| `packages/shared` | Browser-compatible validation/types, no database or secrets |
| `apps/game-server/src/http.ts` | Health only; no checkout/static-file serving |
| `apps/game-server/src/config.ts` | Validated configuration, loopback default; production refused |
| `apps/game-server/src/db` | Bounded pool, migration transactions and readiness |
| `apps/game-server/migrations` | Immutable, ordered SQL |
| `infra` | Local Compose and portable Windows PostgreSQL control |
| Existing root frontend | Unchanged demo and DEV save behavior |

`GET /health/live` reports process availability. `GET /health/ready` returns 200 only
when database migration names/checksums match the application, otherwise sanitized 503.
Neither endpoint authenticates players or grants access to gameplay.

The v1 envelope currently accepts only `ping`, UUID requestId, safe positive integer
sequence and empty payload. Unknown fields/versions, malformed JSON and messages over
4096 UTF-8 bytes are rejected. No public transport consumes it yet. Session sequencing,
replay protection and economic idempotency are not implemented by structural validation.

## Database and recovery

`mare_game.accounts` has UUID identity and unique provider/subject, without passwords.
`mare_game.characters` has UUID identity, one character per account, a restrictive FK,
current class/faction IDs and bounded state_version. Appearance/economy/progression
require later migrations; no gameplay defaults or balance changes are introduced here.

Migrations use one checked-out connection, one transaction for the batch, an advisory
transaction lock and a checksum ledger in `mare_meta`. Concurrent runners serialize.
Failed SQL rolls back DDL and ledger. Applied history must match a prefix of available
files; edits, removals and reordering fail closed. CRLF is normalized to LF before hashing.

Do not edit applied SQL. Add corrective migrations and maintain old application
compatibility during expansion. This phase has no automatic destructive down/reset.
Validate backup/restore before accepting real accounts; no recovery SLA is claimed.

Owner and runtime are separate roles. Runtime receives only USAGE on `mare_meta` and
SELECT on its ledger. It cannot read/write player tables or create schemas. Future
functionality must justify additional grants and enforce account ownership in the server.

## Verification

`npm run build`, `npm run typecheck`, `npm test`, `npm run test:integration`.
Integration requires real loopback PostgreSQL and creates a fresh UUID-named database
per test, dropping only that database. No in-memory substitute or silent skip.
Tests exercise malformed inputs, health/file exposure, migration concurrency/rollback,
checksum drift, repeatability, foreign keys and unique ownership.

Docker is unavailable on the Windows host. The final review ran the Compose build,
migrations, health and privilege smoke checks successfully on Linux CI. See the
[final review](PHASE-1-FINAL-REVIEW.md), [Phase 2 plan](PHASE-2-AUTH-SESSIONS-PLAN.md)
and [local operations](../operations/LOCAL-SERVER.md) for evidence and limitations.
