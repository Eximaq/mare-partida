-- Conchas/Shells Town receives a new Marine base and coastal city scene.
-- Keep the conchas map, swamp area and eight stable Helmeppo encounter IDs.
UPDATE mare_game.character_world
SET x=1536, y=1968, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b'
  AND map_id='conchas';

-- Other maps retain exact coordinates, direction, paths, speed and clocks.
-- Unknown signatures remain rejected; replay cannot relocate migrated rows.
UPDATE mare_game.character_world
SET rules_hash='63d94786300959c580ea26f0f895af50879ce7b4c65735bc3412ecae6dfaee8b'
WHERE rules_hash='f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b';

-- Runtime compatibility reanchors Helmeppo encounters and party extras
-- by spawn ID, preserving HP, alive/dead state, respawns, hunt progress
-- and reward receipts. Spatial actions tied to the old geometry stop.
