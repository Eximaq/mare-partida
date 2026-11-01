-- Run as migration owner, only on the isolated Phase 2 game database.
GRANT USAGE ON SCHEMA mare_game TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.accounts TO mare_runtime;
GRANT UPDATE (auth_epoch) ON mare_game.accounts TO mare_runtime;
GRANT SELECT, INSERT ON mare_game.characters TO mare_runtime;
-- Commands may advance the concurrency version, never rewrite identity or progression.
GRANT UPDATE (state_version) ON mare_game.characters TO mare_runtime;
GRANT SELECT ON mare_game.character_journey_ledger TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before) ON mare_game.character_journey_ledger TO mare_runtime;
-- Reward transactions may update XP/gold/level; catalog and level history stay immutable.
GRANT SELECT ON mare_game.character_progression TO mare_runtime;
GRANT INSERT (character_id) ON mare_game.character_progression TO mare_runtime;
GRANT UPDATE (experience, gold, level) ON mare_game.character_progression TO mare_runtime;
GRANT SELECT ON mare_game.character_hunts, mare_game.character_hunt_rewards TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before) ON mare_game.character_hunts TO mare_runtime;
GRANT INSERT (character_id, request_id, version_before, experience_before, gold_before) ON mare_game.character_hunt_rewards TO mare_runtime;
-- Historical 3F storage is frozen after the 0008 copy. Reapplying removes old grants.
REVOKE ALL ON mare_game.character_combats, mare_game.character_combat_rounds, mare_game.character_combat_rewards FROM mare_runtime;
GRANT SELECT ON mare_game.combat_encounters, mare_game.combat_rounds, mare_game.combat_rewards TO mare_runtime;
GRANT INSERT (character_id, begin_request_id, last_request_id, ordinal, fighter, player_hp, next_attack_at) ON mare_game.combat_encounters TO mare_runtime;
GRANT UPDATE (player_hp, enemy_hp, phase, turn, next_attack_at, last_request_id, closed_at) ON mare_game.combat_encounters TO mare_runtime;
GRANT INSERT (character_id, encounter_id, request_id, turn, version_before, player_before, enemy_before, player_damage, enemy_damage) ON mare_game.combat_rounds TO mare_runtime;
GRANT INSERT (character_id, encounter_id, request_id, version_before, experience_before, gold_before) ON mare_game.combat_rewards TO mare_runtime;
-- Immutable receipts; runtime cannot rewrite or purge replay protection.
GRANT SELECT ON mare_game.character_commands TO mare_runtime;
GRANT INSERT (character_id, request_id, request_hash, result) ON mare_game.character_commands TO mare_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON mare_game.app_sessions, mare_game.auth_flows,
    mare_game.character_control, mare_game.auth_rate_limits, mare_game.provider_revocations TO mare_runtime;

GRANT SELECT ON mare_game.progression_levels,mare_game.character_level_ledger TO mare_runtime;
GRANT INSERT (character_id,level,request_id,experience_total,version_before) ON mare_game.character_level_ledger TO mare_runtime;

GRANT SELECT ON mare_game.character_attribute_ledger TO mare_runtime;
GRANT INSERT (character_id,request_id,version_before,strength,dexterity,vitality,intelligence,spirit) ON mare_game.character_attribute_ledger TO mare_runtime;

GRANT SELECT ON mare_game.item_catalog,mare_game.character_inventory,mare_game.character_equipment,mare_game.inventory_ledger TO mare_runtime;
GRANT INSERT (character_id,item_id,quantity) ON mare_game.character_inventory TO mare_runtime;
GRANT UPDATE (quantity) ON mare_game.character_inventory TO mare_runtime;
GRANT INSERT (character_id,slot,item_id),DELETE ON mare_game.character_equipment TO mare_runtime;
GRANT UPDATE (item_id) ON mare_game.character_equipment TO mare_runtime;
GRANT INSERT (character_id,request_id,event,item_id,version_before,quantity_before,quantity_delta,gold_before,gold_delta,encounter_id,previous_item_id) ON mare_game.inventory_ledger TO mare_runtime;
