'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),B=require('../monster-behavior.js'),W=require('../world-catalog.cjs').load();
const prior='28c090f587fc5f11aa1f007f8008b509cfdd31e630fba12d83a8acfbb8391adf';
const areas=['skypiea-01','skypiea-02','skypiea-03','skypiea-04'];
const stats={maxHP:100,maxEnergy:100},now=100000;

test('changed Skypiea geometry reanchors all four saved battles without restoring HP or respawns',()=>{
 for(const area of areas){
  const b=E.create(area,stats,now,()=>.5),m=b.mobs[0],slot=B.slots(area)[0];
  b.rulesHash=prior;b.hp=43;b.energy=37;b.cooldowns=[7,3];
  Object.assign(b.hunts.areas[area],{kills:17,respawns:{[area+'-5']:now+10000}});
  Object.assign(m,{x:slot.x+256,y:slot.y+256,anchorX:slot.x+256,anchorY:slot.y+256,hp:9,engaged:true,telegraph:{fixture:true}});
  Object.assign(b.mobs[1],{hp:0,alive:false,corpseUntil:now+2000});
  b.targetId=m.id;b.pending={targetId:m.id};b.auto=true;b.projectiles=[{x:m.x,y:m.y}];
  const identity=b.mobs.map(m=>[m.id,m.spawnId,m.hp,m.alive,m.corpseUntil]);
  E.upgradeBalance(b);
  assert.deepEqual([m.x,m.y,m.anchorX,m.anchorY,m.engaged,m.telegraph],[slot.x,slot.y,slot.x,slot.y,false,null],area);
  assert.deepEqual(b.mobs.map(m=>[m.id,m.spawnId,m.hp,m.alive,m.corpseUntil]),identity,area+' identities and health');
  assert.deepEqual([b.hp,b.energy,b.cooldowns,b.hunts.areas[area].kills,b.hunts.areas[area].respawns[area+'-5']],[43,37,[7,3],17,110000]);
  assert.deepEqual([b.pending,b.auto,b.targetId,b.projectiles],[null,false,null,[]]);
  assert.equal(b.rulesHash,E.rulesHash);
  const once=structuredClone(b);E.upgradeBalance(b);assert.deepEqual(b,once,'idempotent '+area);
 }
});

test('shared Skypiea enemies and party extras move together exactly once on every island',()=>{
 for(const area of areas){
  const slot=B.slots(area)[0],nav=W.navigation(area);
  const base={id:'base',source:'world',spawnId:slot.id,type:slot.type,district:slot.sector,hp:11,alive:true,x:slot.x+256,y:slot.y+256,anchorX:slot.x+256,anchorY:slot.y+256,engaged:true};
  const extra={...base,id:'extra',spawnId:'party:room:0',partyExtra:true,hp:0,alive:false,corpseUntil:now+500,x:base.x+32,anchorX:base.anchorX+32};
  const mobs=[base,extra];
  assert.equal(E.reanchorSkypieaMobs(area,mobs,nav),true,area);
  assert.deepEqual(mobs.map(m=>[m.id,m.spawnId,m.hp,m.alive,m.engaged]),[['base',slot.id,11,true,false],['extra','party:room:0',0,false,false]]);
  assert.equal(extra.corpseUntil,100500);
  for(const m of mobs)assert(nav.walkable(m.x,m.y)&&nav.path(nav.map.spawn,m).length>0,area+' reachable party actor');
  const once=structuredClone(mobs);assert.equal(E.reanchorSkypieaMobs(area,mobs,nav),false);assert.deepEqual(mobs,once);
 }
});

test('unchanged geometry retains attacks and unknown fingerprints remain rejected',()=>{
 for(const area of ['alabasta',...areas]){
  const b=E.create(area,stats,now,()=>.5);b.rulesHash=area==='alabasta'?prior:E.rulesHash;
  b.pending={targetId:b.mobs[0]?.id,remaining:.4};b.projectiles=[{x:100,y:200}];b.auto=true;b.cooldowns=[5,2];
  const expected={...structuredClone(b),rulesHash:E.rulesHash};E.upgradeBalance(b);assert.deepEqual(b,expected,area);
 }
 const unknown=E.create('skypiea-03',stats,now,()=>.5);unknown.rulesHash='f'.repeat(64);
 const before=structuredClone(unknown);E.upgradeBalance(unknown);assert.deepEqual(unknown,before);
});

test('HD artwork and gate arrival promote existing celestial battles without changing active state',()=>{
 const celestial='c66c9af7ffaae0d2d98c47196f5edee82ff4fa0875da9f0d08c1cf37b1e7c401';
 for(const area of [...areas,'alabasta']){
  const b=E.create(area,stats,now,()=>.5),m=b.mobs[0];
  b.rulesHash=celestial;b.hp=43;b.energy=37;b.auto=true;b.cooldowns=[7,3];
  b.pending={targetId:m.id,remaining:.4};b.targetId=m.id;b.projectiles=[{x:m.x,y:m.y}];
  Object.assign(m,{x:m.x+8,y:m.y+8,hp:11,attackClock:2.25,engaged:true,telegraph:{fixture:true}});
  Object.assign(b.mobs[1],{hp:0,alive:false,corpseUntil:now+2000});
  b.hunts.areas[area].kills=17;b.hunts.areas[area].respawns[b.mobs[5].spawnId]=now+10000;
  const expected={...structuredClone(b),rulesHash:E.rulesHash};
  E.upgradeBalance(b);assert.deepEqual(b,expected,area+' preserves exact active state');
  E.upgradeBalance(b);assert.deepEqual(b,expected,area+' promotion is idempotent');
 }
});
