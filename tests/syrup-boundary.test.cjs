'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs'),catalog=load(),map=catalog.maps.syrup,nav=catalog.navigation('syrup');
test('Syrup arrives at the cyan marker and can walk north into the village',()=>{
 assert.ok(Math.hypot(map.spawn.x-2295,map.spawn.y-3160)<24,'arrival must be inside the cyan circle');
 assert.ok(nav.walkable(map.spawn.x,map.spawn.y));
 const road={x:2300,y:2700};assert.ok(nav.walkable(road.x,road.y));assert.ok(nav.path(map.spawn,road).length);
});
test('Syrup blocks sea, southern beach and the outside of the red contour',()=>{
 for(const [x,y] of [[1100,1900],[3100,3200],[2295,3250],[2000,3000],[2500,3000],[1800,1100],[3100,2050]])
   assert.equal(nav.walkable(x,y),false,'forbidden point '+x+','+y);
});
test('Syrup retains all authored object feet after the export origin translation',()=>{
 const {createHash}=require('node:crypto'),source=require('../world-map-exports.js').get('syrup');
 const props=structuredClone(source.props);for(const p of props){p.y-=384;p.base=Number((p.base-384).toFixed(2));p.ground.y=Number((p.ground.y-384).toFixed(2));}
 assert.equal(createHash('sha256').update(JSON.stringify(props)).digest('hex'),'3151dde5f3537002f20c579c16f05b91414360989a4b51cae6e3a2d3e55dcc9d');
 for(const c of map.colliders)assert.equal(nav.walkable(c.x+c.w/2,c.y+c.h/2),false,c.id);
});

test('Syrup movement cannot cross the closed southern boundary',()=>{
 const actor={...map.spawn};nav.move(actor,0,200);
 assert.ok(actor.y<3180);assert.ok(nav.walkable(actor.x,actor.y));
 assert.equal(nav.walkable(2226,1858),false,'central lake remains blocked');
 for(const goal of map.navigationGoals)for(const [a,b] of [[map.spawn,goal],[goal,map.spawn]]){
   const actor={...a},route=nav.path(a,b);let ticks=0;
   while(route.length&&ticks++<1000)nav.follow(actor,route,180,.1);
   assert.ok(Math.hypot(actor.x-b.x,actor.y-b.y)<1,goal.id+' round trip');
 }
});
