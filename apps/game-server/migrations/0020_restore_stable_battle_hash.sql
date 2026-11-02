-- PR208 restores the original source/hash without changing valid encounter stats.
-- 0018 has already run locally and stays immutable. Reconcile that known interim
-- hash with the restored engine; preserve every other simulation field and reject
-- unknown rules through the existing worker guard.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',
 '"562bfa13620d2bc08aebcc96590bfeee5fdd3ebab4be31832e28046c31de235f"'::jsonb)
 WHERE simulation->>'rulesHash'='e8c783982e814f1ea67b0ce8fa11e072c47c3a1f5746e77a9ca2de10a0eedce1';
