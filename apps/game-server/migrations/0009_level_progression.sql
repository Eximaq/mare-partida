-- Frozen cumulative thresholds sampled from the demo curve; no local-save import.
CREATE TABLE mare_game.progression_levels (
    level integer PRIMARY KEY CHECK (level BETWEEN 1 AND 20),
    catalog_id text NOT NULL DEFAULT 'online-levels-v1' CHECK(catalog_id='online-levels-v1'),
    required_experience bigint NOT NULL UNIQUE CHECK(required_experience>=0)
);
INSERT INTO mare_game.progression_levels(level,required_experience) VALUES
(1,0),(2,80),(3,185),(4,338),(5,555),(6,849),(7,1232),(8,1714),(9,2304),(10,3012),
(11,3845),(12,4812),(13,5920),(14,7177),(15,8589),(16,10163),(17,11906),(18,13824),(19,15923),(20,18209);

CREATE TABLE mare_game.character_level_ledger (
    character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
    level integer NOT NULL REFERENCES mare_game.progression_levels(level) ON DELETE RESTRICT CHECK(level>=2),
    catalog_id text NOT NULL DEFAULT 'online-levels-v1' CHECK(catalog_id='online-levels-v1'),
    request_id uuid,
    source text NOT NULL DEFAULT 'reward' CHECK(source IN ('reward','migration')),
    experience_total bigint NOT NULL CHECK(experience_total>=0),
    version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
    version_after bigint GENERATED ALWAYS AS (version_before+1) STORED,
    earned_attribute_points integer GENERATED ALWAYS AS ((level-1)*5) STORED,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(character_id,level),
    CHECK ((source='reward')=(request_id IS NOT NULL)),
    FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
-- 3G only issued level 1. Unexpected manual levels require an explicit migration decision.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM mare_game.character_progression WHERE level<>1) THEN
    RAISE EXCEPTION 'Unexpected pre-3H level; migration requires review';
  END IF;
END $$;
ALTER TABLE mare_game.character_progression ADD FOREIGN KEY(level) REFERENCES mare_game.progression_levels(level) ON DELETE RESTRICT;
-- Existing server-earned XP is preserved. One version increment fences old pending commands.
INSERT INTO mare_game.character_level_ledger(character_id,level,source,experience_total,version_before)
SELECT p.character_id,l.level,'migration',p.experience,c.state_version
FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
JOIN mare_game.progression_levels l ON l.level>p.level AND l.required_experience<=p.experience;
UPDATE mare_game.characters c SET state_version=state_version+1
FROM mare_game.character_progression p WHERE c.id=p.character_id AND p.experience>=80;
UPDATE mare_game.character_progression p SET level=(SELECT max(l.level) FROM mare_game.progression_levels l WHERE l.required_experience<=p.experience)
WHERE p.experience>=80;
REVOKE ALL ON mare_game.progression_levels,mare_game.character_level_ledger FROM PUBLIC;
