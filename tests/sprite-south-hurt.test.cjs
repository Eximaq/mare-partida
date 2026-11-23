'use strict';
const assert=require('node:assert/strict');
require('../sprite-combat-v2-data.js');require('../sprite-combat-v2.js');
const S=globalThis.MareSpriteCombatV2,D=globalThis.MareSpriteCombatV2Data;
// Keep every historical South-only reaction; only the newly authored four-way
// Skypiea strips opt into a different direction.
const directions={front:'south',back:'north',left:'west',right:'east'};
const directional=new Set(['shura','gendatsu','ohm']);
assert.deepEqual(new Set(Object.keys(D).filter(k=>D[k].directionalHurt)),directional);
for(const key of Object.keys(D))for(const direction of ['south','north','east','west','front','back','left','right']){
 const result=S.resolve(key,'hurt',direction);
 const expected=directional.has(key)?directions[direction]||direction:'south';
 assert.equal(result.clip.image,`assets/sprites-combat-v2/${key}/hurt-${expected}.png`,key+'/'+direction);
 assert.equal(result.requested,true);
 assert.equal(result.facing,expected,'Hurt geometry must use its source reference');
}
for(const direction of ['south','north','east','west']){
 const r=S.resolve('kuroobi','attack',direction);
 assert.equal(r.clip.image,`assets/sprites-combat-v2/kuroobi/attack-${direction}.png`);
 assert.equal(r.requested,true);
}
for(const [direction,frame]of [['south',18],['north',14],['west',16],['east',16]])assert.equal(S.frameAt(S.resolve('kuroobi','attack',direction).clip,{progress:.5,hitRatio:.5}),frame);
console.log('Historical Hurt uses native South, with four-way exceptions for the Skypiea priests; Kuroobi attack remains unchanged.');
