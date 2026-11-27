CREATE TABLE mare_game.sword_collections (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE CASCADE,
 entries jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(entries)='object')
);

-- Keep the shared worker and exclusive arena membership. The modes keep separate rules and receipts.
ALTER TABLE mare_game.weekly_boss_events
 DROP CONSTRAINT weekly_boss_events_boss_id_check,
 DROP CONSTRAINT weekly_boss_events_check,
 ADD CONSTRAINT shared_boss_map_check CHECK (
  (boss_id='akainu' AND (mode='test' OR map_id='marineford'))
  OR (boss_id IN ('daily-mihawk','daily-shanks','daily-ryuma-alive','daily-oden','daily-rayleigh','daily-zoro','daily-shiki')
      AND mode='official' AND map_id='arena-espadachins')
 );
CREATE UNIQUE INDEX daily_sword_event_once ON mare_game.weekly_boss_events(cycle_key) WHERE map_id='arena-espadachins';
CREATE TABLE mare_game.daily_sword_victories (
 event_id uuid NOT NULL REFERENCES mare_game.weekly_boss_events(id) ON DELETE RESTRICT,
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE CASCADE,
 damage double precision NOT NULL CHECK(damage>=0),
 healing double precision NOT NULL CHECK(healing>=0),
 loot jsonb NOT NULL CHECK(jsonb_typeof(loot)='object'),
 PRIMARY KEY(event_id,character_id)
);

-- The only navigation difference is the newly registered event arena.
UPDATE mare_game.character_world
SET rules_hash='24fb16ebe9096c84138d5a0d3180edec15d557ad787991148172715d34c05b97'
WHERE rules_hash='17b282eefa60baea6281d1333f00694eecfbd88285323a691e70a2612437c15f';
