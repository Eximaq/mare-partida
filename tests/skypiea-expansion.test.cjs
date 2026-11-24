'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {load}=require('../world-catalog.cjs');
const data=require('../skypiea-map-data.js');
const cases=[['skypiea-01',75,80,'satori'],['skypiea-02',80,85,'shura'],['skypiea-03',85,90,'gendatsu'],['skypiea-04',90,95,'ohm']];
test('four registered Skypiea destinations preserve the first ID, gate and authored dimensions',()=>{
 const w=load();
 assert.deepEqual(Array.from(w.islands.filter(x=>x.region==='skypiea'),x=>[x.id,x.minLevel,x.recommended[1]]),cases.map(x=>x.slice(0,3)));
 assert.equal(data.width,7616);assert.equal(data.height,4736);
 for(const [id] of cases){const m=w.maps[id];assert.equal(m.width,7616);assert.equal(m.height,4736);assert.equal(m.terrainWalkable(64,64),false);assert(w.navigation(id).walkable(m.spawn.x,m.spawn.y));}
});

test('new enemies use shared level progression and six separate, reachable encounter slots each',()=>{
 const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js'),w=load();
 const expected=[[77],[84,61979,2356,1024,127,7812],[88,79112,2877,1216,150,11116],[95,121646,4099,1655,197,18596]];
 for(const [k,[id,min,max,type]] of cases.entries()){
  assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert.equal(A.get(id).order,15+k);
  const slots=B.slots(id),m=w.maps[id],nav=w.navigation(id);assert.equal(slots.length,6);
  assert.equal(m.returnPoint.x,m.spawn.x);assert.equal(m.returnPoint.y,m.spawn.y);
  for(const s of slots){
   assert.equal(s.type,type);assert(s.id.startsWith(id+'-'));assert(nav.walkable(s.x,s.y));assert(nav.path(m.spawn,s).length);
   const p=H.profile(id,s.sector,s.type,0.5);
   const xp=H.rewards(id,{...p,district:s.sector,type},p.level,.5).xp;
   assert.deepEqual(k?[p.level,p.maxHP,p.attack,p.defense,p.magicDefense,xp]:[p.level],expected[k]);
  }
 }
 assert.equal(new Set(cases.map(([id])=>JSON.stringify(w.maps[id].spawn))).size,4);
});
test('manual movement and click routes cross all eight visible bridge decks from each island arrival',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 const map=sky.worlds['skypiea-01'].map;
 const n=new MareWorld.Navigation(map,map.navigationCell);
 function traverse(start,target){
  const route=n.path(start,target);
  assert(route.length,JSON.stringify({start,target}));
  const actor={...start};
  for(const p of route){
   assert(n.clear(actor,p),JSON.stringify({actor,p}));
   n.move(actor,p.x-actor.x,p.y-actor.y);
   assert(Math.hypot(actor.x-p.x,actor.y-p.y)<.1,JSON.stringify({actor,p,start,target}));
  }
  assert(Math.hypot(actor.x-target.x,actor.y-target.y)<.1);
 }
 for(const b of data.bridgeDecks){
  const x=b.x+b.w/2,y=b.y+b.h/2,v=b.w<b.h;
  const from=v?{x,y:b.y+24}:{x:b.x+18,y},to=v?{x,y:b.y+b.h-18}:{x:b.x+b.w-18,y};
  assert(n.clear(from,to),b.id+' unobstructed deck');
  for(const [id] of cases)traverse(sky.worlds[id].map.spawn,{x,y});
  traverse(from,to);traverse(to,from);
 }
});
test('the visible opening of the golden entrance arch stays walkable, but its pillars do not',()=>{
 const n=load().originalNavigation('skypiea-01');
 assert(n.clear({x:1540,y:2616},{x:1540,y:2864}),'open stone passage');
 assert(!n.walkable(1460,2792),'left pillar');
 assert(!n.walkable(1616,2792),'right pillar');
});
