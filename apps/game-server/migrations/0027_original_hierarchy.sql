-- No import from the browser/SQLite preview. New online characters start at tier1.
CREATE TABLE mare_game.character_hierarchy (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 tier integer NOT NULL DEFAULT 1 CHECK(tier BETWEEN 1 AND 5),
 power integer NOT NULL DEFAULT 0 CHECK(power BETWEEN 0 AND 1000000000)
);
CREATE INDEX hierarchy_rank_idx ON mare_game.character_hierarchy(tier DESC,power DESC,character_id);
CREATE TABLE mare_game.hierarchy_promotions (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 request_id uuid NOT NULL,
 tier_before integer NOT NULL CHECK(tier_before BETWEEN 1 AND 4),
 tier_after integer NOT NULL CHECK(tier_after=tier_before+1),
 level integer NOT NULL CHECK(level>=CASE tier_after WHEN 2 THEN 20 WHEN 3 THEN 50 WHEN 4 THEN 75 WHEN 5 THEN 100 ELSE 2147483647 END),
 version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,tier_after),UNIQUE(character_id,request_id),UNIQUE(character_id,version_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.character_hierarchy,mare_game.hierarchy_promotions FROM PUBLIC;
