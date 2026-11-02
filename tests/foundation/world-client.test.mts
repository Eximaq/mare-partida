import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ui=require('../../apps/account-client/game-ui.js'),{validIntent}=require('../../apps/account-client/game-session.js');
test('online world projection follows only a confirmed route, caps time at lease and never mutates the snapshot',()=>{
 assert.equal(typeof ui.worldPosition,'function');
 const w={position:{x:10,y:10},path:[{x:20,y:10},{x:20,y:40}],speed:10,direction:'front',serverNow:'2026-11-01T00:00:00.000Z',motionUntil:'2026-11-01T00:00:03.000Z'};const before=JSON.stringify(w);
 assert.deepEqual(ui.worldPosition(w,1500),{x:20,y:15,direction:'front',moving:true});
 assert.deepEqual(ui.worldPosition(w,999999),{x:20,y:30,direction:'front',moving:false});assert.equal(JSON.stringify(w),before);
 assert.deepEqual(ui.worldPosition(w,-1000),{x:10,y:10,direction:'front',moving:false});
});
test('client can send only movement/travel intentions and cannot send an authoritative coordinate snapshot',()=>{
 assert(validIntent('world.move',{x:1504,y:1504}));assert(validIntent('world.travel',{islandId:'dawn'}));assert(validIntent('world.stop',{}));
 assert(!validIntent('world.move',{x:1504,y:1504,speed:1000}));assert(!validIntent('world.move',{x:Infinity,y:1}));assert(!validIntent('world.travel',{islandId:'dawn',level:99}));
});
