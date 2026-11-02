CREATE TABLE mare_game.game_inventory (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 inventory jsonb NOT NULL CHECK(jsonb_typeof(inventory)='array' AND jsonb_array_length(inventory)<=120),
 equipment jsonb NOT NULL CHECK(jsonb_typeof(equipment)='object'),
 materials integer NOT NULL CHECK(materials BETWEEN 0 AND 1000000000),
 potions integer NOT NULL CHECK(potions BETWEEN 0 AND 1000000000),
 forge_seq bigint NOT NULL CHECK(forge_seq BETWEEN 0 AND 9007199254740991),
 forge_history jsonb NOT NULL CHECK(jsonb_typeof(forge_history)='array' AND jsonb_array_length(forge_history)<=12),
 alpha_snapshot jsonb NOT NULL CHECK(jsonb_typeof(alpha_snapshot)='object'),
 initialized_request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(character_id,initialized_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.game_inventory_events (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 action text NOT NULL CHECK(action IN ('items.initialize','items.equip','items.unequip','items.lock','items.sell','potions.buy','potions.use','forge.execute','combat.claim')),
 rules_hash text NOT NULL CHECK(length(rules_hash)=64),
 before_hash text NOT NULL CHECK(length(before_hash)=64),after_hash text NOT NULL CHECK(length(after_hash)=64),
 gold_before bigint NOT NULL CHECK(gold_before>=0),gold_delta bigint NOT NULL,
 gold_after bigint GENERATED ALWAYS AS (gold_before+gold_delta) STORED CHECK(gold_after>=0),
 outcome jsonb NOT NULL CHECK(jsonb_typeof(outcome)='object'),occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,request_id),UNIQUE(character_id,version_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.game_inventory,mare_game.game_inventory_events FROM PUBLIC;
-- Converted alpha rows remain intact as evidence, but can never become a second inventory.
CREATE FUNCTION mare_game.guard_converted_inventory() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM mare_game.game_inventory WHERE character_id=CASE WHEN TG_OP='DELETE' THEN OLD.character_id ELSE NEW.character_id END) THEN
  RAISE EXCEPTION 'Converted inventory is immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_converted_inventory BEFORE INSERT OR UPDATE OR DELETE ON mare_game.character_inventory FOR EACH ROW EXECUTE FUNCTION mare_game.guard_converted_inventory();
CREATE TRIGGER guard_converted_equipment BEFORE INSERT OR UPDATE OR DELETE ON mare_game.character_equipment FOR EACH ROW EXECUTE FUNCTION mare_game.guard_converted_inventory();
REVOKE ALL ON FUNCTION mare_game.guard_converted_inventory() FROM PUBLIC;
-- The old capped alpha fighter must be able to carry original gear's HP. No
-- encounters or receipts are rewritten; the original combat loop is a later domain.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS relation,conname FROM pg_constraint
  WHERE conrelid IN ('mare_game.combat_encounters'::regclass,'mare_game.combat_rounds'::regclass)
  AND contype='c' AND (pg_get_constraintdef(oid) LIKE '%player_max_hp >=%' OR pg_get_constraintdef(oid) LIKE '%player_before >=%')
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.relation,c.conname); END LOOP;
END $$;
ALTER TABLE mare_game.combat_encounters ADD CHECK(player_max_hp BETWEEN 30 AND 32767 AND player_hp BETWEEN 0 AND player_max_hp);
ALTER TABLE mare_game.combat_rounds ADD CHECK(player_before BETWEEN 1 AND 32767);
