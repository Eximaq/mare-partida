const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../pixellab-world-maps-data.js');
const pixelMaps=require('../pixellab-world-maps.js');
require('../world-system.js');
const archipelago=require('../archipelago.js');
const monsters=require('../monster-catalog.js');
const hunts=require('../hunt-system.js');
require('../new-islands-art.js');

function pngSize(file){
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

test('PixelLab maps replace Orange Town and unlock Loguetown with passable, reachable spawns',()=>{
  const world=globalThis.MareWorld;
  assert.equal(archipelago.byArea('orange').area,'orange');
  assert.equal(archipelago.byArea('loguetown').area,'loguetown');
  assert.equal(archipelago.canTravel('loguetown',36),true);
  assert.equal(archipelago.canTravel('loguetown',35),false);

  for(const id of ['orange','loguetown']){
    const source=globalThis.MarePixelWorldMapsData[id==='orange'?'orange':'loguetown'];
    const map=world.maps[id];
    const nav=new world.Navigation(map,24);
    assert.equal(map.pixelLabId,source.pixelLabId);
    assert.equal(map.width,source.columns*64);
    assert.equal(map.height,source.rows*64);
    for(const object of source.objects){const c=pixelMaps.objectCollider(source,object);assert.ok(map.colliders.some(o=>o.x===c.x&&o.y===c.y&&o.w===c.w&&o.h===c.h),'every source object retains its collision, including duplicate placements');}
    assert(map.colliders.every(c=>c.isSolid&&c.footprint));
    assert.equal(nav.walkable(map.spawn.x,map.spawn.y),true);
    assert.ok(nav.path(map.spawn,map.returnPoint).length>0);
    for(const district of pixelMaps[id].districts){
      assert.equal(nav.walkable(district.x,district.y),true,district.id);
      assert.ok(nav.path(map.spawn,district).length>0,district.id);
    }
    const solid=map.colliders.find(c=>map.terrainWalkable(c.x+c.w/2,c.y+c.h/2)&&!nav.walkable(c.x+c.w/2,c.y+c.h/2));
    assert(solid,'object-base colliders must block a passable map tile');
  }

  const orange=world.maps.orange, orangeNav=new world.Navigation(orange,24);
  assert.equal(orangeNav.walkable(8,8),false,'water and empty map edges are not walkable');
  assert.deepEqual(pngSize(require('node:path').join(__dirname,'../assets/world-maps/orange.png')),{width:3904,height:2816});
  assert.deepEqual(pngSize(require('node:path').join(__dirname,'../assets/world-maps/loguetown.png')),{width:2752,height:2880});
});

test('Orange Town has only Mr. 3/Cabaji patrols and Loguetown only level-40 Marinheiros',()=>{
  const orange=hunts.get('orange'),loguetown=hunts.get('loguetown');
  assert.equal(orange.boss,null);
  assert.equal(orange.min,11);
  assert.equal(orange.max,15);
  assert.deepEqual(new Set(orange.sectors.flatMap(s=>s.roles)),new Set(['mr3','cabaji']));
  assert.deepEqual(new Set(loguetown.sectors.flatMap(s=>s.roles)),new Set(['marinheiro']));
  assert.equal(loguetown.min,36);
  assert.equal(loguetown.max,40);
  for(const [id,area,level] of [['mr3','orange',13],['cabaji','orange',13],['marinheiro','loguetown',40]]){
    assert.equal(monsters[id].area,area);
    assert.equal(monsters[id].level,level);
    const sector=hunts.get(area).sectors[0];
    assert.equal(hunts.profile(area,sector.id,id).level,level);
  }
});

test('new monster sprite sheets use the existing PixelLab directions and animations',()=>{
  const manifest=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../assets/new-islands/pixel-lab-manifest.json'),'utf8'));
  const expected={mr3:{walk:6,attack:9},cabaji:{walk:6,attack:9},marinheiro:{walk:8,attack:7}};
  for(const [id,actions] of Object.entries(expected)){
    const entry=manifest[id],meta=globalThis.MareNewIslandArt.meta[id];
    assert(entry.pixelLabCharacterId);
    assert.deepEqual(entry.directions,['south','west','east','north']);
    for(const [action,frames] of Object.entries({idle:1,...actions})){
      assert.equal(entry.frames[action],frames);
      assert.equal(meta[action].frames,frames);
      assert.deepEqual(pngSize(require('node:path').join(__dirname,'../assets/new-islands',id,action+'.png')),{width:64*frames,height:256});
    }
  }
});
