-- Phase 3A: backend-owned initial state; no rewards, mutations or local-save import.
CREATE TABLE mare_game.character_progression (
    character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
    experience bigint NOT NULL DEFAULT 0 CHECK (experience >= 0),
    gold bigint NOT NULL DEFAULT 0 CHECK (gold >= 0)
);
REVOKE ALL ON mare_game.character_progression FROM PUBLIC;

-- Existing online identities receive clean defaults. Their identity/version is untouched.
INSERT INTO mare_game.character_progression(character_id)
SELECT id FROM mare_game.characters;
