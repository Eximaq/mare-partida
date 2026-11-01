#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
\getenv owner_password MARE_OWNER_PASSWORD
\getenv runtime_password MARE_RUNTIME_PASSWORD
CREATE ROLE mare_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'owner_password';
CREATE ROLE mare_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'runtime_password';
CREATE DATABASE mare_dev OWNER mare_owner;
REVOKE ALL ON DATABASE mare_dev FROM PUBLIC;
GRANT CONNECT ON DATABASE mare_dev TO mare_owner, mare_runtime;
SQL
