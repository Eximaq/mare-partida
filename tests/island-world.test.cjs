const assert=require('node:assert/strict');
require('../island-world.js');require('../world-system.js');
const island=globalThis.MareIsland,map=MareWorld.maps.lobby,nav=new MareWorld.Navigation(map);
assert(nav.walkable(map.spawn.x,map.spawn.y));
// All four original NPC approach points must remain reachable from the spawn.
for(const point of [...Object.values(island.npcs).map(n=>({x:n.x-34,y:n.y+13})),...island.paths,{x:220,y:1168}]){
  const route=nav.path(map.spawn,point);assert(route.length,JSON.stringify(point));
  const hero={...map.spawn,facing:1};let frames=0;
  while(route.length&&frames++<6000){nav.follow(hero,route,158,.05);assert(nav.walkable(hero.x,hero.y));}
  assert(frames<6000);assert(Math.hypot(hero.x-point.x,hero.y-point.y)<1);
}
// Coast and open sea must remain solid, while the wooden dock is walkable.
for(const point of [{x:100,y:100},{x:100,y:1000},{x:2900,y:1000},{x:1500,y:50},{x:1500,y:1950}])assert(!nav.walkable(point.x,point.y));
assert(nav.walkable(220,1168));
const hero={x:220,y:1168,facing:1};for(let i=0;i<500;i++){nav.move(hero,-10,0);assert(nav.walkable(hero.x,hero.y));}
assert(hero.x>=island.docks[1].x+nav.radius);assert(hero.x<island.docks[1].x+nav.radius+10);
for(const b of island.buildings){assert(!nav.walkable(b.x,b.y-50),b.id);}
console.log(`Island: 8 full routes, 4 NPC services, quay boundaries and ${island.buildings.length} building footprints passed.`);
