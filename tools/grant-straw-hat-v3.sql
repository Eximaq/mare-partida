-- Requires the same trusted database role used for maintenance grants.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended((:'character_id'::uuid)::text,1296126533));

WITH granted AS (
 UPDATE mare_game.character_profile AS p
 SET cosmetics=jsonb_set(p.cosmetics,'{owned}',(p.cosmetics->'owned') || jsonb_build_array('straw-hat-v3'))
 FROM mare_game.characters AS c
 WHERE p.character_id=c.id
   AND c.id=:'character_id'::uuid
   AND coalesce(p.appearance->>'gender','masculino') IN ('masculino','male')
   AND c.state_version<9007199254740991
   AND NOT ((p.cosmetics->'owned') ? 'straw-hat-v3')
 RETURNING p.character_id
)
UPDATE mare_game.characters AS c
SET state_version=c.state_version+1
FROM granted
WHERE c.id=granted.character_id
RETURNING c.id;

COMMIT;
