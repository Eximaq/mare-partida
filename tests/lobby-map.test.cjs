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

assert(lobby.depthObjects.every(o=>o.id.includes('tree')||o.id.includes('palms')));

for(const c of lobby.colliders){assert.equal(c.isSolid,true,c.id);assert(c.w>=64&&c.h>=64,c.id);}
const render=require('node:fs').readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');assert.match(render,/drawEntityLayer\(\);drawHeroLayer\(\);[\s\S]{0,200}drawForegroundLayer\(/);
