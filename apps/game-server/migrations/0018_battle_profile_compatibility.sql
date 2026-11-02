-- PR207 extracted profileAtLevel without changing common-island profiles.
-- Upgrade only the audited PR204 hash. Unknown hashes must still fail closed.
-- No HP, monsters, position, inventory, rewards, controller or clocks are reset.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',
 '"e8c783982e814f1ea67b0ce8fa11e072c47c3a1f5746e77a9ca2de10a0eedce1"'::jsonb)
 WHERE simulation->>'rulesHash'='562bfa13620d2bc08aebcc96590bfeee5fdd3ebab4be31832e28046c31de235f';
