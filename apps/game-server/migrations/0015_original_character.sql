-- Preserve XP, allocated points, active fighters and immutable command receipts.
SET CONSTRAINTS ALL IMMEDIATE;
-- Full immutable fighter snapshots no longer fit the pilot's2KiB receipt.
-- This bounds server-produced output only; request/body limits are unchanged.
ALTER TABLE mare_game.character_commands DROP CONSTRAINT character_commands_result_check;
ALTER TABLE mare_game.character_commands ADD CHECK(jsonb_typeof(result)='object' AND octet_length(result::text)<=16384);
ALTER TABLE mare_game.character_progression ADD COLUMN level_start_experience bigint NOT NULL DEFAULT 0;
UPDATE mare_game.character_progression p SET level_start_experience=l.required_experience
 FROM mare_game.progression_levels l WHERE p.level=l.level;
ALTER TABLE mare_game.character_progression ADD CHECK(level_start_experience BETWEEN 0 AND experience);
ALTER TABLE mare_game.character_progression DROP CONSTRAINT character_progression_level_fkey;
ALTER TABLE mare_game.character_level_ledger DROP CONSTRAINT character_level_ledger_level_fkey;
ALTER TABLE mare_game.character_level_ledger DROP CONSTRAINT character_level_ledger_catalog_id_check;
ALTER TABLE mare_game.character_level_ledger ALTER COLUMN catalog_id SET DEFAULT 'original-levels-v1';
ALTER TABLE mare_game.character_level_ledger ADD CHECK(catalog_id IN ('online-levels-v1','original-levels-v1'));
-- Same point accounting, now bounded by earned points instead of the pilot's level20 ceiling.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='mare_game.character_attribute_ledger'::regclass AND contype='c'
   AND pg_get_constraintdef(oid) ~ '\m(strength|dexterity|vitality|intelligence|spirit|cost)\M'
 LOOP EXECUTE format('ALTER TABLE mare_game.character_attribute_ledger DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.character_attribute_ledger
 ADD CHECK(strength>=0 AND dexterity>=0 AND vitality>=0 AND intelligence>=0 AND spirit>=0),ADD CHECK(cost>0);
-- Widen HP only; retain encounter/reward/round constraints and all old values.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS relation,conname FROM pg_constraint
   WHERE conrelid IN ('mare_game.combat_encounters'::regclass,'mare_game.combat_rounds'::regclass) AND contype='c'
   AND (pg_get_constraintdef(oid) ~ '\m(player_max_hp|fighter|player_before|player_after)\M')
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.relation,c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.combat_encounters DROP COLUMN player_max_hp;
ALTER TABLE mare_game.combat_encounters ALTER COLUMN player_hp TYPE integer;
ALTER TABLE mare_game.combat_encounters
 ADD COLUMN player_max_hp integer GENERATED ALWAYS AS (coalesce((fighter->>'maxHp')::integer,30)) STORED,
 ADD CHECK(player_max_hp>=30 AND player_hp BETWEEN 0 AND player_max_hp),
 ADD CHECK(fighter IS NULL OR (jsonb_typeof(fighter)='object' AND fighter->>'rulesetId' IN ('online-combat-v2','original-character-v1')
   AND fighter ? 'maxHp' AND octet_length(fighter::text)<=8192));
ALTER TABLE mare_game.combat_rounds DROP COLUMN player_after;
ALTER TABLE mare_game.combat_rounds ALTER COLUMN player_before TYPE integer;
ALTER TABLE mare_game.combat_rounds
 ADD COLUMN player_after integer GENERATED ALWAYS AS (player_before-enemy_damage) STORED,
 ADD CHECK(player_before>=1),ADD CHECK(player_after>=0 AND enemy_after>=0);
SET CONSTRAINTS ALL DEFERRED;
