'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Preserve an independent view of the original import before the HD runtime installs.
const original=require('../alabasta-world.js');
const nativeMap={...original.map,spawn:{...original.map.spawn},returnPoint:{...original.map.returnPoint}};
const nativeDistricts=original.districts.map(d=>({...d}));
test('Alabasta becomes a travel destination at level 40 without an upper-level lock',()=>{
 const A=require('../archipelago.js');assert(A.canTravel('alabasta-desert',40),'Deserto de Alabasta must be available at level 40');assert(!A.canTravel('alabasta-desert',39));assert(A.canTravel('alabasta-desert',99));assert.equal(A.get('alabasta-desert').region,'alabasta');
});
test('Bananawani is a fixed level 45 common encounter with real physical attributes',()=>{
 const M=require('../monster-catalog.js'),H=require('../hunt-system.js');assert(M.bananawani,'Bananawani must be registered');assert.equal(M.bananawani.level,45);assert.equal(M.bananawani.area,'alabasta');assert.equal(M.bananawani.boss,false);
 const r=H.get('alabasta');assert(r&&r.sectors.length>=3);for(const s of r.sectors){const a=H.profile('alabasta',s.id,'bananawani',0),b=H.profile('alabasta',s.id,'bananawani',.999);assert.equal(a.level,45);assert.deepEqual(a,b);assert(a.maxHP>2478&&a.attack>156&&a.defense>64);assert(a.speed>0&&a.reach>0&&a.attackSec>0);}assert.equal(H.migrate({}).hunts.areas.alabasta.kills,0);
});
test('the preserved PixelLab source keeps solid sand walls, projectile blocking and original routes',()=>{
 const file=path.join(__dirname,'../alabasta-world.js');assert(fs.existsSync(file),'native Alabasta map must be preserved');const A=require(file);require('../world-system.js');const nav=new MareWorld.Navigation(nativeMap,32);
 assert.equal(nativeMap.width,5184);assert.equal(nativeMap.height,4608);assert(nav.walkable(nativeMap.spawn.x,nativeMap.spawn.y));
 for(const goal of nativeDistricts){const route=nav.path(nativeMap.spawn,goal),actor={...nativeMap.spawn};assert(route.length>0);for(let t=0;route.length&&t<10000;t++)nav.follow(actor,route,180,.1);assert(Math.hypot(actor.x-goal.x,actor.y-goal.y)<2);}
 for(let y=0;y<A.rows.length;y++)for(let x=0;x<A.rows[y].length;x++)if('ao'.includes(A.rows[y][x])){assert(!nav.walkable(x*64+32,y*64+32),'wall '+x+','+y);assert(!nav.projectileClear({x:x*64+18,y:y*64+32},{x:x*64+46,y:y*64+32}));}
 assert(A.props.length>0);assert(nativeMap.colliders.every(c=>c.isSolid&&c.blocksMovement));
});
test('Bananawani keeps the same pixel scale and foot plane while idle, walking and biting',()=>{
 require('../new-islands-art.js');const art=MareNewIslandArt;assert(art.meta.bananawani,'native Bananawani animation set must be registered');for(const dir of ['south','west','east','north']){const boxes=[{moving:0,attackAnim:0},{moving:1,attackAnim:0},{moving:0,attackAnim:.9}].map(state=>art.layout({type:'bananawani',y:500,emberFacing:dir,...state}));assert(boxes.every(b=>b.scale===1.5),'all states must keep the requested 50% enlargement');assert(boxes.every(b=>b.width===168&&b.top+b.a.feet[b.row]*b.scale===503));}
});
