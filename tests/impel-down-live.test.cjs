'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../prison-system.js');
const catalog={bandit:{name:'Corsário',hp:100,atk:20,def:10,boss:false},spirit:{name:'Sentinela',hp:200,atk:30,def:20},boss:{name:'Guardião',hp:350,atk:50,def:30,boss:true}};
test('live prison starts at full base power and compounds 30 percent per floor',()=>{
 assert.equal(P.multiplier(1),1);assert.equal(P.multiplier(2),1.3);assert.ok(Math.abs(P.multiplier(3)-1.69)<1e-12);
 assert.deepEqual(P.scaleMonster(catalog.bandit,2),{...catalog.bandit,hp:130,atk:26,def:13});assert.equal(catalog.bandit.hp,100);
 for(let f=1;f<=100;f++)assert.ok(Number.isFinite(P.multiplier(f)));
 assert.equal(P.available,true);
});
test('normal floors draw exactly one existing common and every fifth floor uses the boss hook',()=>{
 assert.equal(typeof P.createRun,'function');let draws=0,bosses=[];const run=P.createRun({catalog,random:()=>{draws++;return .99;},spawnBoss:f=>{bosses.push(f);return {type:'boss',...catalog.boss};}});
 assert.equal(run.currentFloor,1);
 for(let f=1;f<=10;f++){
  const enemy=run.startFloor();assert.equal(run.startFloor(),enemy,'a repeated start must reuse the single encounter');assert.equal(enemy.type,f%5===0?'boss':'spirit');
  assert.equal(run.defeat('wrong'),false);assert.equal(run.defeat(enemy.token),true);assert.equal(run.defeat(enemy.token),false);run.advance();assert.equal(run.currentFloor,f+1);
 }
 assert.equal(draws,8);assert.deepEqual(bosses,[5,10]);assert.equal(catalog.spirit.hp,200);
});
test('the placeholder boss is stronger than the common pool and keeps an existing sprite id',()=>{
 assert.equal(typeof P.spawnImpelDownBoss,'function');const boss=P.spawnImpelDownBoss(5,catalog);
 assert.equal(boss.type,'boss');assert.ok(boss.hp>200&&boss.atk>30&&boss.def>20);assert.equal(boss.placeholder,true);
});
