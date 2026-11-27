-- Add the fourteen destinations while retaining all existing visit history.
ALTER TABLE mare_game.achievement_visits
  DROP CONSTRAINT IF EXISTS achievement_visits_island_id_check;
ALTER TABLE mare_game.achievement_visits
  ADD CONSTRAINT achievement_visits_island_id_check
  CHECK(island_id IN (
    'dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown',
    'alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05',
    'skypiea-01','skypiea-02','skypiea-03','skypiea-04',
    'enies-lobby-01','enies-lobby-02','enies-lobby-03','enies-lobby-04','enies-lobby-05',
    'thriller-bark-01','thriller-bark-02','thriller-bark-03','thriller-bark-04',
    'sabaody-01','sabaody-02','sabaody-03','sabaody-04',
    'marineford-01','marineford-02','marineford-03','marineford-04','marineford-05','marineford-06'
  ));

-- These bosses use the existing pending-victory contract with NULL rewards.
-- The claim ledger and every historical victory/reward remain unchanged.
ALTER TABLE mare_game.dungeon_victories
  DROP CONSTRAINT IF EXISTS dungeon_victories_dungeon_id_check;
ALTER TABLE mare_game.dungeon_victories
  ADD CONSTRAINT dungeon_victories_dungeon_id_check
  CHECK(dungeon_id IN (
    'alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile',
    'rob-lucci','gecko-moria','kuma','kizaru','hancock','magellan','ace','aokiji','akainu'
  ));

-- Existing maps, actors and clocks are unchanged. Only promote the known
-- Enies release fingerprints; unknown rules continue to be rejected.
UPDATE mare_game.character_world
SET rules_hash='17b282eefa60baea6281d1333f00694eecfbd88285323a691e70a2612437c15f'
WHERE rules_hash='9c6aa574e983a938188e17282d07a3754b5fae612fff0fb829dadaae64edd2e7';

UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',
  to_jsonb('0d55e5e1f278e9b0ab184c2a4916d25a6f081cabcf9d7b2e0be662889bc2c04f'::text),false)
WHERE simulation->>'rulesHash'='fde69ce5850f0028b5b45ac47805635b3fe798c56aad13c3ade9578297031259';
