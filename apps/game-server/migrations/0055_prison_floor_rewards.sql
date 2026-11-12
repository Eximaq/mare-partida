ALTER TABLE mare_game.character_prison DROP CONSTRAINT character_prison_state_check;
ALTER TABLE mare_game.character_prison ADD CONSTRAINT character_prison_state_check CHECK (
 jsonb_typeof(state)='object' AND octet_length(state::text)<=4096
 AND state ? 'version' AND state->>'version'='1'
 AND state ? 'cleared' AND (state->>'cleared')::integer BETWEEN 0 AND 100
 AND state ? 'claimed' AND jsonb_typeof(state->'claimed')='array' AND jsonb_array_length(state->'claimed')<=100
);
ALTER TABLE mare_game.prison_milestones DROP CONSTRAINT prison_milestones_floor_check;
ALTER TABLE mare_game.prison_milestones ADD CONSTRAINT prison_milestones_floor_check CHECK (floor BETWEEN 1 AND 100);
