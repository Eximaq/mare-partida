import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),world=require('../../world-catalog.cjs').load(),E=require('../../world-battle.cjs'),C=require('../../character-system.js');
test('server broad phase agrees with original exact collisions, LOS and paths on every map',()=>{
 let queries=0;for(const id of Object.keys(world.maps)){
  const old=world.originalNavigation(id),fast=world.navigation(id),map=world.maps[id];assert.deepEqual([...fast.grid],[...old.grid],id+' navigation grid');
  let seed=123;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let i=0;i<100;i++){const a={x:rng()*map.width,y:rng()*map.height},b={x:a.x+(rng()-.5)*160,y:a.y+(rng()-.5)*160};assert.equal(fast.walkable(a.x,a.y),old.walkable(a.x,a.y),id+' point');assert.equal(fast.clear(a,b),old.clear(a,b),id+' swept footprint');assert.equal(fast.projectileClear(a,b),old.projectileClear(a,b),id+' projectile');queries+=3;}
  for(const p of [map.spawn,...(map.interactions||[]).filter((p:any)=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,2)])assert.equal(JSON.stringify(fast.path(map.spawn,p)),JSON.stringify(old.path(map.spawn,p)),id+' exact path');
  for(const p of [{x:NaN,y:0},{x:1e10,y:1e10},{x:-1,y:0}])assert.equal(fast.clear(map.spawn,p),old.clear(map.spawn,p));
 }assert(queries>=3000);
});
test('indexed and original navigation produce identical battle state under deterministic patrol and combat',()=>{
 const stats=C.derive({classId:'sword',level:1,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0});
 for(const value of [0,.3,.5,.99]){const b=E.create('beach',stats,1000,()=>value),copy=structuredClone(b),hero={...world.maps.dawn.spawn},other={...hero};
  for(let i=1;i<=4;i++){const c={stats,classId:'sword',factionId:'pirate',level:1,now:1000+i*250,dt:.25,rng:()=>value};E.step(b,{...c,hero,nav:world.navigation('dawn')});E.step(copy,{...c,hero:other,nav:world.originalNavigation('dawn')});}
  assert.deepEqual(b,copy);assert.deepEqual(hero,other);
 }
});

test('isolated patrol endpoint is rejected without searching the entire reachable map on each substep',()=>{
 const nav=world.navigation('dawn'),start={x:1488,y:1648},end={x:1509.7901182151293,y:1594.6806719081092};
 let calls=0;const clear=nav.clear;nav.clear=function(...args:any[]){calls++;return clear.apply(this,args);};
 try{assert.equal(nav.path(start,end).length,0);assert(calls<=12,'unreachable final edge must be detected locally; checks='+calls);}finally{nav.clear=clear;}
});
