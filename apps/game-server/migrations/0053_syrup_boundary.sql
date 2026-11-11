-- Only Syrup changes geometry; invalidate its old routes and arrive at the cyan marker.
UPDATE mare_game.character_world
SET x=2296, y=3144, path='[]'::jsonb, speed=0, motion_until=started_at,
    rules_hash='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9'
WHERE map_id='syrup'
  AND rules_hash='c0c0a4b93d15ffc69ddd1fc3e01d297bd045d6c648e0291f68622e76083cc501';

-- Other maps keep positions and paths: their geometry and gameplay are unchanged.
UPDATE mare_game.character_world
SET rules_hash='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9'
WHERE rules_hash='c0c0a4b93d15ffc69ddd1fc3e01d297bd045d6c648e0291f68622e76083cc501';
