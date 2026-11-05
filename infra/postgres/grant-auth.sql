GRANT SELECT,INSERT,UPDATE ON mare_game.parties,mare_game.party_members,mare_game.party_invites,mare_game.party_instances TO mare_runtime;
GRANT DELETE ON mare_game.party_members TO mare_runtime;
GRANT SELECT,INSERT ON mare_game.party_deaths,mare_game.party_experience TO mare_runtime;
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
GRANT UPDATE (experience, gold, level, level_start_experience, xp_boost_until) ON mare_game.character_progression TO mare_runtime;
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

GRANT SELECT ON mare_game.game_inventory,mare_game.game_inventory_events TO mare_runtime;
GRANT INSERT (character_id,inventory,equipment,materials,potions,forge_seq,forge_history,alpha_snapshot,initialized_request_id) ON mare_game.game_inventory TO mare_runtime;
GRANT UPDATE (inventory,equipment,materials,potions,forge_seq,forge_history) ON mare_game.game_inventory TO mare_runtime;
GRANT INSERT (character_id,request_id,version_before,action,rules_hash,before_hash,after_hash,gold_before,gold_delta,outcome) ON mare_game.game_inventory_events TO mare_runtime;

GRANT SELECT,INSERT ON mare_game.character_world TO mare_runtime;
GRANT UPDATE (rules_hash,map_id,area,x,y,path,speed,direction,started_at,motion_until) ON mare_game.character_world TO mare_runtime;

GRANT INSERT(world_map_id,enemy_x,enemy_y) ON mare_game.combat_encounters TO mare_runtime;
GRANT SELECT ON mare_game.character_battles TO mare_runtime;
GRANT INSERT (character_id,simulation,control_epoch) ON mare_game.character_battles TO mare_runtime;
GRANT UPDATE (simulation,control_epoch,tick_at) ON mare_game.character_battles TO mare_runtime;
GRANT SELECT ON mare_game.world_battle_rewards TO mare_runtime;
GRANT INSERT (character_id,spawn_id,request_id,area,monster,experience_delta,gold_delta,rules_hash) ON mare_game.world_battle_rewards TO mare_runtime;

GRANT SELECT ON mare_game.contract_progress,mare_game.contract_claims,mare_game.contract_daily_cycles TO mare_runtime;
GRANT INSERT (character_id,cycle,state), UPDATE (state) ON mare_game.contract_daily_cycles TO mare_runtime;
GRANT INSERT (character_id,contract_id,progress) ON mare_game.contract_progress TO mare_runtime;
GRANT UPDATE (progress) ON mare_game.contract_progress TO mare_runtime;
GRANT INSERT (character_id,contract_id,request_id,version_before,experience_before,gold_before,experience_delta,gold_delta,rules_hash) ON mare_game.contract_claims TO mare_runtime;

GRANT SELECT ON mare_game.character_talents,mare_game.character_talent_events TO mare_runtime;
GRANT INSERT(character_id,build,revision) ON mare_game.character_talents TO mare_runtime;
GRANT UPDATE(build,revision) ON mare_game.character_talents TO mare_runtime;
GRANT INSERT(character_id,request_id,action,revision_before,build_before,build_after,earned,rules_hash) ON mare_game.character_talent_events TO mare_runtime;

GRANT SELECT ON mare_game.battle_talent_steals TO mare_runtime;
GRANT INSERT(character_id,spawn_id,total) ON mare_game.battle_talent_steals TO mare_runtime;
GRANT UPDATE(total) ON mare_game.battle_talent_steals TO mare_runtime;

GRANT SELECT ON mare_game.achievement_progress,mare_game.achievement_visits,mare_game.achievement_claims TO mare_runtime;
GRANT INSERT(character_id,kills,coins,peak_power) ON mare_game.achievement_progress TO mare_runtime;
GRANT UPDATE(kills,coins,peak_power) ON mare_game.achievement_progress TO mare_runtime;
GRANT INSERT(character_id,island_id) ON mare_game.achievement_visits TO mare_runtime;
GRANT INSERT(character_id,achievement_id,request_id,points,progress,version_before,rules_hash) ON mare_game.achievement_claims TO mare_runtime;

GRANT SELECT ON mare_game.character_prison,mare_game.prison_floors,mare_game.prison_milestones TO mare_runtime;
GRANT INSERT(character_id,state),UPDATE(state) ON mare_game.character_prison TO mare_runtime;
GRANT INSERT(character_id,floor,spawn_id,request_id,monster,rules_hash) ON mare_game.prison_floors TO mare_runtime;
GRANT INSERT(character_id,floor,request_id,item_id) ON mare_game.prison_milestones TO mare_runtime;

GRANT SELECT ON mare_game.character_dungeons,mare_game.dungeon_victories,mare_game.dungeon_claims TO mare_runtime;
GRANT INSERT(character_id,state),UPDATE(state) ON mare_game.character_dungeons TO mare_runtime;
GRANT INSERT(character_id,dungeon_id,run_id,spawn_id,request_id,reward,rules_hash) ON mare_game.dungeon_victories TO mare_runtime;
GRANT INSERT(character_id,dungeon_id,request_id,experience_delta,gold_delta) ON mare_game.dungeon_claims TO mare_runtime;

GRANT SELECT ON mare_game.character_hierarchy,mare_game.hierarchy_promotions TO mare_runtime;
GRANT INSERT(character_id,tier,power),UPDATE(tier,power) ON mare_game.character_hierarchy TO mare_runtime;
GRANT INSERT(character_id,request_id,tier_before,tier_after,level,version_before) ON mare_game.hierarchy_promotions TO mare_runtime;

GRANT SELECT ON mare_game.fruit_registrations TO mare_runtime;
GRANT INSERT(character_id,fruit_id,item_id,request_id,version_before) ON mare_game.fruit_registrations TO mare_runtime;

GRANT SELECT ON mare_game.character_profile,mare_game.profile_events TO mare_runtime;
GRANT INSERT(character_id,appearance,preferences,class_builds,starter_classes),UPDATE(appearance,preferences,class_builds,starter_classes) ON mare_game.character_profile TO mare_runtime;
GRANT INSERT(character_id,request_id,action,version_before,before_state,after_state) ON mare_game.profile_events TO mare_runtime;
GRANT UPDATE(name,class_id,faction_id) ON mare_game.characters TO mare_runtime;

-- Immutable migration allowance: gameplay may read, never grant or modify it.
GRANT SELECT ON mare_game.talent_legacy_allowances TO mare_runtime;
