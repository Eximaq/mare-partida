'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('the original Impel Down map has solid cells and a traversable left-to-right duel lane',()=>{
 const file=path.join(__dirname,'../impel-down-world.js');assert.ok(fs.existsSync(file),'Impel Down world has not been integrated');
 const I=require(file);require('../world-system.js');const nav=new MareWorld.Navigation(I.map,32);
 assert.equal(I.map.width,2176);assert.equal(I.map.height,1344);assert.equal(I.map.spawn.y,I.enemySpawn.y);assert.ok(I.map.spawn.x<I.enemySpawn.x);
 assert.equal(nav.walkable(I.map.spawn.x,I.map.spawn.y),true);assert.equal(nav.walkable(I.enemySpawn.x,I.enemySpawn.y),true);assert.ok(nav.path(I.map.spawn,I.enemySpawn).length>0);
 for(let x=460;x<1780;x+=8)assert.equal(nav.walkable(x,420),false,'every top cell and bar must be solid');
 for(const start of [{x:1000,y:540},{x:1500,y:540}]){const hero={...start},enemy={...start};nav.move(hero,0,-400);nav.move(enemy,0,-400);assert.ok(hero.y>=470&&enemy.y>=470,'both actor types stop below the cell wall');}
 assert.ok(I.map.colliders.every(c=>c.isSolid===true&&c.blocksProjectiles===true));
 assert.equal(nav.walkable(100,600),false);assert.equal(nav.walkable(2000,700),false);
 assert.equal(nav.projectileClear({x:500,y:600},{x:1700,y:600}),true,'floor and low decorations never block attacks');
});
test('imported terrain contains no ghost cells and preserves the native map pixels',()=>{
 const I=require('../impel-down-world.js'),meta=require('../assets/impel-down/provenance.json');
 assert.equal(I.rows.length,21);assert(I.rows.every(r=>r.length===34&&/^[abcl.]+$/.test(r)));
 assert.equal(I.rows.join('').split('.').length-1,15);assert.equal(meta.placedObjects,45);
 const png=fs.readFileSync(path.join(__dirname,'../assets/impel-down/map.png'));
 assert.equal(png.readUInt32BE(16),2176);assert.equal(png.readUInt32BE(20),1344);
 assert.equal(require('node:crypto').createHash('sha256').update(png).digest('hex'),meta.sha256);
});
