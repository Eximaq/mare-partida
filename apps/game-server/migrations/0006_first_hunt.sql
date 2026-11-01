-- One introductory hunt per character. Additive; no imports or updates to old saves.
CREATE TABLE mare_game.character_hunts (
    character_id uuid PRIMARY KEY REFERENCES mare_game.character_journey_ledger(character_id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    catalog_id text NOT NULL DEFAULT 'dock-patrol-v1' CHECK (catalog_id='dock-patrol-v1'),
    version_before bigint NOT NULL CHECK (version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    begun_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.character_hunt_rewards (
    character_id uuid PRIMARY KEY REFERENCES mare_game.character_hunts(character_id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    version_before bigint NOT NULL CHECK (version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    experience_before bigint NOT NULL CHECK (experience_before BETWEEN 0 AND 9223372036854775787),
    experience_after bigint GENERATED ALWAYS AS (experience_before+20) STORED,
    gold_before bigint NOT NULL CHECK (gold_before BETWEEN 0 AND 9223372036854775799),
    gold_after bigint GENERATED ALWAYS AS (gold_before+8) STORED,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id)
        DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_hunts,mare_game.character_hunt_rewards FROM PUBLIC;
