-- Skypiea is already an authorized travel destination and achievement visit.
-- Expand the constraint without changing any stored character or visit.
ALTER TABLE mare_game.achievement_visits
 DROP CONSTRAINT achievement_visits_island_id_check,
 ADD CONSTRAINT achievement_visits_island_id_check CHECK (island_id IN (
  'dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown',
  'alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05','skypiea-01'
 ));
