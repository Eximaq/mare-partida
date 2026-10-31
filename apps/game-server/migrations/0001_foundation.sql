CREATE SCHEMA mare_game;
REVOKE ALL ON SCHEMA mare_game FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE TABLE mare_game.accounts (
    id uuid PRIMARY KEY,
    provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 64),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, subject)
);

-- Foundation only. No account creation endpoint or local-save import is enabled.
CREATE TABLE mare_game.characters (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL UNIQUE REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
    class_id text NOT NULL CHECK (class_id IN ('brawler','sword','gunner','rogue','cyborg','strategist','healer')),
    faction_id text NOT NULL CHECK (faction_id IN ('revolutionary','pirate','marine','government')),
    state_version bigint NOT NULL DEFAULT 0 CHECK (state_version BETWEEN 0 AND 9007199254740991),
    created_at timestamptz NOT NULL DEFAULT now()
);
