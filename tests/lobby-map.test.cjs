const test=require('node:test');
const assert=require('node:assert/strict');
require('../lobby-map-data.js');
const lobby=require('../lobby-world.js');
require('../island-world.js');
require('../world-system.js');

test('Lobby uses the refreshed native-resolution PixelLab map',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const png=fs.readFileSync(path.join(__dirname,'../assets/lobby-map.png'));
  const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/lobby-map-provenance.json'),'utf8'));
  assert.equal(globalThis.MareLobbyMapData.pixelLabMapId,'5cf16074-4d27-437e-acd5-869fe9339f26');
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[60*64,41*64]);
  assert.equal(provenance.refreshedAt,'2026-10-22');
  assert.equal(provenance.objects,97);
  assert.match(fs.readFileSync(path.join(__dirname,'../lobby-world.js'),'utf8'),/lobby-map\.png\?v=20261022/);
});

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

test('fruit tree trunks block a 32x20 foot box without sealing nearby grass',()=>{
 const nav=new globalThis.MareWorld.Navigation(lobby.map,32);
 for(const c of lobby.colliders.filter(c=>c.id.startsWith('fruit-tree-'))){
  assert.equal(nav.walkable(c.x+c.w/2,c.y+c.h/2),false,c.id);
 }
 assert.equal(nav.walkable(1760,680),true);
});
