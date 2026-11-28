-- Syrup has a newly authored village and coastal hillside layout. Reanchor
-- only known Syrup positions; retain stable map/encounter IDs and receipts.
UPDATE mare_game.character_world
SET x=1504, y=1952, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='0ec69dfeb2ffe38be8a38f37c65479bf4f65d1c4f695cfe5336f172924bd7989'
  AND map_id='syrup';

-- Other maps retain exact positions, direction, routes, speed and clocks.
-- Unknown signatures stay rejected; replay cannot relocate migrated players.
UPDATE mare_game.character_world
SET rules_hash='fa87a4f973901d973637e2308106a4f127bc70b7fc93d24dd3a3b3d83e31d71d'
WHERE rules_hash='0ec69dfeb2ffe38be8a38f37c65479bf4f65d1c4f695cfe5336f172924bd7989';

-- Runtime compatibility moves the eight authored encounters and party extras
-- by stable spawn ID, preserving the praça accent, HP, alive/dead state,
-- respawns, hunt progress and reward receipts. Geometry-bound actions stop.
