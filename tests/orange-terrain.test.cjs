'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const O=require('../orange-world.js');
const T=require('../orange-terrain.js');
require('../world-system.js');
const {Navigation,Camera}=globalThis.MareWorld;
const before=Buffer.from(O.terrain);
const allGrass=t=>t===O.GRASS||t===O.STREET;
const n=(x,y)=>O.at(x,y);
assert.equal(T.neighborMask((x,y)=>x===1&&y===1?1:0,1,1,t=>t===1),0);
assert.equal(T.neighborMask(()=>1,5,5,t=>t===1),255);
assert.equal(T.neighborMask((x,y)=>(x===1&&y===0)||(x===2&&y===1)?1:0,1,1,t=>t===1),3);
for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const m=T.neighborMask(n,x,y,allGrass);
  assert.equal(!!(m&1),allGrass(n(x,y-1)),'north mask');
  assert.equal(!!(m&2),allGrass(n(x+1,y)),'east mask');
  assert.equal(!!(m&4),allGrass(n(x,y+1)),'south mask');
  assert.equal(!!(m&8),allGrass(n(x-1,y)),'west mask');
  assert.equal(!!(m&16),allGrass(n(x+1,y-1)),'NE corner');
  assert.equal(!!(m&128),allGrass(n(x-1,y-1)),'NW corner');
  assert.equal(T.hash(x,y,13),T.hash(x,y,13),'hash deterministic');
  assert.deepEqual(T.decorationPlan(x,y,n(x,y)),T.decorationPlan(x,y,n(x,y)),'no random flicker');
  for(const dir of ['top','right','bottom','left'])for(let i=0;i<=8;i++){
    const value=T.edgeJitter(x,y,dir,i);
    assert(Number.isInteger(value)&&value>=-12&&value<=12&&value%4===0,'pixel-stepped contour');
  }
}
let draws=0,clips=0,details=0;
const c={imageSmoothingEnabled:true,fillStyle:null,
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
  clip(mode){clips++;assert.equal(mode,'evenodd');},
  translate(){},scale(){},
  fillRect(){details++;},
  drawImage(){draws++;}};
const fake={complete:true,naturalWidth:128,naturalHeight:128};
for(const [cx,cy] of [[0,0],[1,1],[2,3],[3,3]])
  T.drawChunk(c,cx,cy,O,{water:fake,sand:fake,grass:fake,street:fake},fake);
assert(draws>600,'textures are rendered');
assert(clips>80,'multiple layered masks rendered');
assert(details>100,'decoration rendered');
assert.deepEqual(Buffer.from(O.terrain),before,'terrain generation not modified');
const nav=new Navigation(O.map);
for(const dest of O.districts)assert(nav.path(O.spawn,dest).length,'district reachable: '+dest.id);
for(const area of [[1920,1080],[393,852]]){
  const cam=new Camera();cam.width=area[0];cam.height=area[1];cam.update({x:2040,y:2040},O.map,0,true);
  assert(cam.x>=0&&cam.y>=0,'camera nonnegative');
}
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const builder=fs.readFileSync(path.join(__dirname,'../tools/build_pages.py'),'utf8');
assert(html.indexOf('src="orange-terrain.js"')>0);
assert(html.indexOf('src="orange-terrain.js"')<html.indexOf('src="orange-renderer.js"'),'load terrain module before renderer');
assert(builder.includes("'orange-terrain.js'"),'Pages includes terrain engine');
console.log('Orange terrain: 8-neighbor masks, internal corners, deterministic decoration, cached raster composition, camera, saves and paths PASS');
