-- Arlong Park has a newly authored terrain layout. Reanchor only recognized
-- Arlong positions; preserve all stable IDs, inventories, progress and receipts.
UPDATE mare_game.character_world
SET x=1536, y=2080, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='c08f45b4a0edee7c4756515411bebfb9b50081abcb159d56417fc434d8a31eec'
  AND map_id='arlong';

-- Other maps keep their coordinates, direction, path, speed and clocks.
-- Unknown signatures stay rejected and replay cannot move a migrated player.
UPDATE mare_game.character_world
SET rules_hash='be0c0ca913d50938d37fa1b20dde8da334f2ca7aef0f295d734718b7c81a2c1a'
WHERE rules_hash='c08f45b4a0edee7c4756515411bebfb9b50081abcb159d56417fc434d8a31eec';

-- Runtime compatibility reanchors existing enemies by stable spawn ID, also
-- projecting canonical party rooms and extras before their next persisted tick.
-- HP, alive/dead state, respawns, hunt progress and reward receipts are retained.
