-- Alabasta's desert receives a new HD scene with five connected sectors.
-- Keep the alabasta map/area and ten stable Bananawani encounter IDs.
UPDATE mare_game.character_world
SET x=1536, y=1728, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='75d653917517f14b56910244d1ff104bba0c736b5d90f0c2fa6dd40be53f8604'
  AND map_id='alabasta';

-- Other maps retain exact coordinates, direction, paths, speed and clocks.
-- Unknown signatures remain rejected; replay cannot relocate migrated rows.
UPDATE mare_game.character_world
SET rules_hash='7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4'
WHERE rules_hash='75d653917517f14b56910244d1ff104bba0c736b5d90f0c2fa6dd40be53f8604';

-- Runtime compatibility reanchors encounters and party extras by spawn ID,
-- preserving HP, alive/dead state, respawns, hunt progress and receipts.
-- Spatial actions tied to the old geometry stop.
