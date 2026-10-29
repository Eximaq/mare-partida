'use strict';
const assert=require('node:assert/strict');
require('../sprite-combat-v2-data.js');require('../sprite-combat-v2.js');
const S=globalThis.MareSpriteCombatV2,D=globalThis.MareSpriteCombatV2Data;
// Catches directional Idle fallback or any renderer resolving another facing for Hurt.
for(const key of Object.keys(D))for(const direction of ['south','north','east','west','front','back','left','right']){
 const result=S.resolve(key,'hurt',direction);
 assert.equal(result.clip.image,`assets/sprites-combat-v2/${key}/hurt-south.png`,key+'/'+direction);
 assert.equal(result.requested,true);
 assert.equal(result.facing,'south','Hurt geometry must also use the south reference');
}
for(const direction of ['south','north','east','west']){
 const r=S.resolve('kuroobi','attack',direction);
 assert.equal(r.clip.image,`assets/sprites-combat-v2/kuroobi/attack-${direction}.png`);
 assert.equal(r.requested,true);
}
for(const [direction,frame]of [['south',18],['north',14],['west',16],['east',16]])assert.equal(S.frameAt(S.resolve('kuroobi','attack',direction).clip,{progress:.5,hitRatio:.5}),frame);
console.log('All 21 Hurt reactions use native South; Kuroobi has four native attack directions.');
