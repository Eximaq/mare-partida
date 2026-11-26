-- Register the additive destinations without rewriting existing visit history.
-- Skypiea's four maps are already live and must remain valid in the same ledger.
ALTER TABLE mare_game.achievement_visits
  DROP CONSTRAINT IF EXISTS achievement_visits_island_id_check;
ALTER TABLE mare_game.achievement_visits
  ADD CONSTRAINT achievement_visits_island_id_check
  CHECK(island_id IN (
    'dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown',
    'alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05',
    'skypiea-01','skypiea-02','skypiea-03','skypiea-04',
    'enies-lobby-01','enies-lobby-02','enies-lobby-03','enies-lobby-04','enies-lobby-05'
  ));

-- Lucci and Moria record pending victories with a NULL reward. Their rewards
-- have not been configured, so the existing claim ledger stays unchanged.
ALTER TABLE mare_game.dungeon_victories
  DROP CONSTRAINT IF EXISTS dungeon_victories_dungeon_id_check;
ALTER TABLE mare_game.dungeon_victories
  ADD CONSTRAINT dungeon_victories_dungeon_id_check
  CHECK(dungeon_id IN (
    'alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile',
    'rob-lucci','gecko-moria'
  ));

-- Enies Lobby adds maps; it does not replace existing geometry. Preserve every
-- position, path, movement timer, battle field and historical receipt exactly.
-- Promote only the known compatible predecessor; unknown hashes stay rejected.
UPDATE mare_game.character_world
SET rules_hash='51960833099ea10cdc82e6647e463bbd2e335d7c58df479c043b0277d13f5ff0'
WHERE rules_hash='1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd';

UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',
  to_jsonb('fde69ce5850f0028b5b45ac47805635b3fe798c56aad13c3ade9578297031259'::text),false)
WHERE simulation->>'rulesHash'='5fa0fe9ceb9c07af9b4b3510e97b31edcb816034683ee0eb8f2af4da7b3f1810';
