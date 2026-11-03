-- Conservative static-terrain acceleration. Original solver remains authoritative
-- at boundaries/obstacles. Positions, paths, clocks, progression and saves stay intact.
UPDATE mare_game.character_world SET rules_hash='65fb208ce5f01adaf0c10618c31efab2d7270e0fae5b44c35dae782ca8235189' WHERE rules_hash='2a2da1585a641e586ade3e544c858a3e630af3f93691fd00a84e7434bb7ce27c';
