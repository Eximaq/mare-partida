CREATE TABLE mare_game.account_kairoseki (
  account_id uuid PRIMARY KEY REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
  balance bigint NOT NULL CHECK (balance >= 0)
);

REVOKE ALL ON mare_game.account_kairoseki FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mare_runtime') THEN
    GRANT SELECT ON mare_game.account_kairoseki TO mare_runtime;
  END IF;
END $$;
