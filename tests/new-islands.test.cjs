'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
require('../new-islands-data.js');
const islands=require('../new-islands.js'),H=require('../hunt-system.js'),catalog=require('../monster-catalog.js');
require('../new-islands-art.js');
require('../world-system.js');
const root=path.join(__dirname,'..');
for(const [id,allowed,min] of [['rare','ei',16],['syrup','u',21],['baratie','c',26],['arlong','c',31]]){
  const island=islands[id],nav=new MareWorld.Navigation(island.map,32);
  assert.equal(MareWorld.maps[id],island.map);
  assert.equal(island.map.width,island.data.width*64);
  assert.equal(island.map.height,island.data.height*64);
  assert(allowed.includes(island.at(Math.floor(island.spawn.x/64),Math.floor(island.spawn.y/64))));
  assert(nav.walkable(island.spawn.x,island.spawn.y));
  assert(island.map.colliders.length>=30,`${id}: visible object footprints are solid`);
  assert(island.map.colliders.some(o=>{
    const x=o.x+o.w/2,y=o.y+o.h/2;
    return island.map.terrainWalkable(x,y)&&!nav.walkable(x,y);
  }),`${id}: objects stop movement on otherwise walkable terrain`);
  for(const sector of island.districts){assert(nav.walkable(sector.x,sector.y));assert(nav.path(island.spawn,sector).length,`${id}/${sector.id}`);}
  assert.equal(H.get(id).min,min);
  assert(fs.existsSync(path.join(root,`assets/new-islands/${id}-map.png`)));
}
assert(islands.syrup.spawn.y>islands.syrup.map.height*.7);
assert(islands.baratie.spawn.y>islands.baratie.districts.at(-1).y);
const python=cp.execFileSync('python',['-c','import json; from server.monsters import CATALOG; print(json.dumps(CATALOG))'],{cwd:root,encoding:'utf8'});
assert.deepEqual(catalog,JSON.parse(python));
for(const [id,area,level] of [['cocox','rare',18],['sham','syrup',23],['buchi','syrup',23],['pearl','baratie',28],['gin','baratie',28],['kuroobi','arlong',33],['chew','arlong',33]]){
  const m=catalog[id],sector=H.get(area).sectors[0],p=H.profile(area,sector.id,id);
  assert.equal(p.level,level);assert.equal(p.maxHP,m.max_hp);assert.equal(p.attack,m.physical_attack);
  if(id!=='cocox')for(const action of ['idle','walk','attack']){
    const img=path.join(root,`assets/new-islands/${id}/${action}.png`);assert(fs.existsSync(img));
    const bytes=fs.readFileSync(img);assert(bytes.readUInt32BE(16)>=48);assert(bytes.readUInt32BE(20)>=192);
    const art=MareNewIslandArt.layout({type:id,y:500,emberFacing:'south',attackAnim:action==='attack'?.3:0,moving:action==='walk'?1:0});
    assert.equal(art.scale,2.25);
    assert(Math.abs(art.top+Math.round(art.a.feet[art.row]*art.scale)-503)<=1);
  }
}
assert(catalog.sham.max_hp>catalog.cocox.max_hp);
assert(catalog.pearl.max_hp>catalog.buchi.max_hp);
assert(catalog.gin.physical_attack>catalog.sham.physical_attack);
console.log('Three maps: native exports, inferred spawns, reachable sectors, original animations and Python/JS balance passed.');
