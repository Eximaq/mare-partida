CREATE TABLE mare_game.character_profile (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 appearance jsonb NOT NULL CHECK(jsonb_typeof(appearance)='object' AND octet_length(appearance::text)<=2048),
 preferences jsonb NOT NULL CHECK(jsonb_typeof(preferences)='object' AND octet_length(preferences::text)<=512),
 class_builds jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(class_builds)='object' AND octet_length(class_builds::text)<=16384),
 starter_classes text[] NOT NULL DEFAULT '{}' CHECK(cardinality(starter_classes)<=7)
);
CREATE TABLE mare_game.profile_events (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),request_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('profile.appearance','profile.preferences','profile.identity')),
 version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 before_state jsonb NOT NULL,after_state jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,request_id),UNIQUE(character_id,version_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_profile,mare_game.profile_events FROM PUBLIC;

-- Upgrade only the verified fruit simulation; preserve all progress and cooldowns.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('d3f91ccf1599a03c2c1dc5d808d304a33ed17139c324ea632387137427c223a7'::text)) WHERE simulation->>'rulesHash'='47658838c992adc1806a80fb64660ce809e05cac44569cdab2caecddbd8394b5';
