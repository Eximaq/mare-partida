'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),B=require('../monster-behavior.js'),W=require('../world-catalog.cjs').load();
const now=1795800000000,stats={maxHP:100,maxEnergy:100};
const prior='c91ad59190d5a25a2214bf4c79f3f50e4e76b84dc8050f5044ee43dbf4132518';
// Literal positions from the shipped Alabasta desert scene, recorded before its replacement.
const oldSlots=[[2288,3568],[2640,3824],[1136,2096],[1520,2288],[2352,1008],[2672,1168],[3632,2096],[3952,2288],[2544,2992],[2864,3184]];
function saved(hash=prior){
 const b=E.create('alabasta',stats,now,()=>.5);b.rulesHash=hash;b.hp=43;b.energy=37;b.cooldowns=[7,3];b.auto=true;
 b.pending={targetId:b.mobs[0].id,remaining:.4};b.targetId=b.mobs[0].id;b.projectiles=[{x:2288,y:3568}];
 b.hunts.areas.alabasta.kills=17;b.hunts.areas.alabasta.respawns[b.mobs[1].spawnId]=now+60000;
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
test('Alabasta desert upgrades known old geometry without resurrecting mobs or resetting hunt progress',()=>{
 const predecessors=[prior,'65190d0d471d444bab81b8c46ded2948934fddb0dce0ea72820c91462f949e80','b936a87dc26fa164f795e1b77931888790932a37a27acdeb36c3b62152546c07','0dfdc472b3ec8f7213d274bff111ed2c152d27e76dcbed3e587255713cec8bbd','c69b729bc7c2dcf29503e803e0d6c1e09ffb5293b42bf8bd9eb400377deece91','77987989a99918858134db83b9767b30bc1fb83ab432ffbe04861b9b502b1c7d','b35bd06e55109403600915cb0e386f9928d3f4166b24d527f9912e1bd9b01d61','315259efc3b292e009398c8951e188f43f791abf03fff5a21ad6dc14bad9f4cc','cd060e983a8453a1ef8414cc2f9efea2f19f7c5b64021b98a3318540422f610b','c66c9af7ffaae0d2d98c47196f5edee82ff4fa0875da9f0d08c1cf37b1e7c401','28c090f587fc5f11aa1f007f8008b509cfdd31e630fba12d83a8acfbb8391adf','0c6dbd3c8a12bb2e1958e830b6bdf3149be9cb911f976f7722ff11d99867b8c0',E.previousBalanceHash];
 const slots=new Map(B.slots('alabasta').map(s=>[s.id,s]));
 for(const hash of predecessors){
  const b=saved(hash),before=structuredClone(b);E.upgradeBalance(b);
  assert.equal(b.rulesHash,E.rulesHash);assert.equal(b.pending,null);assert.equal(b.targetId,null);assert.deepEqual(b.projectiles,[]);assert.equal(b.auto,false);
  preserveProgress(b,before);
  for(const m of b.mobs){const p=slots.get(m.spawnId);assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.district],[p.x,p.y,p.x,p.y,p.sector]);assert.equal(m.engaged,false);assert.equal(m.telegraph,null);}
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'migration is idempotent');
 }
});
test('Alabasta desert shared mobs and party extras follow the same reachable new anchors',()=>{
 assert.equal(typeof E.reanchorAlabastaMobs,'function');
 const b=saved(),m=b.mobs[0],extra={...structuredClone(m),id:'extra-fixture',spawnId:'party:fixture:1',partyExtra:true,x:m.anchorX+96,y:m.anchorY,anchorX:m.anchorX+96,anchorY:m.anchorY};
 b.mobs.push(extra);const before=structuredClone(b),nav=W.navigation('alabasta');
 assert.equal(E.reanchorAlabastaMobs('alabasta',b.mobs,nav),true);preserveProgress(b,before);
 for(const mob of b.mobs){assert(nav.walkable(mob.x,mob.y),mob.spawnId+' has walkable feet');assert(nav.path(W.maps.alabasta.spawn,mob).length,mob.spawnId+' connects to the landing');}
 const once=structuredClone(b.mobs);assert.equal(E.reanchorAlabastaMobs('alabasta',b.mobs,nav),false);assert.deepEqual(b.mobs,once);
 const party=saved();party.partyInstanceId='room-fixture';party.mobs.push(structuredClone(before.mobs.at(-1)));E.upgradeBalance(party);
 for(const mob of party.mobs){assert(nav.walkable(mob.x,mob.y),mob.spawnId+' has walkable feet');assert(nav.path(W.maps.alabasta.spawn,mob).length,mob.spawnId+' connects to the landing');}
});
test('Alabasta desert release preserves active current battles, unrelated worlds, and unknown signatures',()=>{
 const current=E.create('alabasta',stats,now,()=>.5);current.pending={targetId:current.mobs[0].id,remaining:.4};
 const same=structuredClone(current);E.upgradeBalance(current);assert.deepEqual(current,same);
 for(const area of ['beach','swamp','orange','enies-lobby-01','rare','syrup','baratie','arlong','loguetown','skypiea-01']){
  const other=E.create(area,stats,now,()=>.5);other.rulesHash=prior;other.pending={targetId:other.mobs[0].id,remaining:.4};
  const expected={...structuredClone(other),rulesHash:E.rulesHash};E.upgradeBalance(other);assert.deepEqual(other,expected);
 }
 const unknown=saved('f'.repeat(64)),before=structuredClone(unknown);E.upgradeBalance(unknown);assert.deepEqual(unknown,before);
});
