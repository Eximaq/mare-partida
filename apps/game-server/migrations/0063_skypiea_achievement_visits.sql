-- World travel and the authoritative visit receipt share one transaction.
-- Keep every existing visit and extend only the accepted destination IDs.
ALTER TABLE mare_game.achievement_visits
  DROP CONSTRAINT achievement_visits_island_id_check,
  ADD CONSTRAINT achievement_visits_island_id_check
  CHECK(island_id IN ('dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown','alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05','skypiea-01','skypiea-02','skypiea-03','skypiea-04'));
