'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const specs=[['alubarna-01',50,55,'puppu',53,110],['alubarna-02',55,60,'valentine',58,135],['alubarna-03',60,65,'merry',63,120],['alubarna-04',65,70,'doublefinger',68,150],['alubarna-05',70,75,'mr1',75,170]];
test('five Alubarna destinations and Skypiea preserve old regions and enforce entry levels',()=>{
 const A=require('../archipelago.js');for(const [id,min,max,,level]of specs){const i=A.get(id);assert(i,id+' must exist');assert.equal(i.region,'alabasta');assert.equal(i.area,id);assert.deepEqual(i.recommended,[min,max]);assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert(A.canTravel(id,100));assert(i.monster.role.includes(String(level)));}
 assert.equal(A.byArea('alabasta').id,'alabasta-desert');assert.equal(A.list('east-blue').length,8);assert.equal(A.regions.find(r=>r.id==='skypiea')?.locked,false);assert.deepEqual(A.list('skypiea').map(i=>i.id),['skypiea-01']);
});
test('fixed monster levels and independent progress survive migration',()=>{
 const H=require('../hunt-system.js'),M=require('../monster-catalog.js'),B=require('../monster-behavior.js');for(const [id,min,max,type,level]of specs){assert.equal(M[type]?.area,id);assert.equal(M[type]?.level,level);const r=H.get(id);assert(r);assert.equal(r.min,min);assert.equal(r.max,max);for(const s of r.sectors){assert.deepEqual(s.roles,[type]);assert.equal(H.profile(id,s.id,type,0).level,level);assert.deepEqual(H.profile(id,s.id,type,0),H.profile(id,s.id,type,.99));}assert(B.slots(id).length>=6);}
 let g=H.migrate({hunts:{areas:{beach:{kills:7},alabasta:{kills:5}}}});g=H.recordKill(g,'alubarna-01','puppu').state;assert.equal(g.hunts.areas['alubarna-01'].kills,1);assert.equal(g.hunts.areas['alubarna-02'].kills,0);assert.equal(g.hunts.areas.beach.kills,7);assert.equal(g.hunts.areas.alabasta.kills,5);
});
test('full map instances provide safe spawns and routes to every encounter',()=>{
 const catalog=require('../world-catalog.cjs').load(),B=require('../monster-behavior.js');
 const map=catalog.maps['alubarna-01'],nav=catalog.navigation(map.id);
 assert.deepEqual([map.width,map.height],[8128,5568]);
 assert(nav.walkable(map.spawn.x,map.spawn.y));
 for(const [id] of specs){
  assert.equal(catalog.maps[id].terrainWalkable(3048,4408),true);
  for(const slot of B.slots(id)){
   assert(nav.walkable(slot.x,slot.y),slot.id);
   assert(nav.path(map.spawn,slot).length,slot.id);
   assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>180);
  }
 }
 assert(map.colliders.some(c=>c.blocksProjectiles));
});
test('all five native animation sets obey South Hurt and apparent size order',()=>{
 require('../sprite-combat-v2-data.js');require('../sprite-combat-v2.js');for(const [,,,type,,size]of specs){const d=MareSpriteCombatV2Data[type];assert.equal(d?.worldHeight,size);assert.equal(d.idle_extent_ratio,1);for(const dir of ['south','north','west','east']){for(const a of ['idle','walk','attack'])assert(MareSpriteCombatV2.resolve(type,a,dir).requested);assert(MareSpriteCombatV2.resolve(type,'hurt',dir).clip.image.endsWith('/hurt-south.png'));}}
});

test('the exported south and palace gates keep their openings and solid supports',()=>{
 const catalog=require('../world-catalog.cjs').load(),map=catalog.maps['alubarna-01'];
 const nav=catalog.navigation(map.id);
 for(const [x,y] of [[3042,4100],[3028,2650]]){
  assert(nav.clear({x,y:y-50},{x,y:y+50}));
  assert(nav.projectileClear({x,y:y-50},{x,y:y+50}));
  assert(!nav.projectileClear({x:x-78,y:y-50},{x:x-78,y:y+50}));
 }
 assert(nav.path(map.spawn,map.navigationGoals.find(p=>p.id==='palacio')).length);
});
