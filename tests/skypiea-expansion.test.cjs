'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path');
const {load}=require('../world-catalog.cjs');
const data=require('../skypiea-map-data.js');
const cases=[['skypiea-01',75,80,'satori'],['skypiea-02',80,85,'shura'],['skypiea-03',85,90,'gendatsu'],['skypiea-04',90,95,'ohm']];
test('four registered Skypiea destinations preserve the first ID, gate and authored dimensions',()=>{
 const w=load();
 assert.deepEqual(Array.from(w.islands.filter(x=>x.region==='skypiea'),x=>[x.id,x.minLevel,x.recommended[1]]),cases.map(x=>x.slice(0,3)));
 assert.equal(data.width,4608);assert.equal(data.height,3072);
 for(const [id] of cases){const m=w.maps[id];assert.equal(m.width,4608);assert.equal(m.height,3072);assert.equal(m.terrainWalkable(64,64),false);assert(w.navigation(id).walkable(m.spawn.x,m.spawn.y));}
});

test('the packaged Skypiea source meets the HD resolution contract without enlarging the world',()=>{
 const image=fs.readFileSync(path.join(__dirname,'..',data.groundUrl));
 assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');
 let dimensions;
 for(let offset=12;offset+8<=image.length;){
  const kind=image.toString('ascii',offset,offset+4),bytes=image.readUInt32LE(offset+4),start=offset+8;
  assert(start+bytes<=image.length,'complete WebP chunk');
  if(kind==='VP8X'&&bytes>=10)dimensions=[1+image.readUIntLE(start+4,3),1+image.readUIntLE(start+7,3)];
  if(kind==='VP8L'&&bytes>=5){assert.equal(image[start],0x2f);const bits=image.readUInt32LE(start+1);dimensions=[1+(bits&0x3fff),1+((bits>>>14)&0x3fff)];}
  offset=start+bytes+(bytes&1);
 }
 assert(dimensions,'HD dimensions are encoded in a VP8L or VP8X header');
 const [width,height]=dimensions;
 assert.deepEqual([width,height],[data.imageWidth,data.imageHeight],'metadata matches the published source');
 assert(width>=3072&&height>=2048,'the source must supply at least twice the former detail per axis');
 assert(Math.abs(width/height-data.width/data.height)<.001,'the source retains the world composition');
 assert.deepEqual([data.width,data.height],[4608,3072],'texture resolution must not change gameplay scale');
});

test('new enemies use shared level progression and six separate, reachable encounter slots each',()=>{
 const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js'),w=load();
 const expected=[[77],[84,61979,2356,1024,127,7812],[88,79112,2877,1216,150,11116],[95,121646,4099,1655,197,18596]];
 for(const [k,[id,min,max,type]] of cases.entries()){
  assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert.equal(A.get(id).order,15+k);
  const slots=B.slots(id),m=w.maps[id],nav=w.navigation(id);assert.equal(slots.length,6);
  assert.deepEqual([m.spawn.x,m.spawn.y],[534,2604]);
  assert.equal(m.returnPoint.x,1068);assert.equal(m.returnPoint.y,2190);
  assert(Math.hypot(m.spawn.x-m.returnPoint.x,m.spawn.y-m.returnPoint.y)>m.returnPoint.radius+64,'arrival must not immediately return to the port');
  assert(nav.path(m.spawn,m.returnPoint).length,'return dais must be reachable');
  for(const s of slots){
   assert.equal(s.type,type);assert(s.id.startsWith(id+'-'));assert(nav.walkable(s.x,s.y));assert(nav.path(m.spawn,s).length);
   const p=H.profile(id,s.sector,s.type,0.5);
   const xp=H.rewards(id,{...p,district:s.sector,type},p.level,.5).xp;
   assert.deepEqual(k?[p.level,p.maxHP,p.attack,p.defense,p.magicDefense,xp]:[p.level],expected[k]);
  }
 }
 assert.equal(new Set(cases.map(([id])=>JSON.stringify(w.maps[id].spawn))).size,1);
 assert.equal(new Set(cases.flatMap(([id])=>B.slots(id).map(s=>s.id))).size,24);
});
test('walking and click routes traverse the new open courts and connect the return dais to the shrine',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 const n=new MareWorld.Navigation(sky.map,sky.map.navigationCell);
 // The owner-marked entrance (178,868 in the authored grid), open arch, south court,
 // centre plaza, east court, shrine forecourt and west court (world units).
 const stops=[{x:534,y:2604},{x:534,y:2475},{x:2304,y:2400},{x:2304,y:1434},{x:3360,y:1440},{x:2304,y:660},{x:1260,y:1440},{x:1068,y:2190},{x:480,y:2625}];
 const actor={...stops[0]};
 for(const target of stops.slice(1)){
  assert(n.walkable(target.x,target.y),JSON.stringify(target));
  const route=n.path(actor,target);assert(route.length,JSON.stringify({actor,target}));
  for(const p of route){
   assert(n.clear(actor,p),JSON.stringify({actor,p}));
   n.move(actor,p.x-actor.x,p.y-actor.y);
   assert(Math.hypot(actor.x-p.x,actor.y-p.y)<.1,JSON.stringify({actor,p}));
  }
  assert(Math.hypot(actor.x-target.x,actor.y-target.y)<.1);
 }
});
test('the new scene stays visible over the blocked sky and solid landmarks remain outside the walking surface',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 for(const [id] of cases){
  const m=sky.worlds[id].map,n=new MareWorld.Navigation(m,m.navigationCell),coverage=MareWorld.coverageFor(m);
  assert(coverage.contains(0,0,4608,3072),'render must include sky and buildings, not only the walking mask');
  assert(!n.walkable(64,64),'open sky');
  assert(!n.walkable(300,1200),'cloud house on the western edge');
  assert(!n.walkable(2304,270),'golden bell base');
  assert(n.walkable(2304,1434),'open centre plaza');
 }
});
test('the return dais posts block feet while its eastern entrance stays open',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 const nav=new MareWorld.Navigation(sky.map,sky.map.navigationCell);
 // Coordinates measured on the eight visible post bases in the source artwork.
 for(const [x,y]of [[993,2100],[1141.5,2100],[918,2154],[1216.5,2163],[912,2235],[1219.5,2238],[990,2301],[1143,2301]])assert(!nav.walkable(x,y),'solid dais post '+x+','+y);
 assert(nav.walkable(1215,2199),'eastern gap between posts');
 assert(nav.path(sky.map.spawn,sky.map.returnPoint).length,'the centre remains reachable from arrival');
});
