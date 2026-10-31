-- Run explicitly as the migration owner after db:migrate.
-- Runtime can inspect migration readiness, but cannot read/write player tables.
GRANT USAGE ON SCHEMA mare_meta TO mare_runtime;
GRANT SELECT ON mare_meta.schema_migrations TO mare_runtime;
