'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
require('../world-system.js');
const scene=()=>require('../world-map-exports.js').get('alabasta');
const sectors=['entrada','oeste','norte','leste','sul'];

test('travelling to Alabasta opens the new desert and preserves its five Bananawani hunts',()=>{
 const w=load(),s=scene(),map=w.maps.alabasta;
 assert.equal(s?.groundUrl,'assets/alabasta-desert/sand-sea/scene-hd.png','the desert must select the new HD painting');
 assert.equal(A.get('alabasta-desert').area,'alabasta');
 assert(A.canTravel('alabasta-desert',40));assert(!A.canTravel('alabasta-desert',39));
 assert.deepEqual(A.get('alabasta-desert').recommended,[40,50]);
 assert.deepEqual(H.get('alabasta').sectors.map(s=>s.id),sectors);
 assert.deepEqual(B.slots('alabasta').map(s=>s.id),sectors.flatMap(s=>['alabasta-'+s+'-0','alabasta-'+s+'-1']));
 assert(B.slots('alabasta').every(s=>s.type==='bananawani'));
 assert.equal(H.get('alabasta').boss,null);
 for(const slot of B.slots('alabasta'))assert.equal(H.profile('alabasta',slot.sector,slot.type,.5).level,45);
 for(const district of s.districts){
  for(const actual of [H.get('alabasta').sectors.find(p=>p.id===district.id),globalThis.MareAlabasta.districts.find(p=>p.id===district.id)])
   assert.deepEqual([actual.x,actual.y],[district.x,district.y],'hunt and map anchors must follow the new painting');
 }
 const r=globalThis.MareAlabasta.returnPoint;
 assert.deepEqual([r.id,r.x,r.y,r.radius],[map.returnPoint.id,map.returnPoint.x,map.returnPoint.y,map.returnPoint.radius]);
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64);
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' starts on visible floor');
 assert(nav.walkable(to.x,to.y),label+' ends on visible floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){assert(nav.clear(actor,next),label+' does not cross obstacles');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' moves through real collision code');}
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact destination');
}

test('the desert arrival, five sectors, ten encounters and landmarks connect on client and server',()=>{
 const w=load(),s=scene(),map=w.maps.alabasta;
 assert.equal(s?.groundUrl,'assets/alabasta-desert/sand-sea/scene-hd.png');
 for(const [label,nav]of [['client',w.originalNavigation('alabasta')],['server',w.navigation('alabasta')]]){
  for(const p of [map.returnPoint,...s.districts,...B.slots('alabasta'),...map.navigationGoals])walk(nav,map.spawn,p,label+' '+p.id);
  walk(nav,s.districts.at(-1),map.returnPoint,label+' desert to return');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('oasis water and solid stone bases block feet while the temple and shrine gaps remain open',()=>{
 const w=load(),point=([x,y])=>({x:x*3072/1448,y:y*2304/1086});
 const floors=[['temple court',[710,225]],['temple entrance',[710,300]],
  ['shrine doorway',[544,696]],['west shrine route',[370,690]],['east shrine route',[720,690]]];
 const blocked=[['oasis water',[300,490]],['shallow wet edge',[288,542]],
  ['northwest oasis stone',[258,462]],['northeast oasis stone',[376,462]],['southern oasis stone',[255,557]],
  ['narrow oasis root bed',[224,471]],['isolated sandstone block',[1016,384]],
  ['temple pillar foot',[550,282]],['shrine pillar foot',[474,728]],
  ['western palm foot',[202,460]],['eastern rock base',[893,491]],['outer cliff',[1320,848]]];
 for(const [kind,nav]of [['client',w.originalNavigation('alabasta')],['server',w.navigation('alabasta')]]){
  for(const [label,p]of floors){const q=point(p);assert(nav.walkable(q.x,q.y),kind+' '+label);}
  for(const [label,p]of blocked){const q=point(p);assert.equal(nav.walkable(q.x,q.y),false,kind+' '+label);}
  const behind=point([550,245]),front=point([550,319]);
  assert.equal(nav.clear(behind,front),false,kind+' must route around the stone pillar');
  walk(nav,behind,front,kind+' around the pillar');
  walk(nav,point([543,667]),point([543,750]),kind+' through the shrine');
 }
});
