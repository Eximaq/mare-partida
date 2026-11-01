-- Flush deferred FKs from an earlier migration in the same atomic upgrade.
SET CONSTRAINTS ALL IMMEDIATE;
-- Preserve all existing encounters/rounds and receipts. NULL fighter means legacy v1 rules.
-- LIKE-copied checks have implementation-dependent names; replace this known set by table.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS relation,conname FROM pg_constraint
   WHERE conrelid IN ('mare_game.combat_encounters'::regclass,'mare_game.combat_rounds'::regclass) AND contype='c'
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.relation,c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.combat_encounters
 ADD COLUMN fighter jsonb,
 ADD COLUMN player_max_hp smallint GENERATED ALWAYS AS (coalesce((fighter->>'maxHp')::smallint,30)) STORED,
 ADD CHECK(catalog_id='dock-raider-v1'),
 ADD CHECK(phase IN ('active','won','lost','claimed')),
 ADD CHECK(player_max_hp BETWEEN 30 AND 300 AND player_hp BETWEEN 0 AND player_max_hp),
 ADD CHECK(enemy_hp BETWEEN 0 AND 36),
 ADD CHECK(turn BETWEEN 0 AND 4),
 ADD CHECK(ordinal BETWEEN 1 AND 100),
 ADD CHECK((phase IN ('lost','claimed'))=(closed_at IS NOT NULL)),
 ADD CHECK((phase='active' AND player_hp>0 AND enemy_hp>0 AND turn<4)
   OR (phase IN ('won','claimed') AND player_hp>0 AND enemy_hp=0 AND turn>0)
   OR (phase='lost' AND player_hp=0 AND enemy_hp>0 AND turn>0)),
 ADD CHECK(fighter IS NULL OR (jsonb_typeof(fighter)='object' AND fighter->>'rulesetId'='online-combat-v2'
   AND fighter ? 'maxHp' AND octet_length(fighter::text)<=2048));
ALTER TABLE mare_game.combat_rounds
 ADD CHECK(turn BETWEEN 1 AND 4),
 ADD CHECK(version_before BETWEEN 0 AND 9007199254740990),
 ADD CHECK(player_before BETWEEN 1 AND 300),
 ADD CHECK(enemy_before BETWEEN 1 AND 36),
 ADD CHECK(player_damage BETWEEN 1 AND 36),
 ADD CHECK(enemy_damage BETWEEN 0 AND 11),
 ADD CHECK(player_after>=0 AND enemy_after>=0),
 ADD CHECK((enemy_after=0 AND enemy_damage=0) OR (enemy_after>0 AND enemy_damage>0));

SET CONSTRAINTS ALL DEFERRED;
