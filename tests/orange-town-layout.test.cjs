'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const scene=()=>require('../world-map-exports.js').get('orange');
const sectors=['cais','rua','praca','armazens','jardins'];

test('travelling to Orange Town opens the new port city and preserves five Mr3/Cabaji hunts',()=>{
 const w=load(),s=scene();
 assert.equal(s.groundUrl,'assets/orange-town/port-town/scene-hd.png','Orange Town must use the new port city painting');
 assert.equal(A.get('orange-town').area,'orange');
 assert.deepEqual(H.get('orange').sectors.map(s=>s.id),sectors);
 assert.deepEqual(B.slots('orange').map(s=>s.id),sectors.flatMap(s=>['orange-'+s+'-0','orange-'+s+'-1']));
 assert.deepEqual(B.slots('orange').map(s=>s.type),sectors.flatMap(()=>['mr3','cabaji']));
 assert.equal(H.get('orange').boss,null);
 for(const slot of B.slots('orange'))assert.equal(H.profile('orange',slot.sector,slot.type,.5).level,13);
 assert(Math.hypot(w.maps.orange.spawn.x-w.maps.orange.returnPoint.x,w.maps.orange.spawn.y-w.maps.orange.returnPoint.y)>w.maps.orange.returnPoint.radius+64);
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' starts on visible floor');
 assert(nav.walkable(to.x,to.y),label+' ends on visible floor');
 const actor={x:from.x,y:from.y},route=nav.path(actor,to);
 assert(route.length,label+' has a route');
 for(const next of route){assert(nav.clear(actor,next),label+' does not cross obstacles');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' moves through real collision code');}
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact destination');
}

test('the arrival, five sectors, ten encounters and town landmarks connect on client and server',()=>{
 const w=load(),s=scene(),map=w.maps.orange;
 assert.equal(s.groundUrl,'assets/orange-town/port-town/scene-hd.png');
 for(const [label,nav]of [['client',w.originalNavigation('orange')],['server',w.navigation('orange')]]){
  for(const p of [map.returnPoint,...s.districts,...B.slots('orange'),...map.navigationGoals])walk(nav,map.spawn,p,label+' '+p.id);
  walk(nav,s.districts.at(-1),map.returnPoint,label+' town to return');
  for(const [x,y]of [[0,0],[-16,1000],[map.width+16,1000],[map.width/2,map.height+16]])assert.equal(nav.walkable(x,y),false,label+' rejects exterior');
 }
});

test('painted boards, stone streets, building bases and seawater retain their physical materials',()=>{
 const w=load(),layout=require('../orange-town-map-data.js');
 const point=([x,y])=>({x:x*3072/1448,y:y*2304/1086});
 const floors=[['pier',[724,920],'madeira'],['quay',[724,790],'cimento'],
  ['pet shop frontage',[170,740],'cimento'],['upper stairs',[796,217],'cimento']];
 const blocked=[['west pier water',[570,935]],['east pier water',[900,935]],
  ['open sea',[724,1060]],['quay face',[500,875]],['fountain basin',[835,392]],
  ['central house base',[510,650]],['barrel beside central house',[405,662]],['warehouse base',[1331,580]],
  ['raised park wall',[1110,302]],['fenced park',[1150,200]]];
 for(const [label,p,material]of floors){const q=point(p);assert.equal(layout.surfaceAt(q.x,q.y),material,label);}
 for(const [label,p]of blocked){const q=point(p);assert.equal(layout.surfaceAt(q.x,q.y),null,label+' has no footstep material');}
 for(const [kind,nav]of [['client',w.originalNavigation('orange')],['server',w.navigation('orange')]]){
  for(const [label,p]of floors){const q=point(p);assert(nav.walkable(q.x,q.y),kind+' '+label);}
  for(const [label,p]of blocked){const q=point(p);assert.equal(nav.walkable(q.x,q.y),false,kind+' '+label);}
  const behind=point([835,326]),front=point([835,452]);
  assert.equal(nav.clear(behind,front),false,kind+' must route around the fountain basin');
  walk(nav,behind,front,kind+' around the fountain');
 }
});
