-- Ephemeral presence only: characters, worlds, saves and economic records are unchanged.
CREATE TABLE mare_game.lobby_channel_members (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE CASCADE,
 channel_id integer NOT NULL CHECK(channel_id BETWEEN 1 AND 4096),
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 24),
 reserved_until timestamptz NOT NULL,
 changed_at timestamptz,
 UNIQUE(channel_id,slot)
);
CREATE INDEX lobby_channel_expiry ON mare_game.lobby_channel_members(reserved_until);
-- Existing controllers keep mutual visibility through the rolling update.
INSERT INTO mare_game.lobby_channel_members(character_id,channel_id,slot,reserved_until)
 SELECT id,((n-1)/24+1)::int,((n-1)%24+1)::smallint,expires_at FROM (
  SELECT w.character_id id,c.expires_at,row_number() OVER(ORDER BY w.character_id) n
  FROM mare_game.character_world w JOIN mare_game.character_control c USING(character_id)
  WHERE w.map_id='lobby' AND c.expires_at>clock_timestamp()
 ) existing;
REVOKE ALL ON mare_game.lobby_channel_members FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON mare_game.lobby_channel_members TO mare_runtime;
 END IF;
END $$;
