import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ui=require('../../apps/account-client/game-ui.js'),comp=require('../../compendium-ui.js'),A=require('../../akuma-system.js');
test('online compendium never offers free copies while demonstration keeps its original registration',()=>{
 const fruit=A.catalog[0],demo={inventory:[],equipment:{},akumaCompendium:[]};
 assert(comp.registration(demo,fruit).eligible);const online={...demo,onlineFruits:true};assert(!comp.registration(online,fruit).eligible);assert(comp.registration({...online,inventory:[{fruitId:fruit.id}]},fruit).eligible);
});
test('fruit view translates server timelines without changing snapshots, stats or persistent cooldowns',()=>{
 const b={fruit:{id:'akuma_yami_yami',transformed:false,time:1800000000000,cooldowns:{x:1800000010000},effects:{wolfUntil:1800000005},advanced:{rankS:{jobs:[{started:1800000000,until:1800000006,hits:{serverSet:[1]},ticks:{serverMap:[['x',1800000001]]},elemental:1800000001}]}}}};
 const before=JSON.stringify(b),v=ui.fruitView(b,30);assert.equal(v.advanced.rankS.jobs[0].started,30);assert.equal(v.advanced.rankS.jobs[0].until,36);assert(v.advanced.rankS.jobs[0].hits instanceof Set);assert.equal(v.advanced.rankS.jobs[0].elemental,1800000001);assert.equal(v.cooldowns.x,1800000010000);assert.equal(JSON.stringify(b),before);
});
