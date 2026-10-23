'use strict';
const assert=require('node:assert/strict');
const maps=require('../pixellab-world-maps.js');
require('../world-system.js');
const nav=new MareWorld.Navigation(maps.conchas.map,24);
assert.equal(require('../conchas-structures.js').projectionSha256,require('../assets/world-maps/conchas/projection.json').sha256);
const cases=[
  ['southwest facade',{x:1450,y:2080},{x:0,y:400},p=>p.y<2168],
  ['southeast facade',{x:2208,y:2060},{x:0,y:400},p=>p.y<2160],
  ['western wall',{x:1450,y:1700},{x:-300,y:0},p=>p.x>1350],
  ['eastern stepped corner',{x:2820,y:1644},{x:0,y:-400},p=>p.y>=1528],
  ['closed Marine gate',{x:1970,y:1320},{x:0,y:-500},p=>p.y>=1200],
  ['northwest facade',{x:1450,y:1320},{x:0,y:-400},p=>p.y>=1200]
];
for(const actorType of ['player','monster','npc'])for(const [name,start,delta,stopped] of cases){
  assert(nav.walkable(start.x,start.y),`${name} begins on accessible ground; nearest=${JSON.stringify(nav.nearest(start))}`);
  const actor={...start,type:actorType};
  assert(!nav.clear(start,{x:start.x+delta.x,y:start.y+delta.y}),`${name} rejects a direct movement segment`);
  nav.move(actor,delta.x,delta.y);
  assert(stopped(actor),`${actorType} must not cross ${name}: ${JSON.stringify(actor)}`);
  assert(nav.walkable(actor.x,actor.y),`${actorType} must stop outside the solid area`);
}
for(const rect of maps.conchas.map.colliders.filter(c=>c.structure))assert(!nav.walkable(rect.x+rect.w/2,rect.y+rect.h/2));
const courtyard={x:1920,y:1980};
assert(nav.walkable(courtyard.x,courtyard.y));
assert(nav.path(maps.conchas.map.spawn,courtyard).length,'open southern entrance must remain reachable');
assert(nav.path(courtyard,maps.conchas.map.spawn).length,'the player can return through the open entrance');
const walker={...maps.conchas.map.spawn},route=nav.path(walker,courtyard);
for(let i=0;i<4000&&route.length;i++)nav.follow(walker,route,162,1/60);
assert(Math.hypot(walker.x-courtyard.x,walker.y-courtyard.y)<1,`walking route must finish: ${JSON.stringify(walker)}`);
console.log('Conchas fort: six marked structures block three actor types, large steps do not tunnel, open entrance remains reachable.');
