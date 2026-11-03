-- New owner map export; preserve all coordinates, paths and progression.
-- The preceding Skypiea migration stays immutable after its merge.
UPDATE mare_game.character_world
SET rules_hash='d709ce79bf71fc2ddfed3e53b339c4ccddb0776a06d1b7e4fa56091890973230'
WHERE rules_hash='0b25fe7f2b61dc4892d22a7645a262c288dbbdc125ccadd294889016c7cee249';
