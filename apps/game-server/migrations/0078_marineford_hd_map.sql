-- Marineford now shares one authored HD floor between its six hunt instances
-- and the official Akainu arena. Combat profiles, schedules and reward receipts
-- are unchanged. Existing rooms need a persisted geometry identity because an
-- operator can configure arbitrary valid positions and a live boss can move.
-- Add without a default first: NULL identifies rows from the previous layout.
ALTER TABLE mare_game.weekly_boss_settings
 ADD COLUMN IF NOT EXISTS map_geometry_version smallint;
ALTER TABLE mare_game.weekly_boss_events
 ADD COLUMN IF NOT EXISTS map_geometry_version smallint;

-- A disabled configuration stays disabled. Advance its CAS revision only when
-- coordinates actually change; approval and every balance field stay intact.
WITH projected AS (
 SELECT boss_id,CASE WHEN config IS NULL THEN NULL ELSE config || jsonb_build_object(
   'spawn',jsonb_build_object('x',1536,'y',1280),
   'entry',jsonb_build_object('x',1536,'y',1280+(config->'profile'->>'aoeRadius')::numeric+48)) END AS config
 FROM mare_game.weekly_boss_settings
 WHERE boss_id='akainu' AND map_geometry_version IS NULL
   AND (config IS NULL OR config->>'mapId'='marineford')
)
UPDATE mare_game.weekly_boss_settings s
SET config=projected.config,
    revision=s.revision+CASE WHEN s.config IS DISTINCT FROM projected.config THEN 1 ELSE 0 END,
    map_geometry_version=1
FROM projected WHERE s.boss_id=projected.boss_id;

-- Project live rooms and finished rooms that still have participants once.
-- Preserve identities, health/death, contributions, attack clocks, versions and
-- opening/closing times. Spatial actions from the retired floor are cancelled.
-- Private rehearsals, sword arenas and unoccupied historical rooms are intact.
WITH projected AS (
 SELECT e.id,e.config || jsonb_build_object(
   'spawn',jsonb_build_object('x',1536,'y',1280),
   'entry',jsonb_build_object('x',1536,'y',1280+(e.config->'profile'->>'aoeRadius')::numeric+48)) AS config
 FROM mare_game.weekly_boss_events e
 WHERE e.boss_id='akainu' AND e.mode='official' AND e.map_id='marineford'
   AND e.map_geometry_version IS NULL
   AND (e.status='active' OR EXISTS(
     SELECT 1 FROM mare_game.weekly_boss_members m WHERE m.event_id=e.id))
)
UPDATE mare_game.weekly_boss_events e
SET config=projected.config,
    simulation=jsonb_set(jsonb_set(e.simulation,'{config}',projected.config),'{mobs}',(
      SELECT COALESCE(jsonb_agg(CASE
        WHEN mob->>'source'='weekly-boss' AND mob->>'weeklyBossId'='akainu'
        THEN (mob-'partyTaunt') || jsonb_build_object(
          'x',1536,'y',1280,'anchorX',1536,'anchorY',1280,
          'action',NULL,'telegraph',NULL,'engaged',false,'returning',false,
          'moving',0,'attackAnim',0,'partyTargetId',NULL)
        ELSE mob END ORDER BY ordinal),'[]'::jsonb)
      FROM jsonb_array_elements(e.simulation->'mobs') WITH ORDINALITY AS mobs(mob,ordinal)
    )),
    map_geometry_version=1
FROM projected WHERE e.id=projected.id;

-- Hunt arrivals use the shared pier. Official members instead use their room's
-- profile-aware entry, outside its AoE and within its unchanged leash.
UPDATE mare_game.character_world
SET x=1536,y=1824,path='[]'::jsonb,speed=0,motion_until=started_at
WHERE rules_hash='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c'
  AND map_id ~ '^marineford(-0[1-6])?$';

UPDATE mare_game.character_world w
SET x=(e.config->'entry'->>'x')::double precision,
    y=(e.config->'entry'->>'y')::double precision,
    path='[]'::jsonb,speed=0,motion_until=w.started_at
FROM mare_game.weekly_boss_members m JOIN mare_game.weekly_boss_events e ON e.id=m.event_id
WHERE w.character_id=m.character_id AND w.map_id='marineford'
  AND w.rules_hash='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c'
  AND e.boss_id='akainu' AND e.mode='official' AND e.map_id='marineford'
  AND e.map_geometry_version=1;

UPDATE mare_game.character_world
SET rules_hash='a24fd0cc9dd735b8be11a4103dc358877599de95a45c8c0036b841c254e5f6c8'
WHERE rules_hash='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c';

-- Returning from an older private rehearsal must still recognize its saved
-- lobby. The audited historical list is limited to the unchanged lobby floor;
-- other maps require this release's exact predecessor. Unknown signatures stay
-- blocked. Return combat snapshots follow the normal recognized runtime upgrade.
UPDATE mare_game.weekly_boss_members
SET return_world=(CASE WHEN return_world->>'mapId' ~ '^marineford(-0[1-6])?$'
  THEN return_world || jsonb_build_object(
    'position',jsonb_build_object('x',1536,'y',1824),
    'path','[]'::jsonb,'speed',0,'motionUntil',return_world->'serverNow')
  ELSE return_world END) || jsonb_build_object(
    'rulesHash','a24fd0cc9dd735b8be11a4103dc358877599de95a45c8c0036b841c254e5f6c8')
WHERE return_world->>'rulesHash'='3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c'
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
  '7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4',
  'efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87'
 ));

-- Handlers omit these columns, so newly created settings/events use the current
-- geometry without additional INSERT/UPDATE privileges. A raw replay therefore
-- cannot reset operator edits, moving bosses or current participants.
ALTER TABLE mare_game.weekly_boss_settings ALTER COLUMN map_geometry_version SET DEFAULT 1;
ALTER TABLE mare_game.weekly_boss_events ALTER COLUMN map_geometry_version SET DEFAULT 1;
