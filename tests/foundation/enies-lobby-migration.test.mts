import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);

test('the Enies Lobby fingerprints lead through the additive migration to shipped rules',()=>{
 const previous=readFileSync(new URL('../../apps/game-server/migrations/0062_enies_lobby.sql',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../../apps/game-server/migrations/0063_late_archipelago.sql',import.meta.url),'utf8');
 const world=require('../../world-catalog.cjs').load(),battle=require('../../world-battle.cjs');
 const previousWorld=previous.match(/SET rules_hash='([a-f0-9]{64})'/)?.[1];
 const previousBattle=previous.match(/to_jsonb\('([a-f0-9]{64})'::text\)/)?.[1];
 assert(previousWorld&&previousBattle,'Keep the deployed Enies migration intact');
 assert(sql.includes(`WHERE rules_hash='${previousWorld}'`),'Recognize saved Enies worlds');
 assert(sql.includes(`WHERE simulation->>'rulesHash'='${previousBattle}'`),'Recognize saved Enies battles');
 assert(sql.includes(`SET rules_hash='${world.rulesHash}'`),'Migration must promote saved worlds to the shipped catalog hash');
 assert(sql.includes(`to_jsonb('${battle.rulesHash}'::text)`),'Migration must promote saved battles to the shipped combat hash');
});
