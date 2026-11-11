'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../bounty-system.js');
const complete={...B.rules,competitive:{gvg:true,duels:true}};
const max={...B.rules.reference,impel:100,impelMax:100,hierarchy:8,hierarchyMax:8,haki:3,achievements:1};

test('versioned nominal weights, bounds and Berry curve',()=>{
  assert.equal(Math.round(100*Object.values(B.rules.weights).reduce((a,b)=>a+b,0)),100);
  assert.equal(B.calculate({},complete).berry,10000);
  assert.equal(B.calculate(max,complete).berry,1000000000);
  assert.equal(B.calculate({...max,power:1e20,berry:1e20},complete).score,1);
  assert.equal(B.calculate({},complete).version,1);
  assert.equal(B.calculate({},{...complete,version:2}).version,2);
});
test('crew membership is live, and competitive weights are active globally',()=>{
  const row=(view,id)=>view.entries.find(r=>r.id===id);
  const solo=B.calculate({...max,crew:0}),weak=B.calculate({...max,crew:1000}),strong=B.calculate(max);
  assert(solo.berry<weak.berry&&weak.berry<strong.berry);
  assert.equal(B.calculate({...max,crew:0}).berry,solo.berry);
  assert.equal(row(strong,'crew').weight,.07);
  assert.equal(row(strong,'gvg').normalized,null);
  assert.equal(row(strong,'duels').effectiveWeight,0);
  const launch=B.calculate({...max,gvg:0,duels:0},complete);
  assert.equal(row(launch,'gvg').effectiveWeight,.06);
  assert.equal(row(launch,'duels').normalized,0);
  assert.equal(row(B.calculate(max,complete),'duels').contribution,.04);
  assert.equal(strong.berry,1000000000);
});
test('eligible achievements are counted once, with or without claiming the reward',()=>{
  assert.equal(B.countAchievements([
    {enabled:true,progress:10,target:10},
    {enabled:true,claimed:true,progress:0,target:10},
    {enabled:true,progress:9,target:10},
    {enabled:false,progress:10,target:10}
  ]),2/3);
});
