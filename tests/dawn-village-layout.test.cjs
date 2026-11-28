'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const scene=()=>require('../world-map-exports.js').get('dawn');
const sectors=['cais','corsarios','estaleiro','mercado','ancoras','farol','caldeira'];

test('travelling to Dawn loads Foosha while preserving the seven hunts and existing encounter identities',()=>{
 const w=load(),s=scene();
 assert.equal(s.groundUrl,'assets/dawn-village/foosha/scene-hd.png','Dawn must use the new Foosha painting');
 assert.equal(A.get('dawn').area,'beach');
 assert.deepEqual(H.get('beach').sectors.map(s=>s.id),sectors);
 assert.deepEqual(B.slots('beach').map(s=>s.id),[...sectors.flatMap(s=>['beach-'+s+'-0','beach-'+s+'-1']),'beach-boss']);
 assert.deepEqual(B.slots('beach').filter(s=>!s.boss).map(s=>s.type),Array(14).fill('cesar'));
 assert.equal(H.get('beach').bossLevel,5);assert.equal(H.get('beach').firstGold,300);
 for(const s of B.slots('beach').filter(s=>!s.boss))assert.equal(H.profile('beach',s.sector,s.type,.5).level,5);
 assert(Math.hypot(w.maps.dawn.spawn.x-w.maps.dawn.returnPoint.x,w.maps.dawn.spawn.y-w.maps.dawn.returnPoint.y)>w.maps.dawn.returnPoint.radius+64);
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' starts on visible dry ground');
 assert(nav.walkable(to.x,to.y),label+' ends on visible dry ground');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){assert(nav.clear(actor,next),label+' does not cross obstacles');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' moves through the real collision code');}
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches its exact destination');
}

test('all seven village sectors, fourteen encounters, boss and return pier connect on client and server',()=>{
 const w=load(),s=scene(),map=w.maps.dawn;
 assert.equal(s.groundUrl,'assets/dawn-village/foosha/scene-hd.png');
 for(const [label,nav]of [['client',w.originalNavigation('dawn')],['server',w.navigation('dawn')]]){
  for(const p of [map.returnPoint,...s.districts,...B.slots('beach'),...map.navigationGoals])walk(nav,map.spawn,p,label+' '+p.id);
  walk(nav,s.districts.at(-1),map.returnPoint,label+' north village to return');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('Foosha keeps the ocean, cliff faces, tree roots and building foundations outside navigation',()=>{
 const w=load(),point=(x,y)=>({x:x*3072/1448,y:y*2304/1086});
 for(const [label,nav]of [['client',w.originalNavigation('dawn')],['server',w.navigation('dawn')]]){
  for(const [name,x,y]of [['ocean',1000,1000],['coastal cliff',493,865],
   ['west windmill foundation',260,325],['bar foundation',300,535],
   ['east cottage foundation',1296,610],['dense northern forest',800,80],['tree roots',473,354]]){
   const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,label+' blocks '+name);
  }
  for(const [name,x,y]of [['pier',724,980],['plaza',724,520],['village street',800,400]]){
   const p=point(x,y);assert(nav.walkable(p.x,p.y),label+' opens '+name);
  }
  const behind=point(300,480),front=point(300,590);
  assert.equal(nav.clear(behind,front),false,label+' cannot walk through the bar');
  assert.equal(nav.projectileClear(behind,front),false,label+' cannot shoot through the bar');
  walk(nav,point(473,326),point(473,377),label+' walks around the tree');
 }
});

test('a click beside the north garden fence reaches the exact point through real movement',()=>{
 const w=load(),target={x:555*3072/1448,y:341*2304/1086};
 for(const [label,nav]of [['client',w.originalNavigation('dawn')],['server',w.navigation('dawn')]]){
  walk(nav,w.maps.dawn.spawn,target,label+' north garden fence');
  walk(nav,target,w.maps.dawn.returnPoint,label+' north garden fence to pier');
 }
});

test('the northeast woodland road stays connected through its bend in both directions',()=>{
 const w=load();
 for(const [label,nav]of [['client',w.originalNavigation('dawn')],['server',w.navigation('dawn')]]){
  for(const [x,y]of [[1324,135],[1344,154],[1365,175],[1376,216],[1359,103]]){
   const target={x:x*3072/1448,y:y*2304/1086};
   walk(nav,w.maps.dawn.spawn,target,label+' northeast road '+x+','+y);
   walk(nav,target,w.maps.dawn.returnPoint,label+' northeast road return '+x+','+y);
  }
 }
});
