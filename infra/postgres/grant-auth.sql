-- Run as migration owner, only on the isolated Phase 2 game database.
GRANT USAGE ON SCHEMA mare_game TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.accounts TO mare_runtime;
GRANT UPDATE (auth_epoch) ON mare_game.accounts TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.characters TO mare_runtime;
-- Commands may advance the concurrency version, never rewrite identity or progression.
GRANT UPDATE (state_version) ON mare_game.characters TO mare_runtime;
GRANT SELECT ON mare_game.character_journey_ledger TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before) ON mare_game.character_journey_ledger TO mare_runtime;
-- First hunt grants only XP/gold updates; level, identity and initialization stay fixed.
GRANT SELECT ON mare_game.character_progression TO mare_runtime;
GRANT INSERT (character_id) ON mare_game.character_progression TO mare_runtime;
GRANT UPDATE (experience, gold) ON mare_game.character_progression TO mare_runtime;
GRANT SELECT ON mare_game.character_hunts, mare_game.character_hunt_rewards TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before) ON mare_game.character_hunts TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before, experience_before, gold_before) ON mare_game.character_hunt_rewards TO mare_runtime;
-- Immutable receipts; runtime cannot rewrite or purge replay protection.
GRANT SELECT ON mare_game.character_commands TO mare_runtime;
GRANT INSERT (character_id, request_id, request_hash, result) ON mare_game.character_commands TO mare_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON mare_game.app_sessions, mare_game.auth_flows,
    mare_game.character_control, mare_game.auth_rate_limits, mare_game.provider_revocations TO mare_runtime;
