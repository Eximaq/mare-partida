-- The merchant consumables use stack counters, separate from equipment slots.
ALTER TABLE mare_game.game_inventory
 ADD COLUMN mana_potions integer NOT NULL DEFAULT 0 CHECK(mana_potions BETWEEN 0 AND 1000000000);
