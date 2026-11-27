-- The four stable Skypiea IDs now share a different authored layout. Their old
-- coordinates and routes cannot be reused; progression and combat receipts can.
UPDATE mare_game.character_world
SET x=1296, y=2190, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='24fb16ebe9096c84138d5a0d3180edec15d557ad787991148172715d34c05b97'
  AND map_id IN ('skypiea-01','skypiea-02','skypiea-03','skypiea-04');

-- Every other map retains its exact position, route, direction and clocks.
-- Unknown signatures remain rejected, and replay never moves a migrated save.
UPDATE mare_game.character_world
SET rules_hash='5fb13302bc58e2a07ce57eb65ccf8c8c7845246cc991d4f6e876ee18858b8e16'
WHERE rules_hash='24fb16ebe9096c84138d5a0d3180edec15d557ad787991148172715d34c05b97';

-- Leave battle signatures for the audited runtime upgrade: it must reanchor
-- existing Skypiea enemies before promoting their hash, retaining IDs, HP,
-- alive/dead state and respawn ledgers. The party worker owns shared enemies.
