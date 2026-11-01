-- Allocated points only. Existing characters begin with an empty history, never a save import.
CREATE TABLE mare_game.character_attribute_ledger (
    character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    catalog_id text NOT NULL DEFAULT 'online-attributes-v1' CHECK(catalog_id='online-attributes-v1'),
    strength integer NOT NULL CHECK(strength BETWEEN 0 AND 95),
    dexterity integer NOT NULL CHECK(dexterity BETWEEN 0 AND 95),
    vitality integer NOT NULL CHECK(vitality BETWEEN 0 AND 95),
    intelligence integer NOT NULL CHECK(intelligence BETWEEN 0 AND 95),
    spirit integer NOT NULL CHECK(spirit BETWEEN 0 AND 95),
    cost integer GENERATED ALWAYS AS (strength+dexterity+vitality+intelligence+spirit) STORED,
    version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(character_id,request_id),
    UNIQUE(character_id,version_before),
    CHECK(cost BETWEEN 1 AND 95),
    FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_attribute_ledger FROM PUBLIC;
