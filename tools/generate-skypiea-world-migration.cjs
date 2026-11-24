'use strict';
// Render the immutable SQL once from the final, verified server world catalog.
// Run from any working directory: node tools/generate-skypiea-world-migration.cjs
const assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const previous='af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9';
const world=load(),nav=world.navigation('skypiea-01'),{x,y}=nav.map.spawn;
assert.deepEqual([nav.map.width,nav.map.height],[7616,4736]);
assert(world.rulesHash!==previous&&/^[a-f0-9]{64}$/.test(world.rulesHash));
assert(Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&nav.walkable(x,y));
assert(['skypiea-01','skypiea-02','skypiea-03','skypiea-04'].every(id=>world.maps[id]&&world.islands.some(i=>i.id===id&&world.mapId(i.area)===id)));
console.log(`-- The old Skypiea coordinates refer to different geometry. Keep the existing map ID,
-- reset only its position and movement, and preserve all combat/progression records.
UPDATE mare_game.character_world
SET x=${x}, y=${y}, path='[]'::jsonb, speed=0, motion_until=started_at,
    rules_hash='${world.rulesHash}'
WHERE map_id='skypiea-01'
  AND rules_hash='${previous}';

-- Other maps retain their exact coordinates and movement.
UPDATE mare_game.character_world
SET rules_hash='${world.rulesHash}'
WHERE rules_hash='${previous}';`);
