'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {load}=require('../world-catalog.cjs');
const {createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const data=require('../skypiea-map-data.js');
const cases=[['skypiea-01',75,80,'satori'],['skypiea-02',80,85,'shura'],['skypiea-03',85,90,'gendatsu'],['skypiea-04',90,95,'ohm']];
test('four registered Skypiea destinations preserve the first ID, gate and authored dimensions',()=>{
 const w=load();
 assert.deepEqual(Array.from(w.islands.filter(x=>x.region==='skypiea'),x=>[x.id,x.minLevel,x.recommended[1]]),cases.map(x=>x.slice(0,3)));
 assert.equal(data.width,7616);assert.equal(data.height,4736);
 for(const [id] of cases){const m=w.maps[id];assert.equal(m.width,7616);assert.equal(m.height,4736);assert.equal(m.terrainWalkable(64,64),false);assert(w.navigation(id).walkable(m.spawn.x,m.spawn.y));}
});

test('new enemies use shared level progression and six separate, reachable encounter slots each',()=>{
 const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js'),w=load();
 const expected=[[77],[84,51878,2037,899,113,6380],[88,59709,2284,989,124,7580],[95,76430,2792,1171,144,9900]];
 for(const [k,[id,min,max,type]] of cases.entries()){
  assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert.equal(A.get(id).order,15+k);
  const slots=B.slots(id),m=w.maps[id],nav=w.navigation(id);assert.equal(slots.length,6);
  assert.deepEqual([m.returnPoint.x,m.returnPoint.y],[1544,2792]);
  assert(nav.clear(m.spawn,m.returnPoint));
  assert(Math.hypot(m.spawn.x-m.returnPoint.x,m.spawn.y-m.returnPoint.y)>m.returnPoint.radius);
  for(const s of slots){
   assert.equal(s.type,type);assert(s.id.startsWith(id+'-'));assert(nav.walkable(s.x,s.y));assert(nav.path(m.spawn,s).length);
   const p=H.profile(id,s.sector,s.type,0.5);
   const xp=H.rewards(id,{...p,district:s.sector,type},p.level,.5).xp;
   assert.deepEqual(k?[p.level,p.maxHP,p.attack,p.defense,p.magicDefense,xp]:[p.level],expected[k]);
  }
 }
 assert.equal(new Set(cases.map(([id])=>JSON.stringify(w.maps[id].spawn))).size,1);
});
test('manual movement and click routes cross all eight visible bridge decks from each island arrival',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 const map=sky.worlds['skypiea-01'].map;
 const n=new MareWorld.Navigation(map,map.navigationCell);
 function traverse(start,target){
  const route=n.path(start,target);
  assert(route.length,JSON.stringify({start,target}));
  const actor={...start};
  for(const p of route){
   assert(n.clear(actor,p),JSON.stringify({actor,p}));
   n.move(actor,p.x-actor.x,p.y-actor.y);
   assert(Math.hypot(actor.x-p.x,actor.y-p.y)<.1,JSON.stringify({actor,p,start,target}));
  }
  assert(Math.hypot(actor.x-target.x,actor.y-target.y)<.1);
 }
 for(const b of data.bridgeDecks){
  const x=b.x+b.w/2,y=b.y+b.h/2,v=b.w<b.h;
  const from=v?{x,y:b.y+24}:{x:b.x+18,y},to=v?{x,y:b.y+b.h-18}:{x:b.x+b.w-18,y};
  assert(n.clear(from,to),b.id+' unobstructed deck');
  for(const [id] of cases)traverse(sky.worlds[id].map.spawn,{x,y});
  traverse(from,to);traverse(to,from);
 }
});
test('the visible opening of the golden entrance arch stays walkable, but its pillars do not',()=>{
 const n=load().originalNavigation('skypiea-01');
 assert(n.clear({x:1540,y:2616},{x:1540,y:2864}),'open stone passage');
 assert(!n.walkable(1460,2792),'left pillar');
 assert(!n.walkable(1616,2792),'right pillar');
});


test('all four arrivals reveal the full authored canvas, including non-walkable sky and prop extents',()=>{
 const sky=require('../skypiea-world.js');require('../world-system.js');
 const {Camera,coverageFor}=MareWorld;
 const receipt=require('../assets/skypiea/anjos/provenance.json');
 assert.equal(receipt.sceneSourceOpaquePixels,34287616);
 assert.equal(receipt.sceneOpaquePixelDelta,0);
 assert.equal(receipt.sceneSha256,createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',sky.data.groundUrl))).digest('hex'));
 for(const p of sky.props)assert(fs.existsSync(path.join(__dirname,'..',p.url)),p.id);

 assert.equal(new Set(sky.props.map(p=>p.id)).size,137);
 for(const [id] of cases){
  const {map}=sky.worlds[id],c=new Camera(),coverage=coverageFor(map);
  assert.deepEqual(map.spawn,{x:1554,y:2846});
  assert.deepEqual(coverage.bounds,{x:0,y:0,w:data.width,h:data.height});
  assert(coverage.exists(64,64)&&!map.terrainWalkable(64,64));
  assert(coverage.exists(1760,2800)&&!map.terrainWalkable(1760,2800));
  for(const [width,height] of [[360,780],[1114,614],[1920,1080]]){
   const zoom=1.08;
   c.width=Math.round(width/zoom);c.height=Math.round(height/zoom);c.update(map.spawn,map,0,true);
   let clip;
   c.begin({fillRect(){},save(){},translate(){},beginPath(){},rect(...r){clip=r;},clip(){}},map);
   assert(!c.masked);
   assert.deepEqual(clip,[0,0,7616,4736]);
  }
 }
});
