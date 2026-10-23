'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const maps=require('../pixellab-world-maps.js');
require('../world-system.js');
const world=globalThis.MareWorld;
const hunt=require('../hunt-system.js');
require('../new-islands-art.js');
const map=maps.conchas.map;
const source=maps.conchas.source;

function pngSize(relative){
  const bytes=fs.readFileSync(path.join(root,relative));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

assert.equal(source.pixelLabId,'a12956e6-c961-499a-8242-ca264fcfc39a');
assert.deepEqual([map.width,map.height,map.cellSize],[4480,3456,64]);
assert.deepEqual(maps.conchas.spawnCell,[11,24]);
assert.deepEqual(map.spawn,{x:2144,y:2720});
assert.notDeepEqual(map.returnPoint,map.spawn,'return marker remains at the southern pier');
assert.equal(source.terrain[42][33],'c','southern spawn cell is sand');
assert.equal(map.terrainWalkable(map.spawn.x,map.spawn.y),true);
assert.equal(world.maps.conchas,map,'world navigation selects the PixelLab map');

assert.equal(maps.conchas.props.length,source.objects.length);
assert.equal(source.objects.length,105,'fresh PixelLab map keeps all 105 placements');
assert.equal(map.colliders.length,source.objects.length);
assert.equal(typeof globalThis.MarePixelMapRenderer.actorOverlapsProp,'function','game foreground pass must have its public renderer hook');
for(const prop of maps.conchas.props){
  const base=(prop.cellY-source.minY+1)*64;
  assert.equal(prop.bottomY,base,'sprite must end at its PixelLab stands_on base');
  const collider=map.colliders.find(c=>c.sourceId===prop.placementId);
  assert(Math.abs(collider.y+collider.h-base)<=1,'physics and visual base must agree');
}
const small=source.objects.find(o=>o.widthCells===.2);
assert(map.colliders.find(c=>c.sourceId===small.placementId).w<16,'small decoration must not block an entire tile');
assert(map.colliders.every(c=>c.isSolid&&c.footprint));
assert.equal(maps.actorOverlapsProp({x:140,y:150},{x:100,y:100,w:80,h:100}),true,'actor behind a prop is covered by its foreground pass');
assert.equal(maps.actorOverlapsProp({x:140,y:220},{x:100,y:100,w:80,h:100}),false,'actor in front stays visible');
assert.equal(maps.actorOverlapsProp({x:20,y:150},{x:100,y:100,w:80,h:100}),false,'distant actor does not trigger the foreground pass');
for(const sector of maps.conchas.districts){
  assert.equal(sector.min,8);
  assert.equal(sector.max,8);
  assert.deepEqual(sector.roles,['helmeppo']);
  assert(map.terrainWalkable(sector.x,sector.y),`${sector.name} must be walkable`);
  assert(new world.Navigation(map,24).path(map.spawn,sector).length>0,`${sector.name} must be reachable from the southern spawn`);
}

assert.equal(hunt.get('swamp').boss,null);
assert.equal(hunt.get('swamp').sectors.length,4);
for(const sector of hunt.get('swamp').sectors){
  const profile=hunt.profile('swamp',sector.id,'helmeppo',0);
  assert.equal(profile.level,8);
  assert.equal(profile.maxHP,255);
  assert.equal(profile.attack,20);
  assert.equal(profile.defense,9);
  assert.equal(profile.magicDefense,6);
}
assert.deepEqual(pngSize('assets/world-maps/conchas/conchas.png'),{width:4480,height:3456});
const art=globalThis.MareNewIslandArt;
assert.deepEqual([art.meta.helmeppo.idle.size,art.meta.helmeppo.walk.frames,art.meta.helmeppo.attack.frames],[80,8,7]);
const helmeppoLayout=art.layout({type:'helmeppo',emberFacing:'south',attackAnim:0,moving:0,bob:0,x:0,y:200});
assert.deepEqual([helmeppoLayout.width,helmeppoLayout.scale],[80,1]);
for(const [file,expected] of [['idle.png',{width:80,height:320}],['walk.png',{width:640,height:320}],['attack.png',{width:560,height:320}]]){
  assert.deepEqual(pngSize(`assets/new-islands/helmeppo/${file}`),expected);
}
for(const assetId of new Set(source.objects.map(o=>o.assetId)))assert(fs.existsSync(path.join(root,'assets/world-maps/conchas/objects',`${assetId}.png`)),`missing PixelLab object ${assetId}`);

console.log('Conchas PixelLab: mapa, chegada sul, colisores, setores e Helmeppo Nv. 8 validados.');
