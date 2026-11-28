'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),F=require('../forge-system');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('map gear odds preserve the 12 percent gate and unlock only legendary at monster level 100',()=>{
 const world=level=>({source:'world',level}),thresholds=monster=>{
  const counts={common:0,uncommon:0,rare:0,epic:0,legendary:0};
  for(let roll=1;roll<=1000;roll++)counts[F.rarityFromRoll(roll,monster)]++;
  return counts;
 };
 assert.equal(F.generationRules.normalGearChance,.12);
 assert.deepEqual(thresholds(world(99)),{common:600,uncommon:250,rare:100,epic:50,legendary:0});
 assert.deepEqual(thresholds(world(100)),{common:575,uncommon:250,rare:100,epic:50,legendary:25});
 assert.deepEqual(thresholds({source:'boss-dungeon',level:100}),thresholds(world(99)));

 const defs=require('../item-catalog').create({forge:F,prison:require('../prison-system'),haki:require('../haki-system'),
  akuma:require('../akuma-system'),hakiProgression:require('../haki-progression')}).items;
 const map={min:101,max:104},random=(...rolls)=>()=>rolls.shift();
 assert.equal(F.normalLoot(defs,130,map,random(.12),world(100)),null);
 const epic=F.normalLoot(defs,130,map,random(.119,.976,0),world(99));
 assert.equal(epic.rarity,'epic');
 const legendary=F.normalLoot(defs,130,map,random(.119,.975,0),world(100));
 assert.equal(legendary.level,104);
 assert.equal(legendary.rarity,'legendary');
 assert(F.isGear(legendary,defs));
 assert.equal(defs[legendary.def].rarity,'legendary');
 assert(!defs[legendary.def].unavailable);
 const fake=[{slot:'weapon',rarity:'legendary',unavailable:true},{slot:'weapon',rarity:'legendary',kind:'sword-fragment'},
  {slot:'weapon',rarity:'legendary',type:'akuma_no_mi'},defs[legendary.def]];
 assert.equal(F.normalLoot(fake,100,map,random(0,.999,0),world(100)).def,3);
});
test('one million potential draws match the configured decreasing exponential tails including 100',()=>{const rng=random(7721),p=F.potentialProbabilities(),n=1e6,thresholds=[80,90,95,100],counts=Object.fromEntries(thresholds.map(k=>[k,0]));for(let i=0;i<n;i++){const x=F.rollPotential(rng);for(const k of thresholds)if(x>=k)counts[k]++;}for(const k of thresholds){const expected=p.slice(k).reduce((a,b)=>a+b,0);assert(counts[k]>0);assert(Math.abs(counts[k]/n-expected)<Math.max(.0001,expected*.08));}assert(counts[80]>counts[90]&&counts[90]>counts[95]&&counts[95]>counts[100]);console.log('Potential tails',JSON.stringify(counts));});
