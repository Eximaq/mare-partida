'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const source=()=>require('../world-map-exports.js').get('syrup');
const sectors=['entrada','vila-baixa','praça','bosque'];
const encounterTypes=['sham','buchi','buchi','sham','sham','buchi','buchi','sham'];

test('Syrup integration preserves every existing map image and travel cover byte for byte',()=>{
 const originals=[
  ['assets/new-islands/syrup-map.png','e4f8d714f4b9047727a483a5a6fef98736c9879498e118dac78a0c195332672a'],
  ['assets/exported-maps/syrup/map.png','3188b90071a00b3132c7269cadb65d8a992950a7140f0d385bec44ea364b610a'],
  ['assets/ui/voyage-hd/syrup.png','0a0de02524f5b8466bc92407fc83411a2fda1dd6fc81bfab48408ce66b014cd4']
 ];
 for(const [file,hash]of originals)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});

test('travel consumes the new coastal village without changing access, accented sector IDs or encounters',()=>{
 const w=load(),map=w.maps.syrup,scene=source(),slots=B.slots('syrup');
 assert.equal(scene.groundUrl,'assets/syrup-village/coastal-village/scene-hd.png','the playable Syrup must consume its new painting');
 assert.equal(scene.spriteMode,'painted');
 assert.equal(A.canTravel('syrup',20),false);assert.equal(A.canTravel('syrup',21),true);
 assert.deepEqual(A.get('syrup').recommended,[21,25]);
 assert.deepEqual(H.get('syrup').sectors.map(s=>s.id),sectors);
 assert.deepEqual(slots.map(s=>s.id),sectors.flatMap(s=>['syrup-'+s+'-0','syrup-'+s+'-1']));
 assert.deepEqual(slots.map(s=>s.type),encounterTypes);
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64,'arrival must be separated from the return trigger');
 for(const slot of slots){
  assert.equal(H.profile('syrup',slot.sector,slot.type,.5).level,23);
  assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>200,'patrols stay outside the arrival safe zone');
 }
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' begins on dry floor');
 assert(nav.walkable(to.x,to.y),label+' ends on dry floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){
  assert(nav.clear(actor,next),label+' cannot cross sea, cliffs or solid structures');
  nav.move(actor,next.x-actor.x,next.y-actor.y);
  assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' follows real movement');
 }
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact goal');
}

test('village, square, grove, mansion approach and return connect through real client and server routes',()=>{
 const w=load(),map=w.maps.syrup,scene=source();
 assert(scene.goals?.some(g=>g.id==='kaya-gate'),'the mansion gate must be a reachable destination');
 const targets=[{id:'return',...map.returnPoint},...scene.districts,...B.slots('syrup'),...map.navigationGoals];
 for(const [label,nav]of [['client',w.originalNavigation('syrup')],['server',w.navigation('syrup')]]){
  for(const goal of targets)walk(nav,map.spawn,goal,label+' '+goal.id);
  walk(nav,scene.goals.find(g=>g.id==='kaya-gate'),map.returnPoint,label+' mansion gate to exit');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('sea, cliff faces, cottages and the well are solid while the southern road and open gate stay clear',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 // Independent landmarks selected on the painting, not from generated rows.
 for(const [label,nav]of [['client',w.originalNavigation('syrup')],['server',w.navigation('syrup')]]){
  for(const [name,x,y]of [
   ['western sea',130,1005],['eastern sea',1230,1015],['water beside pier',610,1015],
   ['western cliff face',400,822],['eastern cliff face',1100,790],
   ['tavern foundation',290,445],['slate cottage foundation',147,590],
   ['thatched cottage foundation',470,600],['mansion foundation',800,200],
   ['well and water',554,418],['square tree trunk',953,509],
   ['western gatepost',692,323],['eastern gatepost',903,323]
  ]){const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);}
  for(const [name,a,b]of [
   ['southern cliff road',[724,865],[724,680]],
   ['open mansion gate',[798,365],[798,242]],
   ['village square',[661,476],[820,476]]
  ]){
   const from=point(...a),to=point(...b);
   assert(nav.clear(from,to),label+' '+name+' has no invisible movement barrier');
   assert(nav.projectileClear(from,to),label+' '+name+' has no invisible shot barrier');
   walk(nav,from,to,label+' '+name);
  }
  assert.equal(nav.clear(point(313,650),point(724,870)),false,label+' cannot cut across the vertical cliff');
  assert.equal(nav.projectileClear(point(520,419),point(601,419)),false,label+' well blocks shots');
 }
});

test('both gateposts and the square tree can be walked around to exact visible floor positions',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 for(const [label,nav]of [['client',w.originalNavigation('syrup')],['server',w.navigation('syrup')]]){
  for(const [id,x,back,front]of [['west-gate',692,287,351],['east-gate',903,287,351],['square-tree',953,464,545]])
   walk(nav,point(x,back),point(x,front),label+' around '+id);
 }
});

test('the complete native PNG and painted village silhouettes are used without replacing old images',()=>{
 const scene=source(),layout=require('../syrup-map-data.js');
 const bytes=fs.readFileSync(path.join(__dirname,'..',scene.groundUrl));
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1448,1086]);
 assert.deepEqual([layout.imageWidth,layout.imageHeight],[1448,1086]);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'32528120a20ef291ad7e32498db928889fe1dbe68eab584eb7e6db1381050920');
 for(const id of ['kaya-mansion','village-tavern','village-well','square-oak','kaya-gate-west','kaya-gate-east'])
  assert(scene.props.some(p=>p.id==='syrup-'+id),'the '+id+' silhouette is authored');
 for(const p of scene.props){
  assert(!p.assetId,p.id+' cannot overlay an old scenery sprite');
  assert(p.polygon?.length>=3,p.id+' has a silhouette');
  assert(p.x>=0&&p.y>=0&&p.x+p.w<=3072.02&&p.y+p.h<=2304.02,p.id+' stays in the painting');
  assert(p.polygon.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=p.x-.02&&v.y>=p.y-.02&&v.x<=p.x+p.w+.02&&v.y<=p.y+p.h+.02),p.id+' stays in its source crop');
 }
});

test('tight visible clearances accept exact click targets after a detour, including the return from the square',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 // A physically free target must also have an accessible final navigation
 // cell. Starting from the square exposes the pier case hidden by a direct
 // line from spawn; do not snap or replace these independently chosen goals.
 for(const [label,nav]of [['client',w.originalNavigation('syrup')],['server',w.navigation('syrup')]]){
  for(const [id,x,y]of [['west-post-back',696,302],['east-post-back',903,302],
   ['west-gate-leaf',759,313],['oak-east',995,506],['grove-fence',1340,551]])
   walk(nav,w.maps.syrup.spawn,point(x,y),label+' '+id);
  walk(nav,point(737,466),point(740,990),label+' square to inner pier edge');
 }
});
