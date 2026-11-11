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


function legacyDawnNavigation(){
 const {indexedNavigation}=require('../../server-navigation.cjs');
 const {map}=require('../../dawn-world.js');
 const {mask}=require('../../dawn-map-data.js');
 const Base=world.originalNavigation('lobby').constructor,cell=map.navigationCell||24;
 return {fast:indexedNavigation(Base,map,cell,10,{terrainMask:mask}),original:new Base(map,cell)};
}

test('isolated patrol endpoint is rejected without searching the entire reachable map on each substep',()=>{
 const nav=legacyDawnNavigation().fast,start={x:1488,y:1648},end={x:1509.7901182151293,y:1594.6806719081092};
 let calls=0;const clear=nav.clear;nav.clear=function(...args:any[]){calls++;return clear.apply(this,args);};
 try{assert.equal(nav.path(start,end).length,0);assert(calls<=12,'unreachable final edge must be detected locally; checks='+calls);}finally{nav.clear=clear;}
});

test('static exact collision queries reuse bounded results without rounding nearby coordinates',()=>{
 const {indexedNavigation}=require('../../server-navigation.cjs');let points=0,segments=0;
 class Base{map:any;rows=0;radius=10;constructor(map:any){this.map=map;}buildRows(){}walkable(x:number,_y:number){points++;return x>1;}clear(_a:any,b:any){segments++;return b.x>1;}projectileClear(){return true;}}
 const nav=indexedNavigation(Base,{width:100,height:100,colliders:[]});
 for(let i=0;i<10;i++){assert.equal(nav.walkable(1.000001,2),true);assert.equal(nav.clear({x:0,y:0},{x:1.000001,y:2}),true);}
 assert.equal(points,1);assert.equal(segments,1);assert.equal(nav.walkable(.999999,2),false);assert.equal(nav.clear({x:0,y:0},{x:.999999,y:2}),false);
 for(let i=0;i<20000;i++)nav.walkable(2+i/10000,2);assert.ok(nav.walkMemo.size<=4096);assert.ok(nav.clearMemo.size<=8192);
});
test('open static mask regions avoid repeated terrain sampling without changing blocked geometry',()=>{
 const {indexedNavigation}=require('../../server-navigation.cjs'),Base=world.originalNavigation('lobby').constructor;
 let terrainCalls=0,segmentCalls=0;const cols=50,rows=50,step=2,bytes=Buffer.alloc(Math.ceil(cols*rows/8),255);
 const hole=30*cols+30;bytes[hole>>3]=bytes[hole>>3]!&~(1<<(hole&7));
 const sample=(x:number,y:number)=>{const cx=Math.floor(x/step),cy=Math.floor(y/step),i=cy*cols+cx;return cx>=0&&cy>=0&&cx<cols&&cy<rows&&!!(bytes[i>>3]!&(1<<(i&7)));};
 const map={id:'fixture-mask',width:100,height:100,colliders:[{x:80,y:10,w:4,h:30}],terrainWalkable:(x:number,y:number,r=0)=>{terrainCalls++;return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>sample(x+dx!,y+dy!));},segmentBlocked:()=>{segmentCalls++;return false;}};
 const fast=indexedNavigation(Base,map,4,1,{terrainMask:{cols,rows,step,bits:bytes.toString('base64')}}),original=new Base({...map},4,1);
 terrainCalls=segmentCalls=0;
 for(let i=0;i<200;i++){const a={x:10+i*.001,y:10},b={x:50+i*.001,y:10};assert.equal(fast.clear(a,b),true);}
 assert.equal(terrainCalls,0,'proven-open rectangles should need no per-point terrain samples');assert.equal(segmentCalls,0,'proven-open rectangles should need no repeated mask traversal');
 let seed=9;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let i=0;i<1000;i++){const a={x:rng()*100,y:rng()*100},b={x:rng()*100,y:rng()*100};assert.equal(fast.clear(a,b),original.clear(a,b));assert.equal(fast.walkable(a.x,a.y),original.walkable(a.x,a.y));}
 assert.equal(fast.walkable(61,61),false);assert.equal(fast.clear({x:70,y:20},{x:90,y:20}),false);
});

test('negative grid-boundary segments retain the original exact mask traversal decision',()=>{
 const {fast,original}=legacyDawnNavigation();
 const a={x:1488,y:1648},b={x:1496,y:1640};
 assert.equal(original.clear(a,b),false);assert.equal(fast.clear(a,b),false);
 assert.equal(JSON.stringify(fast.path(a,b)),JSON.stringify(original.path(a,b)));
 for(const dx of [-1e-10,0,1e-10])for(const dy of [-1e-10,0,1e-10]){
  const p={x:b.x+dx,y:b.y+dy};assert.equal(fast.clear(a,p),original.clear(a,p));
 }
});
test('disconnected static regions are rejected before repeated whole-map searches',()=>{
 const {indexedNavigation}=require('../../server-navigation.cjs'),Base=world.originalNavigation('lobby').constructor;
 const nav=indexedNavigation(Base,{width:512,height:256,colliders:[{x:248,y:0,w:16,h:256}]},8,2);
 let checks=0;const clear=nav.clear;nav.clear=function(...args:any[]){checks++;return clear.apply(this,args);};
 assert.equal(nav.path({x:32,y:128},{x:480,y:128}).length,0);assert.ok(checks<=12,'disconnected regions need no A* flood; checks='+checks);
});
test('directed grid-edge verdicts survive dynamic-query churn without rerunning exact predicates',()=>{
 const {indexedNavigation}=require('../../server-navigation.cjs'),Base=world.originalNavigation('lobby').constructor;let checks=0;
 const map={width:64,height:64,colliders:[{x:7,y:0,w:2,h:8}],segmentBlocked:()=>{checks++;return false;}},nav=indexedNavigation(Base,map,8,1);
 const open=[{x:4,y:20},{x:12,y:20}],blocked=[{x:4,y:4},{x:12,y:4}];
 assert.equal(nav.clear(...open),true);assert.equal(nav.clear(...blocked),false);
 for(let i=1;i<8300;i++)nav.clear({x:4+i*.0001,y:40},{x:20+i*.0001,y:40});
 const before=checks;assert.equal(nav.clear(...open),true);assert.equal(nav.clear(...blocked),false);
 assert.equal(checks,before,'static graph edges must not be evicted by moving actors');
});

test('a walkable start in a blocked grid-center cell can still join its neighboring component',()=>{
 const {indexedNavigation}=require('../../server-navigation.cjs'),Base=world.originalNavigation('lobby').constructor;
 const map={width:96,height:96,colliders:[{x:28,y:0,w:3,h:72}]},fast=indexedNavigation(Base,map,8,1),original=new Base({...map},8,1);
 const a={x:26,y:20},b={x:36,y:20},cell=Math.floor(a.y/8)*12+Math.floor(a.x/8);
 assert.equal(fast.walkable(a.x,a.y),true);assert.equal(fast.grid[cell],0);
 const route=fast.path(a,b);assert.ok(route.length>1);assert.equal(JSON.stringify(route),JSON.stringify(original.path(a,b)));
});
