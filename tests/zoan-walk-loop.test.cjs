'use strict';
const assert=require('node:assert/strict');
require('../sprite-combat-v2.js');
const S=globalThis.MareSpriteCombatV2;
const clip={frames:29,fps:24,loop:true,loop_start:3,loop_end:22};
// Ignoring the curated loop would show frame 0 Idle and the frozen 24–28 tail.
assert.equal(S.frameAt(clip,{time:0}),3);
assert.equal(S.frameAt(clip,{time:19/24}),22);
assert.equal(S.frameAt(clip,{time:20/24}),3);
for(let i=0;i<240;i++){const f=S.frameAt(clip,{time:i/24});assert.ok(f>=3&&f<=22);}
assert.equal(S.frameAt(clip,{progress:0}),0,'explicit source inspection still exposes every native frame');
assert.equal(S.frameAt({frames:8,fps:12,loop:true},{time:8/12}),0,'unmodified wolf loop remains intact');
console.log('Zoan walking: curated native interval, wrap, frozen tail exclusion and complete source inspection passed.');
