'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../rare-world.js'),H=require('../hunt-system.js');
require('../world-system.js');
const {Navigation}=MareWorld,nav=new Navigation(R.map,R.map.navigationCell||24);
assert.deepEqual([R.COLS,R.ROWS,R.TILE,R.map.width,R.map.height],[32,32,64,2048,2048]);
assert.equal(MareWorld.maps.rare,R.map);
assert(R.props.filter(p=>p.kind==='tree').length>=100);
assert(nav.walkable(R.spawn.x,R.spawn.y));
assert(nav.walkable(R.returnPoint.x,R.returnPoint.y));
for(const a of [R.spawn,...R.paths,R.returnPoint])for(const b of [R.spawn,...R.paths,R.returnPoint])assert(nav.path(a,b).length,`${a.id||'spawn'} to ${b.id||'spawn'}`);
for(const d of R.districts){assert.equal(H.profile('rare',d.id,'cocox').level,35);assert.equal(H.sectorAt('rare',d,R.districts).id,d.id);}
assert.equal(H.bossReady(H.migrate({}), 'rare',R.districts.at(-1)),false);
const db=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/monsters.json'),'utf8')).cocox;
const c=H.profile('rare','mata-fechada','cocox');
assert.equal(c.maxHP,db.max_hp);assert.equal(c.attack,db.physical_attack);assert.equal(c.defense,db.physical_defense);assert.equal(c.magicDefense,db.magic_defense);
assert.equal(c.speed,db.move_speed);assert.equal(c.attackSec,db.attack_seconds);assert.equal(c.aggro,db.aggro_radius);
for(const [name,size] of [['grass',64],['grass-alt',64],['sand',64]]){
  const b=fs.readFileSync(path.join(__dirname,`../assets/rare-animals/${name}.png`));assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);
}
for(const [name,width,height] of [['idle',48,192],['run',320,320],['attack',612,272]]){
  const b=fs.readFileSync(path.join(__dirname,`../assets/rare-animals/cocox/${name}.png`));assert.equal(b.readUInt32BE(16),width);assert.equal(b.readUInt32BE(20),height);
}
console.log('Rare island: native tiles, organic forest, reachable clearings, Cocox catalog and original sheets passed.');
