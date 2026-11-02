CREATE TABLE mare_game.fruit_registrations (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 fruit_id text NOT NULL CHECK(fruit_id ~ '^akuma_[a-z_]{1,50}$'),
 item_id text NOT NULL CHECK(length(item_id) BETWEEN 1 AND 80),
 request_id uuid NOT NULL,
 version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,fruit_id),UNIQUE(character_id,request_id),UNIQUE(character_id,version_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.fruit_registrations FROM PUBLIC;

-- Only the known previous simulation rules are upgraded. Unknown versions fail closed.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('47658838c992adc1806a80fb64660ce809e05cac44569cdab2caecddbd8394b5'::text)) WHERE simulation->>'rulesHash'='dda97ea842c4df922f59eecda3fa8ea09c62d915ed74fc2033af719a12df52ce';
