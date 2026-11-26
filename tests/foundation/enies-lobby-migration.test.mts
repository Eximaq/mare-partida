import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);

test('the Enies Lobby migration fingerprints match the shipped world and combat rules',()=>{
 const sql=readFileSync(new URL('../../apps/game-server/migrations/0062_enies_lobby.sql',import.meta.url),'utf8');
 const world=require('../../world-catalog.cjs').load(),battle=require('../../world-battle.cjs');
 assert(sql.includes(`SET rules_hash='${world.rulesHash}'`),'Migration must promote saved worlds to the shipped catalog hash');
 assert(sql.includes(`to_jsonb('${battle.rulesHash}'::text)`),'Migration must promote saved battles to the shipped combat hash');
});
