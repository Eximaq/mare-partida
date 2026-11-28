'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),B=require('../monster-behavior.js');
// Exact battle signatures of PR #393/main and PR #394 before reconciliation.
const mainHash='6d92bfa8026e119f3fcb25a55a605cf4b4b89f4d1e34887deaaede7981e7bdea';
const hdHash='132be50d66d77d11a46dff57be1d0a7c7c5a51125da40fe279c468032d3ff67e';
const timedProgressionPredecessor='25e85126fbe82f0bb9367589fc80c5a183fd64bc8ee2530d83d6bd14d8e3a142';
const now=1795800000000,stats={maxHP:300,maxEnergy:100};
const oldAnchors=[['loguetown',1576,2824],['arlong',1192,1544],['baratie',1112,2040],['syrup',2236,2538],['rare',1168,528],['beach',1048,1480],['swamp',1960,2632],['orange',984,1912],['alabasta',2288,3568],...Array.from({length:5},(_,i)=>['alubarna-0'+(i+1),2984,3912]),...Array.from({length:6},(_,i)=>['marineford-0'+(i+1),3048,2408])];
function active(area,hash){
 const b=E.create(area,stats,now,()=>.5);b.rulesHash=hash;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.potionReadyAt=now+10000;
 b.auto=true;b.targetId=b.mobs[0]?.id||'target';b.pending={targetId:b.targetId,remaining:.4};b.projectiles=[{x:40,y:50}];
 if(area){b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[1].spawnId]=now+60000;}
 return b;
}
function preservedProgress(b,before){
 for(const key of ['hp','energy','cooldowns','potionReadyAt','hunts'])assert.deepEqual(b[key],before[key],key);
 for(const [i,m] of b.mobs.entries())for(const key of ['id','spawnId','alive','corpseUntil'])assert.deepEqual(m[key],before.mobs[i][key],key);
}
test('progression branch battles acquire every HD geometry without restoring enemies or rewards',()=>{
 for(const hash of [mainHash,timedProgressionPredecessor])for(const [area,x,y] of oldAnchors){
  const b=active(area,hash),m=b.mobs[0],p=B.slots(area)[0];
  Object.assign(m,{x:x+8,y:y+8,anchorX:x,anchorY:y,hp:11,engaged:true,telegraph:{remaining:.4}});
  b.mobs[1].alive=false;b.mobs[1].hp=0;b.mobs[1].corpseUntil=now+5000;
  const before=structuredClone(b);E.upgradeBalance(b);
  assert.equal(b.rulesHash,E.rulesHash,area+' accepts the progression release');
  assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[p.x,p.y,p.x,p.y,p.sector],area);
  preservedProgress(b,before);assert.equal(m.hp,11);assert.equal(b.mobs[1].hp,0);assert.equal(b.pending,null);assert.equal(m.telegraph,null);
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'projection runs once');
 }
});
test('progression branch dungeon and official weekly boss enter the authored HD arenas',()=>{
 const dungeon=active(null,mainHash),hero={};E.enterDungeon(dungeon,'alvida',{runId:'run',encounterId:'encounter',spawnId:'spawn',phase:'running'},stats,hero);
 Object.assign(dungeon.mobs[0],{x:1568,y:960,anchorX:1568,anchorY:960,hp:11,dungeonAttack:{remaining:.4}});
 const weekly=active(null,mainHash);Object.assign(weekly,{area:'marineford',weeklyBossInstanceId:'event',weeklyBossTest:false});
 weekly.mobs=[{id:'boss',spawnId:'boss',source:'weekly-boss',weeklyBossId:'akainu',x:2600,y:1440,anchorX:2560,anchorY:1408,hp:12345,maxHP:20000,alive:true,attackCount:7,action:{kind:'aoe'},telegraph:{remaining:.4}}];
 for(const [b,x,y] of [[dungeon,1536,1152],[weekly,1536,1280]]){
  const before=structuredClone(b);E.upgradeBalance(b);assert.equal(b.rulesHash,E.rulesHash);
  assert.deepEqual([b.mobs[0].x,b.mobs[0].y,b.mobs[0].anchorX,b.mobs[0].anchorY],[x,y,x,y]);
  preservedProgress(b,before);assert.equal(b.mobs[0].hp,before.mobs[0].hp);assert.equal(b.mobs[0].maxHP,before.mobs[0].maxHP);
  assert.equal(b.pending,null);assert.equal(b.mobs[0].telegraph,null);
 }
});
test('HD branch hunt balance preserves wound ratios and in-flight attacks without moving the scene again',()=>{
 const b=active('beach',hdHash);b.mobs=b.mobs.slice(0,3);
 for(const [i,m] of b.mobs.entries()){
  Object.assign(m,{x:m.x+17,y:m.y+9,maxHP:100,hp:i===1?0:25,alive:i!==1,attack:3,attackSec:4,attackClock:2,telegraph:i===2?{remaining:.4}:null});
  delete m.huntVersion;
 }
 const before=structuredClone(b);E.upgradeBalance(b);assert.equal(b.rulesHash,E.rulesHash);preservedProgress(b,before);
 // The first Dawn hunt profile is 222 HP / 17 attack / 0.8s after PR #393.
 assert.equal(b.mobs[0].maxHP,222);assert.equal(b.mobs[0].hp,56);assert.equal(b.mobs[0].attack,17);assert.equal(b.mobs[0].attackClock,.4);
 assert.equal(b.mobs[1].hp,0);assert.equal(b.mobs[2].attackClock,2);assert.deepEqual(b.mobs[2].telegraph,{remaining:.4});
 for(const key of ['auto','targetId','pending','projectiles'])assert.deepEqual(b[key],before[key],key);
 for(const [i,m] of b.mobs.entries()){
  for(const key of ['x','y','anchorX','anchorY','district'])assert.equal(m[key],before.mobs[i][key],key);
  assert.equal(m.huntVersion,E.hunt.profileVersion);
 }
 const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'balance scales wounds and clocks only once');
});
test('all intermediate HD branches also receive hunt progression while unrelated geometry stays intact',()=>{
 for(const hash of ['df87a9e7018eff5bcbee1d33a2d8ba3347ff3fc019133d6c0bdf86f8145e51cc','c9607a8978503a6a30677f041a6c8f24a932be20932e322da0f80366b0e35d32','6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65','cd060e983a8453a1ef8414cc2f9efea2f19f7c5b64021b98a3318540422f610b']){
  const b=active('enies-lobby-01',hash),m=b.mobs[0];Object.assign(m,{maxHP:100,hp:25,x:m.x+17});delete m.huntVersion;
  const before=structuredClone(b);E.upgradeBalance(b);assert.equal(b.rulesHash,E.rulesHash);assert.equal(m.maxHP,40081);assert.equal(m.hp,10021);assert.equal(m.x,before.mobs[0].x);assert.deepEqual(b.pending,before.pending);
 }
});
test('the HD branch keeps active dungeon and weekly attacks at their already-upgraded positions',()=>{
 const dungeon=active(null,hdHash),hero={};E.enterDungeon(dungeon,'alvida',{runId:'run',encounterId:'encounter',spawnId:'spawn',phase:'running'},stats,hero);
 dungeon.pending={targetId:dungeon.mobs[0].id,remaining:.4};dungeon.mobs[0].x+=17;dungeon.mobs[0].dungeonAttack={remaining:.4};
 const weekly=structuredClone(dungeon);delete weekly.dungeon;Object.assign(weekly,{area:'marineford',weeklyBossInstanceId:'event',weeklyBossTest:false});
 Object.assign(weekly.mobs[0],{source:'weekly-boss',weeklyBossId:'akainu',x:1580,y:1310,anchorX:1536,anchorY:1280,action:{kind:'aoe'}});
 const rehearsal=structuredClone(weekly);rehearsal.area='quest-dungeons';rehearsal.weeklyBossTest=true;
 for(const b of [dungeon,weekly,rehearsal]){
  const expected={...structuredClone(b),rulesHash:E.rulesHash};E.upgradeBalance(b);assert.deepEqual(b,expected);
 }
});
test('unrecognized battle signatures cannot request either branch migration',()=>{
 const b=active('beach','f'.repeat(64));delete b.mobs[0].huntVersion;b.mobs[0].maxHP=100;
 const before=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,before);
});
