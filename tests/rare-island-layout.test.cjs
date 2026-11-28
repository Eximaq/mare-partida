'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const source=()=>require('../world-map-exports.js').get('rare');
const sectors=['entrada','subbosque','mata-fechada','copa-antiga'];

test('Rare island preserves its original map and travel cover byte for byte',()=>{
 const originals=[
  ['assets/new-islands/rare-map.png','b2044dbb4ea3815d4b2696cf0b7e3858d64e9a3eb324b31f6fd2e83b0eb07492'],
  ['assets/ui/voyage-hd/animais-raros.png','e9173c4604a621768fd7f7b59b634c0f96678bc2f3c8bcf931670b387598a671']
 ];
 for(const [file,hash]of originals)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});

test('the sea, cliff, rock summit and roots stay solid while the visible forest paths remain open',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1447,y:y*2304/1087});
 for(const [label,nav]of [['client',w.originalNavigation('rare')],['server',w.navigation('rare')]]){
  // These independent landmarks were selected on the original painting
  // before authoring the navigation mask or physical footprints.
  for(const [name,x,y]of [['sea',240,1020],['east cliff',1210,850],
   ['vertical treasure rock',714,405],['inaccessible summit',716,151],
   ['ancient tree roots',1274,277],['southern palm roots',881,700]]){
   const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);
  }
  for(const [name,x,y]of [['western trail',479,419],['eastern trail',923,458]]){
   const p=point(x,y);assert(nav.walkable(p.x,p.y),label+' opens '+name);
  }
  for(const [name,a,b]of [['clearings',[300,493],[1156,494]],
   ['ancient tree',[1159,219],[1195,329]],['southern palm',[880,665],[880,730]]]){
   walk(nav,point(...a),point(...b),label+' '+name);
   walk(nav,point(...b),point(...a),label+' reverse '+name);
  }
  assert.equal(nav.clear(point(479,419),point(923,458)),false,label+' cannot cut through the cliff face');
  assert.equal(nav.projectileClear(point(479,419),point(923,458)),false,label+' cannot shoot through the cliff face');
 }
});

test('animais-raros travel consumes the new wild island while preserving gate, sectors and Cocox encounters',()=>{
 const w=load(),map=w.maps.rare,scene=source(),slots=B.slots('rare');
 assert(scene,'rare must register its new painted scene');
 assert.equal(scene.groundUrl,'assets/rare-animals/gaimon-island/scene-hd.png');
 assert.equal(scene.spriteMode,'painted');
 assert.equal(A.canTravel('animais-raros',15),false);assert.equal(A.canTravel('animais-raros',16),true);
 assert.equal(A.get('animais-raros').area,'rare');assert.deepEqual(A.get('animais-raros').recommended,[16,20]);
 assert.deepEqual(H.get('rare').sectors.map(s=>s.id),sectors);
 assert.deepEqual(slots.map(s=>s.id),sectors.flatMap(s=>['rare-'+s+'-0','rare-'+s+'-1']));
 assert.deepEqual(slots.map(s=>s.type),Array(8).fill('cocox'));
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64,'arrival stays outside the return trigger');
 for(const slot of slots){
  assert.equal(H.profile('rare',slot.sector,slot.type,.5).level,18);
  assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>200,'Cocox stay outside the arrival safe zone');
 }
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' begins on dry floor');
 assert(nav.walkable(to.x,to.y),label+' ends on dry floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){
  assert(nav.clear(actor,next),label+' cannot cross water, rock walls or solid roots');
  nav.move(actor,next.x-actor.x,next.y-actor.y);
  assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' follows real movement');
 }
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact goal');
}

test('the renderer uses the actual native PNG and authored island silhouettes without old overlays',()=>{
 const scene=source(),layout=require('../rare-animals-map-data.js');
 const bytes=fs.readFileSync(path.join(__dirname,'..',scene.groundUrl));
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1447,1087]);
 assert.deepEqual([layout.imageWidth,layout.imageHeight],[1447,1087]);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'c93dae2dfb9a199941c0e38bfcbaf191b8bc3ca4c35942d9ed13bd98c00012e5');
 assert.equal(layout.scaleX,3072/1447);assert.equal(layout.scaleY,2304/1087);
 for(const id of ['treasure-rock','ancient-tree','south-palm','west-glade-palm','cove-palm'])
  assert(scene.props.some(p=>p.id==='rare-'+id),'the '+id+' silhouette is authored');
 for(const p of scene.props){
  assert(!p.assetId,p.id+' cannot overlay an old scenery sprite');
  assert(p.polygon?.length>=3,p.id+' has a silhouette');
  assert(p.x>=0&&p.y>=0&&p.x+p.w<=3072.02&&p.y+p.h<=2304.02,p.id+' stays in the painting');
  assert(p.polygon.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=p.x-.02&&v.y>=p.y-.02&&v.x<=p.x+p.w+.02&&v.y<=p.y+p.h+.02),p.id+' stays in its source crop');
 }
});

test('all four clearings, both sides of the treasure rock and the landing connect on client and server',()=>{
 const w=load(),map=w.maps.rare,scene=source();
 assert(scene?.goals?.some(g=>g.id==='treasure-rock-west'),'the western side of the treasure rock must be explored');
 assert(scene.goals.some(g=>g.id==='treasure-rock-east'));
 const targets=[{id:'return',...map.returnPoint},...scene.districts,...B.slots('rare'),...map.navigationGoals];
 for(const [label,nav]of [['client',w.originalNavigation('rare')],['server',w.navigation('rare')]]){
  for(const goal of targets)walk(nav,map.spawn,goal,label+' '+goal.id);
  walk(nav,scene.goals.find(g=>g.id==='treasure-rock-west'),scene.goals.find(g=>g.id==='treasure-rock-east'),label+' around the rock');
  walk(nav,scene.districts.at(-1),map.returnPoint,label+' forest to landing');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});
