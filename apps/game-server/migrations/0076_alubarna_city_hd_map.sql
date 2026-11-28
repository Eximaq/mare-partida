-- Alubarna's five independent destinations now share a new HD city scene.
-- Preserve each map/area, all fifty encounter IDs and the separate hunt ledgers.
UPDATE mare_game.character_world
SET x=1536, y=1536, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4'
  AND map_id IN ('alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05');

-- Other maps retain exact coordinates, direction, paths, speed and clocks.
-- Unknown signatures remain rejected; replay cannot relocate migrated rows.
UPDATE mare_game.character_world
SET rules_hash='efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87'
WHERE rules_hash='7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4';

-- Runtime compatibility reanchors encounters and party extras by stable ID,
-- preserving HP, alive/dead state, respawns, hunt progress and receipts.
-- Spatial actions tied to the previous city geometry stop only in Alubarna.
