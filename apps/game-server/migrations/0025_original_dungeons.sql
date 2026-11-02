CREATE TABLE mare_game.character_dungeons (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object' AND octet_length(state::text)<=32768
 AND state ? 'version' AND state->>'version'='1' AND state ? 'seq' AND (state->>'seq')::bigint BETWEEN 0 AND 9007199254740991
 AND state ? 'records' AND jsonb_typeof(state->'records')='object')
);
CREATE TABLE mare_game.dungeon_victories (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 dungeon_id text NOT NULL CHECK(dungeon_id IN ('alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile')),
 run_id uuid NOT NULL,spawn_id uuid NOT NULL,request_id uuid NOT NULL,
 reward jsonb CHECK(reward IS NULL OR jsonb_typeof(reward)='object' AND octet_length(reward::text)<=512),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,dungeon_id),UNIQUE(character_id,spawn_id),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.dungeon_claims (
 character_id uuid NOT NULL,dungeon_id text NOT NULL CHECK(dungeon_id IN ('alvida','morgan')),request_id uuid NOT NULL,
 experience_delta bigint NOT NULL CHECK(experience_delta>=0),gold_delta bigint NOT NULL CHECK(gold_delta>=0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(character_id,dungeon_id),
 FOREIGN KEY(character_id,dungeon_id) REFERENCES mare_game.dungeon_victories(character_id,dungeon_id),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_dungeons,mare_game.dungeon_victories,mare_game.dungeon_claims FROM PUBLIC;
ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft'));
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}','"11d7e176c6e0b3c8ed5fb1f6ddf43f0b023bedfba5c042fb2bb5621771871679"') WHERE simulation->>'rulesHash'='5f9f3b94bacc9b9da99edfeee01f0ce1bbec02dc4d9897c1247fc06e5ace4dd6';
