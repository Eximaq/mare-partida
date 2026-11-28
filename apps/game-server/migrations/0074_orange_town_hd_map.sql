-- Orange Town receives a new coastal town scene with five connected sectors.
-- Keep the orange map/area and ten stable Mr. 3 and Cabaji encounter IDs.
UPDATE mare_game.character_world
SET x=1536, y=1712, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='63d94786300959c580ea26f0f895af50879ce7b4c65735bc3412ecae6dfaee8b'
  AND map_id='orange';

-- Other maps retain exact coordinates, direction, paths, speed and clocks.
-- Unknown signatures remain rejected; replay cannot relocate migrated rows.
UPDATE mare_game.character_world
SET rules_hash='75d653917517f14b56910244d1ff104bba0c736b5d90f0c2fa6dd40be53f8604'
WHERE rules_hash='63d94786300959c580ea26f0f895af50879ce7b4c65735bc3412ecae6dfaee8b';

-- Runtime compatibility reanchors encounters and party extras by spawn ID,
-- preserving HP, alive/dead state, respawns, hunt progress and receipts.
-- Spatial actions tied to the old geometry stop.
