-- Server-owned achievement progress; never imports browser saves or grants claims.
CREATE TABLE mare_game.achievement_progress (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 kills integer NOT NULL CHECK(kills BETWEEN 0 AND 10000),
 coins integer NOT NULL CHECK(coins BETWEEN 0 AND 1000000),
 peak_power integer NOT NULL CHECK(peak_power BETWEEN 0 AND 100000)
);
CREATE TABLE mare_game.achievement_visits (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 island_id text NOT NULL CHECK(island_id IN ('dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown','alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05')),
 PRIMARY KEY(character_id,island_id)
);
CREATE TABLE mare_game.achievement_claims (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id),
 achievement_id text NOT NULL,
 request_id uuid NOT NULL,
 points integer NOT NULL CHECK(points BETWEEN 1 AND 5) CHECK(points=CASE achievement_id
 WHEN 'kills-0' THEN 1
 WHEN 'kills-1' THEN 1
 WHEN 'kills-2' THEN 2
 WHEN 'kills-3' THEN 3
 WHEN 'floors-0' THEN 1
 WHEN 'floors-1' THEN 2
 WHEN 'floors-2' THEN 3
 WHEN 'floors-3' THEN 5
 WHEN 'coins-0' THEN 1
 WHEN 'coins-1' THEN 1
 WHEN 'coins-2' THEN 2
 WHEN 'level-0' THEN 1
 WHEN 'level-1' THEN 1
 WHEN 'level-2' THEN 2
 WHEN 'level-3' THEN 3
 WHEN 'level-4' THEN 5
 WHEN 'power-0' THEN 1
 WHEN 'power-1' THEN 1
 WHEN 'power-2' THEN 2
 WHEN 'power-3' THEN 3
 WHEN 'power-4' THEN 5
 WHEN 'fruits-0' THEN 2
 WHEN 'fruits-1' THEN 3
 WHEN 'awakenings-0' THEN 5
 WHEN 'observation-0' THEN 1
 WHEN 'armament-0' THEN 1
 WHEN 'conqueror-0' THEN 3
 WHEN 'hakiMastery-0' THEN 5
 WHEN 'islands-0' THEN 1
 WHEN 'fastTravel-0' THEN 2
 WHEN 'bounties-0' THEN 3
 ELSE -1 END),
 progress integer NOT NULL CHECK(progress BETWEEN 1 AND 1000000) CHECK(progress=CASE achievement_id
 WHEN 'kills-0' THEN 100
 WHEN 'kills-1' THEN 500
 WHEN 'kills-2' THEN 2000
 WHEN 'kills-3' THEN 10000
 WHEN 'floors-0' THEN 10
 WHEN 'floors-1' THEN 30
 WHEN 'floors-2' THEN 50
 WHEN 'floors-3' THEN 100
 WHEN 'coins-0' THEN 10000
 WHEN 'coins-1' THEN 100000
 WHEN 'coins-2' THEN 1000000
 WHEN 'level-0' THEN 5
 WHEN 'level-1' THEN 10
 WHEN 'level-2' THEN 20
 WHEN 'level-3' THEN 50
 WHEN 'level-4' THEN 100
 WHEN 'power-0' THEN 1000
 WHEN 'power-1' THEN 5000
 WHEN 'power-2' THEN 20000
 WHEN 'power-3' THEN 50000
 WHEN 'power-4' THEN 100000
 WHEN 'fruits-0' THEN 1
 WHEN 'fruits-1' THEN 5
 WHEN 'awakenings-0' THEN 1
 WHEN 'observation-0' THEN 1
 WHEN 'armament-0' THEN 1
 WHEN 'conqueror-0' THEN 1
 WHEN 'hakiMastery-0' THEN 3
 WHEN 'islands-0' THEN 5
 WHEN 'fastTravel-0' THEN 14
 WHEN 'bounties-0' THEN 10
 ELSE -1 END),
 version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 rules_hash text NOT NULL CHECK(rules_hash ~ '^[a-f0-9]{64}$'),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,achievement_id),UNIQUE(character_id,request_id),UNIQUE(character_id,version_before),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.achievement_progress,mare_game.achievement_visits,mare_game.achievement_claims FROM PUBLIC;
-- Each command's positive economic event is counted once across historical ledgers.
-- combat_rewards already contains the migrated introductory combat; do not add the old copy.
WITH events AS (
 SELECT character_id,request_id,gold_delta::numeric amount FROM mare_game.game_inventory_events
 UNION ALL SELECT character_id,request_id,gold_delta::numeric FROM mare_game.inventory_ledger
 UNION ALL SELECT character_id,request_id,gold_delta::numeric FROM mare_game.contract_claims
 UNION ALL SELECT character_id,request_id,(gold_after-gold_before)::numeric FROM mare_game.combat_rewards
 UNION ALL SELECT character_id,request_id,(gold_after-gold_before)::numeric FROM mare_game.character_hunt_rewards
), earned AS (
 SELECT character_id,sum(amount) amount FROM (SELECT character_id,request_id,GREATEST(0,max(amount)) amount FROM events GROUP BY character_id,request_id) unique_events GROUP BY character_id
), kills AS (
 SELECT character_id,count(*) amount FROM (SELECT character_id FROM mare_game.world_battle_rewards UNION ALL SELECT character_id FROM mare_game.combat_rewards) defeated GROUP BY character_id
)
INSERT INTO mare_game.achievement_progress(character_id,kills,coins,peak_power)
 SELECT c.id,LEAST(10000,COALESCE(k.amount,0))::int,LEAST(1000000,GREATEST(p.gold,COALESCE(e.amount,0)))::int,0
 FROM mare_game.characters c JOIN mare_game.character_progression p ON p.character_id=c.id
 LEFT JOIN earned e ON e.character_id=c.id LEFT JOIN kills k ON k.character_id=c.id;
-- Only successful travel receipts count; inspecting a destination never creates one.
INSERT INTO mare_game.achievement_visits(character_id,island_id)
 SELECT DISTINCT r.character_id,i.id FROM mare_game.character_commands r JOIN (VALUES
 ('dawn','beach'),
 ('conchas','swamp'),
 ('orange-town','orange'),
 ('animais-raros','rare'),
 ('syrup','syrup'),
 ('baratie','baratie'),
 ('arlong','arlong'),
 ('loguetown','loguetown'),
 ('alabasta-desert','alabasta'),
 ('alubarna-01','alubarna-01'),
 ('alubarna-02','alubarna-02'),
 ('alubarna-03','alubarna-03'),
 ('alubarna-04','alubarna-04'),
 ('alubarna-05','alubarna-05')) i(id,area) ON r.result#>>'{world,area}'=i.area
 WHERE r.result->>'action'='world.travel';
