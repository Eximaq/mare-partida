-- One immutable, non-economic milestone per character. No backfill or save import.
CREATE TABLE mare_game.character_journey_ledger (
    character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    event text NOT NULL DEFAULT 'journey.started' CHECK (event = 'journey.started'),
    version_before bigint NOT NULL CHECK (version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before + 1) STORED,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (character_id, request_id) REFERENCES mare_game.character_commands(character_id, request_id)
        DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_journey_ledger FROM PUBLIC;
