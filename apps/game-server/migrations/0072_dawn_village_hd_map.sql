-- Dawn/Foosha village replaces only the Dawn scene geometry.
-- Preserve the existing dawn map, beach area and all stable encounter IDs.
UPDATE mare_game.character_world
SET x=1536, y=1808, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='b1c2e63f0aa604c4e30ffdffdd765c461450f1752eb2bf2a5ae2c639e8d2dca9'
  AND map_id='dawn';

-- Other destinations retain their exact coordinates, routes and clocks.
-- Unknown signatures remain rejected; replay cannot relocate migrated rows.
UPDATE mare_game.character_world
SET rules_hash='f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b'
WHERE rules_hash='b1c2e63f0aa604c4e30ffdffdd765c461450f1752eb2bf2a5ae2c639e8d2dca9';

-- Runtime compatibility reanchors the fourteen encounters, existing boss
-- and party extras by spawn ID. HP, dead state, respawns, hunt progress and
-- already-claimed rewards remain intact; obsolete spatial actions stop.
