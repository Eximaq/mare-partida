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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mare_game' AND table_name='game_inventory' AND column_name='mana_potions') THEN
    GRANT UPDATE (mana_potions) ON mare_game.game_inventory TO mare_runtime;
  END IF;
END $$;
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

-- Crew membership and finances are separate from temporary party state.
GRANT SELECT ON mare_game.crews,mare_game.crew_members,mare_game.crew_entry_blocks,mare_game.crew_requests,
  mare_game.crew_ledger,mare_game.crew_missions,mare_game.crew_activity_events TO mare_runtime;
GRANT INSERT(id,name,name_key,tag,flag,captain_id,policy,min_level),UPDATE(captain_id,policy,min_level,xp,treasury,facilities,dissolved_at) ON mare_game.crews TO mare_runtime;
GRANT INSERT(character_id,crew_id,role,joined_at),UPDATE(role),DELETE ON mare_game.crew_members TO mare_runtime;
GRANT INSERT(character_id,until_at),UPDATE(until_at) ON mare_game.crew_entry_blocks TO mare_runtime;
GRANT INSERT(id,crew_id,character_id,sender_id,kind,expires_at),UPDATE(status) ON mare_game.crew_requests TO mare_runtime;
GRANT INSERT(crew_id,character_id,request_id,kind,amount,facility,created_at) ON mare_game.crew_ledger TO mare_runtime;
GRANT INSERT(id,crew_id,cycle,kind,capacity,target,reward_xp),UPDATE(progress,completed_at) ON mare_game.crew_missions TO mare_runtime;
GRANT INSERT(crew_id,character_id,kind,event_id,mission_id) ON mare_game.crew_activity_events TO mare_runtime;

-- The runtime may award profession XP, but it cannot change a profession or rewrite history.
GRANT SELECT ON mare_game.character_professions,mare_game.profession_weeks,mare_game.profession_events,mare_game.profession_xp TO mare_runtime;
GRANT INSERT (character_id,profession) ON mare_game.character_professions TO mare_runtime;
GRANT UPDATE (experience) ON mare_game.character_professions TO mare_runtime;
GRANT INSERT (character_id,week_start,issued_at,spec), UPDATE (progress,material_count) ON mare_game.profession_weeks TO mare_runtime;
GRANT INSERT (character_id,week_start,kind,event_id) ON mare_game.profession_events TO mare_runtime;
GRANT INSERT (character_id,week_start,objective,amount) ON mare_game.profession_xp TO mare_runtime;

-- Official letters retain immutable reward identity and attachment contents.
GRANT SELECT ON mare_game.social_mail TO mare_runtime;
GRANT INSERT (character_id,source,source_id,reward_id,title,message,attachments), UPDATE (read_at,claimed_at,claimed_request_id,archived_at) ON mare_game.social_mail TO mare_runtime;

-- Social projections read public character data and persist actions through the authenticated server.
GRANT SELECT ON mare_game.social_friend_requests,mare_game.social_contact_blocks,mare_game.social_presence,
  mare_game.social_conversations,mare_game.social_private_messages TO mare_runtime;
GRANT INSERT(id,sender_id,target_id),UPDATE(status) ON mare_game.social_friend_requests TO mare_runtime;
GRANT INSERT(blocker_id,target_id),DELETE ON mare_game.social_contact_blocks TO mare_runtime;
GRANT INSERT(character_id,control_epoch,last_seen),UPDATE(control_epoch,last_seen) ON mare_game.social_presence TO mare_runtime;
GRANT INSERT(character_low,character_high),UPDATE(low_read_through,high_read_through) ON mare_game.social_conversations TO mare_runtime;
GRANT INSERT(character_low,character_high,sender_id,request_id,body) ON mare_game.social_private_messages TO mare_runtime;

-- Trade keeps live reservations separate from inventory and stores participant receipts.
GRANT SELECT ON mare_game.social_trades,mare_game.social_trade_members,mare_game.social_trade_reservations TO mare_runtime;
GRANT INSERT(id,initiator_id,target_id,expires_at),UPDATE(status,offer_version,initiator_locked,target_locked,initiator_confirmed,target_confirmed,expires_at,ended_at,receipt) ON mare_game.social_trades TO mare_runtime;
GRANT INSERT(character_id,trade_id),DELETE ON mare_game.social_trade_members TO mare_runtime;
GRANT INSERT(character_id,item_id,trade_id,quantity,item),UPDATE(quantity),DELETE ON mare_game.social_trade_reservations TO mare_runtime;

-- Markets apply after Social. Provision these permissions for freshly created
-- runtime roles as well as databases upgraded with the role already present.
DO $$
BEGIN
  IF to_regclass('mare_game.bounty_victories') IS NOT NULL THEN
    GRANT SELECT ON mare_game.bounty_victories TO mare_runtime;
  END IF;
  IF to_regclass('mare_game.market_listings') IS NOT NULL THEN
    GRANT SELECT ON mare_game.market_listings,mare_game.market_proposals,mare_game.market_notifications TO mare_runtime;
    GRANT EXECUTE ON FUNCTION mare_game.market_balance(uuid),mare_game.market_reward_wallet_offset(uuid),
      mare_game.market_expire(integer),mare_game.market_command(uuid,jsonb,integer,integer,integer) TO mare_runtime;
  END IF;
END
$$;
