CREATE TABLE mare_game.social_mail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 source text NOT NULL CHECK(source IN ('dungeon','event','system')),
 source_id text NOT NULL CHECK(length(source_id) BETWEEN 1 AND 120),
 reward_id text NOT NULL CHECK(length(reward_id) BETWEEN 1 AND 120),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 96),
 message text NOT NULL CHECK(length(message) BETWEEN 1 AND 480),
 attachments jsonb NOT NULL CHECK(jsonb_typeof(attachments)='array' AND jsonb_array_length(attachments) BETWEEN 1 AND 24 AND octet_length(attachments::text)<=32768),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 read_at timestamptz,
 claimed_at timestamptz,
 claimed_request_id uuid,
 archived_at timestamptz,
 UNIQUE(character_id,source,source_id,reward_id),
 FOREIGN KEY(character_id,claimed_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
 CHECK((claimed_at IS NULL)=(claimed_request_id IS NULL)),
 CHECK(archived_at IS NULL OR claimed_at IS NOT NULL)
);
CREATE INDEX social_mail_inbox ON mare_game.social_mail (character_id,(claimed_at IS NOT NULL),created_at DESC,id DESC) WHERE archived_at IS NULL;
REVOKE ALL ON mare_game.social_mail FROM PUBLIC;

-- Once recorded, delivery, reading and archival dates are immutable.
CREATE FUNCTION mare_game.guard_social_mail_receipt() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at)
 OR (OLD.claimed_at IS NOT NULL AND (NEW.claimed_at IS DISTINCT FROM OLD.claimed_at OR NEW.claimed_request_id IS DISTINCT FROM OLD.claimed_request_id))
 OR (OLD.archived_at IS NOT NULL AND NEW.archived_at IS DISTINCT FROM OLD.archived_at) THEN
  RAISE EXCEPTION 'Official mail receipt is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_social_mail_receipt BEFORE UPDATE ON mare_game.social_mail FOR EACH ROW EXECUTE FUNCTION mare_game.guard_social_mail_receipt();
REVOKE ALL ON FUNCTION mare_game.guard_social_mail_receipt() FROM PUBLIC;

ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','items.use-xp-boost','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest','mail.claim','mail.claim-all'));

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT ON mare_game.social_mail TO mare_runtime;
  GRANT INSERT (character_id,source,source_id,reward_id,title,message,attachments), UPDATE (read_at,claimed_at,claimed_request_id,archived_at) ON mare_game.social_mail TO mare_runtime;
 END IF;
END
$$;
