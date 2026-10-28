'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('pending actions aggregate and select the first actionable character section',()=>{
 const file=path.join(__dirname,'../notification-system.js');assert.ok(fs.existsSync(file),'notification manager is not implemented');
 const N=require(file),m=N.create();
 m.update({attributes:5,talents:2,canBePromoted:true,unclaimedAchievements:['level-0','kills-0']});
 assert.deepEqual(m.state,{status:5,talents:2,hierarchy:1,achievements:2,character:10});assert.equal(m.focus(),'status');
 m.update({talents:2,canBePromoted:true,unclaimedAchievements:['level-0']});assert.equal(m.focus(),'talents');
 m.update({canBePromoted:true,unclaimedAchievements:['level-0']});assert.equal(m.focus(),'hierarchy');
 m.update({unclaimedAchievements:['level-0']});assert.equal(m.focus(),'achievements');
 m.update({});assert.equal(m.focus(),null);assert.equal(m.state.character,0);
});
test('observers only fire when counts change and never mutate player data',()=>{
 const m=require('../notification-system.js').create(),events=[],input={attributes:5};
 const off=m.subscribe(s=>events.push(s.character));m.update(input);m.update({attributes:5});
 assert.deepEqual(events,[0,5]);assert.deepEqual(input,{attributes:5});assert.ok(Object.isFrozen(m.state));
 off();m.update({attributes:0});assert.deepEqual(events,[0,5]);
});
test('badge labels hide zero and negative counts and cap the visual label at 99+',()=>{
 const N=require('../notification-system.js');
 for(const [n,want]of [[0,''],[-4,''],[1,'1'],[99,'99'],[100,'99+'],[500,'99+'],[NaN,''],[Infinity,'']])assert.equal(N.label(n),want);
 const m=N.create();m.update({attributes:-3,talents:NaN,canBePromoted:false});assert.equal(m.state.character,0);
});
