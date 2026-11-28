-- A cosmetic collection is independent of the equipment inventory and its capacity.
ALTER TABLE mare_game.character_profile
 ADD COLUMN cosmetics jsonb NOT NULL DEFAULT '{"owned":[],"equipped":{},"demoClaimed":false}'::jsonb,
 ADD CONSTRAINT character_profile_cosmetics_valid CHECK(
  jsonb_typeof(cosmetics)='object'
  AND cosmetics ?& ARRAY['owned','equipped','demoClaimed']
  AND jsonb_typeof(cosmetics->'owned')='array'
  AND jsonb_typeof(cosmetics->'equipped')='object'
  AND jsonb_typeof(cosmetics->'demoClaimed')='boolean'
  AND octet_length(cosmetics::text)<=65536
 );
