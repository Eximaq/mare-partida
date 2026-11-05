-- Server time owns recurring contracts and consumable expiry.
CREATE TABLE mare_game.contract_daily_cycles (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 cycle integer NOT NULL,
 state jsonb NOT NULL,
 PRIMARY KEY(character_id,cycle)
);
ALTER TABLE mare_game.character_progression ADD COLUMN xp_boost_until timestamptz;
REVOKE ALL ON mare_game.contract_daily_cycles FROM PUBLIC;

ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','items.use-xp-boost','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest'));

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT ON mare_game.contract_daily_cycles TO mare_runtime;
  GRANT INSERT (character_id,cycle,state), UPDATE (state) ON mare_game.contract_daily_cycles TO mare_runtime;
  GRANT UPDATE (xp_boost_until) ON mare_game.character_progression TO mare_runtime;
 END IF;
END
$$;
