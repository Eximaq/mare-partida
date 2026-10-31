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
No Windows service or global PATH change is needed. Root `.env` contains generated,
ignored credentials for runtime, migration owner and test admin; never share it.

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
described in `infra/postgres/init-roles.sh`, and create `.env` from `.env.example` with
unique passwords. Do not reuse another project's database or production credentials.

After initial migration, execute `infra/postgres/grant-health.sql` as `mare_owner`
using psql. Supply PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD in the process environment,
not passwords in command arguments/history. Grants are already applied on this host.

## Optional Docker environment

Docker Engine/Compose were unavailable on this Windows host: definitions are prepared,
but no container build/run is claimed. Stop portable PostgreSQL before binding the same
55432 port. Copy `infra/.env.example` to ignored `infra/.env.local` and replace all
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
Current instruction permits local work only: no push, remote PR, merge or publication.
