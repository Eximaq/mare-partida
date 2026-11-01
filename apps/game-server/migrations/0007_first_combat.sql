-- Versioned, one-off encounter. No update/import of existing character progress.
CREATE TABLE mare_game.character_combats (
    character_id uuid PRIMARY KEY REFERENCES mare_game.character_hunt_rewards(character_id) ON DELETE RESTRICT,
    begin_request_id uuid NOT NULL,
    last_request_id uuid NOT NULL,
    catalog_id text NOT NULL DEFAULT 'dock-raider-v1' CHECK (catalog_id='dock-raider-v1'),
    phase text NOT NULL DEFAULT 'active' CHECK (phase IN ('active','won','lost','claimed')),
    player_hp smallint NOT NULL DEFAULT 30 CHECK (player_hp BETWEEN 0 AND 30),
    enemy_hp smallint NOT NULL DEFAULT 36 CHECK (enemy_hp BETWEEN 0 AND 36),
    turn smallint NOT NULL DEFAULT 0 CHECK (turn BETWEEN 0 AND 4),
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    next_attack_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '2 seconds'),
    CHECK ((phase='active' AND player_hp>0 AND enemy_hp>0 AND turn<4)
        OR (phase IN ('won','claimed') AND player_hp>0 AND enemy_hp=0 AND turn>0)
        OR (phase='lost' AND player_hp=0 AND enemy_hp>0 AND turn>0)),
    FOREIGN KEY (character_id,begin_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (character_id,last_request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.character_combat_rounds (
    character_id uuid NOT NULL REFERENCES mare_game.character_combats(character_id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    turn smallint NOT NULL CHECK (turn BETWEEN 1 AND 4),
    version_before bigint NOT NULL CHECK (version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    player_before smallint NOT NULL CHECK (player_before BETWEEN 1 AND 30),
    enemy_before smallint NOT NULL CHECK (enemy_before BETWEEN 1 AND 36),
    player_damage smallint NOT NULL CHECK (player_damage BETWEEN 1 AND 14),
    enemy_damage smallint NOT NULL CHECK (enemy_damage BETWEEN 0 AND 11),
    player_after smallint GENERATED ALWAYS AS (player_before-enemy_damage) STORED CHECK (player_after>=0),
    enemy_after smallint GENERATED ALWAYS AS (enemy_before-player_damage) STORED CHECK (enemy_after>=0),
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(character_id,request_id),
    UNIQUE(character_id,turn),
    CHECK ((enemy_after=0 AND enemy_damage=0) OR (enemy_after>0 AND enemy_damage>0)),
    FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mare_game.character_combat_rewards (
    character_id uuid PRIMARY KEY REFERENCES mare_game.character_combats(character_id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    version_before bigint NOT NULL CHECK (version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    experience_before bigint NOT NULL CHECK (experience_before BETWEEN 0 AND 9223372036854775777),
    experience_after bigint GENERATED ALWAYS AS (experience_before+30) STORED,
    gold_before bigint NOT NULL CHECK (gold_before BETWEEN 0 AND 9223372036854775795),
    gold_after bigint GENERATED ALWAYS AS (gold_before+12) STORED,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_combats,mare_game.character_combat_rounds,mare_game.character_combat_rewards FROM PUBLIC;
