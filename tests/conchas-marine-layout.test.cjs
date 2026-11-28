'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const scene=()=>require('../world-map-exports.js').get('conchas');
const sectors=['areia-sul','caminho-central','ruas-do-porto','praca-das-conchas'];

test('travelling to Shells Town opens the Marine courtyard and preserves the four Helmeppo hunts',()=>{
 const w=load(),s=scene();
 assert.equal(s.groundUrl,'assets/conchas-marine/shells-town/scene-hd.png','Conchas must use the new Marine courtyard painting');
 assert.equal(A.get('conchas').area,'swamp');
 assert.deepEqual(H.get('swamp').sectors.map(s=>s.id),sectors);
 assert.deepEqual(B.slots('swamp').map(s=>s.id),sectors.flatMap(s=>['swamp-'+s+'-0','swamp-'+s+'-1']));
 assert.deepEqual(B.slots('swamp').map(s=>s.type),Array(8).fill('helmeppo'));
 assert.equal(H.get('swamp').boss,null);
 for(const slot of B.slots('swamp'))assert.equal(H.profile('swamp',slot.sector,slot.type,.5).level,8);
 assert(Math.hypot(w.maps.conchas.spawn.x-w.maps.conchas.returnPoint.x,w.maps.conchas.spawn.y-w.maps.conchas.returnPoint.y)>w.maps.conchas.returnPoint.radius+64);
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' starts on visible floor');
 assert(nav.walkable(to.x,to.y),label+' ends on visible floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){assert(nav.clear(actor,next),label+' does not cross obstacles');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' moves through real collision code');}
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact destination');
}

test('the arrival, four sectors, eight encounters and courtyard landmarks connect on client and server',()=>{
 const w=load(),s=scene(),map=w.maps.conchas;
 assert.equal(s.groundUrl,'assets/conchas-marine/shells-town/scene-hd.png');
 for(const [label,nav]of [['client',w.originalNavigation('conchas')],['server',w.navigation('conchas')]]){
  for(const p of [map.returnPoint,...s.districts,...B.slots('swamp'),...map.navigationGoals])walk(nav,map.spawn,p,label+' '+p.id);
  walk(nav,s.districts.at(-1),map.returnPoint,label+' courtyard to return');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('the Marine walls, houses, sea and cross base block movement while both sides of Zoro remain open',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 for(const [label,nav]of [['client',w.originalNavigation('conchas')],['server',w.navigation('conchas')]]){
  for(const [name,x,y]of [['sea',250,1030],['quay face',500,985],
    ['headquarters foundation',724,310],['cross and boots',724,518],
    ['west perimeter wall',400,765],['east perimeter wall',1100,765],['town house',498,919]]){
   const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);
  }
  const behind=point(724,489),front=point(724,553);
  assert.equal(nav.clear(behind,front),false,label+' cannot cross the solid base');
  assert.equal(nav.projectileClear(behind,front),false,label+' projectiles respect the post');
  let from=w.maps.conchas.spawn;
  for(const [x,y]of [[724,744],[656,516],[724,489],[791,516],[724,553],[724,1048]]){
   const to=point(x,y);walk(nav,from,to,label+' continuous gate/cross/pier route');from=to;
  }
 }
});

test('the pier excludes blue water beside its supports and keeps both board edges connected',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 for(const [label,nav]of [['client',w.originalNavigation('conchas')],['server',w.navigation('conchas')]]){
  const water=point(617,1020);
  assert.equal(nav.walkable(water.x,water.y),false,label+' rejects the visible water beside the west post');
  let from=point(194,947);
  for(const to of [point(644,1030),point(804,1030),w.maps.conchas.returnPoint,point(1246,947),point(724,744)]){
   walk(nav,from,to,label+' pier boards to town and gate');from=to;
  }
 }
});
