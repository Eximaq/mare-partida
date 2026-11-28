'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),B=require('../monster-behavior.js'),W=require('../world-catalog.cjs').load(),A=require('../akainu-combat.js');
const prior='df87a9e7018eff5bcbee1d33a2d8ba3347ff3fc019133d6c0bdf86f8145e51cc';
const now=1795800000000,stats={maxHP:300,maxEnergy:100};
const areas=Array.from({length:6},(_,i)=>'marineford-0'+(i+1));
// Literal anchors from the six hunt instances before the Marineford painting.
const oldSlots=[[3048,2408],[3496,2408],[3944,2408],[3048,3048],[3432,3208],[3944,3048]];
function saved(area,hash=prior){
 const b=E.create(area,stats,now,()=>.5);b.rulesHash=hash;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
 b.pending={targetId:b.mobs[0].id,remaining:.4};b.targetId=b.mobs[0].id;b.projectiles=[{x:3048,y:2408}];
 b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[1].spawnId]=now+60000;
 for(const [i,m] of b.mobs.entries()){
  const [x,y]=oldSlots[i];Object.assign(m,{x:x+8,y:y+8,anchorX:x,anchorY:y,hp:i===1?0:11,alive:i!==1,attackClock:2.25,engaged:true,telegraph:{fixture:true},corpseUntil:now+2000});
 }
 return b;
}
function preserve(actual,before){
 for(const key of ['hp','energy','cooldowns','hunts'])assert.deepEqual(actual[key],before[key],key);
 for(const old of before.mobs){
  const current=actual.mobs.find(m=>m.id===old.id);assert(current,'retain every enemy identity');
  for(const key of ['id','spawnId','type','level','hp','maxHP','alive','corpseUntil','attackClock','attack','defense','balanceVersion'])assert.deepEqual(current[key],old[key],old.spawnId+' '+key);
 }
}
test('official Akainu projections move wounded and defeated bosses without changing profile, clocks or contributions',()=>{
 const profile={hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:240,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:304};
 for(const alive of [true,false]){
  const b=E.create(null,stats,now,()=>.5);Object.assign(b,{rulesHash:prior,area:'marineford',weeklyBossInstanceId:'official-fixture',weeklyBossTest:false,hp:43,energy:37,cooldowns:[7,3]});
  const boss=A.create({id:'official-boss',x:2560,y:1408,profile,now});Object.assign(boss,{x:2600,y:1440,hp:alive?12345:0,alive,action:{kind:'aoe',center:{x:2600,y:1440}},telegraph:{x:2600,y:1440},attackCount:7});b.mobs=[boss];
  const before=structuredClone(b);E.upgradeBalance(b);
  assert.deepEqual([boss.x,boss.y,boss.anchorX,boss.anchorY],[1536,1280,1536,1280]);assert.equal(b.rulesHash,E.rulesHash);
  for(const key of ['id','spawnId','hp','maxHP','alive','attackCount','nextPunchAt','nextAoeAt','profile'])assert.deepEqual(boss[key],before.mobs[0][key],key);
  for(const key of ['hp','energy','cooldowns','weeklyBossInstanceId','weeklyBossTest'])assert.deepEqual(b[key],before[key]);
  assert.equal(boss.action,null);assert.equal(boss.telegraph,null);
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once);
 }
});
test('all six saved hunts retain identities, HP and respawns through every recognized predecessor',()=>{
 for(const area of areas)for(const hash of [prior,'c9607a8978503a6a30677f041a6c8f24a932be20932e322da0f80366b0e35d32','6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65',E.previousBalanceHash]){
  const b=saved(area,hash),before=structuredClone(b),slots=new Map(B.slots(area).map(s=>[s.id,s]));E.upgradeBalance(b);
  assert.equal(b.rulesHash,E.rulesHash);preserve(b,before);assert.equal(b.pending,null);assert.equal(b.targetId,null);assert.deepEqual(b.projectiles,[]);assert.equal(b.auto,false);
  for(const m of b.mobs){const point=slots.get(m.spawnId);assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[point.x,point.y,point.x,point.y,point.sector]);assert.equal(m.engaged,false);assert.equal(m.telegraph,null);}
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'migration is idempotent');
 }
});
test('Marineford party extras move to reachable nearby anchors without losing their identities or clocks',()=>{
 for(const area of areas){
  const b=saved(area),m=b.mobs[0],extra={...structuredClone(m),id:'extra-fixture',spawnId:'party:fixture:1',partyExtra:true,x:m.anchorX+96,y:m.anchorY,anchorX:m.anchorX+96,anchorY:m.anchorY};
  b.mobs.push(extra);const before=structuredClone(b),nav=W.navigation(area);
  assert.equal(E.reanchorMarinefordMobs(area,b.mobs,nav),true);preserve(b,before);
  for(const mob of b.mobs){assert(nav.walkable(mob.x,mob.y),mob.spawnId+' has walkable feet');assert(nav.path(W.maps[area].spawn,mob).length,mob.spawnId+' connects to arrival');}
  const once=structuredClone(b.mobs);assert.equal(E.reanchorMarinefordMobs(area,b.mobs,nav),false);assert.deepEqual(b.mobs,once);
 }
});
test('the Marineford release leaves the new boss dungeon, private rehearsal, unrelated maps and unknown signatures intact',()=>{
 const dungeon=E.create(null,stats,now,()=>.5),hero={};E.enterDungeon(dungeon,'alvida',{runId:'run',encounterId:'encounter',spawnId:'spawn',phase:'running'},stats,hero);
 dungeon.pending={targetId:'spawn',remaining:.4};dungeon.mobs[0].dungeonAttack={elapsed:.2};
 const privateBoss=structuredClone(dungeon);delete privateBoss.dungeon;privateBoss.weeklyBossInstanceId='private';privateBoss.weeklyBossTest=true;privateBoss.mobs[0].source='weekly-boss';
 for(const b of [dungeon,privateBoss,...[null,'beach','alubarna-01','alabasta','enies-lobby-01','thriller-bark-01','sabaody-01'].map(area=>E.create(area,stats,now,()=>.5))]){
  b.rulesHash=prior;const expected={...structuredClone(b),rulesHash:E.rulesHash};E.upgradeBalance(b);assert.deepEqual(b,expected);
 }
 for(const hash of [E.rulesHash,'f'.repeat(64)]){const b=saved('marineford-01',hash),before=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,before);}
});
