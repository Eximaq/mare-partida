'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),B=require('../monster-behavior.js'),W=require('../world-catalog.cjs').load();
const now=1795800000000,stats={maxHP:100,maxEnergy:100};
const prior='0dfdc472b3ec8f7213d274bff111ed2c152d27e76dcbed3e587255713cec8bbd';
// Captured from the shipped Dawn projection before this scene change.
const oldSlots=[[1048,1480],[1272,1736],[1272,1448],[1496,1640],[1656,1800],[1880,1832],[1944,1608],[2296,1832],[1528,1256],[1816,1416],[1688,1080],[1976,1240],[2008,984],[2296,1176],[2152,1064]];
function saved(hash=prior){
 const b=E.create('beach',stats,now,()=>.5);b.hunts.areas.beach.kills=20;
 E.populate(b,now,()=>.5,B.slots('beach').find(s=>s.boss));
 assert.equal(b.mobs.length,15,'fixture includes the unlocked existing boss');
 b.rulesHash=hash;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
 b.pending={targetId:b.mobs[0].id,remaining:.4};b.targetId=b.mobs[0].id;b.projectiles=[{x:1048,y:1480}];
 b.hunts.areas.beach.respawns[b.mobs[1].spawnId]=now+60000;
 b.hunts.areas.beach.firstRewardClaimed=true;b.hunts.areas.beach.bosses=3;
 for(const [i,m] of b.mobs.entries()){
  const [x,y]=oldSlots[i];Object.assign(m,{x:x+8,y:y+8,anchorX:x,anchorY:y,hp:i===1?0:11,alive:i!==1,attackClock:2.25,engaged:true,telegraph:{fixture:true},corpseUntil:now+2000});
 }
 return b;
}
function preserveProgress(actual,before){
 for(const key of ['hp','energy','cooldowns','hunts'])assert.deepEqual(actual[key],before[key],key);
 for(const old of before.mobs){
  const current=actual.mobs.find(m=>m.id===old.id);assert(current,'stable enemy identity');
  for(const key of ['id','spawnId','type','level','hp','maxHP','alive','corpseUntil','attackClock','attack','defense','balanceVersion'])assert.deepEqual(current[key],old[key],old.spawnId+' '+key);
 }
}
test('Dawn upgrades recognized scenes without resetting dead enemies, the boss or claimed rewards',()=>{
 const predecessors=[prior,'c69b729bc7c2dcf29503e803e0d6c1e09ffb5293b42bf8bd9eb400377deece91','77987989a99918858134db83b9767b30bc1fb83ab432ffbe04861b9b502b1c7d','b35bd06e55109403600915cb0e386f9928d3f4166b24d527f9912e1bd9b01d61','315259efc3b292e009398c8951e188f43f791abf03fff5a21ad6dc14bad9f4cc','cd060e983a8453a1ef8414cc2f9efea2f19f7c5b64021b98a3318540422f610b','c66c9af7ffaae0d2d98c47196f5edee82ff4fa0875da9f0d08c1cf37b1e7c401','28c090f587fc5f11aa1f007f8008b509cfdd31e630fba12d83a8acfbb8391adf','0c6dbd3c8a12bb2e1958e830b6bdf3149be9cb911f976f7722ff11d99867b8c0',E.previousBalanceHash];
 const slots=new Map(B.slots('beach').map(s=>[s.id,s]));
 for(const hash of predecessors){
  const b=saved(hash),before=structuredClone(b);E.upgradeBalance(b);
  assert.equal(b.rulesHash,E.rulesHash);assert.equal(b.pending,null);assert.equal(b.targetId,null);assert.deepEqual(b.projectiles,[]);assert.equal(b.auto,false);
  preserveProgress(b,before);
  for(const m of b.mobs){const p=slots.get(m.spawnId);assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[p.x,p.y,p.x,p.y,p.sector]);assert.equal(m.engaged,false);assert.equal(m.telegraph,null);}
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'migration is idempotent');
 }
});
test('Dawn projects shared monsters and party extras onto reachable anchors on map dawn',()=>{
 const b=saved(),m=b.mobs[0],extra={...structuredClone(m),id:'extra-fixture',spawnId:'party:fixture:1',partyExtra:true,x:m.anchorX+96,y:m.anchorY,anchorX:m.anchorX+96,anchorY:m.anchorY};
 b.mobs.push(extra);const before=structuredClone(b),nav=W.navigation('dawn');
 assert.equal(typeof E.reanchorDawnMobs,'function');
 assert.equal(E.reanchorDawnMobs('beach',b.mobs,nav),true);preserveProgress(b,before);
 for(const mob of b.mobs){assert(nav.walkable(mob.x,mob.y),mob.spawnId+' has walkable feet');assert(nav.path(W.maps.dawn.spawn,mob).length,mob.spawnId+' connects to the landing');}
 const once=structuredClone(b.mobs);assert.equal(E.reanchorDawnMobs('beach',b.mobs,nav),false);assert.deepEqual(b.mobs,once);
 const party=saved();party.partyInstanceId='room-fixture';party.mobs.push(structuredClone(before.mobs.at(-1)));E.upgradeBalance(party);
 for(const mob of party.mobs){assert(nav.walkable(mob.x,mob.y),mob.spawnId+' has walkable feet');assert(nav.path(W.maps.dawn.spawn,mob).length,mob.spawnId+' connects to the landing');}
});
test('Dawn preserves current battles, other regions and unrecognized save signatures',()=>{
 const current=E.create('beach',stats,now,()=>.5);current.pending={targetId:current.mobs[0].id,remaining:.4};
 const same=structuredClone(current);E.upgradeBalance(current);assert.deepEqual(current,same);
 for(const area of ['alabasta','rare','syrup','baratie','arlong','loguetown','skypiea-01']){
  const other=E.create(area,stats,now,()=>.5);other.rulesHash=prior;other.pending={targetId:other.mobs[0].id,remaining:.4};
  const expected={...structuredClone(other),rulesHash:E.rulesHash};E.upgradeBalance(other);assert.deepEqual(other,expected);
 }
 const unknown=saved('f'.repeat(64)),before=structuredClone(unknown);E.upgradeBalance(unknown);assert.deepEqual(unknown,before);
});
