-- Curve v4. Retain each original character's level, level start and ledger;
-- rescale XP within the level once in this transactional migration.
WITH RECURSIVE original AS (
 SELECT p.character_id,p.level,p.experience::numeric,p.level_start_experience::numeric
 FROM mare_game.character_progression p JOIN mare_game.game_inventory i USING(character_id)
), curve(level,legacy_cost,prior_cost) AS (
 SELECT 1,80::double precision,80::double precision
 UNION ALL
 SELECT c.level+1,n.cost,c.prior_cost*(1+2*((n.cost-c.legacy_cost)/c.legacy_cost))
 FROM curve c
 CROSS JOIN LATERAL (SELECT floor(80+25*power(c.level::double precision,1.55::double precision)+0.5) AS cost) n
 WHERE c.level<(SELECT max(level) FROM original)
), map_xp(min_level,xp) AS (
 -- Freeze the unlock levels and hunt XP for this version.
 VALUES (1,14),(5,26),(11,30),(16,40),(21,46),(26,52),(31,54),(36,60),(40,70),
        (50,90),(55,94),(60,98),(65,106),(70,120),(75,126),(80,132),(85,140),(90,160),
        (95,168),(101,176),(104,184),(107,192),(110,200),(114,208),(118,220),(122,230),
        (127,248),(131,258),(136,272),(141,298),(146,316),(151,330),(156,352),(161,368),
        (166,382),(171,398),(176,414)
), milestones AS (
 SELECT o.*,ceil(floor(c.prior_cost+0.5)/3)::numeric AS old_cost,
        o.experience-o.level_start_experience AS xp_into,
        map.xp AS kill_xp,
        CASE o.level/5
          WHEN 1 THEN 36 WHEN 2 THEN 54 WHEN 3 THEN 70 WHEN 4 THEN 88 WHEN 5 THEN 108
          ELSE floor(128*power(1.12::double precision,least(o.level/5,35)-6)+0.5)::bigint
               +greatest(0,o.level/5-35)::bigint*120
        END AS kills
 FROM original o JOIN curve c USING(level)
 CROSS JOIN LATERAL (
  SELECT m.xp FROM map_xp m WHERE m.min_level<=o.level ORDER BY m.min_level DESC LIMIT 1
 ) map
), costs AS (
 SELECT m.*,CASE m.level WHEN 1 THEN 27 WHEN 2 THEN 44 WHEN 3 THEN 56 WHEN 4 THEN 70
        ELSE (m.kills/5+CASE WHEN m.level%5>=5-m.kills%5 THEN 1 ELSE 0 END)*m.kill_xp
        END::numeric AS new_cost
 FROM milestones m
), converted AS (
 SELECT v.character_id,least(9223372036854775807::numeric,v.level_start_experience+CASE
  WHEN v.xp_into<v.old_cost THEN least(v.new_cost-1,round(v.xp_into*v.new_cost/v.old_cost))
  ELSE round(v.xp_into*v.new_cost/v.old_cost)
 END)::bigint AS new_experience
 FROM costs v
), updated AS (
 UPDATE mare_game.character_progression p SET experience=c.new_experience
 FROM converted c WHERE p.character_id=c.character_id AND p.experience<>c.new_experience
)
UPDATE mare_game.characters c SET state_version=c.state_version+1
FROM original o WHERE c.id=o.character_id AND c.state_version<9007199254740991;
