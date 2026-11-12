CREATE TABLE mare_game.weekly_boss_loot (
  event_id uuid NOT NULL,
  character_id uuid NOT NULL,
  rank_b boolean NOT NULL,
  haki text CHECK (haki IN ('armament','observation')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(event_id,character_id),
  FOREIGN KEY(event_id,character_id) REFERENCES mare_game.weekly_boss_victories(event_id,character_id)
);
REVOKE ALL ON mare_game.weekly_boss_loot FROM PUBLIC;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT, INSERT ON mare_game.weekly_boss_loot TO mare_runtime;
END IF; END $$;
