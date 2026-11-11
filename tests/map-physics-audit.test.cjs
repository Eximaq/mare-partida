'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../world-system.js');const {Navigation}=MareWorld;
test('non-solid decorative rectangles never create invisible movement walls',()=>{const nav=new Navigation({width:100,height:100,colliders:[{id:'ground',x:40,y:20,w:10,h:60,isSolid:false}]},8,2);assert.equal(nav.walkable(45,50),true);const actor={x:30,y:50};nav.move(actor,30,0);assert.equal(actor.x,60);});
test('a thin solid wall stops a fast move on both axes without tunneling',()=>{for(const vertical of [true,false]){const nav=new Navigation({width:100,height:100,colliders:[vertical?{x:12,y:0,w:.5,h:100}:{x:0,y:12,w:100,h:.5}]},8,.1),actor={x:10,y:10};nav.move(actor,vertical?10:0,vertical?0:10);assert.ok((vertical?actor.x:actor.y)<12);}});
test('projectiles cross non-walkable floor and low objects but stop at a real wall',()=>{const nav=new Navigation({width:200,height:100,terrainWalkable:(x)=>x<60||x>100,colliders:[{id:'barrel',x:120,y:20,w:10,h:60,blocksProjectiles:false}]},8,2);assert.equal(typeof nav.projectileClear,'function');assert.equal(nav.clear({x:30,y:50},{x:160,y:50}),false);assert.equal(nav.projectileClear({x:30,y:50},{x:160,y:50}),true);nav.map.colliders.push({id:'wall',x:170,y:0,w:1,h:100,blocksProjectiles:true});assert.equal(nav.projectileClear({x:30,y:50},{x:190,y:50}),false);});
test('characters sort by feet between scenery, with stable ties',()=>{assert.equal(typeof MareWorld.sortDepth,'function');const items=[{id:'south',y:140},{id:'house',y:120},{id:'hero',y:100},{id:'peer',y:100}];assert.deepEqual(MareWorld.sortDepth(items).map(o=>o.id),['hero','peer','house','south']);assert.deepEqual(items.map(o=>o.id),['south','house','hero','peer']);});

test('collision cleanup removes only invalid/exact duplicate geometry, preserving distinct overlapping solids',()=>{assert.equal(typeof MareWorld.cleanColliders,'function');const source=[{id:'a',x:20,y:20,w:10,h:10},{id:'duplicate',x:20,y:20,w:10,h:10},{id:'overlap',x:25,y:20,w:10,h:10},{id:'ghost',x:NaN,y:0,w:1,h:1},{id:'empty',x:0,y:0,w:0,h:1}];const clean=MareWorld.cleanColliders(source);assert.deepEqual(clean.map(o=>o.id),['a','overlap']);assert.equal(source.length,5);});

test('occlusion feedback is limited to an overlapping actor behind a tall object',()=>{assert.equal(typeof MareWorld.occluded,'function');const roof={x:100,y:50,w:100,h:150,base:200,tall:true};assert.equal(MareWorld.occluded({x:150,y:170},[roof],80),true);assert.equal(MareWorld.occluded({x:150,y:210},[roof],80),false);assert.equal(MareWorld.occluded({x:20,y:170},[roof],80),false);assert.equal(MareWorld.occluded({x:150,y:170},[{...roof,tall:false}],80),false);});

test('rectangular feet cannot protrude beyond a map boundary',()=>{const nav=new Navigation({width:100,height:100,playerFootprint:{w:32,h:20},colliders:[]},8,10);assert.equal(nav.walkable(12,50),false);assert.equal(nav.walkable(50,12),false);assert.equal(nav.walkable(50,50),true);});

test('invalid or unbounded motion and ray coordinates cannot hang the game loop',()=>{const vm=require('node:vm'),fs=require('node:fs'),source=fs.readFileSync(require.resolve('../world-system.js'),'utf8');for(const action of ["nav.move(actor,Infinity,0)","nav.clear(actor,{x:Infinity,y:50})"]){const ctx=vm.createContext({});vm.runInContext(source,ctx);assert.doesNotThrow(()=>vm.runInContext("var nav=new MareWorld.Navigation({width:100,height:100,colliders:[]}),actor={x:50,y:50};"+action,ctx,{timeout:50}));assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(actor)',ctx)),{x:50,y:50});}});

test('Baratie blocks movement at low props and keeps projectile clearance',()=>{
 const ctx=require('../tools/audit_maps.cjs').loadMaps(),map=ctx.MareWorld.maps.baratie;
 const solid=map.colliders.find(c=>!c.blocksProjectiles&&c.w>=20&&c.h>=16);
 assert.ok(solid);
 const nav=new Navigation({width:map.width,height:map.height,colliders:[solid]});
 const a={x:solid.x-20,y:solid.y+solid.h/2},b={x:solid.x+solid.w+20,y:a.y};
 assert.equal(nav.clear(a,b),false);
 assert.equal(nav.projectileClear(a,b),true);
});

test('Dawn keeps floor walkability independent of a solid object footprint',()=>{
 const ctx=require('../tools/audit_maps.cjs').loadMaps(),map=ctx.MareWorld.maps.dawn;
 const nav=new ctx.MareWorld.Navigation(map,16);
 const solid=map.colliders.find(c=>map.terrainWalkable(c.x+c.w/2,c.y+c.h/2,10));
 assert.ok(solid);
 const p={x:solid.x+solid.w/2,y:solid.y+solid.h/2};
 assert.equal(nav.clear(p,p),false);
 const terrainOnly=new ctx.MareWorld.Navigation({...map,colliders:[]},16);
 assert.equal(terrainOnly.clear(p,p),true);
});
