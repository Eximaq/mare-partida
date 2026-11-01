-- Run as migration owner, only on the isolated Phase 2 game database.
GRANT USAGE ON SCHEMA mare_game TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.accounts TO mare_runtime;
GRANT UPDATE (auth_epoch) ON mare_game.accounts TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.characters TO mare_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON mare_game.app_sessions, mare_game.auth_flows,
    mare_game.character_control, mare_game.auth_rate_limits, mare_game.provider_revocations TO mare_runtime;
