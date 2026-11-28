-- HD artwork and a revised arrival point do not invalidate saved coordinates.
-- New travel uses the gate spawn; current worlds keep paths, speed and clocks.
UPDATE mare_game.character_world
SET rules_hash='7a6056d9a7974974d6d1dc4bc811b4bf9a582901cf6f42d3378ad6fe5f973262'
WHERE rules_hash='5fb13302bc58e2a07ce57eb65ccf8c8c7845246cc991d4f6e876ee18858b8e16';

-- The runtime promotes the known preceding battle signature without changing
-- enemies, HP, active attacks, respawns, receipts or shared-party state.
