ALTER TABLE mare_game.account_kairoseki ADD COLUMN vip_until timestamptz;
ALTER TABLE mare_game.character_progression
  ADD COLUMN drop_boost_until timestamptz,
  ADD COLUMN xp_boost_percent smallint NOT NULL DEFAULT 100 CHECK (xp_boost_percent IN (50,100));

-- Only the game service can spend. Credits remain outside its privileges.
CREATE FUNCTION mare_game.spend_kairoseki(character_id uuid, cost integer, days integer, needs_vip boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE wallet mare_game.account_kairoseki%ROWTYPE;
BEGIN
  IF cost IS NULL OR cost <= 0 OR days IS NULL OR days NOT IN (0, 7, 30) OR needs_vip IS NULL THEN
    RAISE EXCEPTION 'Invalid Kairoseki debit';
  END IF;
  SELECT w.* INTO wallet
    FROM mare_game.account_kairoseki w JOIN mare_game.characters c ON c.account_id = w.account_id
    WHERE c.id = character_id FOR UPDATE OF w;
  IF needs_vip AND (wallet.vip_until IS NULL OR wallet.vip_until <= statement_timestamp()) THEN
    RETURN 'crew_vip_required';
  END IF;
  IF wallet.balance IS NULL OR wallet.balance < cost THEN
    RETURN 'kairoseki_insufficient';
  END IF;
  UPDATE mare_game.account_kairoseki
    SET balance = balance - cost,
        vip_until = CASE WHEN days = 0 THEN vip_until
          ELSE greatest(vip_until, statement_timestamp()) + days * interval '24 hours' END
    WHERE account_id = wallet.account_id;
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION mare_game.spend_kairoseki(uuid, integer, integer, boolean) FROM PUBLIC;

ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.sell-batch','items.lock-batch','items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','items.use-xp-boost','items.use-drop-boost','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest','mail.claim','mail.claim-all','swords.activate'));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mare_runtime') THEN
    GRANT EXECUTE ON FUNCTION mare_game.spend_kairoseki(uuid, integer, integer, boolean) TO mare_runtime;
    GRANT UPDATE (drop_boost_until, xp_boost_percent) ON mare_game.character_progression TO mare_runtime;
  END IF;
END $$;
