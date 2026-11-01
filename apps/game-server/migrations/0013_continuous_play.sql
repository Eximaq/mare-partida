-- Remove only the pilot ordinal ceiling, preserving every identity/receipt/reward.
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='mare_game.combat_encounters'::regclass AND contype='c'
   AND pg_get_constraintdef(oid) ~ '\mordinal\M'
 LOOP EXECUTE format('ALTER TABLE mare_game.combat_encounters DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.combat_encounters ADD CHECK(ordinal BETWEEN 1 AND 2147483647);
SET CONSTRAINTS ALL DEFERRED;
-- Existing (character_id,created_at) and (character_id,started_at) indexes support bounded windows.
-- No deduplication keys are deleted: old economic commands remain replay-safe.
