import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const characters=require('../../character-system.js');
test('shared character catalog preserves all seven classes and four factions byte for byte',()=>{
  const rules=require('../../character-catalog.js');
  const catalog=rules.create({characters});
  assert.equal(createHash('sha256').update(JSON.stringify(catalog)).digest('hex'),'47dcee47e14f33f51a089a639079ab4fce881050a0309c329be30562274fb9c9');
  assert.equal(Object.keys(catalog.classes).length,7);assert.equal(Object.keys(catalog.factions).length,4);
  const again=rules.create({characters});catalog.classes.sword.attack=999;
  assert.equal(again.classes.sword.attack,14,'assembly must not share mutable definitions');
});
test('original XP curve has no alpha level20 cap and uses bounded twenty-level advancement',()=>{
  const rules=require('../../character-catalog.js');
  for(const level of [1,2,20,21,50,100,1000])assert.equal(rules.legacyXpNeeded(level),Math.round(80+25*Math.pow(level-1,1.55)));
  assert.equal(rules.xpNeeded(2),130);assert.equal(rules.xpNeeded(20),41391);
  const step=rules.advance({level:20,start:18209n,experience:18209n+BigInt(rules.xpNeeded(20))});
  assert.equal(step.level,21);assert.equal(step.start,59600n);
  const cappedWork=rules.advance({level:1,start:0n,experience:9223372036854775807n});
  assert.equal(cappedWork.level,21,'twenty iterations per reward matches gainXP without unbounded CPU work');
  assert.equal(cappedWork.levels.length,20);
  assert.throws(()=>rules.xpNeeded(NaN));assert.throws(()=>rules.xpNeeded(0));
});
