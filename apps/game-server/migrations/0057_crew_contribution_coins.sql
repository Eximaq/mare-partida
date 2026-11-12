CREATE TABLE mare_game.crew_contribution_coins (
  character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE CASCADE,
  reference_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount<>0),
  cycle integer,
  mission_kind text CHECK (mission_kind IN ('kills','bosses','donations')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (character_id,reference_id),
  UNIQUE (character_id,cycle,mission_kind),
  CHECK ((amount>0 AND cycle IS NOT NULL AND mission_kind IS NOT NULL)
      OR (amount<0 AND cycle IS NULL AND mission_kind IS NULL))
);
REVOKE ALL ON mare_game.crew_contribution_coins FROM PUBLIC;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT, INSERT ON mare_game.crew_contribution_coins TO mare_runtime;
END IF; END $$;
