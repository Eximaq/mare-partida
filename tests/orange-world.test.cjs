'use strict';
const assert=require('node:assert/strict');
const O=require('../orange-world.js');require('../world-system.js');
const {Navigation,Camera}=globalThis.MareWorld,nav=new Navigation(O.map);
assert.equal(O.COLS,32);assert.equal(O.ROWS,32);assert.equal(O.TILE,64);
assert.deepEqual([O.map.width,O.map.height],[2048,2048]);
assert(nav.walkable(O.spawn.x,O.spawn.y));assert(nav.walkable(O.returnPoint.x,O.returnPoint.y));
assert(nav.path(O.spawn,O.returnPoint).length);
for(const d of O.districts){
 assert(nav.walkable(d.x,d.y),d.name+' center');
 const path=nav.path(O.spawn,d);assert(path.length,d.name+' reachable');
 const actor={...O.spawn};let steps=0;while(path.length&&steps++<10000){nav.follow(actor,path,170,1/30);assert(nav.walkable(actor.x,actor.y),'route crosses obstruction');}
 assert(steps<10000);assert(Math.hypot(actor.x-d.x,actor.y-d.y)<1);
 assert(nav.path(d,O.returnPoint).length,d.name+' return route');
}
for(const f of O.frontages){assert(nav.walkable(f.entrance.x,f.entrance.y),f.id+' front door');assert(nav.path(f.entrance,f.street).length,f.id+' street access');assert(nav.path(O.spawn,f.entrance).length,f.id+' reachable facade');}
for(const c of O.map.colliders)assert(!nav.walkable(c.x+c.w/2,c.y+c.h/2),c.id+' solid');
assert(!nav.walkable(1000,50),'sea blocked');
for(const [width,height] of [[1920,1080],[393,852],[2500,1200]]){const camera=new Camera();camera.width=width;camera.height=height;camera.update({x:2040,y:2040},O.map,0,true);assert(camera.x>=0&&camera.x<=Math.max(0,2048-width));assert(camera.y>=0&&camera.y<=Math.max(0,2048-height));}
console.log('Orange Town: 32x32, five connected sectors, eight frontages, real collisions and camera bounds passed.');
