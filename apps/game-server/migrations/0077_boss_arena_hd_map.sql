-- Replace only the geometry of the shared boss-dungeon arena. The eighteen
-- dungeon records, encounter identities and immutable reward receipts stay intact.
UPDATE mare_game.character_world
SET x=1536, y=1824, path='[]'::jsonb, speed=0, motion_until=started_at
WHERE rules_hash='efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87'
  AND map_id='quest-dungeons';

UPDATE mare_game.character_world
SET rules_hash='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c'
WHERE rules_hash='efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87';

-- Private rehearsals restore a saved world when leaving. Advance recognized
-- snapshots as well, preserving the exact port position and movement metadata.
-- Rehearsals were introduced after 0053. Earlier HD migrations updated personal
-- world rows only, so their saved port snapshots can retain any audited identity
-- from the 0053--0076 chain. Only lobby snapshots may use that historical list;
-- a dungeon snapshot still requires this release's exact predecessor signature.
-- Combat snapshots retain their original data; the recognized battle upgrade
-- projects their signature and geometry through the same path as personal saves.
UPDATE mare_game.weekly_boss_members
SET return_world=(CASE WHEN return_world->>'mapId'='quest-dungeons'
  THEN return_world || jsonb_build_object(
    'position',jsonb_build_object('x',1536,'y',1824),
    'path','[]'::jsonb,'speed',0,'motionUntil',return_world->'serverNow')
  ELSE return_world END) || jsonb_build_object(
    'rulesHash','3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c')
WHERE return_world->>'rulesHash'='efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87'
 OR (return_world->>'mapId'='lobby' AND return_world->>'rulesHash' IN (
  'af897f7bc7334c34b65078ee6cf34b917dd9e176a2b6cbedea6a97c0a7a314d9',
  '1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd',
  '9c6aa574e983a938188e17282d07a3754b5fae612fff0fb829dadaae64edd2e7',
  '17b282eefa60baea6281d1333f00694eecfbd88285323a691e70a2612437c15f',
  '24fb16ebe9096c84138d5a0d3180edec15d557ad787991148172715d34c05b97',
  '5fb13302bc58e2a07ce57eb65ccf8c8c7845246cc991d4f6e876ee18858b8e16',
  '7a6056d9a7974974d6d1dc4bc811b4bf9a582901cf6f42d3378ad6fe5f973262',
  'c08f45b4a0edee7c4756515411bebfb9b50081abcb159d56417fc434d8a31eec',
  'be0c0ca913d50938d37fa1b20dde8da334f2ca7aef0f295d734718b7c81a2c1a',
  '0ec69dfeb2ffe38be8a38f37c65479bf4f65d1c4f695cfe5336f172924bd7989',
  'fa87a4f973901d973637e2308106a4f127bc70b7fc93d24dd3a3b3d83e31d71d',
  'b1c2e63f0aa604c4e30ffdffdd765c461450f1752eb2bf2a5ae2c639e8d2dca9',
  'f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b',
  '63d94786300959c580ea26f0f895af50879ce7b4c65735bc3412ecae6dfaee8b',
  '75d653917517f14b56910244d1ff104bba0c736b5d90f0c2fa6dd40be53f8604',
  '7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4'
 ));

-- The private Akainu rehearsal shares this map but owns a canonical room, not
-- a dungeon record. Move live rooms (and finished rooms with remaining members)
-- once, preserving HP, alive/dead state, contributions, clocks and event status.
-- The prior entry/spawn pair identifies the old built-in rehearsal configuration;
-- official Marineford events and historical rooms without members are untouched.
WITH changed AS (
 SELECT e.id,e.config || jsonb_build_object(
   'entry',jsonb_build_object('x',1536,'y',1824),
   'spawn',jsonb_build_object('x',1536,'y',1644)) AS config
 FROM mare_game.weekly_boss_events e
 WHERE e.mode='test' AND e.map_id='quest-dungeons'
   AND e.config->'entry'='{"x":1824,"y":2144}'::jsonb
   AND e.config->'spawn'='{"x":1824,"y":1964}'::jsonb
   AND (e.status='active' OR EXISTS(
     SELECT 1 FROM mare_game.weekly_boss_members m WHERE m.event_id=e.id))
)
UPDATE mare_game.weekly_boss_events e
SET config=changed.config,
    simulation=jsonb_set(jsonb_set(e.simulation,'{config}',changed.config),'{mobs}',(
      SELECT COALESCE(jsonb_agg(CASE
        WHEN mob->>'source'='weekly-boss' AND mob->>'weeklyBossId'='akainu'
        THEN (mob-'partyTaunt') || jsonb_build_object(
          'x',1536,'y',1644,'anchorX',1536,'anchorY',1644,
          'action',NULL,'telegraph',NULL,'engaged',false,'returning',false,
          'moving',0,'attackAnim',0,'partyTargetId',NULL)
        ELSE mob END ORDER BY ordinal),'[]'::jsonb)
      FROM jsonb_array_elements(e.simulation->'mobs') WITH ORDINALITY AS mobs(mob,ordinal)
    ))
FROM changed WHERE e.id=changed.id;
