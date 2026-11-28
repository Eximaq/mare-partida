'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs'),exportsData=require('../world-map-exports.js');
const L=require('../late-archipelago-world.js'),B=require('../monster-behavior.js'),H=require('../hunt-system.js');
const point=([x,y])=>({x:x*3072/1448,y:y*2304/1086});
const specs=[['marineford-01',151,'squard'],['marineford-02',156,'onigumo'],
  ['marineford-03',161,'little-oars-jr'],['marineford-04',166,'izo'],
  ['marineford-05',171,'vista'],['marineford-06',176,'jozu']];
const sectors=['north-courtyard','north-courtyard','north-courtyard','west-courtyard','west-courtyard','east-courtyard'];
function walk(nav,from,to,label){
  assert(nav.walkable(from.x,from.y),label+' starts on floor');
  assert(nav.walkable(to.x,to.y),label+' ends on floor');
  const actor={...from},route=nav.path(actor,to);assert(route.length,label+' is connected');
  for(const next of route){assert(nav.clear(actor,next),label+' avoids solids');nav.move(actor,next.x-actor.x,next.y-actor.y);assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' can move');}
  assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches its destination');
}
test('the weekly arena and all six hunts select the same HD painting with distinct travel contracts',()=>{
  const w=load(),source=exportsData.get('marineford');
  assert.equal(source.groundUrl,'assets/marineford/naval-headquarters/scene-hd.png');
  assert.equal(source.spriteMode,'painted');
  assert.deepEqual([w.maps.marineford.width,w.maps.marineford.height],[3072,2304]);
  assert.equal(w.maps.marineford.returnPoint,undefined);
  assert.equal(w.maps.marineford.interactions.length,0);assert.equal(w.maps.marineford.safeZones.length,0);
  for(const [id,min,type]of specs){
    assert.equal(exportsData.get(id),source);assert.equal(L.worlds[id].spec.min,min);
    assert.deepEqual(B.slots(id).map(p=>[p.id,p.type,p.sector]),sectors.map((sector,i)=>[id+'-'+i,type,sector]));
    const map=w.maps[id];assert.deepEqual({...map.spawn},{x:1536,y:1824});
    assert.deepEqual({...map.returnPoint},{id:'return',x:1536,y:2112,radius:40});
    assert.deepEqual(JSON.parse(JSON.stringify(map.interactions)),[{id:'return',x:1536,y:2112,radius:40}]);
    assert.deepEqual(JSON.parse(JSON.stringify(map.safeZones)),[{x:1536,y:1824,radius:160}]);
    for(const d of source.districts){const h=H.get(id).sectors.find(p=>p.id===d.id);assert.deepEqual([h.x,h.y],[d.x,d.y]);}
  }
});
test('both navigation engines connect the arrival, 36 encounter slots, districts and return',()=>{
  const w=load();
  for(const [id]of specs){
    const map=w.maps[id];
    for(const [kind,nav]of [['client',w.originalNavigation(id)],['server',w.navigation(id)]])
      for(const p of [map.returnPoint,...B.slots(id),...L.worlds[id].districts,...map.navigationGoals])walk(nav,map.spawn,p,id+' '+kind+' '+p.id);
  }
});
test('the plaza, quay and platform stairs follow the painting while water, cannons and supports remain solid',()=>{
  const w=load(),floor=[['plaza',[724,600]],['west plaza',[400,540]],['east plaza',[1048,540]],
    ['southern quay',[724,1015]],['platform stair',[724,402]],['platform deck',[724,356]],['HQ stair',[724,284]]];
  const blocked=[['west sea',[80,700]],['east sea',[1380,700]],['west wall',[135,548]],
    ['northwest supplies',[225,360]],['northeast supplies',[1227,360]],
    ['southwest cannon tower',[320,860]],['southeast cannon tower',[1130,860]],
    ['platform supports',[640,400]],['HQ door',[724,238]],['quay west parapet',[566,984]]];
  for(const [kind,nav]of [['client',w.originalNavigation('marineford')],['server',w.navigation('marineford')]]){
    for(const [label,p]of floor){const q=point(p);assert(nav.walkable(q.x,q.y),kind+' '+label);walk(nav,point([724,600]),q,kind+' '+label);}
    for(const [label,p]of blocked){const q=point(p);assert.equal(nav.walkable(q.x,q.y),false,kind+' '+label);}
  }
});
test('the official weekly boss can activate at both legal area sizes with a clear full attack circle',()=>{
  const w=load(),rules=require('../weekly-boss-rules.cjs'),source=exportsData.get('marineford');
  assert.deepEqual(source.weeklyBossSpawn,{x:1536,y:1280});
  for(const aoeRadius of [48,240]){
    const profile={hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,
      aoeCooldown:8,aoeRadius,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:Math.max(240,aoeRadius+64)};
    const config={mapId:'marineford',spawn:{...source.weeklyBossSpawn},entry:{x:1536,y:1280+aoeRadius+48},
      maxPlayers:16,minLevel:50,durationMinutes:60,balanceApproved:true,profile};
    assert.equal(rules.canActivate(config,{map:id=>w.navigation(id)}),true);
    assert.equal(rules.canActivate(config,{map:id=>w.originalNavigation(id)}),true);
  }
});
