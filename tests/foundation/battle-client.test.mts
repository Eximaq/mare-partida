import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ui=require('../../apps/account-client/game-ui.js');
test('original HUD projects server battle HP, energy and hunt counters over old pilot history',()=>{
 const b={hp:42,energy:37,hunts:{areas:{beach:{kills:9,bosses:0}}}},base={equipment:{weapon:null},stats:{kills:0,boss:0},hunts:{areas:{}}};
 const data={character:{name:'Hunter',classId:'sword',factionId:'pirate'},online:{battle:b,state:{level:1,experience:'0',gold:'0'},progression:{xpIntoLevel:'0'},combat:{status:'lost',encounterId:'old',playerHp:0},combatPreview:{maxHp:200},attributes:{allocated:{},available:0}}};
 const projected=ui.project(base,data);assert.equal(projected.hp,42);assert.equal(projected.energy,37);assert.deepEqual(projected.hunts,b.hunts);assert.equal(projected.stats.kills,9);
 b.hp=1;assert.equal(projected.hp,42,'projection does not mutate authoritative snapshot');
});
