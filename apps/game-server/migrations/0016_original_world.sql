-- Separate authoritative position. No save import or modification to existing rows.
CREATE TABLE mare_game.character_world (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),
 map_id text NOT NULL CHECK(length(map_id) BETWEEN 1 AND 40),
 area text CHECK(length(area) BETWEEN 1 AND 40),
 x double precision NOT NULL CHECK(x BETWEEN 0 AND 100000),
 y double precision NOT NULL CHECK(y BETWEEN 0 AND 100000),
 path jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(path)='array' AND jsonb_array_length(path)<=128 AND octet_length(path::text)<=16000),
 speed double precision NOT NULL CHECK(speed BETWEEN 0 AND 500),
 direction text NOT NULL DEFAULT 'front' CHECK(direction IN ('front','back','left','right')),
 started_at timestamptz NOT NULL,
 motion_until timestamptz NOT NULL CHECK(motion_until>=started_at AND motion_until<=started_at+interval '120 seconds')
);

ALTER TABLE mare_game.combat_encounters ADD COLUMN world_map_id text,
 ADD COLUMN enemy_x double precision, ADD COLUMN enemy_y double precision,
 ADD CHECK((world_map_id IS NULL AND enemy_x IS NULL AND enemy_y IS NULL) OR
 (world_map_id IS NOT NULL AND world_map_id='dawn' AND enemy_x IS NOT NULL AND enemy_y IS NOT NULL AND enemy_x BETWEEN 0 AND 100000 AND enemy_y BETWEEN 0 AND 100000));
