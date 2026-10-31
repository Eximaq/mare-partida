# Phase 1 checkpoint — 2026-10-30

- Active checkout: `mare-partida-authoritative`; branch `refactor/authoritative-server`.
- Base main: `7b14fa74dabd51d2efd51021dc6304e3f9bdfa9b`.
- Core implementation commit: `16c18e0d9e586fcfb3a90962db948598df8f8629`.
- Local infrastructure/documentation accompany this checkpoint. Confirm HEAD/status on resume.
- Owner authorized Phase 1 but expressly prohibited publishing: no push, remote Draft PR,
  merge, deployment or DNS change. Do not apply older automatic-push guidance here.
- Previous checkout `mare-partida-v12` is read-only and preserved, including its working
  changes and ignored/untracked files. A sibling preservation directory holds the ZIP,
  hashes, patches and review inventory; nothing was imported into this branch.
- Delivered: strict TypeScript workspaces, shared v1 validation, health-only HTTP server,
  PostgreSQL migrations/initial identity schema, isolated local DB and separate roles.
- Executed: build/typecheck; 17 foundation tests; 122 legacy Node test files; 5 real-PostgreSQL
  tests including concurrent migration, rollback and network recovery; 73 Python tests;
  4 static-build tests, both builds, native96 release check and isolated browser smoke.
- Runtime role denied player-table access and schema creation. Static outputs exclude
  backend, packages, infra, environment files and Git metadata. No game source/assets changed.
- Limitations: no Docker engine/container execution or remote CI run; automated approval
  blocked the combined PostgreSQL stop/start helper exercise. Status worked; network-failure
  recovery was verified through a disposable TCP proxy without stopping PostgreSQL.
- Phase 2 (identity/session/authorization), online gameplay and 600-CCU testing remain pending.
  Do not advertise the foundation as an authenticated or authoritative playable server.
- Start with `docs/operations/LOCAL-SERVER.md` and `docs/architecture/AUTHORITATIVE-FOUNDATION.md`.
