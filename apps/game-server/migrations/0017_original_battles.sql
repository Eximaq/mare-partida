-- Opt-in simulation. Existing saves, characters and encounter history are untouched.
CREATE TABLE mare_game.character_battles (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 simulation jsonb NOT NULL CHECK(jsonb_typeof(simulation)='object' AND octet_length(simulation::text)<=262144
   AND simulation->>'version'='1' AND jsonb_typeof(simulation->'hp')='number' AND simulation ? 'hp'
   AND (simulation->>'hp')::double precision BETWEEN 0 AND 1000000000),
 control_epoch bigint NOT NULL CHECK(control_epoch>=1),
 tick_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE mare_game.world_battle_rewards (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 spawn_id uuid NOT NULL,
 request_id uuid NOT NULL,
 area text NOT NULL CHECK(length(area) BETWEEN 1 AND 40),
 monster text NOT NULL CHECK(length(monster) BETWEEN 1 AND 60),
 experience_delta bigint NOT NULL CHECK(experience_delta>=0),
 gold_delta bigint NOT NULL CHECK(gold_delta>=0),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,spawn_id),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first'));
REVOKE ALL ON mare_game.character_battles,mare_game.world_battle_rewards FROM PUBLIC;
