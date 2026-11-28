'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
require('../world-system.js');
const sectors=['entrada','mercado','praca','bairro','palacio'];
const specs=[['alubarna-01',50,55,'puppu',53],['alubarna-02',55,60,'valentine',58],
 ['alubarna-03',60,65,'merry',63],['alubarna-04',65,70,'doublefinger',68],['alubarna-05',70,75,'mr1',75]];
const point=([x,y])=>({x:x*3072/1448,y:y*2304/1086});

test('all five Alubarna destinations open the city painting and retain independent encounters and access levels',()=>{
 const w=load(),exports=require('../world-map-exports.js');
 for(const [id,min,max,type,level]of specs){
  const s=exports.get(id),map=w.maps[id];
  assert.equal(s.groundUrl,'assets/alubarna-city/royal-capital/scene-hd.png');
  assert(A.canTravel(id,min));assert(!A.canTravel(id,min-1));
  assert.deepEqual(A.get(id).recommended,[min,max]);
  assert.deepEqual(H.get(id).sectors.map(s=>s.id),sectors);
  assert.deepEqual(B.slots(id).map(s=>s.id),sectors.flatMap((s,i)=>[id+'-'+s+'-'+i*2,id+'-'+s+'-'+(i*2+1)]));
  assert(B.slots(id).every(s=>s.type===type));
  for(const slot of B.slots(id))assert.equal(H.profile(id,slot.sector,slot.type,.5).level,level);
  for(const d of s.districts){
   for(const actual of [H.get(id).sectors.find(p=>p.id===d.id),globalThis.MareAlubarna.worlds[id].districts.find(p=>p.id===d.id)])
    assert.deepEqual([actual.x,actual.y],[d.x,d.y]);
  }
  assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64);
 }
});

function walk(nav,from,to,label){
 assert(nav.walkable(from.x,from.y),label+' starts on floor');
 assert(nav.walkable(to.x,to.y),label+' ends on floor');
 const actor={...from},route=nav.path(actor,to);assert(route.length,label+' has a route');
 for(const next of route){assert(nav.clear(actor,next),label+' avoids solids');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' can actually move');}
 assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches exact coordinates');
}

test('arrival, return, five sectors and ten encounters are reachable in every city instance',()=>{
 const w=load(),exports=require('../world-map-exports.js');
 for(const [id]of specs){
  const map=w.maps[id],s=exports.get(id);
  assert.equal(s.groundUrl,'assets/alubarna-city/royal-capital/scene-hd.png');
  for(const [kind,nav]of [['client',w.originalNavigation(id)],['server',w.navigation(id)]]){
   for(const goal of [map.returnPoint,...s.districts,...B.slots(id),...map.navigationGoals])walk(nav,map.spawn,goal,id+' '+kind+' '+goal.id);
   walk(nav,s.districts.at(-1),map.returnPoint,id+' '+kind+' return');
  }
 }
});

test('the south arch and palace stairs are open while stone piers, garden beds and clock tower remain solid',()=>{
 const w=load();
 const floor=[['central square',[724,550]],['south arch opening',[724,900]],['southern approach',[724,1000]],
  ['palace stairs',[724,340]],['palace landing',[724,295]],['east staircase',[1198,235]],['market street',[270,525]]];
 const blocked=[['west gate pier',[650,921]],['east gate pier',[799,921]],['clock tower foot',[1320,697]],
  ['west palace garden',[523,365]],['east palace garden',[922,365]],['west palace balustrade',[601,380]],
  ['outer city wall',[340,960]],['palace door',[724,270]],['outside the bridge',[1140,1030]]];
 for(const [kind,nav]of [['client',w.originalNavigation('alubarna-01')],['server',w.navigation('alubarna-01')]]){
  for(const [label,p]of floor){const q=point(p);assert(nav.walkable(q.x,q.y),kind+' '+label);}
  for(const [label,p]of blocked){const q=point(p);assert.equal(nav.walkable(q.x,q.y),false,kind+' '+label);}
  walk(nav,point([724,1000]),point([724,700]),kind+' through the gate');
  walk(nav,point([724,440]),point([724,295]),kind+' up the palace stairs');
 }
});
