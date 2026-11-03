-- Additive Skypiea catalog: all previously registered maps and enemy profiles
-- remain unchanged. Upgrade only the audited predecessor signatures.
-- Preserve positions, paths, clocks, HP, inventory and every simulation field.
UPDATE mare_game.character_world
SET rules_hash='0b25fe7f2b61dc4892d22a7645a262c288dbbdc125ccadd294889016c7cee249'
WHERE rules_hash='65fb208ce5f01adaf0c10618c31efab2d7270e0fae5b44c35dae782ca8235189';

UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('90158f79c9b5101227c40a0f4124617a1bcf08f217892dfa26daab3d90d797d4'::text))
WHERE simulation->>'rulesHash'='6ca609c3086bf4062843ebd12d84fc75b5f0cad8307ce0d23454c92101d34e68';
