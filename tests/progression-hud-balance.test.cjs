'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../character-system.js'),X=require('../character-catalog.js'),B=require('../world-battle.cjs'),A=require('../archipelago.js'),F=require('../forge-system.js'),D=require('../contract-system.js');
test('charge a third of the previous level cost and preserve exact XP through migration',()=>{
  assert.equal(X.xpNeeded(1),27);assert.equal(X.xpNeeded(2),44);
  for(const level of [3,5,10,20,40,75,200]){
    const cost=X.xpNeeded(level),next=X.xpNeeded(level+1),stats={xpEarned:123};
    assert.equal(cost,Math.ceil(X.previousXpNeeded(level)/3));
    assert.deepEqual(X.migrateXP({level,xp:cost-1,stats,xpCurveVersion:2}),{level,xp:cost-1,stats,xpCurveVersion:3});
    const m=X.migrateXP({level,xp:cost+next+7,stats,xpCurveVersion:2});
    assert.deepEqual(m,{level:level+2,xp:7,stats,xpCurveVersion:3});
    assert.equal(X.migrateXP(m),m);
  }
});
test('XP follows archipelago order across regions; normal iron is scaled once after loot bonuses',()=>{
 assert.deepEqual([4,5,10,80].map(level=>F.lootLevel(level,B.hunt.get('swamp'))),[5,5,10,10]);
 for(const [i,island] of A.islands.entries()){
   const s=B.hunt.get(island.area).sectors[0],type=s.roles[0],p=B.hunt.profile(island.area,s.id,type);
   const reward=B.hunt.rewards(island.area,{...p,type,district:s.id},p.level);
   assert.equal(reward.xp,2*Math.round(Math.round(p.xp/10)*1.15**i));
   assert.equal(reward.gearChance,.12);
   assert.equal(B.hunt.materialDropChance(reward,2),Math.min(1,reward.materialChance*2)*.2);
 }
 const r=B.hunt.rewards('beach',{type:'boss',district:B.hunt.get('beach').sectors.at(-1).id},5);
 assert.equal(B.hunt.materialDropChance(r,2),1);
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
test('high-level world damage preserves defense and does not change dungeon damage',()=>{
  const damage=(defense,level,source)=>C.incoming({defense,mitigation:0},250,false,1,{monster:{level,source}});
  assert.equal(damage(100,44,'world'),damage(100,45,'boss-dungeon'));
  assert(damage(100,45,'world')>damage(100,44,'world'));
  assert(damage(200,45,'world')<damage(100,45,'world'));
});
