'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const {createCanvas,Image}=require('@napi-rs/canvas');
const sky=require('../skypiea-world.js');require('../world-system.js');
const depth=require('../world-depth.js');
const root=path.join(__dirname,'..');
const source=Object.getOwnPropertyDescriptor(Image.prototype,'src');
const pending=[];
global.Image=function FileImage(){
 const image=new Image();
 Object.defineProperty(image,'src',{set(url){pending.push(new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;source.set.call(image,fs.readFileSync(path.join(root,url)));}));}});
 return image;
};
test.before(async()=>{sky.prepare();await Promise.all(pending);});
global.document={createElement:()=>createCanvas(1,1)};
const pixel=(ctx,x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);

test('the native renderer preserves export pixels at desktop scale with a visible but closed sky',()=>{
 for(const [id,{map}] of Object.entries(sky.worlds)){
  for(const [w,h] of [[390,780],[1114,614],[1920,1080]]){
   const surface=createCanvas(w,h),ctx=surface.getContext('2d'),camera=new MareWorld.Camera(),zoom=1.08;
   camera.width=Math.round(w/zoom);camera.height=Math.round(h/zoom);camera.update(map.spawn,map,0,true);
   const screen=(x,y)=>[Math.floor((x-Math.round(camera.x)+.5)*zoom),Math.floor((y-Math.round(camera.y)+.5)*zoom)];
   ctx.imageSmoothingEnabled=false;ctx.scale(zoom,zoom);
   camera.begin(ctx,map);sky.ground(ctx,camera,camera.width,camera.height);
   const samples=[[1554,2846,[252,253,250,255]],[1544,2792,[163,146,122,255]],[1615,2680,[160,94,9,255]],[1760,2800,[1,126,250,255]]];
   for(const [x,y,expected] of samples){const [sx,sy]=screen(x,y);if(sx<0||sx>=w||sy<0||sy>=h)continue;assert.deepEqual(pixel(ctx,sx,sy),expected,id+' @ '+x+'/'+y);}
   assert(!map.terrainWalkable(1760,2800));
   ctx.restore();
  }
 }
});

test('the arch is still a depth layer over actors without hiding its transparent passage',()=>{
 const map=sky.worlds['skypiea-01'].map,camera=new MareWorld.Camera(),surface=createCanvas(500,400),ctx=surface.getContext('2d');
 camera.width=500;camera.height=400;camera.update(map.spawn,map,0,true);
 camera.begin(ctx,map);sky.ground(ctx,camera,500,400);
 const arch=depth.regions(map.id).find(p=>p.url.includes('d575994fe59a4ca2'));
 assert(arch);
 const points=[[1489,2698],[1538,2776]],screen=points.map(([x,y])=>Object.values(camera.worldToScreen(x,y)));
 const before=screen.map(([x,y])=>pixel(ctx,x,y));
 ctx.fillStyle='#ff00ff';for(const [x,y] of points)ctx.fillRect(x,y,1,1);
 depth.draw(ctx,arch,[{x:1520,y:2800,visualHeight:170,visualWidth:160}]);
 assert.deepEqual(pixel(ctx,...screen[0]),before[0],'stone arch keeps depth');
 assert.deepEqual(pixel(ctx,...screen[1]),[255,0,255,255],'transparent opening stays open');
 ctx.restore();
});

