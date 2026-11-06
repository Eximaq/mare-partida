-- The Market uses the normal character wallet and the normal mail inbox.
-- A pending proposal is escrowed: its Berry has already left available gold.
CREATE TABLE mare_game.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  buyer_id uuid REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  mode text NOT NULL CHECK (mode IN ('direct','auction')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')),
  item jsonb NOT NULL CHECK (jsonb_typeof(item)='object' AND item ? 'id'),
  details jsonb NOT NULL CHECK (jsonb_typeof(details)='object' AND details ? 'name'),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99999),
  price bigint CHECK (price BETWEEN 1 AND 1000000000000),
  min_offer bigint CHECK (min_offer BETWEEN 1 AND 1000000000000),
  buy_now bigint CHECK (buy_now BETWEEN min_offer AND 1000000000000),
  fee_bps integer NOT NULL CHECK (fee_bps IN (1000,1500)),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  gross bigint,
  fee bigint,
  net bigint,
  delivery_mail_id uuid UNIQUE REFERENCES mare_game.social_mail(id) ON DELETE RESTRICT,
  collected_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (buyer_id IS NULL OR seller_id <> buyer_id),
  CHECK ((mode='direct' AND price IS NOT NULL AND min_offer IS NULL AND buy_now IS NULL)
      OR (mode='auction' AND price IS NULL AND min_offer IS NOT NULL)),
  CHECK ((status='active')=(ended_at IS NULL) AND (status='active')=(delivery_mail_id IS NULL)),
  CHECK ((status='sold' AND buyer_id IS NOT NULL AND gross > 0 AND fee >= 0 AND net >= 0
      AND gross IS NOT NULL AND fee IS NOT NULL AND net IS NOT NULL AND gross=fee+net)
    OR (status<>'sold' AND buyer_id IS NULL AND gross IS NULL AND fee IS NULL AND net IS NULL AND collected_at IS NULL))
);
CREATE UNIQUE INDEX market_active_instance ON mare_game.market_listings(seller_id,(item->>'id')) WHERE status='active';
CREATE INDEX market_active_recent ON mare_game.market_listings(created_at DESC,id DESC) WHERE status='active';
CREATE INDEX market_active_expiry ON mare_game.market_listings(expires_at,id) WHERE status='active';
CREATE INDEX market_active_category ON mare_game.market_listings((details->>'category'),(details->>'slot'),created_at DESC,id DESC) WHERE status='active';
CREATE INDEX market_active_name ON mare_game.market_listings((details->>'searchName'),id) WHERE status='active';
CREATE INDEX market_active_mode_price ON mare_game.market_listings(mode,(coalesce(price,buy_now,min_offer)),id) WHERE status='active';
CREATE INDEX market_seller_history ON mare_game.market_listings(seller_id,created_at DESC,id DESC);
CREATE INDEX market_buyer_history ON mare_game.market_listings(buyer_id,ended_at DESC,id DESC) INCLUDE (gross) WHERE status='sold';
CREATE INDEX market_uncollected ON mare_game.market_listings(seller_id,ended_at,id) WHERE status='sold' AND collected_at IS NULL;
CREATE INDEX market_collected ON mare_game.market_listings(seller_id) INCLUDE (net) WHERE status='sold' AND collected_at IS NOT NULL;

CREATE TABLE mare_game.market_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES mare_game.market_listings(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn','expired','closed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX market_one_pending_offer ON mare_game.market_proposals(listing_id,buyer_id) WHERE status='pending';
CREATE INDEX market_best_offer ON mare_game.market_proposals(listing_id,amount DESC,id) WHERE status='pending';
CREATE INDEX market_proposal_buyer ON mare_game.market_proposals(buyer_id,updated_at DESC,id DESC);
CREATE INDEX market_held_berry ON mare_game.market_proposals(buyer_id) INCLUDE(amount) WHERE status='pending';
CREATE INDEX market_proposal_listing ON mare_game.market_proposals(listing_id,updated_at DESC,id DESC);

CREATE TABLE mare_game.market_commissions (
  listing_id uuid PRIMARY KEY REFERENCES mare_game.market_listings(id) ON DELETE RESTRICT,
  gross bigint NOT NULL CHECK (gross > 0),
  fee bigint NOT NULL CHECK (fee >= 0 AND fee <= gross),
  fee_bps integer NOT NULL CHECK (fee_bps IN (1000,1500)),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Recipients are derived from the locked listing/proposals, never user data.
-- Avoid a foreign-key lock on a seller's live character when a proposal arrives.
CREATE TABLE mare_game.market_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES mare_game.market_listings(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('proposal_received','proposal_accepted','proposal_rejected','proposal_withdrawn','proposal_closed','proposal_expired','purchase','sale','listing_expired','listing_cancelled')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz
);
CREATE INDEX market_notice_listing ON mare_game.market_notifications(listing_id) WHERE read_at IS NULL;
CREATE INDEX market_notice_inbox ON mare_game.market_notifications(character_id,created_at DESC,id DESC) WHERE read_at IS NULL;
CREATE UNIQUE INDEX market_one_unread_notice ON mare_game.market_notifications(character_id,kind,subject_id) WHERE read_at IS NULL;

ALTER TABLE mare_game.social_mail DROP CONSTRAINT social_mail_source_check;
ALTER TABLE mare_game.social_mail ADD CONSTRAINT social_mail_source_check CHECK (source IN ('dungeon','event','system','market'));

CREATE FUNCTION mare_game.market_balance(actor uuid)
RETURNS TABLE (available bigint,reserved bigint,receivable bigint)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT gold,
    coalesce((SELECT sum(p.amount)::bigint FROM mare_game.market_proposals p WHERE p.buyer_id=actor AND p.status='pending'),0),
    coalesce((SELECT sum(l.net)::bigint FROM mare_game.market_listings l WHERE l.seller_id=actor AND l.status='sold' AND l.collected_at IS NULL),0)
  FROM mare_game.character_progression WHERE character_id=actor
$$;

-- Undo only market movements when an older reward calculation uses current
-- wallet as a fallback for historical Berry earned before its ledger existed.
CREATE FUNCTION mare_game.market_reward_wallet_offset(actor uuid) RETURNS numeric
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT
    coalesce((SELECT sum(p.amount) FROM mare_game.market_proposals p WHERE p.buyer_id=actor AND p.status='pending'),0)
    + coalesce((SELECT sum(l.gross) FROM mare_game.market_listings l WHERE l.buyer_id=actor AND l.status='sold'),0)
    - coalesce((SELECT sum(l.net) FROM mare_game.market_listings l WHERE l.seller_id=actor AND l.status='sold' AND l.collected_at IS NOT NULL),0)
$$;

-- Keep room for a complete escrow refund even if the character earns Berry
-- while an offer is pending. This only matters at the game's existing safe cap.
CREATE FUNCTION mare_game.market_wallet_headroom() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.gold>9007199254740991-COALESCE((
    SELECT sum(amount) FROM mare_game.market_proposals WHERE buyer_id=NEW.character_id AND status='pending'
  ),0) THEN
    RAISE EXCEPTION 'market_wallet_limit' USING ERRCODE='23514',CONSTRAINT='market_wallet_limit';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER market_wallet_headroom BEFORE UPDATE OF gold ON mare_game.character_progression
FOR EACH ROW WHEN (NEW.gold > OLD.gold) EXECUTE FUNCTION mare_game.market_wallet_headroom();

-- The game worker, Party and account commands acquire this same character
-- advisory lock before touching world/inventory/progression rows. Never wait on
-- someone else's lock while holding an actor lock or a marketplace listing.
CREATE FUNCTION mare_game.market_lock_character(target uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended(target::text,1296126533)) THEN
    RAISE lock_not_available;
  END IF;
  PERFORM id FROM mare_game.characters WHERE id=target FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'market_character_missing'; END IF;
  PERFORM character_id FROM mare_game.character_progression WHERE character_id=target FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'market_character_missing'; END IF;
END $$;

CREATE FUNCTION mare_game.market_touch(actor uuid, peer uuid) RETURNS void
LANGUAGE sql SET search_path=pg_catalog AS $$
  UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=peer AND peer IS DISTINCT FROM actor
$$;

CREATE FUNCTION mare_game.market_notice(recipient uuid, listing uuid, event_kind text, subject uuid) RETURNS void
LANGUAGE sql SET search_path=pg_catalog AS $$
  INSERT INTO mare_game.market_notifications(character_id,listing_id,kind,subject_id)
  VALUES(recipient,listing,event_kind,subject)
  ON CONFLICT (character_id,kind,subject_id) WHERE read_at IS NULL
  DO UPDATE SET created_at=clock_timestamp()
$$;

CREATE FUNCTION mare_game.market_mail(recipient uuid, listing uuid, item jsonb, sold boolean) RETURNS uuid
LANGUAGE sql SET search_path=pg_catalog AS $$
  INSERT INTO mare_game.social_mail(character_id,source,source_id,reward_id,title,message,attachments)
  VALUES(recipient,'market',listing::text,CASE WHEN sold THEN 'purchase' ELSE 'return' END,
    CASE WHEN sold THEN 'Compra no Mercado dos Mares' ELSE 'Devolução do Mercado dos Mares' END,
    CASE WHEN sold THEN 'Resgate o item adquirido no Mercado dos Mares.' ELSE 'O anúncio foi encerrado. Resgate seu item devolvido.' END,
    jsonb_build_array(item)) RETURNING id
$$;

-- This function runs inside the command receipt transaction. All terminal
-- transitions lock the same listing and recheck versions before calling it.
CREATE FUNCTION mare_game.market_finish(
  listing mare_game.market_listings, actor uuid, terminal text, purchaser uuid, amount bigint, winner uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE
  offer_row mare_game.market_proposals;
  peer_id uuid;
  mail_id uuid;
  fee_value bigint;
  net_value bigint;
  hold bigint := 0;
  proposal_state text;
BEGIN
  -- The outer gameplay transaction may already own a participant's character
  -- lock. Never wait here with the listing locked; abort and allow retry.
  FOR peer_id IN SELECT id FROM mare_game.characters WHERE id=purchaser
    OR (terminal<>'sold' AND id=listing.seller_id)
    OR id IN (SELECT p.buyer_id FROM mare_game.market_proposals p WHERE p.listing_id=listing.id AND p.status='pending')
    ORDER BY id
  LOOP
    PERFORM mare_game.market_lock_character(peer_id);
  END LOOP;

  IF terminal='sold' AND winner IS NULL THEN
    SELECT coalesce(sum(p.amount),0)::bigint INTO hold FROM mare_game.market_proposals p
      WHERE p.listing_id=listing.id AND p.buyer_id=purchaser AND p.status='pending';
    IF NOT EXISTS(SELECT 1 FROM mare_game.character_progression
      WHERE character_id=purchaser AND gold+hold>=amount) THEN
      RAISE EXCEPTION 'market_gold_insufficient';
    END IF;
  END IF;

  FOR offer_row IN SELECT * FROM mare_game.market_proposals
    WHERE listing_id=listing.id AND status='pending' ORDER BY buyer_id,id FOR UPDATE
  LOOP
    proposal_state := CASE WHEN offer_row.id=winner THEN 'accepted' WHEN terminal='expired' THEN 'expired' ELSE 'closed' END;
    UPDATE mare_game.market_proposals SET status=proposal_state,version=version+1,updated_at=clock_timestamp() WHERE id=offer_row.id;
    IF offer_row.id IS DISTINCT FROM winner THEN
      UPDATE mare_game.character_progression SET gold=gold+offer_row.amount WHERE character_id=offer_row.buyer_id;
    END IF;
    PERFORM mare_game.market_touch(actor,offer_row.buyer_id);
    PERFORM mare_game.market_notice(offer_row.buyer_id,listing.id,'proposal_'||proposal_state,offer_row.id);
  END LOOP;

  UPDATE mare_game.market_notifications SET read_at=clock_timestamp()
    WHERE listing_id=listing.id AND kind='proposal_received' AND read_at IS NULL;

  IF terminal='sold' THEN
    IF winner IS NULL THEN
      UPDATE mare_game.character_progression SET gold=gold-amount WHERE character_id=purchaser AND gold>=amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'market_gold_insufficient'; END IF;
    END IF;
    -- Integer division deliberately rounds the commission down to whole Berry.
    fee_value := amount * listing.fee_bps / 10000;
    net_value := amount - fee_value;
    INSERT INTO mare_game.market_commissions(listing_id,gross,fee,fee_bps) VALUES(listing.id,amount,fee_value,listing.fee_bps);
    mail_id := mare_game.market_mail(purchaser,listing.id,listing.item,true);
  ELSE
    mail_id := mare_game.market_mail(listing.seller_id,listing.id,listing.item,false);
    PERFORM mare_game.market_touch(actor,listing.seller_id);
  END IF;

  UPDATE mare_game.market_listings SET status=terminal,buyer_id=purchaser,version=version+1,ended_at=clock_timestamp(),
    gross=amount,fee=fee_value,net=net_value,delivery_mail_id=mail_id WHERE id=listing.id;

  IF terminal='sold' THEN
    PERFORM mare_game.market_notice(purchaser,listing.id,'purchase',listing.id);
    PERFORM mare_game.market_notice(listing.seller_id,listing.id,'sale',listing.id);
  ELSE
    PERFORM mare_game.market_notice(listing.seller_id,listing.id,'listing_'||terminal,listing.id);
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object('listingId',listing.id,'proposalId',winner,'version',listing.version+1,
    'status',terminal,'mailId',mail_id,'gross',amount,'fee',fee_value,'net',net_value));
END $$;

CREATE FUNCTION mare_game.market_expire(batch_size integer DEFAULT 20) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  listing mare_game.market_listings;
  expired integer := 0;
BEGIN
  FOR listing IN SELECT * FROM mare_game.market_listings WHERE status='active' AND expires_at<=clock_timestamp()
    ORDER BY expires_at,id LIMIT greatest(1,least(coalesce(batch_size,20),100)) FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM mare_game.market_finish(listing,NULL,'expired',NULL,NULL,NULL);
      expired := expired + 1;
    EXCEPTION WHEN lock_not_available THEN
      -- Gameplay owns a relevant character briefly; a later sweep can retry.
      NULL;
    END;
  END LOOP;
  RETURN expired;
END $$;

CREATE FUNCTION mare_game.market_positive(raw text) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE value bigint;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  IF raw !~ '^[0-9]{1,13}$' THEN RAISE EXCEPTION 'market_invalid_amount'; END IF;
  value := raw::bigint;
  IF value<1 OR value>1000000000000 THEN RAISE EXCEPTION 'market_invalid_amount'; END IF;
  RETURN value;
END $$;

CREATE FUNCTION mare_game.market_command(
  actor uuid, input jsonb, fee_bps integer, listing_limit integer, publish_interval_seconds integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  operation text := input->>'kind';
  listing mare_game.market_listings;
  proposal mare_game.market_proposals;
  current_item jsonb;
  custody_item jsonb;
  stock jsonb;
  equipped jsonb;
  item_quantity integer;
  quantity integer;
  hours integer;
  mode text;
  price bigint;
  minimum bigint;
  immediate bigint;
  offer_amount bigint;
  wallet bigint;
  difference bigint;
  target_id uuid;
  collected bigint;
  reply jsonb;
  now_at timestamptz := clock_timestamp();
BEGIN
  PERFORM mare_game.market_lock_character(actor);

  IF operation='market_publish' THEN
    IF fee_bps IS NULL OR fee_bps NOT IN (1000,1500)
      OR listing_limit IS NULL OR listing_limit NOT BETWEEN 1 AND 200
      OR publish_interval_seconds IS NULL OR publish_interval_seconds NOT BETWEEN 0 AND 86400 THEN
      RAISE EXCEPTION 'market_configuration';
    END IF;
    IF (SELECT count(*) FROM mare_game.market_listings WHERE seller_id=actor AND status='active' AND expires_at>now_at)>=listing_limit THEN
      RAISE EXCEPTION 'market_listing_limit';
    END IF;
    IF EXISTS(SELECT 1 FROM mare_game.market_listings WHERE seller_id=actor
      AND created_at>now_at-make_interval(secs=>publish_interval_seconds)) THEN
      RAISE EXCEPTION 'market_publish_rate';
    END IF;
    mode := input->>'mode';
    hours := (input->>'hours')::integer;
    quantity := (input->>'quantity')::integer;
    IF mode IS NULL OR mode NOT IN ('direct','auction') OR hours IS NULL OR hours NOT IN (24,48,72)
      OR quantity IS NULL OR quantity NOT BETWEEN 1 AND 99999 OR jsonb_typeof(input->'details') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'market_invalid_listing';
    END IF;
    IF mode='direct' THEN
      price := mare_game.market_positive(input->>'price');
      IF price IS NULL THEN RAISE EXCEPTION 'market_invalid_amount'; END IF;
    ELSE
      minimum := mare_game.market_positive(input->>'minOffer');
      immediate := mare_game.market_positive(input->>'buyNow');
      IF minimum IS NULL OR immediate<minimum THEN RAISE EXCEPTION 'market_invalid_amount'; END IF;
    END IF;
    SELECT inventory,equipment INTO stock,equipped FROM mare_game.game_inventory WHERE character_id=actor FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'market_inventory_missing'; END IF;
    SELECT val INTO current_item FROM jsonb_array_elements(stock) AS entry(val) WHERE val->>'id'=input->>'itemId';
    IF current_item IS NULL THEN
      IF EXISTS (SELECT 1 FROM jsonb_each(equipped) AS gear(k,val) WHERE val->>'id'=input->>'itemId') THEN
        RAISE EXCEPTION 'market_item_equipped';
      END IF;
      RAISE EXCEPTION 'market_item_unavailable';
    END IF;
    IF current_item IS DISTINCT FROM input->'item' THEN RAISE EXCEPTION 'market_item_changed'; END IF;
    IF current_item->>'locked'='true' THEN RAISE EXCEPTION 'market_item_locked'; END IF;
    IF current_item->>'binding' IS NOT NULL OR current_item->>'boundToCharacter' IS NOT NULL THEN
      RAISE EXCEPTION 'market_item_untradable';
    END IF;
    IF EXISTS (SELECT 1 FROM mare_game.social_trade_reservations r JOIN mare_game.social_trades t ON t.id=r.trade_id
      WHERE r.character_id=actor AND r.item_id=input->>'itemId' AND t.status='active' AND t.expires_at>clock_timestamp()) THEN
      RAISE EXCEPTION 'market_item_reserved';
    END IF;

    item_quantity := coalesce((current_item->>'qty')::integer,1);
    IF quantity>item_quantity THEN RAISE EXCEPTION 'market_invalid_quantity'; END IF;
    custody_item := current_item;
    IF quantity<item_quantity THEN
      custody_item := current_item || jsonb_build_object('id',gen_random_uuid(),'qty',quantity);
    END IF;
    UPDATE mare_game.game_inventory SET inventory=coalesce((
      SELECT jsonb_agg(CASE WHEN val->>'id'=input->>'itemId'
        THEN val || jsonb_build_object('qty',item_quantity-quantity) ELSE val END ORDER BY position)
      FROM jsonb_array_elements(stock) WITH ORDINALITY AS entry(val,position)
      WHERE val->>'id'<>input->>'itemId' OR quantity<item_quantity
    ),'[]'::jsonb) WHERE character_id=actor;

    INSERT INTO mare_game.market_listings(seller_id,mode,item,details,quantity,price,min_offer,buy_now,fee_bps,created_at,expires_at)
    VALUES(actor,mode,custody_item,input->'details'||jsonb_build_object('instanceId',custody_item->>'id','quantity',quantity),
      quantity,price,minimum,immediate,fee_bps,now_at,now_at+make_interval(hours=>hours))
    RETURNING * INTO listing;
    RETURN jsonb_build_object('kind',operation,'listingId',listing.id,'version',listing.version,'status',listing.status);
  END IF;

  IF operation='market_read_notices' THEN
    IF jsonb_typeof(input->'noticeIds') IS DISTINCT FROM 'array' OR jsonb_array_length(input->'noticeIds')>50 THEN
      RAISE EXCEPTION 'market_invalid_action';
    END IF;
    UPDATE mare_game.market_notifications SET read_at=clock_timestamp() WHERE character_id=actor AND read_at IS NULL
      AND id IN (SELECT val::uuid FROM jsonb_array_elements_text(input->'noticeIds') AS ids(val));
    RETURN jsonb_build_object('kind',operation);
  END IF;

  IF operation IN ('market_collect','market_collect_all') THEN
    IF operation='market_collect' THEN
      target_id := coalesce(input->>'saleId',input->>'listingId')::uuid;
      IF target_id IS NULL OR NOT EXISTS (SELECT 1 FROM mare_game.market_listings WHERE id=target_id AND seller_id=actor AND status='sold') THEN
        RAISE EXCEPTION 'market_sale_missing';
      END IF;
    END IF;
    SELECT b.available+b.reserved INTO wallet FROM mare_game.market_balance(actor) AS b;
    IF wallet IS NULL THEN RAISE EXCEPTION 'market_character_missing'; END IF;
    collected := 0;
    FOR listing IN SELECT * FROM mare_game.market_listings
      WHERE seller_id=actor AND status='sold' AND collected_at IS NULL AND (target_id IS NULL OR id=target_id)
      ORDER BY ended_at,id FOR UPDATE NOWAIT
    LOOP
      IF listing.net>9007199254740991-wallet-collected THEN
        IF operation='market_collect' THEN RAISE EXCEPTION 'market_wallet_limit'; END IF;
        CONTINUE;
      END IF;
      UPDATE mare_game.market_listings SET collected_at=clock_timestamp() WHERE id=listing.id;
      collected := collected+listing.net;
    END LOOP;
    IF collected>0 THEN
      UPDATE mare_game.character_progression SET gold=gold+collected WHERE character_id=actor;
    END IF;
    RETURN jsonb_strip_nulls(jsonb_build_object('kind',operation,'listingId',target_id,'collected',collected));
  END IF;

  IF operation IS NULL OR operation NOT IN ('market_buy','market_offer','market_withdraw','market_reject','market_accept','market_cancel') THEN
    RAISE EXCEPTION 'market_invalid_action';
  END IF;
  SELECT * INTO listing FROM mare_game.market_listings WHERE id=(input->>'listingId')::uuid FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'market_listing_missing'; END IF;
  IF listing.status<>'active' OR listing.expires_at<=clock_timestamp() THEN
    RAISE EXCEPTION 'market_listing_closed';
  END IF;
  IF listing.version IS DISTINCT FROM (input->>'version')::integer THEN RAISE EXCEPTION 'market_stale'; END IF;

  IF operation IN ('market_buy','market_offer') THEN
    IF EXISTS (SELECT 1 FROM mare_game.characters seller JOIN mare_game.characters buyer ON buyer.account_id=seller.account_id
      WHERE seller.id=listing.seller_id AND buyer.id=actor) THEN
      RAISE EXCEPTION 'market_own_listing';
    END IF;
    offer_amount := mare_game.market_positive(input->>'amount');
    IF offer_amount IS NULL THEN RAISE EXCEPTION 'market_invalid_amount'; END IF;
    IF operation='market_buy' THEN
      price := coalesce(listing.price,listing.buy_now);
      IF price IS NULL THEN RAISE EXCEPTION 'market_buy_unavailable'; END IF;
      IF offer_amount<>price THEN RAISE EXCEPTION 'market_stale'; END IF;
      reply := mare_game.market_finish(listing,actor,'sold',actor,price,NULL);
      RETURN reply||jsonb_build_object('kind',operation);
    END IF;

    IF listing.mode<>'auction' OR offer_amount<listing.min_offer THEN RAISE EXCEPTION 'market_offer_below_minimum'; END IF;
    IF listing.buy_now IS NOT NULL AND offer_amount>=listing.buy_now THEN RAISE EXCEPTION 'market_confirm_buy_now'; END IF;
    SELECT * INTO proposal FROM mare_game.market_proposals
      WHERE listing_id=listing.id AND buyer_id=actor AND status='pending' FOR UPDATE;
    IF (proposal.version IS DISTINCT FROM (input->>'proposalVersion')::integer)
      OR (input ? 'proposalId' AND proposal.id IS DISTINCT FROM (input->>'proposalId')::uuid) THEN
      RAISE EXCEPTION 'market_stale';
    END IF;
    IF proposal.id IS NULL AND (SELECT count(*) FROM mare_game.market_proposals WHERE listing_id=listing.id AND status='pending')>=50 THEN
      RAISE EXCEPTION 'market_proposal_limit';
    END IF;
    difference := offer_amount-coalesce(proposal.amount,0);
    IF difference=0 THEN
      RETURN jsonb_build_object('kind',operation,'listingId',listing.id,'proposalId',proposal.id,'version',listing.version,'proposalVersion',proposal.version,'status','pending');
    END IF;

    -- Set a smaller hold before refunding the difference, or debit before
    -- increasing the hold, so the invariant also holds at the wallet ceiling.
    IF difference>0 THEN
      UPDATE mare_game.character_progression SET gold=gold-difference WHERE character_id=actor AND gold>=difference;
      IF NOT FOUND THEN RAISE EXCEPTION 'market_gold_insufficient'; END IF;
    END IF;
    IF proposal.id IS NULL THEN
      INSERT INTO mare_game.market_proposals(listing_id,buyer_id,amount) VALUES(listing.id,actor,offer_amount) RETURNING * INTO proposal;
    ELSE
      UPDATE mare_game.market_proposals SET amount=offer_amount,version=version+1,updated_at=clock_timestamp()
      WHERE id=proposal.id RETURNING * INTO proposal;
    END IF;
    IF difference<0 THEN
      UPDATE mare_game.character_progression SET gold=gold-difference WHERE character_id=actor;
    END IF;
    PERFORM mare_game.market_notice(listing.seller_id,listing.id,'proposal_received',proposal.id);
    RETURN jsonb_build_object('kind',operation,'listingId',listing.id,'proposalId',proposal.id,'version',listing.version,'proposalVersion',proposal.version,'status','pending');
  END IF;

  IF operation<>'market_withdraw' AND listing.seller_id<>actor THEN RAISE EXCEPTION 'market_not_seller'; END IF;
  IF operation='market_cancel' THEN
    reply := mare_game.market_finish(listing,actor,'cancelled',NULL,NULL,NULL);
    RETURN reply||jsonb_build_object('kind',operation);
  END IF;

  SELECT * INTO proposal FROM mare_game.market_proposals WHERE id=(input->>'proposalId')::uuid AND listing_id=listing.id FOR UPDATE;
  IF NOT FOUND OR (operation='market_withdraw' AND proposal.buyer_id<>actor) THEN RAISE EXCEPTION 'market_proposal_missing'; END IF;
  IF proposal.status<>'pending' OR proposal.version IS DISTINCT FROM (input->>'proposalVersion')::integer THEN
    RAISE EXCEPTION 'market_stale';
  END IF;
  IF operation='market_accept' THEN
    IF input ? 'amount' AND proposal.amount IS DISTINCT FROM mare_game.market_positive(input->>'amount') THEN
      RAISE EXCEPTION 'market_stale';
    END IF;
    reply := mare_game.market_finish(listing,actor,'sold',proposal.buyer_id,proposal.amount,proposal.id);
    RETURN reply||jsonb_build_object('kind',operation);
  END IF;

  PERFORM mare_game.market_lock_character(proposal.buyer_id);
  UPDATE mare_game.market_proposals SET status=CASE WHEN operation='market_withdraw' THEN 'withdrawn' ELSE 'rejected' END,
    version=version+1,updated_at=clock_timestamp() WHERE id=proposal.id RETURNING * INTO proposal;
  UPDATE mare_game.character_progression SET gold=gold+proposal.amount WHERE character_id=proposal.buyer_id;
  PERFORM mare_game.market_touch(actor,proposal.buyer_id);
  UPDATE mare_game.market_notifications SET read_at=clock_timestamp()
    WHERE listing_id=listing.id AND subject_id=proposal.id AND kind='proposal_received' AND read_at IS NULL;
  IF operation='market_withdraw' THEN
    PERFORM mare_game.market_notice(listing.seller_id,listing.id,'proposal_withdrawn',proposal.id);
  ELSE
    PERFORM mare_game.market_notice(proposal.buyer_id,listing.id,'proposal_rejected',proposal.id);
  END IF;
  RETURN jsonb_build_object('kind',operation,'listingId',listing.id,'proposalId',proposal.id,'version',listing.version,'proposalVersion',proposal.version,'status',proposal.status);
EXCEPTION WHEN lock_not_available THEN
  RAISE EXCEPTION 'market_busy';
END $$;

REVOKE ALL ON mare_game.market_listings,mare_game.market_proposals,mare_game.market_commissions,mare_game.market_notifications FROM PUBLIC;
REVOKE ALL ON FUNCTION mare_game.market_balance(uuid),mare_game.market_reward_wallet_offset(uuid),mare_game.market_lock_character(uuid),mare_game.market_touch(uuid,uuid),mare_game.market_wallet_headroom(),
  mare_game.market_notice(uuid,uuid,text,uuid),mare_game.market_mail(uuid,uuid,jsonb,boolean),
  mare_game.market_finish(mare_game.market_listings,uuid,text,uuid,bigint,uuid),mare_game.market_expire(integer),
  mare_game.market_positive(text),mare_game.market_command(uuid,jsonb,integer,integer,integer) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
    GRANT SELECT ON mare_game.market_listings,mare_game.market_proposals,mare_game.market_notifications TO mare_runtime;
    GRANT EXECUTE ON FUNCTION mare_game.market_balance(uuid),mare_game.market_reward_wallet_offset(uuid),mare_game.market_expire(integer),mare_game.market_command(uuid,jsonb,integer,integer,integer) TO mare_runtime;
  END IF;
END $$;
