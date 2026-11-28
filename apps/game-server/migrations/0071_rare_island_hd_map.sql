-- Rare Animals Island has a newly authored forest and coastal cove layout.
-- Reanchor only known rare positions; retain stable map/encounter IDs and receipts.
UPDATE mare_game.character_world
SET x=1504, y=1952, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='fa87a4f973901d973637e2308106a4f127bc70b7fc93d24dd3a3b3d83e31d71d'
  AND map_id='rare';

-- Other maps retain exact positions, direction, routes, speed and clocks.
-- Unknown signatures stay rejected; replay cannot relocate migrated players.
UPDATE mare_game.character_world
SET rules_hash='b1c2e63f0aa604c4e30ffdffdd765c461450f1752eb2bf2a5ae2c639e8d2dca9'
WHERE rules_hash='fa87a4f973901d973637e2308106a4f127bc70b7fc93d24dd3a3b3d83e31d71d';

-- Runtime compatibility moves the eight Cocox encounters and party extras
-- by stable spawn ID, preserving HP, alive/dead state, respawns, hunt progress
-- and reward receipts. Geometry-bound actions stop; travel keeps animais-raros.
