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
  assert.ok(lobby.colliders.length>50);
  const solid=lobby.colliders.find(o=>lobby.terrainWalkable(o.x+o.w/2,o.y+o.h/2));
  assert.ok(solid);
  assert.equal(nav.walkable(solid.x+solid.w/2,solid.y+solid.h/2),false);
});
