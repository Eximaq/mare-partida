-- Extend the audited original battle with server-owned talents. The empty build
-- preserves its balance. Change only the known rules hash: monsters, HP, resource
-- balances, respawn clocks and cooldowns remain exactly as persisted.
-- Unknown versions still fail closed; never regenerate a saved encounter here.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',
 '"c6f28ee5b9d8ce36d1df33e560675ddab0038e6186a5691483238bb25c9c91bf"'::jsonb)
 WHERE simulation->>'rulesHash'='562bfa13620d2bc08aebcc96590bfeee5fdd3ebab4be31832e28046c31de235f';
