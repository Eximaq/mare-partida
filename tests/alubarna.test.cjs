'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const specs=[['alubarna-01',50,55,'puppu',53,110],['alubarna-02',55,60,'valentine',58,135],['alubarna-03',60,65,'merry',63,120],['alubarna-04',65,70,'doublefinger',68,150],['alubarna-05',70,75,'mr1',75,170]];
test('five Alubarna destinations and Skypiea preserve old regions and enforce entry levels',()=>{
 const A=require('../archipelago.js');for(const [id,min,max,,level]of specs){const i=A.get(id);assert(i,id+' must exist');assert.equal(i.region,'alabasta');assert.equal(i.area,id);assert.deepEqual(i.recommended,[min,max]);assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert(A.canTravel(id,100));assert(i.monster.role.includes(String(level)));}
 assert.equal(A.byArea('alabasta').id,'alabasta-desert');assert.equal(A.list('east-blue').length,8);assert.equal(A.regions.find(r=>r.id==='skypiea')?.locked,false);assert.deepEqual(A.list('skypiea'),[]);
});
test('fixed monster levels and independent progress survive migration',()=>{
 const H=require('../hunt-system.js'),M=require('../monster-catalog.js'),B=require('../monster-behavior.js');for(const [id,min,max,type,level]of specs){assert.equal(M[type]?.area,id);assert.equal(M[type]?.level,level);const r=H.get(id);assert(r);assert.equal(r.min,min);assert.equal(r.max,max);for(const s of r.sectors){assert.deepEqual(s.roles,[type]);assert.equal(H.profile(id,s.id,type,0).level,level);assert.deepEqual(H.profile(id,s.id,type,0),H.profile(id,s.id,type,.99));}assert(B.slots(id).length>=6);}
 let g=H.migrate({hunts:{areas:{beach:{kills:7},alabasta:{kills:5}}}});g=H.recordKill(g,'alubarna-01','puppu').state;assert.equal(g.hunts.areas['alubarna-01'].kills,1);assert.equal(g.hunts.areas['alubarna-02'].kills,0);assert.equal(g.hunts.areas.beach.kills,7);assert.equal(g.hunts.areas.alabasta.kills,5);
});
test('full map instances provide safe spawns and routes to every encounter',()=>{
 const A=require('../alubarna-world.js');require('../world-system.js');const B=require('../monster-behavior.js');for(const [id]of specs){const w=A.worlds[id],n=new MareWorld.Navigation(w.map,32);assert.equal(w.map.width,6592);assert.equal(w.map.height,5248);assert(n.walkable(w.map.spawn.x,w.map.spawn.y));for(const s of B.slots(id)){assert(n.walkable(s.x,s.y),s.id);assert(n.path(w.map.spawn,s).length,s.id);assert(Math.hypot(s.x-w.map.spawn.x,s.y-w.map.spawn.y)>180);}assert(w.map.colliders.some(c=>c.blocksProjectiles));}
});
test('all five native animation sets obey South Hurt and apparent size order',()=>{
 require('../sprite-combat-v2-data.js');require('../sprite-combat-v2.js');for(const [,,,type,,size]of specs){const d=MareSpriteCombatV2Data[type];assert.equal(d?.worldHeight,size);assert.equal(d.idle_extent_ratio,1);for(const dir of ['south','north','west','east']){for(const a of ['idle','walk','attack'])assert(MareSpriteCombatV2.resolve(type,a,dir).requested);assert(MareSpriteCombatV2.resolve(type,'hurt',dir).clip.image.endsWith('/hurt-south.png'));}}
});

test('the native northern arch leaves a route and projectile opening toward the palace',()=>{
 const A=require('../alubarna-world.js'),map=A.worlds['alubarna-01'].map;require('../world-system.js');const n=new MareWorld.Navigation(map,32),goal={x:3280,y:752};
 assert(n.walkable(goal.x,goal.y),'palace approach is open ground');assert(n.path(map.spawn,goal).length,'the northern arch must not seal off the palace road');
 assert(n.projectileClear({x:3295,y:850},{x:3295,y:960}),'projectiles cross the visible arch opening');assert(!n.projectileClear({x:3232,y:850},{x:3232,y:960}),'the arch columns remain solid');
});
