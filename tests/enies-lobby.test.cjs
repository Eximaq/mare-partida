'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../archipelago.js'),{load}=require('../world-catalog.cjs');
const cases=[
 ['enies-lobby-01',95,100,'fukurou',97],
 ['enies-lobby-02',101,104,'kalifa',101],
 ['enies-lobby-03',104,106,'jabra',104],
 ['enies-lobby-04',107,109,'blueno',107],
 ['enies-lobby-05',110,114,'kaku',110]
];
test('Enies Lobby travel unlocks the five requested destinations at their own level gates',()=>{
 assert.deepEqual(A.list('enies-lobby').map(i=>[i.id,...i.recommended]),cases.map(c=>c.slice(0,3)));
 for(const [id,min] of cases){assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert(A.canTravel(id,150));}
 assert(A.canTravel('enies-lobby-02',104));assert(A.canTravel('enies-lobby-03',104));
 const U=require('../voyage-ui.js'),region=A.regions.find(r=>r.id==='enies-lobby');
 const ui=U.voyage({region,regions:A.regions,islands:A.list(region.id),game:{area:'beach'},scene:'lobby'});
 assert.equal([...ui.body.matchAll(/data-island="enies-lobby-0[1-5]"/g)].length,5);
 assert.equal(new Set([...ui.body.matchAll(/style="--map-x:([^;]+);--map-y:([^"]+)"/g)].map(m=>m[0])).size,5);
});
test('the approved Enies map preserves navigation, return route and water boundaries',()=>{
 const w=load();assert(w.maps['enies-lobby-01'],'new map is registered');
 for(const [id]of cases){const m=w.maps[id];assert.equal(m.width,3072);assert.equal(m.height,4736);assert.equal(m.colliders.length,94);assert.equal(m.spawn.x,1533);assert.equal(m.spawn.y,4590);assert.equal(m.returnPoint.x,m.spawn.x);assert.equal(m.returnPoint.y,m.spawn.y);assert(!m.terrainWalkable(32,32));}
 const m=w.maps['enies-lobby-01'],nav=w.navigation(m.id);
 assert(nav.walkable(m.spawn.x,m.spawn.y));assert.equal(m.navigationGoals.length,13);
 for(const goal of m.navigationGoals){assert(nav.path(m.spawn,goal).length,goal.id+' outward');assert(nav.path(goal,m.spawn).length,goal.id+' return');}
});
test('each Enies encounter has reachable independent slots and reload keeps previous progress',()=>{
 const H=require('../hunt-system.js'),B=require('../monster-behavior.js'),w=load();
 for(const [id,,,type,level]of cases){
  const slots=B.slots(id);assert.equal(slots.length,6,id);
  const nav=w.navigation(id),m=w.maps[id];
  for(const s of slots){assert.equal(s.type,type);assert(s.id.startsWith(id+'-'));assert(nav.walkable(s.x,s.y));assert(nav.path(m.spawn,s).length);assert(Math.hypot(s.x-m.spawn.x,s.y-m.spawn.y)>48);assert.equal(H.profile(id,s.sector,type).level,level);}
 }
 const old={area:'beach',gold:123,hunts:{areas:{beach:{kills:9,bosses:1,firstRewardClaimed:true,bossReadyAt:800,respawns:{'beach-cais-0':1234}}}}};
 const migrated=H.migrate(old);assert.deepEqual(migrated.hunts.areas.beach,old.hunts.areas.beach);assert.equal(migrated.gold,123);assert.equal(migrated.area,'beach');
 for(const [id]of cases)assert.equal(migrated.hunts.areas[id].kills,0);
 assert.deepEqual(H.migrate(migrated),migrated);
});
