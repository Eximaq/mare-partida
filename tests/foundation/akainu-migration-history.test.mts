import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../../apps/game-server/src/db/migrations.js';

test('both release histories preserve an applied Akainu migration and reject unknown hashes',()=>{
 const first={name:'0049_previous.sql',checksum:'old'};
 const curve={name:'0050_character_xp_curve.sql',checksum:'curve'};
 const boss={name:'0054_akainu_weekly_boss.sql',checksum:'akainu'};
 const next={name:'0055_prison_floor_rewards.sql',checksum:'prison'};
 const oldBoss={name:'0050_akainu_weekly_boss.sql',checksum:'akainu'};
 const plan=[first,curve,boss,next];
 assert.equal(typeof (db as any).pendingMigrations,'function');
 assert.deepEqual((db as any).pendingMigrations(plan,[first,oldBoss]),[curve,next]);
 assert.deepEqual((db as any).pendingMigrations(plan,[first,curve]),[boss,next]);
 assert.deepEqual((db as any).pendingMigrations(plan,[first,oldBoss,curve,next]),[]);
 assert.throws(()=>(db as any).pendingMigrations(plan,[first,{...oldBoss,checksum:'unknown'}]));
 assert.throws(()=>(db as any).pendingMigrations(plan,[first,oldBoss,curve,boss]));
 assert.throws(()=>(db as any).pendingMigrations(plan,[oldBoss]));
});
