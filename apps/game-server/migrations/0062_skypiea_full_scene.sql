-- Only the art coverage and future arrival point change. Existing positions,
-- routes, combat rewards and saves still describe the same collision geometry.
UPDATE mare_game.character_world
SET rules_hash='fcf771a96537f15d0706849acf13c3e99999a25b0f74506b3a53c2583077bf25'
WHERE rules_hash='1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd';
