-- Preserve the 3F tables byte-for-byte; copy their records to per-encounter storage.
-- LIKE includes checks/defaults/generated values, but deliberately not old unique indexes.
CREATE TABLE mare_game.combat_encounters (LIKE mare_game.character_combats INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING GENERATED);
ALTER TABLE mare_game.combat_encounters
    ADD COLUMN encounter_id uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN ordinal integer NOT NULL DEFAULT 1 CHECK (ordinal BETWEEN 1 AND 100),
    ADD COLUMN closed_at timestamptz,
    ADD PRIMARY KEY (character_id,encounter_id),
    ADD UNIQUE (character_id,ordinal),
    ADD UNIQUE (character_id,begin_request_id),
    ADD CHECK ((phase IN ('lost','claimed')) = (closed_at IS NOT NULL)),
    ADD FOREIGN KEY (character_id) REFERENCES mare_game.character_hunt_rewards(character_id) ON DELETE RESTRICT,
    ADD FOREIGN KEY (character_id,begin_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
    ADD FOREIGN KEY (character_id,last_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX combat_one_open ON mare_game.combat_encounters(character_id) WHERE phase IN ('active','won');
CREATE INDEX combat_start_budget ON mare_game.combat_encounters(character_id,started_at);

CREATE TABLE mare_game.combat_rounds (LIKE mare_game.character_combat_rounds INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING GENERATED);
ALTER TABLE mare_game.combat_rounds
    ADD COLUMN encounter_id uuid NOT NULL,
    ADD PRIMARY KEY (character_id,request_id),
    ADD UNIQUE (character_id,encounter_id,turn),
    ADD FOREIGN KEY (character_id,encounter_id) REFERENCES mare_game.combat_encounters(character_id,encounter_id) ON DELETE RESTRICT,
    ADD FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE mare_game.combat_rewards (LIKE mare_game.character_combat_rewards INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING GENERATED);
ALTER TABLE mare_game.combat_rewards
    ADD COLUMN encounter_id uuid NOT NULL,
    ADD PRIMARY KEY (character_id,encounter_id),
    ADD UNIQUE (character_id,request_id),
    ADD FOREIGN KEY (character_id,encounter_id) REFERENCES mare_game.combat_encounters(character_id,encounter_id) ON DELETE RESTRICT,
    ADD FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED;

INSERT INTO mare_game.combat_encounters(character_id,begin_request_id,last_request_id,catalog_id,phase,player_hp,enemy_hp,turn,started_at,next_attack_at,closed_at)
SELECT b.character_id,b.begin_request_id,b.last_request_id,b.catalog_id,b.phase,b.player_hp,b.enemy_hp,b.turn,b.started_at,b.next_attack_at,
    CASE WHEN b.phase='claimed' THEN w.occurred_at WHEN b.phase='lost' THEN r.occurred_at ELSE NULL END
FROM mare_game.character_combats b
LEFT JOIN mare_game.character_combat_rewards w ON w.character_id=b.character_id
LEFT JOIN mare_game.character_combat_rounds r ON r.character_id=b.character_id AND r.turn=b.turn;

INSERT INTO mare_game.combat_rounds(character_id,request_id,turn,version_before,player_before,enemy_before,player_damage,enemy_damage,occurred_at,encounter_id)
SELECT r.character_id,r.request_id,r.turn,r.version_before,r.player_before,r.enemy_before,r.player_damage,r.enemy_damage,r.occurred_at,b.encounter_id
FROM mare_game.character_combat_rounds r JOIN mare_game.combat_encounters b USING(character_id);
INSERT INTO mare_game.combat_rewards(character_id,request_id,version_before,experience_before,gold_before,occurred_at,encounter_id)
SELECT w.character_id,w.request_id,w.version_before,w.experience_before,w.gold_before,w.occurred_at,b.encounter_id
FROM mare_game.character_combat_rewards w JOIN mare_game.combat_encounters b USING(character_id);
REVOKE ALL ON mare_game.combat_encounters,mare_game.combat_rounds,mare_game.combat_rewards FROM PUBLIC;
