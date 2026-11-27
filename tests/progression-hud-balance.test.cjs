'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../character-system.js'),X=require('../character-catalog.js'),B=require('../world-battle.cjs'),A=require('../archipelago.js'),F=require('../forge-system.js'),D=require('../contract-system.js');
test('preserve level and fractional XP through migration without changing earned rewards',()=>{
  assert.equal(X.version4XpNeeded(1),27);assert.equal(X.version4XpNeeded(2),44);
  assert.equal(X.version4XpNeeded(5),182);assert.equal(X.huntExperience.swamp,32);
  for(const level of [1,3,5,10,20,40,75,180,184,185,200])for(const [version,pastCost] of [[1,X.legacyXpNeeded],[2,X.previousXpNeeded],[3,X.version3XpNeeded],[4,X.version4XpNeeded]]){
    const cost=X.xpNeeded(level),before=pastCost(level),stats={xpEarned:123};
    const save={level,xp:Math.floor(before/2),stats,attributes:{strength:2},xpCurveVersion:version};
    const m=X.migrateXP(save);
    assert.deepEqual(m,{...save,xp:Math.round(save.xp*cost/before),xpCurveVersion:5});
    assert.equal(X.migrateXP(m),m);
    const almost=X.migrateXP({...save,xp:before-1});
    assert.equal(almost.level,level);assert(almost.xp<cost);
    assert.equal(X.migrateXP({...save,xp:before+10}).level,level);
  }
});
test('latest accessible hunt pays full XP; all earlier maps pay exactly half before bonuses',()=>{
 assert.deepEqual([4,5,10,80].map(level=>F.lootLevel(level,B.hunt.get('swamp'))),[5,5,10,10]);
 for(const [i,island] of A.islands.entries()){
   const s=B.hunt.get(island.area).sectors[0],type=s.roles[0],p=B.hunt.profile(island.area,s.id,type);
   const mob={...p,type,district:s.id},reward=B.hunt.rewards(island.area,mob,island.minLevel);
   assert.equal(reward.xp,X.huntExperience[island.area]);
   assert.equal(B.hunt.referenceXp(island.area,mob),reward.xp);
   const next=A.islands[i+1];
   if(next){
     assert.equal(B.hunt.rewards(island.area,mob,next.minLevel-1).xp,reward.xp);
     assert.equal(B.hunt.rewards(island.area,mob,next.minLevel).xp,reward.xp/2);
     assert.equal(B.hunt.rewards(island.area,mob,180).xp,reward.xp/2);
   }
   assert.equal(reward.gearChance,.12);
   assert.equal(B.hunt.materialDropChance(reward,2),Math.min(1,reward.materialChance*2)*.2);
 }
 const r=B.hunt.rewards('beach',{type:'boss',district:B.hunt.get('beach').sectors.at(-1).id},5);
 assert.equal(B.hunt.materialDropChance(r,2),1);
});
test('v5 grows through level 185, then continues without a new cap',()=>{
  let xp=0n;
  for(let level=1;level<185;level++){
    const cost=X.xpNeeded(level);
    assert(Number.isSafeInteger(cost)&&cost>0,level);
    assert(X.xpNeeded(level+1)>cost,level);
    if(level>=20)assert(X.xpNeeded(level+1)<=Math.ceil(cost*1.13),level);
    xp+=BigInt(cost);
  }
  assert(X.xpNeeded(1)<200);
  assert.equal(X.advance({level:1,start:0n,experience:xp-1n},185).level,184);
  assert.equal(X.advance({level:1,start:0n,experience:xp},185).level,185);
  assert.equal(X.xpNeeded(186)-X.xpNeeded(185),X.xpNeeded(187)-X.xpNeeded(186));
  assert(Number.isSafeInteger(X.xpNeeded(1_000_000)));
});
test('dexterity scales real cadence for every class with the configured class ceilings',()=>{
 const {classes,factions}=B.catalog,gear={attack:0,defense:0,hp:0},rules=require('../attribute-rules.js');
 for(const id of Object.keys(classes)){
 const get=dexterity=>C.derive({classId:id,level:1,attributes:{dexterity}},classes[id],factions.pirate,gear);
 const a=get(0),b=get(20);assert(b.speed>a.speed,id);assert(Math.abs(b.speed/a.speed-(1+rules.bonuses(b.attributes,id).speed)/(1+rules.bonuses(a.attributes,id).speed))<1e-10,id);
 }
});
test('measured daily targets replace fixed estimates and legacy floor credit still works',()=>{
 const d=D.daily({cycle:2,level:5,seed:0,profiles:[{entry:1,level:5,area:'beach',name:'César',type:'cesar',region:'Dawn',maxHP:100,defense:0,gold:[10,10],travel:0,slots:1,respawnSeconds:3600}],stats:{attack:50,physical:50,speed:1,huntSpeed:100}});
 assert.deepEqual(d.objectives.map(x=>[x.id,x.target]),[['daily-combat',2106],['daily-berry',67230]]);
 const old={objectives:[{id:'daily-combat',current:1,target:1},{id:'daily-prison',floor:4,current:0,target:1}]};
 D.applyDaily(old,{prisonFloor:4});assert(D.dailyComplete(old));
});
test('old battle profiles are upgraded once without resetting wounds, position or clocks',()=>{
 const b=B.create('beach',{maxHP:100,maxEnergy:50},0,()=>.5),m=b.mobs[0];
 b.rulesHash=B.previousBalanceHash;Object.assign(m,{balanceVersion:1,hp:100,maxHP:200,attackSec:1.2,attackClock:.6});
 const {x,y,id}=m;B.upgradeBalance(b);
 assert.deepEqual({x:m.x,y:m.y,id:m.id},{x,y,id});assert.equal(m.hp,Math.ceil(m.maxHP/2));assert(Math.abs(m.attackClock-m.attackSec/2)<1e-10);
 const before=structuredClone(b);B.upgradeBalance(b);assert.deepEqual(b,before);
 b.rulesHash='25e85126fbe82f0bb9367589fc80c5a183fd64bc8ee2530d83d6bd14d8e3a142';
 B.upgradeBalance(b);assert.deepEqual(b,before);
});
test('César level five halves normal and amplified incoming hits once',()=>{
  const stats={defense:40,mitigation:0,protection:0};
  for(const multiplier of [1,1.8,2.1]){
    const attack=220*multiplier;
    const before=C.incoming(stats,attack,false,1);
    assert.equal(C.incoming(stats,attack,false,1,{monster:{type:'cesar',level:5}}),Math.ceil(before/2));
    assert.equal(C.incoming(stats,attack,false,1,{monster:{type:'cesar',level:6}}),before);
  }
});
test('world profiles use effective stats and persistent wounded enemies retain their proportion',()=>{
  const {hunt:H}=B;
  function p(area,type){return H.profile(area,H.get(area).sectors[0].id,type);}
  const {maxHP,attack,defense,attackSec}=p('beach','cesar');
  assert.deepEqual([maxHP,attack,defense,attackSec],[222,17,20,.8]);
  const base={classId:'sword',level:1,attributes:C.empty()},stats=C.derive(base,B.catalog.classes.sword,B.catalog.factions.pirate,{attack:6,defense:4,hp:17});
  const one={source:'world',type:'cesar',level:5};
  assert(C.incoming(stats,attack,false,1,{monster:one})<C.incoming(stats,33,false,1,{monster:one}));
  const hel=p('swamp','helmeppo');
  assert.deepEqual([hel.maxHP,hel.attack,hel.defense],[674,47,29]);
  assert.deepEqual([p('alabasta','bananawani').maxHP,p('marineford-06','jozu').maxHP],[6200,170483]);
  const battle=B.create('beach',{maxHP:100,maxEnergy:50},0,()=>.5),mob=battle.mobs[0];
  battle.rulesHash=B.previousHuntProgressionHash;
  const originalPosition=[mob.x,mob.y,mob.id,mob.attackClock];
  Object.assign(mob,{maxHP:443,hp:221,attack:33});delete mob.huntVersion;
  B.upgradeBalance(battle);B.upgradeBalance(battle);
  assert.equal(battle.rulesHash,B.rulesHash);
  assert.deepEqual([mob.x,mob.y,mob.id,mob.attackClock],originalPosition);
  assert.equal(mob.maxHP,222);assert.equal(mob.hp,Math.ceil(221*222/443));assert.equal(mob.attack,17);
});
test('high-level world damage preserves defense and does not change dungeon damage',()=>{
  const damage=(defense,level,source)=>C.incoming({defense,mitigation:0},250,false,1,{monster:{level,source}});
  assert.equal(damage(100,44,'world'),damage(100,45,'boss-dungeon'));
  assert(damage(100,45,'world')>damage(100,44,'world'));
  assert(damage(200,45,'world')<damage(100,45,'world'));
});
