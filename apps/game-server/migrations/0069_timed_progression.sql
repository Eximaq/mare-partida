-- Curve v5. Keep levels, attained level boundaries and reward/attribute ledgers.
-- These costs are frozen to the timed progression curve in character-catalog.js.
WITH curve AS (
 SELECT ARRAY[
    167,348,655,1122,1123,1124,1427,1761,2106,3012,
    3013,3014,3015,3016,3312,4737,6774,7506,8131,9506,
    10742,11387,11615,11842,12365,13973,14884,15511,16152,16764,
    16765,16766,16767,16768,16769,18949,21413,24197,27343,29996,
    30621,31246,31871,32496,32663,33343,34024,34704,35385,39986,
    45185,51060,57698,65199,73675,83253,94076,106306,120126,135743,
    153390,173331,188835,192538,211792,216204,220616,225029,229441,259269,
    278252,283931,289609,295288,295289,295290,295291,295292,295293,295294,
    295295,295296,295297,295298,295299,295300,295301,295302,295303,333693,
    349190,356317,363443,370569,373539,385807,398258,410892,423710,435063,
    439858,448835,457812,486038,493515,503797,536983,547722,558462,591241,
    603558,615876,628193,628194,628195,628196,628197,670689,683839,694360,
    708826,756168,771292,786415,798514,815150,897539,915490,933440,947801,
    947802,947803,947804,961341,1012284,1087953,1110156,1132359,1154562,1172325,
    1312820,1339613,1366405,1393197,1414631,1532157,1563426,1594694,1625963,1650978,
    1865606,2108135,2382193,2691879,2976843,3239777,3305894,3372012,3438130,3491025,
    3729510,3805623,3881735,3957847,4018737,4254404,4341229,4428053,4514878,4584337,
    4880409,4980009,5079610,5179210,5258890,5576815,5690627,5804440,5918252,6009302,
    6134496,6259690,6384884,6510077,6640279
 ]::numeric[] AS costs,
 132806::numeric AS post_185_step
), v4_maps(min_level,xp) AS (
 -- Historical v4 map entry levels and XP used to price advancement.
 VALUES (1,14),(5,26),(11,30),(16,40),(21,46),(26,52),(31,54),(36,60),(40,70),
        (50,90),(55,94),(60,98),(65,106),(70,120),(75,126),(80,132),(85,140),(90,160),
        (95,168),(101,176),(104,184),(107,192),(110,200),(114,208),(118,220),(122,230),
        (127,248),(131,258),(136,272),(141,298),(146,316),(151,330),(156,352),(161,368),
        (166,382),(171,398),(176,414)
), originals AS (
 SELECT p.character_id,p.level,p.level_start_experience::numeric,
        (p.experience-p.level_start_experience)::numeric AS xp_into,
        curve.costs[least(p.level,185)]+greatest(0,p.level-185)*curve.post_185_step AS new_cost,
        map.xp AS old_kill_xp,
        CASE p.level/5
          WHEN 1 THEN 36 WHEN 2 THEN 54 WHEN 3 THEN 70 WHEN 4 THEN 88 WHEN 5 THEN 108
          ELSE floor(128*power(1.12::double precision,least(p.level/5,35)-6)+0.5)::bigint
               +greatest(0,p.level/5-35)::bigint*120
        END AS old_kills
 FROM mare_game.character_progression p JOIN mare_game.game_inventory i USING(character_id)
 CROSS JOIN curve
 CROSS JOIN LATERAL (
  SELECT m.xp FROM v4_maps m WHERE m.min_level<=p.level ORDER BY m.min_level DESC LIMIT 1
 ) map
), costs AS (
 SELECT o.*,CASE o.level WHEN 1 THEN 27 WHEN 2 THEN 44 WHEN 3 THEN 56 WHEN 4 THEN 70
        ELSE (o.old_kills/5+CASE WHEN o.level%5>=5-o.old_kills%5 THEN 1 ELSE 0 END)*o.old_kill_xp
        END::numeric AS old_cost
 FROM originals o
), fractions AS (
 SELECT *,div(xp_into*new_cost+div(old_cost,2),old_cost) AS scaled_xp
 FROM costs
), converted AS (
 SELECT character_id,least(9223372036854775807::numeric,level_start_experience+CASE
  WHEN xp_into<old_cost THEN least(new_cost-1,scaled_xp)
  ELSE scaled_xp
 END)::bigint AS new_experience
 FROM fractions
), updated AS (
 UPDATE mare_game.character_progression p SET experience=c.new_experience
 FROM converted c WHERE p.character_id=c.character_id AND p.experience<>c.new_experience
)
UPDATE mare_game.characters c SET state_version=c.state_version+1
FROM originals o WHERE c.id=o.character_id AND c.state_version<9007199254740991;
