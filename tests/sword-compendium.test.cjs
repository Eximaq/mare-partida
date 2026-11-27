'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../sword-compendium.js');
const take=(number)=>({ 'bamboo':number });
test('40 supplied blades and the catalogue yield exactly 5.425% to every attribute',()=>{
 assert.equal(S.catalog.length,40);
 assert.deepEqual(Object.fromEntries(Object.entries(S.byRank).map(([k,v])=>[k,v.length])),{E:5,D:7,C:8,B:7,A:9,S:4});
 assert.equal(S.bonusUnits(Object.fromEntries(S.catalog.map(s=>[s.id,{active:true,fragments:0}]))),5425);
});
test('fragments route per sword, only activation yields bonus, and surplus stays recoverable',()=>{
 const grant=S.receive({bamboo:{fragments:18,active:false}},take(5));
 assert.equal(grant.collection.bamboo.fragments,23);
 assert.deepEqual(grant.excess,{});
 assert.equal(S.bonusUnits(grant.collection),0);
 assert.equal(S.activate(grant.collection,'nakiri'),null);
 const active=S.activate(grant.collection,'bamboo');
 assert.deepEqual(active.excess,take(3));
 assert.equal(S.bonusUnits(active.collection),50);
 assert.equal(S.activate(active.collection,'bamboo'),null);
 const next=S.receive(active.collection,{bamboo:4,nakiri:5});
 assert.deepEqual(next.excess,take(4));
 assert.deepEqual(next.collection.nakiri,{active:false,fragments:5});
 assert.equal(S.bonusUnits(JSON.parse(JSON.stringify(next.collection))),50);
});
test('the server can use one weekly rotation with independent rank rolls and exclusive closing time',()=>{
 assert.deepEqual(S.day(new Date('2026-11-23T22:59:59Z')),{key:'2026-11-23',boss:'daily-mihawk',status:'waiting'});
 assert.equal(S.day(new Date('2026-11-23T23:00:00Z')).status,'open');
 assert.equal(S.day(new Date('2026-11-24T00:00:00Z')).status,'closed');
 assert.equal(S.day(new Date('2026-11-27T23:30:00Z')).boss,'daily-rayleigh');
 const reward=S.roll(()=>0);
 assert.equal(Object.values(reward).reduce((sum,n)=>sum+n,0),12);
 assert.equal(Object.values(S.roll(()=>.9999)).reduce((sum,n)=>sum+n,0),10);
});
