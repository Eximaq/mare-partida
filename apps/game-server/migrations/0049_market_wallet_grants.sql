-- Keep the already published market migration immutable. Repair wallet checks
-- for both existing deployments and jobs using limited database roles.
CREATE OR REPLACE FUNCTION mare_game.market_wallet_headroom() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE reserved numeric;
BEGIN
  SELECT coalesce(sum(amount),0) INTO reserved FROM mare_game.market_proposals
    WHERE buyer_id=NEW.character_id AND status='pending';
  IF reserved>0 AND NEW.gold>9007199254740991-reserved THEN
    RAISE EXCEPTION 'market_wallet_limit' USING ERRCODE='23514',CONSTRAINT='market_wallet_limit';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION mare_game.market_proposal_headroom() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  available bigint;
  other_reservations numeric;
BEGIN
  IF NEW.status<>'pending' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status='pending' AND NEW.amount<=OLD.amount THEN RETURN NEW; END IF;
  END IF;

  -- The market has already debited the new amount or increase in the same
  -- transaction. Check the new reservation with the remaining available Berry.
  SELECT gold INTO available FROM mare_game.character_progression
    WHERE character_id=NEW.buyer_id FOR UPDATE;
  SELECT coalesce(sum(amount),0) INTO other_reservations FROM mare_game.market_proposals
    WHERE buyer_id=NEW.buyer_id AND status='pending' AND id<>NEW.id;
  IF available::numeric+other_reservations+NEW.amount>9007199254740991 THEN
    RAISE EXCEPTION 'market_wallet_limit' USING ERRCODE='23514',CONSTRAINT='market_wallet_limit';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER market_proposal_headroom BEFORE INSERT OR UPDATE OF amount,status
ON mare_game.market_proposals FOR EACH ROW EXECUTE FUNCTION mare_game.market_proposal_headroom();

REVOKE ALL ON FUNCTION mare_game.market_wallet_headroom(),mare_game.market_proposal_headroom() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
    GRANT UPDATE (mana_potions) ON mare_game.game_inventory TO mare_runtime;
    GRANT SELECT ON mare_game.market_listings,mare_game.market_proposals,mare_game.market_notifications TO mare_runtime;
    GRANT EXECUTE ON FUNCTION mare_game.market_balance(uuid),mare_game.market_reward_wallet_offset(uuid),
      mare_game.market_expire(integer),mare_game.market_command(uuid,jsonb,integer,integer,integer) TO mare_runtime;
  END IF;
END
$$;
