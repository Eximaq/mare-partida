CREATE TABLE mare_game.character_talents (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 build jsonb NOT NULL CHECK(jsonb_typeof(build)='object'),
 revision bigint NOT NULL CHECK(revision>=1 AND revision<=9007199254740991)
);
CREATE TABLE mare_game.character_talent_events (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 request_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('talents.commit','talents.reset')),
 revision_before bigint NOT NULL CHECK(revision_before>=0),
 build_before jsonb NOT NULL,
 build_after jsonb NOT NULL,
 earned integer NOT NULL CHECK(earned>=1),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,request_id),
 UNIQUE(character_id,revision_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_talents,mare_game.character_talent_events FROM PUBLIC;
CREATE TABLE mare_game.battle_talent_steals (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 spawn_id uuid NOT NULL,
 total integer NOT NULL CHECK(total BETWEEN 1 AND 6),
 PRIMARY KEY(character_id,spawn_id)
);
REVOKE ALL ON mare_game.battle_talent_steals FROM PUBLIC;
