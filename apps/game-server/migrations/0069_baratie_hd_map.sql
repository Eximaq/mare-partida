-- Baratie has a newly authored restaurant-ship layout. Reanchor only known
-- Baratie positions; retain stable map/encounter IDs, inventories and receipts.
UPDATE mare_game.character_world
SET x=1536, y=1952, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='be0c0ca913d50938d37fa1b20dde8da334f2ca7aef0f295d734718b7c81a2c1a'
  AND map_id='baratie';

-- Other maps retain exact positions, direction, routes, speed and clocks.
-- Unknown signatures stay rejected; replay cannot relocate migrated players.
UPDATE mare_game.character_world
SET rules_hash='0ec69dfeb2ffe38be8a38f37c65479bf4f65d1c4f695cfe5336f172924bd7989'
WHERE rules_hash='be0c0ca913d50938d37fa1b20dde8da334f2ca7aef0f295d734718b7c81a2c1a';

-- Runtime compatibility moves the eight authored encounters and party extras
-- by stable spawn ID, preserving accents in salão/convés, HP, alive/dead state,
-- respawns, hunt progress and reward receipts. Geometry-bound actions stop.
