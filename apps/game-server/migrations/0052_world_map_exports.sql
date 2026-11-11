-- Re-anchor characters on replaced maps. In-flight paths refer to the old geometry.
WITH spawn(map_id, x, y) AS (VALUES
 ('alubarna-01', 3048, 4408),
 ('alubarna-02', 3048, 4408),
 ('alubarna-03', 3048, 4408),
 ('alubarna-04', 3048, 4408),
 ('alubarna-05', 3048, 4408),
 ('arlong', 1384, 1640),
 ('baratie', 1496, 2200),
 ('conchas', 2144, 2720),
 ('lobby', 1504, 1568),
 ('loguetown', 1576, 3032),
 ('dawn', 872, 1608),
 ('syrup', 1816, 2104),
 ('orange', 1184, 1952),
 ('quest-dungeons', 1824, 2144)
)
UPDATE mare_game.character_world AS world
SET rules_hash='c0c0a4b93d15ffc69ddd1fc3e01d297bd045d6c648e0291f68622e76083cc501',
    x=spawn.x, y=spawn.y, path='[]'::jsonb, speed=0, motion_until=world.started_at
FROM spawn
WHERE world.map_id=spawn.map_id
  AND world.rules_hash='face3a9b1c4478cf40c93343ec3a5f9d090564869a99303c99fb8292f2a6ce83';

-- Unchanged maps retain their positions and paths.
UPDATE mare_game.character_world
SET rules_hash='c0c0a4b93d15ffc69ddd1fc3e01d297bd045d6c648e0291f68622e76083cc501'
WHERE rules_hash='face3a9b1c4478cf40c93343ec3a5f9d090564869a99303c99fb8292f2a6ce83';
