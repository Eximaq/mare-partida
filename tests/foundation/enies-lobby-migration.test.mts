import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const readMigration=(file:string)=>readFileSync(new URL('../../apps/game-server/migrations/'+file,import.meta.url),'utf8');

test('the Enies Lobby fingerprints lead through the additive migrations to shipped rules',()=>{
 const previous=readMigration('0062_enies_lobby.sql');
 const late=readMigration('0063_late_archipelago.sql');
 const swords=readMigration('0064_sword_compendium.sql');
 const skypiea=readMigration('0065_skypiea_celestial_map.sql');
 const arrival=readMigration('0066_skypiea_hd_arrival.sql');
 const world=require('../../world-catalog.cjs').load(),battle=require('../../world-battle.cjs');
 const previousWorld=previous.match(/SET rules_hash='([a-f0-9]{64})'/)?.[1];
 const previousBattle=previous.match(/to_jsonb\('([a-f0-9]{64})'::text\)/)?.[1];
 const lateWorld=late.match(/SET rules_hash='([a-f0-9]{64})'/)?.[1];
 const lateBattle=late.match(/to_jsonb\('([a-f0-9]{64})'::text\)/)?.[1];
 const swordWorld=swords.match(/SET rules_hash='([a-f0-9]{64})'/)?.[1];
 const skypieaWorld=skypiea.match(/SET rules_hash='([a-f0-9]{64})'/)?.[1];
 assert(previousWorld&&previousBattle,'Keep the deployed Enies migration intact');
 assert(lateWorld&&lateBattle,'Keep the deployed late-archipelago migration intact');
 assert(late.includes("WHERE rules_hash='"+previousWorld+"'"),'Recognize saved Enies worlds');
 assert(late.includes("WHERE simulation->>'rulesHash'='"+previousBattle+"'"),'Recognize saved Enies battles');
 assert(swords.includes("WHERE rules_hash='"+lateWorld+"'"),'Recognize worlds after the late-archipelago migration');
 assert(swordWorld&&skypiea.includes("WHERE rules_hash='"+swordWorld+"'"),'Recognize worlds after the sword arena migration');
 assert(skypieaWorld&&arrival.includes("WHERE rules_hash='"+skypieaWorld+"'"),'Recognize worlds after the celestial island migration');
 assert(arrival.includes("SET rules_hash='"+world.rulesHash+"'"),'Migration must promote saved worlds to the shipped catalog hash');
 const savedBattle={rulesHash:lateBattle,hp:17,pending:{targetId:'fixture',remaining:.3}};
 battle.upgradeBalance(savedBattle);
 assert.deepEqual(savedBattle,{rulesHash:battle.rulesHash,hp:17,pending:{targetId:'fixture',remaining:.3}},'Runtime must promote saved battles and preserve the active attack');
});
