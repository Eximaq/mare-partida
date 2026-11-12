CREATE TABLE mare_game.contract_weekly_cycles (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 cycle integer NOT NULL, state jsonb NOT NULL, PRIMARY KEY(character_id,cycle)
);
REVOKE ALL ON mare_game.contract_weekly_cycles FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT ON mare_game.contract_weekly_cycles TO mare_runtime;
  GRANT INSERT (character_id,cycle,state), UPDATE (state) ON mare_game.contract_weekly_cycles TO mare_runtime;
 END IF;
END $$;
