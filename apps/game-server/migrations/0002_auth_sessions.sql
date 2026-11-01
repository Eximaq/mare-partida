ALTER TABLE mare_game.accounts ADD COLUMN auth_epoch bigint NOT NULL DEFAULT 0
    CHECK (auth_epoch BETWEEN 0 AND 9007199254740991);

CREATE TABLE mare_game.app_sessions (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
    account_epoch bigint NOT NULL CHECK (account_epoch>=0),
    token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    provider_session_id uuid NOT NULL,
    token_ciphertext text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('play','recovery')),
    expires_at timestamptz NOT NULL,
    idle_expires_at timestamptz NOT NULL,
    provider_valid_until timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_sessions_account ON mare_game.app_sessions(account_id);
CREATE INDEX app_sessions_expiry ON mare_game.app_sessions(expires_at);

CREATE TABLE mare_game.auth_flows (
    token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    binding_hash text NOT NULL CHECK (binding_hash ~ '^[0-9a-f]{64}$'),
    kind text NOT NULL CHECK (kind IN ('signup','recovery')),
    payload_ciphertext text NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE INDEX auth_flows_expiry ON mare_game.auth_flows(expires_at);

CREATE TABLE mare_game.character_control (
    character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    session_id uuid NOT NULL REFERENCES mare_game.app_sessions(id) ON DELETE RESTRICT,
    token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    epoch bigint NOT NULL CHECK (epoch BETWEEN 1 AND 9007199254740991),
    expires_at timestamptz NOT NULL
);

CREATE TABLE mare_game.auth_rate_limits (
    key text PRIMARY KEY,
    bucket bigint NOT NULL,
    count integer NOT NULL CHECK (count BETWEEN 1 AND 100000),
    expires_at timestamptz NOT NULL
);
CREATE TABLE mare_game.provider_revocations (
    id uuid PRIMARY KEY,
    payload_ciphertext text NOT NULL,
    scope text NOT NULL CHECK (scope IN ('local','all')),
    retry_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES IN SCHEMA mare_game FROM PUBLIC;
