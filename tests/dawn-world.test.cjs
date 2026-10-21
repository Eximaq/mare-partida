'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const D=require('../dawn-map-data.js'),O=require('../dawn-world.js'),H=require('../hunt-system.js');require('../world-system.js');
const {Navigation,Camera,maps}=MareWorld,nav=new Navigation(O.map,O.map.navigationCell);
assert.equal(maps.dawn,O.map);assert.deepEqual([O.COLS,O.ROWS,O.TILE,O.map.width,O.map.height],[56,40,64,3584,2560]);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/dawn-manual/map.png')).digest('hex'),D.source.sha256);
assert(fs.readFileSync('assets/dawn-manual/map.png').equals(fs.readFileSync('pixellab-pip-generations/dawn-manual-20261020/map-composite.png')));
assert.equal(O.props.length,42);assert.equal(O.props.filter(p=>p.kind==='tree').length,22);assert.equal(O.props.filter(p=>p.kind==='boat').length,6);
const raw=JSON.parse(fs.readFileSync('pixellab-pip-generations/dawn-manual-20261020/objects/manifest.json'));
const receipt=JSON.parse(fs.readFileSync('pixellab-pip-generations/dawn-manual-20261020/source-archive.json'));
for(const [name,hash]of Object.entries(receipt.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('pixellab-pip-generations/dawn-manual-20261020/'+name)).digest('hex'),hash,'Original ZIP member changed: '+name);
for(const p of O.props){const o=raw.objects.find(o=>o.id===p.id);assert.equal(p.bounds.x,o.boundingBox.x+D.offset.x);assert.equal(p.foot.y,o.groundBounds.y+D.offset.y);assert(fs.readFileSync(p.url).equals(fs.readFileSync('pixellab-pip-generations/dawn-manual-20261020/objects/'+o.filename)));const c=O.map.colliders.find(c=>c.id===p.id);assert(!nav.walkable(c.x+c.w/2,c.y+c.h/2));}
assert(!O.ground(128,128,10));assert(nav.walkable(O.spawn.x,O.spawn.y));
for(const a of [O.spawn,...O.paths,O.returnPoint])for(const b of [O.spawn,...O.paths,O.returnPoint]){
 const path=nav.path(a,b),actor={...a};assert(path.length,`${a.id} -> ${b.id}`);let steps=0;
 while(path.length&&steps++<4000){nav.follow(actor,path,158,1/30);assert(nav.walkable(actor.x,actor.y));}
 assert(!path.length&&Math.hypot(actor.x-b.x,actor.y-b.y)<1,`${a.id} -> ${b.id} stopped at ${actor.x},${actor.y}`);
}
for(const d of O.districts){const r=H.get('beach').sectors.find(s=>s.id===d.id);assert.equal(r.x,d.x);assert.equal(r.y,d.y);assert.deepEqual([r.min,r.max],[d.min,d.max]);}
assert.equal(H.get('beach').bossLevel,5);assert.equal(H.get('beach').firstGold,300);
const camera=new Camera();for(const [w,h]of [[1920,1080],[1366,768],[393,852],[4096,2800]]){Object.assign(camera,{width:w,height:h});for(const p of O.paths){camera.update(p,O.map,0,true);assert(camera.x>=0&&camera.y>=0);assert(camera.x<=Math.max(0,O.map.width-w)&&camera.y<=Math.max(0,O.map.height-h));}}
console.log('Dawn manual: byte-identical export, 42 original placements, precise footprints, 81 walking routes, source dimensions, fixed levels/reward and camera passed.');
