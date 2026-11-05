CREATE TABLE mare_game.social_trades (
  id uuid PRIMARY KEY,
  initiator_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  target_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','declined','cancelled','expired','completed')),
  offer_version integer NOT NULL DEFAULT 0 CHECK(offer_version>=0),
  initiator_locked boolean NOT NULL DEFAULT false,
  target_locked boolean NOT NULL DEFAULT false,
  initiator_confirmed boolean NOT NULL DEFAULT false,
  target_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  receipt jsonb,
  CHECK(initiator_id<>target_id),
  CHECK(expires_at>created_at),
  CHECK((status IN ('pending','active'))=(ended_at IS NULL)),
  CHECK((status='completed')=(receipt IS NOT NULL)),
  CHECK(receipt IS NULL OR jsonb_typeof(receipt)='object'),
  CHECK(NOT (initiator_confirmed OR target_confirmed) OR (initiator_locked AND target_locked))
);
CREATE UNIQUE INDEX social_trade_pending_pair ON mare_game.social_trades(
  least(initiator_id,target_id),greatest(initiator_id,target_id)
) WHERE status='pending';
CREATE INDEX social_trade_sender_history ON mare_game.social_trades(initiator_id,created_at DESC);
CREATE INDEX social_trade_receiver_history ON mare_game.social_trades(target_id,created_at DESC);
CREATE INDEX social_trade_expiry ON mare_game.social_trades(expires_at) WHERE status IN ('pending','active');
CREATE INDEX social_trade_sender_completed ON mare_game.social_trades(initiator_id,ended_at DESC,id DESC) WHERE status='completed';
CREATE INDEX social_trade_receiver_completed ON mare_game.social_trades(target_id,ended_at DESC,id DESC) WHERE status='completed';

CREATE TABLE mare_game.social_trade_members (
  character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  trade_id uuid NOT NULL REFERENCES mare_game.social_trades(id) ON DELETE RESTRICT,
  UNIQUE(trade_id,character_id)
);
CREATE TABLE mare_game.social_trade_reservations (
  character_id uuid NOT NULL,
  item_id text NOT NULL CHECK(length(item_id) BETWEEN 1 AND 80),
  trade_id uuid NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99999),
  item jsonb NOT NULL CHECK(jsonb_typeof(item)='object' AND item->>'id'=item_id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(character_id,item_id),
  FOREIGN KEY(trade_id,character_id) REFERENCES mare_game.social_trade_members(trade_id,character_id) ON DELETE CASCADE
);
CREATE INDEX social_trade_reservation_session ON mare_game.social_trade_reservations(trade_id,character_id,created_at,item_id);

-- A finished session and its receipt are durable. Runtime writes only affect live trades.
CREATE FUNCTION mare_game.guard_terminal_trade() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Finished trade is immutable'
    USING ERRCODE='23514', CONSTRAINT='social_trade_finished';
END $$;
CREATE TRIGGER guard_terminal_trade BEFORE UPDATE OR DELETE ON mare_game.social_trades
FOR EACH ROW WHEN (OLD.status NOT IN ('pending','active')) EXECUTE FUNCTION mare_game.guard_terminal_trade();
REVOKE ALL ON FUNCTION mare_game.guard_terminal_trade() FROM PUBLIC;

-- Every existing inventory writer converges on this row. A live reservation
-- protects the exact JSON instance from movement, consumption and mutation.
CREATE FUNCTION mare_game.guard_trade_reservations() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM mare_game.social_trade_reservations r
    JOIN mare_game.social_trades t ON t.id=r.trade_id
    WHERE r.character_id=OLD.character_id AND t.status='active' AND t.expires_at>clock_timestamp()
    AND (TG_OP='DELETE' OR NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(NEW.inventory) candidate(item)
      WHERE candidate.item->>'id'=r.item_id AND candidate.item=r.item
    ))
  ) THEN
    RAISE EXCEPTION 'Item reserved for an active trade'
      USING ERRCODE='23514', CONSTRAINT='social_trade_inventory_reserved';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER guard_trade_reservations BEFORE UPDATE OF inventory OR DELETE
ON mare_game.game_inventory FOR EACH ROW EXECUTE FUNCTION mare_game.guard_trade_reservations();

REVOKE ALL ON mare_game.social_trades,mare_game.social_trade_members,mare_game.social_trade_reservations FROM PUBLIC;
REVOKE ALL ON FUNCTION mare_game.guard_trade_reservations() FROM PUBLIC;
