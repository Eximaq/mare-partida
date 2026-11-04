-- Freeze the pre-update allowance once. Its historical provenance is not invented.
-- New characters have no row and receive zero legacy points.
CREATE TABLE mare_game.talent_legacy_allowances (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 budget integer NOT NULL CHECK(budget>=0),
 captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO mare_game.talent_legacy_allowances(character_id,budget)
 SELECT c.id,p.level FROM mare_game.characters c
 JOIN mare_game.character_progression p ON p.character_id=c.id;
REVOKE ALL ON mare_game.talent_legacy_allowances FROM PUBLIC;
-- A new character can legitimately have no PT; old audited receipts are unchanged.
ALTER TABLE mare_game.character_talent_events DROP CONSTRAINT character_talent_events_earned_check;
ALTER TABLE mare_game.character_talent_events ADD CHECK(earned>=0);
