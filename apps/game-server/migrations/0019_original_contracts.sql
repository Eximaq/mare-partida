-- Original once-only objectives. No recurring resets or client/imported save data.
CREATE TABLE mare_game.contract_progress (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 contract_id text NOT NULL CHECK(contract_id IN ('crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol')),
 progress integer NOT NULL CHECK(progress>=0 AND progress<=CASE contract_id WHEN 'crab' THEN 6 WHEN 'bandit' THEN 5 WHEN 'boss' THEN 1 WHEN 'dawn-patrol' THEN 20 WHEN 'dawn-clear' THEN 1 WHEN 'conchas-patrol' THEN 30 WHEN 'conchas-clear' THEN 1 WHEN 'orange-patrol' THEN 40 WHEN 'orange-clear' THEN 12 WHEN 'rare-patrol' THEN 20 ELSE 0 END),
 PRIMARY KEY(character_id,contract_id)
);
CREATE TABLE mare_game.contract_claims (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 contract_id text NOT NULL CHECK(contract_id IN ('crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol')),
 request_id uuid NOT NULL,
 version_before bigint NOT NULL CHECK(version_before>=0),
 experience_before bigint NOT NULL CHECK(experience_before>=0),
 gold_before bigint NOT NULL CHECK(gold_before>=0),
 experience_delta bigint NOT NULL CHECK(experience_delta>0),
 gold_delta bigint NOT NULL CHECK(gold_delta>0),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,contract_id),
 UNIQUE(character_id,request_id),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
-- Existing authoritative kills already have unique spawn receipts. Backfill capped
-- objective counters once; do not award anything or touch the existing kill ledger.
INSERT INTO mare_game.contract_progress(character_id,contract_id,progress)
 SELECT r.character_id,q.id,LEAST(q.target,count(*))::integer
 FROM mare_game.world_battle_rewards r JOIN (VALUES
 ('crab',NULL,'crab',6),
 ('bandit',NULL,'bandit',5),
 ('boss',NULL,'boss',1),
 ('dawn-patrol','beach',NULL,20),
 ('dawn-clear','beach','boss',1),
 ('conchas-patrol','swamp',NULL,30),
 ('conchas-clear','swamp',NULL,1),
 ('orange-patrol','orange',NULL,40),
 ('orange-clear','orange',NULL,12),
 ('rare-patrol','rare',NULL,20)
 ) AS q(id,area,monster,target)
 ON (q.area IS NULL AND r.monster=q.monster) OR (q.area=r.area AND (q.monster IS NULL OR r.monster=q.monster))
 GROUP BY r.character_id,q.id,q.target;
REVOKE ALL ON mare_game.contract_progress,mare_game.contract_claims FROM PUBLIC;
