-- A 0039 chest could return its owner to port with a stale room reference.
-- Match the personal receipt to the boss actually defeated in that instance.
UPDATE mare_game.character_battles AS b
SET simulation = b.simulation - 'partyInstanceId'
FROM mare_game.character_world AS w
JOIN mare_game.dungeon_claims AS claim USING (character_id)
JOIN mare_game.dungeon_victories AS victory USING (character_id, dungeon_id)
JOIN mare_game.party_deaths AS death ON death.spawn_id = victory.spawn_id::text
JOIN mare_game.party_instances AS room ON room.id = death.instance_id
WHERE b.character_id = w.character_id AND w.map_id = 'lobby'
  AND b.simulation->>'dungeon' IS NULL
  AND b.simulation->>'partyInstanceId' = room.id::text
  AND room.simulation->>'kind' = 'dungeon'
  AND room.simulation->>'destination' = claim.dungeon_id;
