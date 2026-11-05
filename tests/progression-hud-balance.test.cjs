'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../character-system.js'),X=require('../character-catalog.js'),B=require('../world-battle.cjs'),A=require('../archipelago.js'),F=require('../forge-system.js'),D=require('../contract-system.js');
test('double the incremental XP percentage and convert saves once',()=>{
 assert.equal(X.xpNeeded(1),80);assert.equal(X.xpNeeded(2),130);
 for(const level of [3,5,10,20,40,75,200]){
   const prev=X.legacyXpNeeded(level-1),growth=2*(X.legacyXpNeeded(level)-prev)/prev;
   assert(Math.abs(X.xpNeeded(level)-X.xpNeeded(level-1)*(1+growth))<=1.25);
   const xp=Math.floor(X.legacyXpNeeded(level)/2),save={level,xp,stats:{xpEarned:123}},m=X.migrateXP(save);
   assert.equal(m.level,level);assert.equal(m.stats,save.stats);
   assert(Math.abs(m.xp/X.xpNeeded(level)-xp/X.legacyXpNeeded(level))<=1/X.xpNeeded(level));
   assert.equal(X.migrateXP(m),m);
 }
});
test('XP follows archipelago order across regions; normal iron is scaled once after loot bonuses',()=>{
 assert.deepEqual([4,5,10,80].map(level=>F.lootLevel(level,B.hunt.get('swamp'))),[5,5,10,10]);
 for(const [i,island] of A.islands.entries()){
   const s=B.hunt.get(island.area).sectors[0],type=s.roles[0],p=B.hunt.profile(island.area,s.id,type);
   const reward=B.hunt.rewards(island.area,{...p,type,district:s.id},p.level);
   assert.equal(reward.xp,Math.round(Math.round(p.xp/10)*1.15**i));
   assert.equal(reward.gearChance,.12);
   assert.equal(B.hunt.materialDropChance(reward,2),Math.min(1,reward.materialChance*2)*.2);
 }
 const r=B.hunt.rewards('beach',{type:'boss',district:B.hunt.get('beach').sectors.at(-1).id},5);
 assert.equal(B.hunt.materialDropChance(r,2),1);
});
test('dexterity changes cadence only for the two authorized classes',()=>{
 const {classes,factions}=B.catalog,gear={attack:0,defense:0,hp:0};
 for(const id of Object.keys(classes)){
   const get=dexterity=>C.derive({classId:id,level:1,attributes:{dexterity}},classes[id],factions.pirate,gear);
   const a=get(0),b=get(20),factor={rogue:.7,gunner:.4}[id]??0;
   assert(Math.abs(b.speed-a.speed-.12*factor)<1e-10,id);
   assert(a.speed>=classes[id].speed&&b.evasion>a.evasion);
 }
});
test('daily reinforcement and Berry targets are quadrupled; current cycle state remains untouched by generation',()=>{
 const d=D.daily({cycle:2,level:5,seed:0,profiles:[{entry:1,level:5,area:'beach',name:'César',type:'cesar',region:'Dawn',maxHP:100,defense:0,gold:[10,10],travel:0,slots:1,respawnSeconds:3600}],stats:{attack:50,physical:50,speed:1,huntSpeed:100}});
 assert.deepEqual(d.objectives.map(x=>[x.id,x.target]),[['daily-combat',32],['daily-berry',304],['daily-reinforcement',4]]);
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