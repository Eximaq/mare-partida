-- Preserve original-character levels and fractional progress; legacy Alpha levels are independent.
-- The migration runner records this transaction once. Historical receipts are left intact.
WITH RECURSIVE original AS (
 SELECT p.character_id,p.level,p.experience,p.level_start_experience
 FROM mare_game.character_progression p JOIN mare_game.game_inventory i USING(character_id)
), curve(level,old_cost,new_cost) AS (
 SELECT 1,80::double precision,80::double precision
 UNION ALL
 SELECT c.level+1,next.cost,c.new_cost*(1+2*((next.cost-c.old_cost)/c.old_cost))
 FROM curve c CROSS JOIN LATERAL (SELECT floor(80+25*power(c.level::double precision,1.55::double precision)+0.5) AS cost) next
 WHERE c.level < (SELECT max(level) FROM original)
), converted AS (
 SELECT o.character_id, o.level_start_experience::numeric + CASE
  WHEN o.experience-o.level_start_experience < c.old_cost THEN least(floor(c.new_cost+0.5)-1,round((o.experience-o.level_start_experience)::numeric*floor(c.new_cost+0.5)::numeric/c.old_cost::numeric))
  ELSE round((o.experience-o.level_start_experience)::numeric*floor(c.new_cost+0.5)::numeric/c.old_cost::numeric)
 END AS xp
 FROM original o JOIN curve c USING(level)
)
UPDATE mare_game.character_progression p SET experience=least(9223372036854775807::numeric,converted.xp)::bigint
FROM converted WHERE p.character_id=converted.character_id AND p.experience<>converted.xp;

-- Invalidate cached snapshots of the changed per-level curve.
UPDATE mare_game.characters c SET state_version=state_version+1
FROM mare_game.character_progression p JOIN mare_game.game_inventory i USING(character_id)
WHERE c.id=p.character_id AND p.level>1 AND c.state_version<9007199254740991;

-- Only map metadata changed. Positions, paths, collision and map IDs remain valid.
UPDATE mare_game.character_world SET rules_hash='face3a9b1c4478cf40c93343ec3a5f9d090564869a99303c99fb8292f2a6ce83'
WHERE rules_hash='d709ce79bf71fc2ddfed3e53b339c4ccddb0776a06d1b7e4fa56091890973230';
