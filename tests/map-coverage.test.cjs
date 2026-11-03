'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {loadMaps}=require('../tools/audit_maps.cjs');
const ctx=loadMaps(),{Coverage,Camera,coverageFor,maps}=ctx.MareWorld;
test('visual existence preserves water, walls, shadows and negative coordinates; holes are absent',()=>{
 const c=new Coverage({rows:['wa.','wsa'],tile:64,x:-128,y:-64});
 assert(c.exists(-120,-60));assert(c.exists(-60,-60));assert(!c.exists(10,-60));assert(c.exists(10,10));assert(!c.exists(NaN,0));
 assert(c.contains(-128,-64,128,128));assert(!c.contains(-128,-64,192,128));assert(!c.contains(-130,-64,128,128));
});
test('versioned coverage cache rebuilds only when native metadata changes',()=>{
 const map={id:'fixture',width:192,height:128,visualCoverage:{rows:['aa.','aaa'],version:1}};
 const first=coverageFor(map);for(let i=0;i<10000;i++)assert.equal(coverageFor(map),first);
 map.visualCoverage.rows=['aaa','aaa'];map.visualCoverage.version++;assert.notEqual(coverageFor(map),first);assert(coverageFor(map).contains(0,0,192,128));
});
test('camera cannot interpolate across an internal hole, and always keeps the player visible',()=>{
 const map={id:'holes',width:640,height:384,visualCoverage:{rows:['aaaaaaaaaa','aaaaaaaaaa','aaaa..aaaa','aaaaaaaaaa','aaaaaaaaaa','aaaaaaaaaa'],tile:64}};
 const camera=new Camera();camera.width=192;camera.height=128;
 for(const hero of [{x:160,y:210},{x:500,y:210},{x:240,y:300}]){camera.update(hero,map,.016,false);assert(coverageFor(map).contains(camera.x,camera.y,camera.width,camera.height));const p=camera.worldToScreen(hero.x,hero.y);assert(p.x>=0&&p.x<camera.width&&p.y>=0&&p.y<camera.height);}
});
test('a small map gets finite cropping rather than moving the player or inventing terrain',()=>{
 const map={id:'small',width:128,height:128},hero={x:64,y:64},camera=new Camera();camera.width=1500;camera.height=900;
 camera.update(hero,map,.016,true);assert(camera.masked);assert.deepEqual(hero,{x:64,y:64});const p=camera.worldToScreen(hero.x,hero.y);assert.equal(p.x,750);assert.equal(p.y,450);assert.equal(camera.fitZoom(map,1500,900,.8),1.8);
});
test('all registered maps use their native coverage, with finite caches and bounded edge searches',()=>{
 assert.equal(Object.keys(maps).length,20);
 for(const [id,map]of Object.entries(maps)){
  const camera=new Camera(),coverage=coverageFor(map);assert(coverage.exists(map.spawn.x,map.spawn.y),id+' spawn has visual content');
  for(const [sw,sh]of [[360,800],[960,570],[1920,1080],[3440,1440]])for(const zoom of [.8,1,1.8]){
   const z=camera.fitZoom(map,sw,sh,zoom);camera.width=Math.round(sw/z);camera.height=Math.round(sh/z);
   const b=coverage.bounds;for(const hero of [map.spawn,{x:b.x+32,y:b.y+96},{x:b.x+b.w-32,y:b.y+b.h-32}]){
    camera.update(hero,map,.016,true);assert([camera.x,camera.y].every(Number.isFinite),id);assert(camera.width<=b.w||camera.masked);assert(camera.height<=b.h||camera.masked);
    const p=camera.worldToScreen(hero.x,hero.y),back=camera.screenToWorld(p.x,p.y);assert.equal(back.x,hero.x);assert.equal(back.y,hero.y);
   }
  }
  assert.equal(coverage.builds,1);assert(camera.solves<150,id+' bounded search count');
 }
});

test('deferred navigation agrees with the complete grid and does not build other maps',()=>{
 const map=maps.lobby,a=new ctx.MareWorld.Navigation(map,map.navigationCell||24),b=new ctx.MareWorld.Navigation(map,map.navigationCell||24,10,{defer:true});
 assert.equal(b.builtRows,0);assert.equal(b.ready,false);b.buildRows(2);assert.equal(b.builtRows,2);while(!b.ready)b.buildRows(4);assert.deepEqual(b.grid,a.grid);
 assert.deepEqual(b.path(map.spawn,map.spawn),a.path(map.spawn,map.spawn));
});

test('partial cell slices preserve complete navigation and never expose unbuilt rows as ready',()=>{const map=maps['quest-dungeons'],a=new ctx.MareWorld.Navigation(map,16),b=new ctx.MareWorld.Navigation(map,16,10,{defer:true});b.buildCells(24);assert.equal(b.buildCursor,24);assert.equal(b.builtRows,0);assert(!b.ready);while(!b.ready)b.buildCells(24);assert.deepEqual(b.grid,a.grid);assert.equal(b.builtRows,b.rows);});
