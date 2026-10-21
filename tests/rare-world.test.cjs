'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../rare-world.js');
require('../new-islands-data.js');
const I=require('../new-islands.js'),H=require('../hunt-system.js');
require('../world-system.js');
const {Navigation}=MareWorld,nav=new Navigation(I.rare.map,32);
assert.deepEqual([I.rare.data.width,I.rare.data.height,I.rare.map.width,I.rare.map.height],[58,33,3712,2112]);
assert.equal(MareWorld.maps.rare,I.rare.map);
assert('ei'.includes(I.rare.at(Math.floor(I.rare.spawn.x/64),Math.floor(I.rare.spawn.y/64))));
assert(R.props.filter(p=>p.kind==='tree').length>=100);
assert(nav.walkable(I.rare.spawn.x,I.rare.spawn.y));
for(const d of I.rare.districts){assert(nav.path(I.rare.spawn,d).length);assert.equal(H.profile('rare',d.id,'cocox').level,18);assert.equal(H.sectorAt('rare',d,I.rare.districts).id,d.id);}
assert.equal(H.bossReady(H.migrate({}), 'rare',I.rare.districts.at(-1)),false);
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
