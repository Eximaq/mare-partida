-- Persisted actions remain readable; only the audited predecessor is promoted.
-- Legacy jobs without impactAt/remaining execute once through runtime defaults.
UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('6097ce83f78f199399d8a81d53e6caae1f02f0d6324a03d484d720e5b4f3f833'::text))
WHERE simulation->>'rulesHash'='90158f79c9b5101227c40a0f4124617a1bcf08f217892dfa26daab3d90d797d4';
