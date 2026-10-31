# Local authoritative foundation

Use `mare-partida-authoritative` on `refactor/authoritative-server`. Keep
`mare-partida-v12` intact. The sibling preservation directory contains the complete ZIP,
SHA-256 inventory, patches and comparisons; none belongs in Git. Do not automatically
copy old assets, saves or exclusive commits into this checkout.

## Build

Requires Node 24.15.0 (supported major pinned by engines), npm and PostgreSQL 18.
Python remains necessary for existing builds/tests.

```powershell
npm ci --ignore-scripts
npm run build
npm run typecheck
```

Only the new workspaces use ESM. Root JavaScript remains CommonJS-compatible. No
frontend bundler/framework was introduced. The lockfile pins installed dependencies.

## Configured Windows environment

Portable EDB PostgreSQL 18.6 is under `$env:LOCALAPPDATA\MarePartida\postgres-18.6`.
The isolated cluster is `$env:LOCALAPPDATA\MarePartida\authoritative-dev\data`.
No Windows service or global PATH change is needed. Each command loads a distinct
ignored credential file: `.env.server.local` (runtime), `.env.migration.local` (owner)
and `.env.test.local` (test admin). The original mixed `.env` is preserved locally but
is no longer loaded by the npm commands; never share it or any of the local files.
Create runtime configuration from `.env.example`; migration/test templates live in
`infra/env/`. Keep privileged credentials out of the runtime process environment,
including inherited shell variables. File separation is not OS sandboxing: use separate
OS identities/secret mounts and access controls before a deployment. Restart old Node
processes to adopt the separated configuration. Compose already injects only runtime
credentials into its server container.

```powershell
& .\infra\postgres-local.ps1 -Action status
# Start only if stopped:
& .\infra\postgres-local.ps1 -Action start
npm run db:migrate
npm run start:server
```

Check `http://127.0.0.1:8787/health/live` and `/health/ready`. Only health endpoints
exist. The frontend still uses its own local save. Ctrl+C stops the Node process.

```powershell
& .\infra\postgres-local.ps1 -Action stop
```

The helper accepts `-PgBin`, `-DataDirectory`, `-Port`; it never initializes/removes
data. Launcher output uses files to avoid inherited stdout pipes on Windows.
The status action was tested. Automatic approval review blocked the combined stop/start
exercise, so recovery through this helper is not claimed as validated. Execution policy
was not changed. PostgreSQL itself was started successfully via its portable binaries.

On another Windows machine, obtain binaries from PostgreSQL's official Windows/EDB
page, initialize a dedicated SCRAM cluster on loopback, provision the roles/database
described in `infra/postgres/init-roles.sh`, and create the three local env files from
their role-specific templates with unique passwords. Do not reuse another project's
database or production credentials.

After initial migration, execute `infra/postgres/grant-health.sql` as `mare_owner`
using psql. Supply PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD in the process environment,
not passwords in command arguments/history. Grants are already applied on this host.

## Optional Docker environment

Docker Engine/Compose are unavailable on this Windows host. The final review executed
and passed build/run/migration/health/privilege checks on Linux CI; see the
[review](../architecture/PHASE-1-FINAL-REVIEW.md). The default host port 55432 must be
free before starting Compose; do not interrupt an existing database to run this check.
Use an isolated host or explicitly configure a distinct port instead.
Copy `infra/.env.example` to ignored `infra/.env.local` and replace all
placeholders with distinct random hexadecimal passwords, safe in connection URLs.

```sh
docker compose --env-file infra/.env.local -f infra/compose.yaml up -d postgres
docker compose --env-file infra/.env.local -f infra/compose.yaml --profile tools run --build --rm migrate
docker compose --env-file infra/.env.local -f infra/compose.yaml exec postgres psql -U mare_owner -d mare_dev -f /opt/mare/grant-health.sql
docker compose --env-file infra/.env.local -f infra/compose.yaml --profile server up --build -d server
docker compose --env-file infra/.env.local -f infra/compose.yaml stop
```

The database uses a named volume. Never add `down -v` to routine instructions.
Initialization credentials apply only to a new volume; changing env files does not
rotate existing passwords. The non-root runtime image excludes frontend/assets,
Git history and local env files. It is a local-development definition, not a public deploy.

## Tests and preview

```powershell
npm test
npm run test:integration
python -B -m unittest discover -s tests -p '*backend_test.py'
python -B -m unittest discover -s tests -p 'test_hierarchy.py'
python -B tools/player96_release.py --check
python -B tools/build_pages.py
python -B tools/build_portal.py
python -B -m http.server 8781 --bind 127.0.0.1 --directory dist
```

`npm test` includes foundation and legacy standalone Node tests. The existing
`supa-browser.test.cjs` needs its separate browser harness and remains excluded as in
the original essential-tests workflow. Integration needs TEST_DATABASE_URL with
database-creation rights on isolated loopback PostgreSQL; it creates/drops only its
own UUID databases, never migrates an existing player's database.

Preview the static output, not the checkout root. Use an isolated browser profile.
Native96 loading can exceed default automation timeouts; inspect readiness/errors
instead of substituting old sprites. No reset of browser saves is required.

## Next phase

Phase 2 adds real identity, account/character authorization and sessions. Online
economy/combat, public WSS, TLS/deploy, backup SLA and 600-CCU acceptance remain pending.
Production configuration is refused until those deployment/security gates exist.
The final Phase 1 review authorizes pushing this branch and opening a Draft PR only.
No merge or production deployment is authorized. Phase 2 implementation must wait for
the review results and pending architectural decisions to be presented.

## Migration failure diagnosis

SQL errors before COMMIT roll back the batch, as exercised by the integration tests.
A lost connection during COMMIT can leave the client unable to determine whether the
transaction committed. Reconnect and inspect `mare_meta.schema_migrations` against
the unchanged migration files before retrying. The migrator checks the ledger and
skips already-applied migrations. Never edit history, reset the database or assume a
failure message alone proves rollback. Crash recovery, restart and backup restoration
have not been validated by the network-interruption test.
