-- Preserve receipts and permit claims for all registered boss dungeons.
ALTER TABLE mare_game.dungeon_claims DROP CONSTRAINT dungeon_claims_dungeon_id_check;
ALTER TABLE mare_game.dungeon_claims ADD CONSTRAINT dungeon_claims_dungeon_id_check
  CHECK (dungeon_id IN (
    'alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile',
    'rob-lucci','gecko-moria','kuma','kizaru','hancock','magellan','ace','aokiji','akainu'
  ));

-- Register consumption of a complete sword and delivery of excess fragments.
ALTER TABLE mare_game.game_inventory_events DROP CONSTRAINT game_inventory_events_action_check;
ALTER TABLE mare_game.game_inventory_events ADD CONSTRAINT game_inventory_events_action_check CHECK(action IN
 ('items.sell-batch','items.lock-batch','items.initialize','items.equip','items.unequip','items.lock','items.sell','items.open-box','items.use-xp-boost','potions.buy','potions.use','forge.execute','combat.claim','battle.reward','battle.first','prison.claim','prison.reward','dungeon.battle','dungeon.claim','dungeon.craft','haki.unlock','haki.invest','mail.claim','mail.claim-all','swords.activate'));

-- Replace only undelivered Rank B chests. Victory and claim ledgers stay immutable.
WITH pending AS (
  SELECT d.character_id, jsonb_object_agg(r.key,r.value || jsonb_build_object(
    'reward',jsonb_build_object('xp',0,'berry',0,'items',jsonb_build_array(
      jsonb_build_object('materialId','akuma_fragment_c','quantity',10,'boundToCharacter',d.character_id)
    ))
  )) AS records
  FROM mare_game.character_dungeons d
  CROSS JOIN LATERAL jsonb_each(d.state->'records') r
  WHERE r.key IN ('wapol','crocodile')
    AND r.value->>'phase'='pending' AND r.value->>'ownerId'=d.character_id::text
    AND r.value->'reward'->>'materialId'='akuma_fragment_b'
    AND r.value->'reward'->>'boundToCharacter'=d.character_id::text
  GROUP BY d.character_id
)
UPDATE mare_game.character_dungeons d
SET state=jsonb_set(d.state,'{records}',(d.state->'records') || p.records)
FROM pending p WHERE d.character_id=p.character_id;
