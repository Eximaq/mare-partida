'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../akuma-system.js');
test('fruit offense combines independent physical and elemental bases without adding basic attack twice',()=>{
 const raw={physical:200,elemental:100,attack:200,healing:30,defense:20};const s=A.offensiveStats(raw);
 assert.equal(s.attack,235);assert.equal(s.physical,235);assert.equal(s.elemental,235);assert.equal(s.healing,30);assert.equal(s.defense,20);assert.equal(raw.physical,200);assert.deepEqual(A.offensiveStats(s),s);
 assert.equal(A.offensiveStats({...raw,physical:100,elemental:200}).attack,235);
});
test('small total coefficients receive one cast budget, never a full minimum for each tick',()=>{
 const raw={physical:100,elemental:0,attack:100},single=A.offensiveStats(raw,.55),multi=A.offensiveStats(raw,.5);
 assert(single.attack*.55>=110-1e-9);assert(Math.abs(multi.attack*.1*5-110)<1e-9);assert(multi.attack*.1<100);
 assert.equal(A.offensiveStats({...raw,physical:0,elemental:0,attack:0}).attack,0);
});
