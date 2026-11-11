-- Audited predecessors: private 8ac7a4c and public 69dac39.
-- Rework assets, Phoenix final tick, Jiki assembly duration and Wolf feedback.
-- Keep HP, positions, pending actions, cooldowns, party links and rewards intact.
-- Unknown rules remain rejected by the simulation. Never reset a battle here.
UPDATE mare_game.character_battles
SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('b672ad6a2dc8d1b947514a51985552813cbf96dc2b40fad2935275ef3d81a977'::text))
WHERE simulation->>'rulesHash' IN (
 'd28ab5e53df81f190558b406a873618e6848955d0e53b92edc395d254e9c114d',
 'c6129a2128183184726fcaa7375746ba192117780add77a91867d78a0fc15a1b'
);
