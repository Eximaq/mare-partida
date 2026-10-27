'use strict';
const assert=require('node:assert/strict'),A=require('../akuma-system.js'),P=require('../akuma-passives.js');
assert.deepEqual(P.stats,{akuma_ryu_ryu:require('../assets/akuma/ryu/rules.json').passiveStats,akuma_jiki_jiki:require('../assets/akuma/jiki/rules.json').passiveStats,akuma_hoya_hoya:require('../assets/akuma/hoya/rules.json').passiveStats,...require('../assets/akuma/rank-d-passives.json'),...Object.fromEntries(Object.values(require('../assets/akuma/rank-b-rules.json')).map(r=>[r.id,r.passiveStats])),...Object.fromEntries(Object.values(require('../assets/akuma/rank-c-expansion-rules.json')).map(r=>[r.id,r.passiveStats])),...Object.fromEntries(Object.values(require('../assets/akuma/rank-c-rules.json')).map(r=>[r.id,r.passiveStats]))});
const base={physical:100,elemental:80,attack:100,defense:50,maxHP:500,maxEnergy:100,speed:2,moveSpeed:100,huntSpeed:80,crit:.2,critMultiplier:1.65,penetration:.1,lifesteal:0,power:1000,evasion:.1,healing:10};
for(const fruit of A.catalog.filter(f=>f.rank==='D')){assert.deepEqual(fruit.passiveStats,P.stats[fruit.id]);const out=P.apply(base,fruit.id);assert.notStrictEqual(out,base);assert.deepEqual(base,{...base});assert.deepEqual(P.apply(base,fruit.id),out,'recalculation is idempotent from base');}
const wolf=P.apply(base,'akuma_inu_wolf');assert.equal(wolf.physical,112);assert.equal(wolf.speed,2.16);assert.equal(wolf.moveSpeed,105);assert.equal(wolf.fruitLifesteal,.05);assert.equal(P.cooldown(20,'akuma_doru_doru'),19);
const cat=P.apply(base,'akuma_neko_leopard');assert.ok(Math.abs(cat.crit-.3)<1e-8);assert.ok(Math.abs(cat.critMultiplier-1.8)<1e-8);
assert.equal(P.apply(base,'akuma_ushi_giraffe').maxHP,680);assert.ok(Math.abs(P.apply(base,'akuma_ushi_giraffe').penetration-.15)<1e-8);
const wax=P.apply(base,'akuma_doru_doru');assert.equal(wax.elemental,94);assert.equal(wax.physical,100);assert.equal(wax.maxHP,600);
assert.strictEqual(P.apply(base,null),base);assert.equal(P.apply({...base,crit:.65,penetration:.6,lifesteal:.3},'akuma_ushi_giraffe').penetration,.6);
assert.equal(P.apply({...base,lifesteal:.3},'akuma_inu_wolf').fruitLifesteal,0);
assert.equal(P.reflection(100,'akuma_supa_supa',{physical:true}),5);assert.equal(P.reflection(100,'akuma_supa_supa',{physical:false}),0);assert.equal(P.reflection(100,'akuma_supa_supa',{physical:true,reflected:true}),0);
const T=require('../game-tooltips.js');for(const stats of Object.values(P.stats))assert.equal(Object.keys(T.filterCleanStats(stats)).length,Object.keys(stats).length);
console.log('Rank D passives: shared data, exact stats, percentages, caps, independent recalculation, reflection guard and tooltip fields passed');
