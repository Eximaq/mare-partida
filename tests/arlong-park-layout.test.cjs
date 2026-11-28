'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const source=()=>require('../world-map-exports.js').get('arlong');
const sectors=['entrada','ala-oeste','ala-leste','palacio'];
const encounterTypes=['kuroobi','chew','chew','kuroobi','kuroobi','chew','chew','kuroobi'];

test('Arlong scenery integration preserves all existing map, travel cover and boss portrait pixels',()=>{
 const originals=[
  ['assets/new-islands/arlong-map.png','59263b8f8f44de57950baad679c42ed158420ab1c1010abc8bf8c5d990ad53c1'],
  ['assets/exported-maps/arlong/map.png','f82ac9e049a0ed3609e3d185b05625f1ae0f26068a5f510254e4997f28f0acc9'],
  ['assets/ui/voyage-hd/arlong.png','300a96d20f2144be2be564940df6da51d8d24cea2d3237bd575704263eab2f59'],
  ['assets/ui/boss-dungeons/portraits/arlong.png','846957452d310a5919c1c190b2036c8f7fb7932448cf102740294f4121261c9a']
 ];
 for(const [file,hash]of originals)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});

test('travel selects the new park, arrives safely off the return trigger and retains every encounter identity',()=>{
 const w=load(),map=w.maps.arlong,scene=source(),slots=B.slots('arlong');
 assert.equal(scene.groundUrl,'assets/arlong-park/shark-palace/scene-hd.png','the playable destination must consume the new painting');
 assert.equal(scene.spriteMode,'painted');
 assert.equal(A.canTravel('arlong',30),false);assert.equal(A.canTravel('arlong',31),true);
 assert.deepEqual(A.get('arlong').recommended,[31,35]);
 assert.deepEqual(H.get('arlong').sectors.map(s=>s.id),sectors);
 assert.deepEqual(slots.map(s=>s.id),sectors.flatMap(s=>['arlong-'+s+'-0','arlong-'+s+'-1']));
 assert.deepEqual(slots.map(s=>s.type),encounterTypes);
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64,'arriving must not immediately send the player back to port');
 for(const slot of slots){
  assert.equal(H.profile('arlong',slot.sector,slot.type,.5).level,33);
  assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>200,'a patrol cannot occupy the arrival safe zone');
 }
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' begins on dry floor');
 assert(nav.walkable(to.x,to.y),label+' ends on dry floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){
  assert(nav.clear(actor,next),label+' cannot cross a pool or wall');
  nav.move(actor,next.x-actor.x,next.y-actor.y);
  assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' follows real movement');
 }
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact goal');
}

test('all patrols and the palace, pool promenades and pier remain connected in client and server navigation',()=>{
 const w=load(),map=w.maps.arlong,scene=source();
 assert(scene.goals?.some(g=>g.id==='palace-approach'),'the new palace forecourt must be reachable');
 const targets=[{id:'return',...map.returnPoint},...scene.districts,...B.slots('arlong'),...map.navigationGoals];
 for(const [label,nav]of [['client',w.originalNavigation('arlong')],['server',w.navigation('arlong')]]){
  for(const goal of targets)walk(nav,map.spawn,goal,label+' '+goal.id);
  walk(nav,scene.goals.find(g=>g.id==='palace-approach'),map.returnPoint,label+' palace to exit');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects map exterior');
 }
});

test('water, palace and wall footprints block walking while the open central avenue supports movement and combat',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 // Independent probes selected on the painting, not derived from its mask.
 for(const [label,nav]of [['client',w.originalNavigation('arlong')],['server',w.navigation('arlong')]]){
  for(const [name,x,y]of [
   ['western pool',457,655],['eastern pool',1001,655],['open sea',510,1030],
   ['palace foundation',724,418],['western perimeter',80,520],
   ['western gate foot',600,945],['eastern gate foot',843,945]
  ]){const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);}
  const north=point(724,585),south=point(724,747);
  assert(nav.clear(north,south),label+' central avenue is continuously walkable');
  assert(nav.projectileClear(north,south),label+' open avenue has no invisible projectile barrier');
  walk(nav,north,south,label+' central avenue');
  const west=point(230,655),center=point(724,655);
  assert.equal(nav.clear(west,center),false,label+' cannot take a straight shortcut through the pool');
  walk(nav,west,center,label+' route around western pool');
  assert.equal(nav.projectileClear(point(565,944),point(639,944)),false,label+' solid gate blocks shots');
 }
});

test('the complete new PNG is loaded at its actual native resolution and scenery uses its own silhouettes',()=>{
 const scene=source(),layout=require('../arlong-map-data.js');
 const bytes=fs.readFileSync(path.join(__dirname,'..',scene.groundUrl));
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1448,1086]);
 assert.deepEqual([layout.imageWidth,layout.imageHeight],[1448,1086]);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'7c46e80612a0ab93293285e5ee63cc1576640d9254bbbafee408c7a5ffb310df','copy the original PNG without resizing or recompressing it');
 for(const id of ['shark-palace','south-gate-west','south-gate-east','west-palm','east-palm'])
  assert(scene.props.some(p=>p.id==='arlong-'+id),'the '+id+' silhouette is authored');
 for(const p of scene.props){
  assert(!p.assetId,p.id+' cannot overlay an old object image');
  assert(p.polygon?.length>=3,p.id+' has a silhouette');
  assert(p.x>=0&&p.y>=0&&p.x+p.w<=3072.02&&p.y+p.h<=2304.02,p.id+' stays in the painting');
  assert(p.polygon.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=p.x-.02&&v.y>=p.y-.02&&v.x<=p.x+p.w+.02&&v.y<=p.y+p.h+.02),p.id+' stays in its source crop');
 }
});
