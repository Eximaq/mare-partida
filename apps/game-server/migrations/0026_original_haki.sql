ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest'));
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}','"dda97ea842c4df922f59eecda3fa8ea09c62d915ed74fc2033af719a12df52ce"') WHERE simulation->>'rulesHash'='11d7e176c6e0b3c8ed5fb1f6ddf43f0b023bedfba5c042fb2bb5621771871679';
