'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs'),catalog=load(),map=catalog.maps.syrup,nav=catalog.navigation('syrup');
const point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
test('Syrup arrives on the new pier and can walk north through the cliff road',()=>{
 assert.deepEqual([map.spawn.x,map.spawn.y],[1504,1952]);
 assert.deepEqual([map.width,map.height],[3072,2304]);
 assert.ok(nav.walkable(map.spawn.x,map.spawn.y));
 const road=point(724,710);assert.ok(nav.walkable(road.x,road.y));assert.ok(nav.path(map.spawn,road).length);
});
test('Syrup blocks sea and vertical cliff faces outside the newly authored coastline',()=>{
 // The previous cyan/red annotations belong to the preserved old image.
 // These probes are on the new painting, independent of its navigation mask.
 for(const [x,y] of [[130,1005],[1230,1015],[610,1015],[800,1015],[710,1060],[400,822],[1100,790]]){
  const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,'forbidden source point '+x+','+y);
 }
});
test('Syrup cottages, well and gateposts retain solid foundations in the new painted scene',()=>{
 for(const id of ['village-tavern','cottage-slate','cottage-thatch','village-well','kaya-gate-west','kaya-gate-east'])
  assert(map.colliders.some(c=>c.id==='syrup-'+id),'solid landmark '+id);
 for(const c of map.colliders)assert.equal(nav.walkable(c.x+c.w/2,c.y+c.h/2),false,c.id);
});

test('Syrup movement cannot cross the closed southern boundary',()=>{
 const actor={...map.spawn};nav.move(actor,0,2000);
 assert.ok(actor.y>map.returnPoint.y&&actor.y<2200,'movement stops at the end of the pier');
 assert.ok(nav.walkable(actor.x,actor.y));
 const well=point(554,418);assert.equal(nav.walkable(well.x,well.y),false,'the well water and rim remain blocked');
 for(const goal of map.navigationGoals)for(const [a,b] of [[map.spawn,goal],[goal,map.spawn]]){
   const actor={...a},route=nav.path(a,b);let ticks=0;
   while(route.length&&ticks++<1000)nav.follow(actor,route,180,.1);
   assert.ok(Math.hypot(actor.x-b.x,actor.y-b.y)<1,goal.id+' round trip');
 }
});
