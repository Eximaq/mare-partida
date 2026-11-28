'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),D=require('../boss-dungeon-system.js'),A=require('../akainu-combat.js');
const prior='c9607a8978503a6a30677f041a6c8f24a932be20932e322da0f80366b0e35d32';
const now=1795800000000,stats={maxHP:300,maxEnergy:100};
// Coordinates and signatures are from PR #394 before the boss-arena replacement.
function saved(id='alvida',phase='running',hash=prior){
 const b=E.create(null,stats,now,()=>.5),hero={x:1824,y:2144};
 const record={ownerId:'owner',runId:'run-'+id,encounterId:'enemy-'+id,spawnId:'spawn-'+id,phase:'running',startedAt:now-1000,berryReward:123};
 E.enterDungeon(b,id,record,stats,hero);
 b.rulesHash=hash;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.talentCooldowns={immortalUntil:now+90000};
 b.pending={targetId:b.mobs[0].id,remaining:.4};b.targetId=b.mobs[0].id;b.projectiles=[{x:1816,y:1384}];
 b.dungeon.record.phase=phase;
 if(phase==='pending')b.dungeon.record.reward=D.byId[id].rewardConfigured?{quantity:5,berry:123,boundToCharacter:'owner'}:null;
 Object.assign(b.mobs[0],{x:1840,y:1408,anchorX:1816,anchorY:1384,hp:phase==='pending'?0:11,alive:phase!=='pending',attackClock:2.25,attackCount:4,talentStolen:6,engaged:true,telegraph:{x:1840,y:1408},dungeonAttack:{elapsed:.2,impacted:false}});
 return b;
}
function preserved(actual,before){
 for(const key of ['hp','energy','cooldowns','talentCooldowns','hunts','dungeon'])assert.deepEqual(actual[key],before[key],key);
 assert.equal(actual.mobs.length,before.mobs.length);
 for(const old of before.mobs){
  const mob=actual.mobs.find(m=>m.id===old.id);assert(mob,'retain enemy identity');
  for(const key of ['id','spawnId','type','dungeonId','dungeonRunId','dungeonEncounterId','level','hp','maxHP','alive','attackClock','attackCount','attack','defense','magicDefense','balanceVersion','talentStolen'])assert.deepEqual(mob[key],old[key],key);
 }
}
test('saved boss fights move to the new arena without healing, resurrecting or changing their rewards',()=>{
 for(const d of D.catalog)for(const phase of ['running','pending']){
  const b=saved(d.id,phase),before=structuredClone(b);E.upgradeBalance(b);
  assert.deepEqual([b.mobs[0].x,b.mobs[0].y,b.mobs[0].anchorX,b.mobs[0].anchorY],[1536,1152,1536,1152]);
  assert.equal(b.rulesHash,E.rulesHash);preserved(b,before);
  assert.equal(b.pending,null);assert.equal(b.targetId,null);assert.deepEqual(b.projectiles,[]);assert.equal(b.auto,false);
  assert.equal(b.mobs[0].dungeonAttack,null);assert.equal(b.mobs[0].telegraph,null);assert.equal(b.mobs[0].engaged,false);
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'idempotent projection');
 }
});
test('pending chest reentry keeps its empty arena and immutable victory record',()=>{
 const b=saved('alvida','pending');b.mobs=[];const before=structuredClone(b);E.upgradeBalance(b);
 assert.equal(b.rulesHash,E.rulesHash);preserved(b,before);assert.equal(b.mobs.length,0);
});
test('recognized historical upgrade paths also relocate the boss arena before returning',()=>{
 const hashes=['6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65','c91ad59190d5a25a2214bf4c79f3f50e4e76b84dc8050f5044ee43dbf4132518','65190d0d471d444bab81b8c46ded2948934fddb0dce0ea72820c91462f949e80','b936a87dc26fa164f795e1b77931888790932a37a27acdeb36c3b62152546c07','0dfdc472b3ec8f7213d274bff111ed2c152d27e76dcbed3e587255713cec8bbd','c69b729bc7c2dcf29503e803e0d6c1e09ffb5293b42bf8bd9eb400377deece91','77987989a99918858134db83b9767b30bc1fb83ab432ffbe04861b9b502b1c7d','b35bd06e55109403600915cb0e386f9928d3f4166b24d527f9912e1bd9b01d61','315259efc3b292e009398c8951e188f43f791abf03fff5a21ad6dc14bad9f4cc','cd060e983a8453a1ef8414cc2f9efea2f19f7c5b64021b98a3318540422f610b','c66c9af7ffaae0d2d98c47196f5edee82ff4fa0875da9f0d08c1cf37b1e7c401','28c090f587fc5f11aa1f007f8008b509cfdd31e630fba12d83a8acfbb8391adf','0c6dbd3c8a12bb2e1958e830b6bdf3149be9cb911f976f7722ff11d99867b8c0',E.previousBalanceHash];
 for(const hash of hashes){const b=saved('morgan','running',hash),before=structuredClone(b);E.upgradeBalance(b);assert.equal(b.rulesHash,E.rulesHash);assert.deepEqual([b.mobs[0].x,b.mobs[0].y],[1536,1152],hash);preserved(b,before);assert.equal(b.mobs[0].dungeonAttack,null);}
});
test('private Akainu rehearsal relocates its living or defeated boss and cancels old spatial attacks only',()=>{
 const profile={hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:110,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:480};
 for(const alive of [true,false]){
  const b=E.create(null,stats,now,()=>.5);Object.assign(b,{rulesHash:prior,area:'quest-dungeons',weeklyBossInstanceId:'weekly-fixture',weeklyBossTest:true,hp:43,energy:37,cooldowns:[7,3]});
  const boss=A.create({id:'private-boss',x:1824,y:1964,profile,now});Object.assign(boss,{x:1850,y:2000,hp:alive?12345:0,alive,action:{kind:'aoe',center:{x:1850,y:2000}},telegraph:{x:1850,y:2000},attackCount:7});b.mobs=[boss];
  const before=structuredClone(b);E.upgradeBalance(b);assert.equal(b.rulesHash,E.rulesHash);
  assert.deepEqual([boss.x,boss.y,boss.anchorX,boss.anchorY],[1536,1644,1536,1644]);
  for(const key of ['id','spawnId','hp','maxHP','alive','attackCount','nextPunchAt','nextAoeAt','profile'])assert.deepEqual(boss[key],before.mobs[0][key],key);
  for(const key of ['hp','energy','cooldowns','weeklyBossInstanceId','weeklyBossTest'])assert.deepEqual(b[key],before[key]);
  assert.equal(boss.action,null);assert.equal(boss.telegraph,null);
 }
});
test('the arena release preserves current fights, other maps and unrecognized signatures',()=>{
 for(const area of [null,'beach','swamp','alubarna-01','alabasta','enies-lobby-01']){
  const b=E.create(area,stats,now,()=>.5);b.rulesHash=prior;b.hp=43;b.pending={targetId:'kept',remaining:.4};
  const expected={...structuredClone(b),rulesHash:E.rulesHash};E.upgradeBalance(b);assert.deepEqual(b,expected);
 }
 for(const hash of [E.rulesHash,'f'.repeat(64)]){const b=saved('alvida','running',hash),before=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,before);}
});
