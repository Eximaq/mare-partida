CREATE TABLE mare_game.character_prison (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object' AND octet_length(state::text)<=4096
 AND state ? 'version' AND state->>'version'='1' AND state ? 'cleared' AND (state->>'cleared')::integer BETWEEN 0 AND 100
 AND state ? 'claimed' AND jsonb_typeof(state->'claimed')='array' AND jsonb_array_length(state->'claimed')<=10)
);
CREATE TABLE mare_game.prison_floors (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),floor smallint NOT NULL CHECK(floor BETWEEN 1 AND 100),
 spawn_id uuid NOT NULL,request_id uuid NOT NULL,monster text NOT NULL CHECK(length(monster) BETWEEN 1 AND 60),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,floor),UNIQUE(character_id,spawn_id),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.prison_milestones (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),floor smallint NOT NULL CHECK(floor IN (5,10,15,20,25,30,35,40,45,50)),
 request_id uuid NOT NULL,item_id text NOT NULL CHECK(item_id='impel-milestone-'||floor),claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,floor),UNIQUE(character_id,item_id),
 FOREIGN KEY(character_id,floor) REFERENCES mare_game.prison_floors(character_id,floor),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_prison,mare_game.prison_floors,mare_game.prison_milestones FROM PUBLIC;
ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward'));
-- Compatible engine upgrade: only the preceding known hash; payloads are preserved.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}','"5f9f3b94bacc9b9da99edfeee01f0ce1bbec02dc4d9897c1247fc06e5ace4dd6"') WHERE simulation->>'rulesHash'='c6f28ee5b9d8ce36d1df33e560675ddab0038e6186a5691483238bb25c9c91bf';
