'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const A=require('../akuma-system.js');
const C=require('../character-system.js');
assert.deepEqual(A.supaRules,require('../assets/akuma/supa/rules.json'));
const skills=A.activeSkills('akuma_supa_supa');
assert.deepEqual(skills.map(s=>[s.key,s.cooldown,s.cost]),[['1',10,20],['2',20,25]]);
assert.equal(A.activeSkill('akuma_supa_supa','2').name,'Retaliação Metálica');
assert.equal(A.activeSkill('akuma_supa_supa','3'),null);
assert.equal(A.cooldownKey('akuma_supa_supa','1'),'akuma_supa_supa:1');
assert.equal(A.cooldownKey('akuma_supa_supa','2'),'akuma_supa_supa:2');
assert.equal(A.cooldownKey('akuma_beri_beri','2'),'akuma_beri_beri');
const targets=A.supaTargets({x:100,y:100},[
  {id:'center',x:100,y:100},{id:'edge',x:228,y:100},{id:'outside',x:228.01,y:100},
  {id:'corner',x:228,y:228},{id:'dead',x:100,y:100,alive:false},{id:'invalid',x:NaN,y:100}
]);
assert.deepEqual(targets.map(t=>t.id),['center','edge']);
assert.equal(C.damage({physical:100},0,{type:'physical',multiplier:skills[0].damage_multiplier}),130);
assert.equal(C.damage({physical:100},20,{type:'physical',multiplier:skills[0].damage_multiplier}),124);
assert.deepEqual(A.retaliate(100,50,{active:true}),{damage:30,reflected:30});
for(const options of [{active:false},{active:true,physical:false},{active:true,direct:true}])assert.deepEqual(A.retaliate(100,50,options),{damage:50,reflected:0});
assert.deepEqual(A.retaliate(100,0,{active:true}),{damage:0,reflected:0});
// Item indices from old saves must not move when the sixth fruit is introduced.
const source=fs.readFileSync(require.resolve('../item-catalog.js'),'utf8');
assert.ok(source.indexOf('MareAkuma.catalog.slice(0,5)')<source.indexOf("{name:'Katana da Maelstrom'"));
assert.ok(source.indexOf('MareAkuma.catalog.slice(5)')>source.indexOf("{name:'Lâmina das Trevas'"));
console.log('Supa: balance parity, independent HUD skills, physical scaling, circular range, mitigation, reflection and save indices passed');
