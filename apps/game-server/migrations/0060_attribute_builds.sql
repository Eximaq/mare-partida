CREATE TABLE mare_game.character_attribute_builds (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 profile text NOT NULL CHECK(profile IN ('brawler','sword','rogue','gunner','cyborg','strategist','healer')),
 automatic boolean NOT NULL DEFAULT false,
 credits jsonb NOT NULL DEFAULT '{"strength":0,"dexterity":0,"vitality":0,"intelligence":0,"spirit":0}'::jsonb
);
REVOKE ALL ON mare_game.character_attribute_builds FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN GRANT SELECT,INSERT,UPDATE ON mare_game.character_attribute_builds TO mare_runtime; END IF; END $$;

ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.sell-batch','items.lock-batch','items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','items.use-xp-boost','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest','mail.claim','mail.claim-all'));

-- Preserve fractional derived HP in the legacy dock encounter as in world battles.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE mare_game.combat_encounters DROP COLUMN player_max_hp;
ALTER TABLE mare_game.combat_encounters ALTER COLUMN player_hp TYPE double precision;
ALTER TABLE mare_game.combat_encounters ADD COLUMN player_max_hp double precision GENERATED ALWAYS AS (coalesce((fighter->>'maxHp')::double precision,30)) STORED,
 ADD CHECK(player_max_hp BETWEEN 30 AND 2147483647 AND player_hp BETWEEN 0 AND player_max_hp);
ALTER TABLE mare_game.combat_rounds DROP COLUMN player_after;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='mare_game.combat_rounds'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%player_before%'
 LOOP EXECUTE format('ALTER TABLE mare_game.combat_rounds DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.combat_rounds ALTER COLUMN player_before TYPE double precision;
ALTER TABLE mare_game.combat_rounds ADD CHECK(player_before>0 AND player_before<=2147483647);
ALTER TABLE mare_game.combat_rounds ALTER COLUMN enemy_damage TYPE double precision;
ALTER TABLE mare_game.combat_rounds ADD COLUMN player_after double precision GENERATED ALWAYS AS (player_before-enemy_damage) STORED,
 ADD CHECK(player_after>=0 AND enemy_after>=0);
SET CONSTRAINTS ALL DEFERRED;
