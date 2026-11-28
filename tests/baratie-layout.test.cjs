'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const source=()=>require('../world-map-exports.js').get('baratie');
const sectors=['entrada','salão','convés','cozinha'];
const encounterTypes=['pearl','gin','gin','pearl','pearl','gin','gin','pearl'];

test('Baratie integration preserves every existing map image and travel cover byte for byte',()=>{
 const originals=[
  ['assets/new-islands/baratie-map.png','df9cb9b5e0fbfa6c67ed146116427de357ff045890daad9bcfa1bd9681dde403'],
  ['assets/exported-maps/baratie/map.png','0b13f454582e91b0bafcab6dcdfebd2b9a9a61ad2f4a32055a079617b54c43dd'],
  ['assets/ui/voyage-hd/baratie.png','ceb5de198b1379010b32cf3fc572efc9987bc7627b4c77cd270a6907620d722c']
 ];
 for(const [file,hash]of originals)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});

test('travel consumes the new floating restaurant without changing access, accented sector IDs or encounters',()=>{
 const w=load(),map=w.maps.baratie,scene=source(),slots=B.slots('baratie');
 assert.equal(scene.groundUrl,'assets/baratie/floating-restaurant/scene-hd.png','the playable Baratie must consume its new painting');
 assert.equal(scene.spriteMode,'painted');
 assert.equal(A.canTravel('baratie',25),false);assert.equal(A.canTravel('baratie',26),true);
 assert.deepEqual(A.get('baratie').recommended,[26,30]);
 assert.deepEqual(H.get('baratie').sectors.map(s=>s.id),sectors);
 assert.deepEqual(slots.map(s=>s.id),sectors.flatMap(s=>['baratie-'+s+'-0','baratie-'+s+'-1']));
 assert.deepEqual(slots.map(s=>s.type),encounterTypes);
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64,'arrival must be separated from the return trigger');
 for(const slot of slots){
  assert.equal(H.profile('baratie',slot.sector,slot.type,.5).level,28);
  assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>200,'patrols stay outside the arrival safe zone');
 }
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' begins on dry floor');
 assert(nav.walkable(to.x,to.y),label+' ends on dry floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){
  assert(nav.clear(actor,next),label+' cannot cross sea or furniture');
  nav.move(actor,next.x-actor.x,next.y-actor.y);
  assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' follows real movement');
 }
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact goal');
}

test('dining hall, kitchen, fighting platforms and return connect through real client and server routes',()=>{
 const w=load(),map=w.maps.baratie,scene=source();
 assert(scene.goals?.some(g=>g.id==='galley-approach'),'the exposed kitchen must be a reachable destination');
 const targets=[{id:'return',...map.returnPoint},...scene.districts,...B.slots('baratie'),...map.navigationGoals];
 for(const [label,nav]of [['client',w.originalNavigation('baratie')],['server',w.navigation('baratie')]]){
  for(const goal of targets)walk(nav,map.spawn,goal,label+' '+goal.id);
  walk(nav,scene.goals.find(g=>g.id==='galley-approach'),map.returnPoint,label+' kitchen to exit');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('sea, fish hull, tables and mooring posts block movement while the real doorways stay open',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 // Probes are chosen on the painting independently of the generated mask.
 for(const [label,nav]of [['client',w.originalNavigation('baratie')],['server',w.navigation('baratie')]]){
  for(const [name,x,y]of [
   ['sea west of gangway',510,850],['sea east of gangway',950,850],
   ['sea below landing',724,1066],['fish head',130,365],['fish tail',1330,330],
   ['northwest dining table',365,372],['southeast dining table',646,455],
   ['cooking range',984,353],['dining front wall',630,525],
   ['western mooring post',345,673],['eastern mooring post',1104,673]
  ]){const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);}
  for(const [name,a,b]of [
   ['open fighting deck',[450,599],[990,599]],
   ['dining doorway',[510,390],[510,586]],
   ['galley doorway',[974,416],[974,586]]
  ]){
   const from=point(...a),to=point(...b);
   assert(nav.clear(from,to),label+' '+name+' has no invisible movement barrier');
   assert(nav.projectileClear(from,to),label+' '+name+' has no invisible shot barrier');
   walk(nav,from,to,label+' '+name);
  }
  const wing=point(270,700),landing=point(724,995);
  assert.equal(nav.clear(wing,landing),false,label+' cannot cut across the sea');
  walk(nav,wing,landing,label+' follows the deck and gangway instead');
  assert.equal(nav.projectileClear(point(326,673),point(366,673)),false,label+' solid post stops shots');
 }
});

test('the complete native PNG and painted restaurant silhouettes are used without modifying existing artwork',()=>{
 const scene=source(),layout=require('../baratie-map-data.js');
 const bytes=fs.readFileSync(path.join(__dirname,'..',scene.groundUrl));
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1448,1086]);
 assert.deepEqual([layout.imageWidth,layout.imageHeight],[1448,1086]);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'20861fafc5afa5287390a2436a43dee7c1fd8cd2c9e97624c1d58aedf1a5cb92');
 for(const id of ['restaurant-house','fish-head','fish-tail','dining-table-sw','galley-range','west-mooring-post','east-mooring-post'])
  assert(scene.props.some(p=>p.id==='baratie-'+id),'the '+id+' silhouette is authored');
 for(const p of scene.props){
  assert(!p.assetId,p.id+' cannot overlay an old scenery sprite');
  assert(p.polygon?.length>=3,p.id+' has a silhouette');
  assert(p.x>=0&&p.y>=0&&p.x+p.w<=3072.02&&p.y+p.h<=2304.02,p.id+' stays in the painting');
  assert(p.polygon.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=p.x-.02&&v.y>=p.y-.02&&v.x<=p.x+p.w+.02&&v.y<=p.y+p.h+.02),p.id+' stays in its source crop');
 }
});

test('click routes reach the visible floor immediately in front of both tall mooring posts',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 // These exact visible floor points exposed a walkable target whose A* cell
 // center was clipped by the old deck edge. Do not snap the expected target.
 for(const [label,nav]of [['client',w.originalNavigation('baratie')],['server',w.navigation('baratie')]]){
  for(const x of [346,1104])walk(nav,point(x,635),point(x,694),label+' mooring post '+x);
 }
});
