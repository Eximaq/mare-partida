-- Preserve the existing immutable claim ledger and admit the four newly configured chests.
ALTER TABLE mare_game.dungeon_claims DROP CONSTRAINT dungeon_claims_dungeon_id_check;
ALTER TABLE mare_game.dungeon_claims ADD CONSTRAINT dungeon_claims_dungeon_id_check
CHECK(dungeon_id IN ('alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile'));

-- Prior unclaimed victories can use the original battle receipt, which records
-- character level after the zero-XP victory of these previously empty chests.
WITH pending AS (
 SELECT d.character_id,v.dungeon_id,d.state->'records'->v.dungeon_id AS record,
        c.result #> '{state,level}' AS recorded_level
 FROM mare_game.character_dungeons d
 JOIN mare_game.dungeon_victories v ON v.character_id=d.character_id
 LEFT JOIN mare_game.character_commands c
   ON c.character_id=v.character_id AND c.request_id=v.request_id
   AND c.result->>'action'='battle.reward'
 WHERE v.dungeon_id IN ('arlong','smoker','wapol','crocodile') AND v.reward IS NULL
   AND d.state->'records'->v.dungeon_id->>'phase'='pending'
   AND d.state->'records'->v.dungeon_id->>'runId'=v.run_id::text
   AND d.state->'records'->v.dungeon_id->'reward'='null'::jsonb
), rewards AS (
 SELECT character_id,dungeon_id,record,
        jsonb_build_object('xp',0,'berry',0,'boundToCharacter',character_id) ||
        CASE WHEN dungeon_id IN ('arlong','smoker')
             THEN jsonb_build_object('itemId','epic-equipment-box','quantity',1,'equipmentLevel',recorded_level)
             ELSE jsonb_build_object('materialId','akuma_fragment_b','quantity',10) END AS reward
 FROM pending
 WHERE dungeon_id IN ('wapol','crocodile') OR
       (jsonb_typeof(recorded_level)='number' AND recorded_level::text ~ '^[1-9][0-9]{0,3}$')
), records AS (
 SELECT character_id,jsonb_object_agg(dungeon_id,record || jsonb_build_object('reward',reward)) AS patched
 FROM rewards GROUP BY character_id
)
UPDATE mare_game.character_dungeons d
SET state=jsonb_set(d.state,'{records}',(d.state->'records') || r.patched)
FROM records r WHERE d.character_id=r.character_id;
