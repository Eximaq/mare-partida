CREATE TABLE mare_game.character_commands (
    character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
    result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object' AND octet_length(result::text) <= 2048),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (character_id, request_id)
);
CREATE INDEX character_commands_recent ON mare_game.character_commands(character_id, created_at);
REVOKE ALL ON mare_game.character_commands FROM PUBLIC;
