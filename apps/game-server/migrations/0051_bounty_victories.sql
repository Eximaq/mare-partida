-- Reserved for trusted official result processing when competitive modes launch.
-- No client-facing grant or insert privilege is provided while the modes are inactive.
CREATE TABLE mare_game.bounty_victories (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 mode text NOT NULL CHECK(mode IN ('gvg','duels')),
 match_id uuid NOT NULL,
 opponent_id uuid NOT NULL,
 credited_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,mode,match_id)
);
REVOKE ALL ON mare_game.bounty_victories FROM PUBLIC;

CREATE INDEX bounty_victories_opponent_recent
  ON mare_game.bounty_victories(character_id,mode,opponent_id,credited_at DESC);

-- Private entry point for a future official result processor. For GvG, opponent
-- is the opposing crew at match time. For duels, it is a player character.
CREATE FUNCTION mare_game.credit_bounty_victory(
  winner uuid, competition text, match uuid, opponent uuid,
  outcome text, official boolean, eligible boolean
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog, mare_game
AS $$
DECLARE
  winner_account uuid;
  opponent_key uuid := opponent;
  inserted integer;
BEGIN
  IF official IS DISTINCT FROM true OR eligible IS DISTINCT FROM true
     OR outcome IS DISTINCT FROM 'win' OR competition IS NULL
     OR competition NOT IN ('gvg','duels') OR match IS NULL OR opponent IS NULL THEN
    RETURN false;
  END IF;

  -- Serialize credits for the same character, including the repeat-opponent check.
  SELECT account_id INTO winner_account FROM mare_game.characters WHERE id=winner FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF competition='duels' THEN
    SELECT account_id INTO opponent_key FROM mare_game.characters WHERE id=opponent;
    IF NOT FOUND OR opponent_key=winner_account THEN RETURN false; END IF;
  END IF;

  -- Bound repeated wins against the same account or crew without deleting history.
  IF (SELECT count(*) FROM mare_game.bounty_victories
      WHERE character_id=winner AND mode=competition AND opponent_id=opponent_key
        AND credited_at>clock_timestamp()-interval '24 hours') >= 3 THEN
    RETURN false;
  END IF;

  INSERT INTO mare_game.bounty_victories(character_id,mode,match_id,opponent_id)
  VALUES(winner,competition,match,opponent_key)
  ON CONFLICT (character_id,mode,match_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted=1;
END;
$$;
REVOKE ALL ON FUNCTION mare_game.credit_bounty_victory(uuid,text,uuid,uuid,text,boolean,boolean) FROM PUBLIC;
