-- Advance original characters using their exact XP within the current level.
-- The old level start remains the starting point for each character.
WITH RECURSIVE original AS (
 SELECT p.character_id,p.level,p.experience,p.level_start_experience,c.state_version
 FROM mare_game.character_progression p
 JOIN mare_game.game_inventory i USING(character_id)
 JOIN mare_game.characters c ON c.id=p.character_id
), curve(level,legacy_cost,previous_cost) AS (
 SELECT 1,80::double precision,80::double precision
 UNION ALL
 SELECT c.level+1,n.cost,c.previous_cost*(1+2*((n.cost-c.legacy_cost)/c.legacy_cost))
 FROM curve c CROSS JOIN LATERAL (SELECT floor(80+25*power(c.level::double precision,1.55::double precision)+0.5) AS cost) n
 WHERE c.level < (SELECT max(level) FROM original)
), progress AS (
 SELECT o.character_id,o.level,o.experience,o.level_start_experience,o.state_version,c.legacy_cost,c.previous_cost
 FROM original o JOIN curve c USING(level)
 UNION ALL
 SELECT p.character_id,p.level+1,p.experience,p.level_start_experience+cost.value,p.state_version,
        n.cost,p.previous_cost*(1+2*((n.cost-p.legacy_cost)/p.legacy_cost))
 FROM progress p
 CROSS JOIN LATERAL (SELECT greatest(1,ceil(floor(p.previous_cost+0.5)/3))::bigint AS value) cost
 CROSS JOIN LATERAL (SELECT floor(80+25*power(p.level::double precision,1.55::double precision)+0.5) AS cost) n
 WHERE p.experience-p.level_start_experience>=cost.value
), earned AS (
 INSERT INTO mare_game.character_level_ledger(character_id,level,source,experience_total,version_before)
 SELECT p.character_id,p.level,'migration',p.experience,p.state_version
 FROM progress p JOIN original o USING(character_id) WHERE p.level>o.level
 ON CONFLICT(character_id,level) DO NOTHING
), latest AS (
 SELECT DISTINCT ON(character_id) character_id,level,level_start_experience FROM progress ORDER BY character_id,level DESC
), updated AS (
 UPDATE mare_game.character_progression p SET level=l.level,level_start_experience=l.level_start_experience
 FROM latest l WHERE p.character_id=l.character_id AND p.level<>l.level RETURNING p.character_id
)
UPDATE mare_game.characters c SET state_version=state_version+1
FROM updated u WHERE c.id=u.character_id;

-- A promotion can change permanent power. Refresh that projection on the next
-- authenticated state read or authoritative action through the existing hooks.
