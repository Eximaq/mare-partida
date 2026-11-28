-- Loguetown has a new layout; only its recognized old coordinates and paths
-- are invalidated. Stable map IDs, progress, inventories and receipts remain.
UPDATE mare_game.character_world
SET x=2048, y=2736, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='7a6056d9a7974974d6d1dc4bc811b4bf9a582901cf6f42d3378ad6fe5f973262'
  AND map_id='loguetown';

-- Other maps keep exact coordinates, direction, path, speed and clocks.
-- Unknown signatures remain rejected; replay cannot relocate a migrated save.
UPDATE mare_game.character_world
SET rules_hash='c08f45b4a0edee7c4756515411bebfb9b50081abcb159d56417fc434d8a31eec'
WHERE rules_hash='7a6056d9a7974974d6d1dc4bc811b4bf9a582901cf6f42d3378ad6fe5f973262';

-- Runtime compatibility reanchors Loguetown monsters by stable spawn ID,
-- including party-room extras, before promoting the known battle signature.
-- Existing HP, alive/dead state, respawns, hunt progress and receipts are kept.
