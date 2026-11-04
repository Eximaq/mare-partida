-- Equipment/fruit formulas changed; retain actions and promote only the audited predecessor.
UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('33f5c37bd55b0dc9a052d31c9e7d68f760bb31122337fb1da73058050083fa6a'::text))
WHERE simulation->>'rulesHash'='6097ce83f78f199399d8a81d53e6caae1f02f0d6324a03d484d720e5b4f3f833';

-- Preserve old records while accepting the versioned fragment and will-book chest rewards.
ALTER TABLE mare_game.character_dungeons DROP CONSTRAINT character_dungeons_state_check;
ALTER TABLE mare_game.character_dungeons ADD CONSTRAINT character_dungeons_state_check
CHECK(jsonb_typeof(state)='object' AND octet_length(state::text)<=32768
AND state ? 'version' AND state->>'version' IN ('1','2','3') AND state ? 'seq'
AND (state->>'seq')::bigint BETWEEN 0 AND 9007199254740991
AND state ? 'records' AND jsonb_typeof(state->'records')='object');
