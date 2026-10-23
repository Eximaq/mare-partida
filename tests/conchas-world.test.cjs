'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const O=require('../conchas-world.js'),A=require('../terrain-autotile.js'),T=require('../orange-terrain.js'),H=require('../hunt-system.js');
require('../world-system.js');const {Navigation,Camera,maps}=MareWorld,nav=new Navigation(O.map);
assert.notEqual(maps.conchas,O.map);assert.equal(maps.conchas.pixelLabId,'a12956e6-c961-499a-8242-ca264fcfc39a');assert.equal(maps.conchas.width,4480);assert.equal(maps.conchas.height,3456);assert.equal(O.COLS,32);assert.equal(O.ROWS,32);assert.equal(O.TILE,64);assert.equal(O.map.width,2048);assert.equal(O.map.height,2048);
assert(nav.walkable(O.spawn.x,O.spawn.y));assert(!nav.walkable(64,64));
for(const a of [O.spawn,...O.paths,O.returnPoint])for(const b of [O.spawn,...O.paths,O.returnPoint]){
 const path=nav.path(a,b);assert(path.length,`${a.id} -> ${b.id}`);const actor={...a};let steps=0;
 while(path.length&&steps++<3000)nav.follow(actor,path,158,1/30);
 assert(!path.length);assert(nav.walkable(actor.x,actor.y));assert(Math.hypot(actor.x-b.x,actor.y-b.y)<1);
}
for(const f of O.frontages){assert(nav.walkable(f.entrance.x,f.entrance.y),f.id);assert(nav.path(f.entrance,f.street).length,f.id);}
for(const p of O.props.filter(p=>p.kind==='building'))assert.notEqual(O.at(Math.floor(p.x/64),Math.floor(p.y/64)),O.WATER,p.id);
for(const c of O.map.colliders)assert(!nav.walkable(c.x+c.w/2,c.y+c.h/2),c.id);
const arch=O.props.find(p=>p.id==='arco-do-bastiao');assert(nav.clear({x:arch.x,y:arch.y-64},{x:arch.x,y:arch.y+40}),'Arch center stays open');
for(const d of O.docks){let sea=false,land=false;for(let y=d.y/64;y<(d.y+d.h)/64;y++)for(let x=d.x/64;x<(d.x+d.w)/64;x++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const t=O.at(x+dx,y+dy);sea ||= t===O.WATER;land ||= t!==O.WATER&&t!==O.WOOD;}assert(sea&&land,'Each dock reaches both shore and sea');}
const manifest=require('../assets/terrain/harbor-v2/manifest.json'),images={};for(const s of Object.values(manifest.sets))images[s.url]={naturalWidth:128};for(const v of Object.values(manifest.variants).flat())images[v]={naturalWidth:32};
const cfg=T.configure(O,{...manifest,layout:{}},images);assert.equal(cfg.quads.size,1089);
for(let y=-1;y<32;y++)for(let x=-1;x<32;x++)assert(new Set(A.corners(cfg.plan.at,x,y)).size<=2,'No unsupported three-material joins');
const stone=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(cfg.plan.at(x,y)==='stone')stone.push([x,y]);
const visited=new Set(),queue=[stone[0]];for(let n=0;n<queue.length;n++){const [x,y]=queue[n],key=x+','+y;if(visited.has(key)||cfg.plan.at(x,y)!=='stone')continue;visited.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
assert.equal(visited.size,stone.length,'Rendered paving must form one connected street network');
const conchas=globalThis.MarePixelWorldMaps.conchas,conchasNav=new Navigation(conchas.map,24);
assert.deepEqual(H.get('swamp').sectors.map(s=>[s.min,s.max]),[[8,8],[8,8],[8,8],[8,8]]);assert.equal(H.get('swamp').boss,null);
for(const s of H.sectors('swamp',conchas.districts)){assert.equal(s.roles[0],'helmeppo');assert(conchasNav.path(conchas.map.spawn,s).length);}
const cam=new Camera();for(const [w,h]of [[1920,1080],[1366,768],[393,852],[2560,1440]]){cam.width=w;cam.height=h;for(const pt of [O.spawn,...O.paths]){cam.update(pt,O.map,0,true);assert(cam.x>=0&&cam.y>=0);assert(cam.x<=Math.max(0,2048-w)&&cam.y<=Math.max(0,2048-h));}}
const html=fs.readFileSync('index.html','utf8');assert(html.indexOf('src="conchas-world.js"')<html.indexOf('src="world-system.js"'));assert(html.indexOf('src="orange-terrain.js"')<html.indexOf('src="conchas-renderer.js"'));
console.log('Conchas legacy fallback and the PixelLab map selected for runtime both passed their navigation and compatibility checks.');
