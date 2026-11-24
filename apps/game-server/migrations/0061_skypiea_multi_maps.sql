-- The old Skypiea coordinates refer to different geometry. Keep the existing map ID,
-- reset only its position and movement, and preserve all combat/progression records.
UPDATE mare_game.character_world
SET x=1512, y=2600, path='[]'::jsonb, speed=0, motion_until=started_at,
    rules_hash='1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd'
WHERE map_id='skypiea-01'
  AND rules_hash='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9';

-- Other maps retain their exact coordinates and movement.
UPDATE mare_game.character_world
SET rules_hash='1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd'
WHERE rules_hash='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9';
