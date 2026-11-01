# Phase 1 checkpoint — 2026-10-30

- Active checkout: `mare-partida-authoritative`; branch `refactor/authoritative-server`.
- Base main: `7b14fa74dabd51d2efd51021dc6304e3f9bdfa9b`.
- Core implementation commit: `16c18e0d9e586fcfb3a90962db948598df8f8629`.
- Infrastructure: `d8710ba`; review fixes: `34dbc05` (COMMIT outcome/Compose CI),
  `b3cbadb` (role-specific env files and four regression tests).
- Draft PR: https://github.com/Eximaq/mare-partida/pull/160. Main advanced independently
  to `c4b7cf6` during review; not merged/rebased into this branch. Check current CI.
- Local infrastructure/documentation accompany this checkpoint. Confirm HEAD/status on resume.
- The final Phase 1 review now authorizes branch publication and a remote Draft PR.
  No merge, production deployment or DNS change. Present the review and pending
  architectural decisions before any Phase 2 implementation.
- Previous checkout `mare-partida-v12` is read-only and preserved, including its working
  changes and ignored/untracked files. A sibling preservation directory holds the ZIP,
  hashes, patches and review inventory; nothing was imported into this branch.
- Delivered: strict TypeScript workspaces, shared v1 validation, health-only HTTP server,
  PostgreSQL migrations/initial identity schema, isolated local DB and separate roles.
- Executed: build/typecheck; 21 foundation tests; 122 legacy Node test files; 5 real-PostgreSQL
  tests including concurrent migration, rollback and network recovery; 73 Python tests;
  4 static-build tests, both builds, native96 release check and isolated browser smoke.
- Runtime role denied player-table access and schema creation. Static outputs exclude
  backend, packages, infra, environment files and Git metadata. No game source/assets changed.
- Linux CI ran Docker Compose build/migrations/health/runtime isolation successfully.
  No Docker engine is installed on this Windows host. Automated approval previously
  blocked the combined PostgreSQL stop/start helper exercise. Status worked; network-failure
  recovery was verified through a disposable TCP proxy without stopping PostgreSQL.
- Phase 2 (identity/session/authorization), online gameplay and 600-CCU testing remain pending.
  Do not advertise the foundation as an authenticated or authoritative playable server.
- Runtime commands load only `.env.server.local`, migrations `.env.migration.local`,
  integration `.env.test.local`. Original mixed `.env` preserved but no longer loaded.
- Start with `docs/architecture/PHASE-1-FINAL-REVIEW.md`,
  `docs/architecture/PHASE-2-AUTH-SESSIONS-PLAN.md` and `docs/operations/LOCAL-SERVER.md`.
