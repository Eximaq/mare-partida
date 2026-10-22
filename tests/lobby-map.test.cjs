const test=require('node:test');
const assert=require('node:assert/strict');
require('../lobby-map-data.js');
const lobby=require('../lobby-world.js');
require('../island-world.js');
require('../world-system.js');

test('existing 64px Lobby map has a walkable spawn and reachable services',()=>{
  const map=globalThis.MareWorld.maps.lobby;
  const nav=new globalThis.MareWorld.Navigation(map,32);
  assert.equal(map.width,60*64);
  assert.equal(map.height,41*64);
  assert.equal(nav.walkable(map.spawn.x,map.spawn.y),true);
  assert.equal(lobby.terrain(map.spawn.x,map.spawn.y),'e');
  for(const target of [...Object.values(lobby.npcs),...lobby.portals]){
    assert.equal(nav.walkable(target.x,target.y),true);
    assert.ok(nav.path(map.spawn,target).length>0);
  }
  assert.equal(nav.walkable(100,100),false);
  assert.equal(nav.walkable(1350,1050),false);
});
const actor={x:0,y:10,height:24,isCharacter:true};const multi={x:0,y:0,height:192,pivotOffsetY:160};assert.equal(lobby.pivotY(actor),34);assert.equal(lobby.pivotY(multi),160);assert.deepEqual(lobby.sortDepth([multi,actor]).map(lobby.pivotY),[34,160]);

assert(lobby.depthObjects.every(o=>lobby.colliders.some(c=>c.id===o.id)));assert(lobby.depthObjects.some(o=>o.id.includes('chest')));

for(const c of lobby.colliders){assert.equal(c.isSolid,true,c.id);assert(c.w>0&&c.h>0,c.id);if(!c.footprintOnly)assert(c.w>=64&&c.h>=64,c.id);}
const render=require('node:fs').readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');assert.match(render,/drawCharacterLayer\(\);drawMapObjectLayer\(actors\)/);assert(render.indexOf('drawMapObjectLayer(actors)')<render.indexOf('for(const food of world.food)'));assert.match(render,/Object\.assign\(world\.hero,safeMapSpawn\(\)/);

test('fruit tree roots block movement and blocked spawns resolve to walkable ground',()=>{
 const nav=new globalThis.MareWorld.Navigation(lobby.map,32);
 for(const c of lobby.colliders.filter(c=>c.id.startsWith('fruit-tree-'))){
   assert.equal(c.footprintOnly,true,c.id);
   assert.deepEqual([c.w,c.h],[48,32],c.id);
   assert.equal(c.visualY+c.visualH,c.pivotY,c.id);
   assert.equal(lobby.depthObjects.find(o=>o.id===c.id).y1,c.pivotY,c.id);
   assert.equal(nav.walkable(c.x+c.w/2,c.y+c.h/2),false,c.id);
   const safe=nav.nearest({x:c.x+c.w/2,y:c.y+c.h/2});
   assert(safe&&nav.walkable(safe.x,safe.y),`${c.id}: blocked position resolves safely`);
 }
 const tree=lobby.colliders.find(c=>c.id==='fruit-tree-0'),actor={x:tree.x+tree.w/2,y:tree.y-8};
 assert(nav.walkable(actor.x,actor.y));nav.move(actor,0,48);assert(actor.y<=tree.y,`movement stops before ${tree.id}`);
 assert.equal(nav.walkable(1760,680),true);
});
