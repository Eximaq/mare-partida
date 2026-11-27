'use strict';
((root)=>{
 const data=root.MareSkypieaData||(typeof module!=='undefined'?require('./skypiea-map-data.js'):null);if(!data)return;
 const {width,height,colliders,spawn,districts,slots,props,specs}=data;
 function inside(x,y,polygon){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const a=polygon[i],b=polygon[j];
   if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;
  }
  return result;
 }
 const onLand=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&data.walkableAreas.some(p=>inside(x,y,p));
 const terrain=(x,y)=>onLand(x,y)?'c':'.';
 const terrainWalkable=(x,y)=>[[0,0],[-16,-20],[16,-20],[-16,0],[16,0]].every(([dx,dy])=>onLand(x+dx,y+dy));
 function zone(spec){
  const {id,spawn,districts,slots}=spec,returnPoint={id:'return',...spec.returnPoint,radius:48};
  const map={id,width,height,origin:{x:0,y:0},spawn,colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:16,
   navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-120,y:d.y-120,w:240,h:240})),
   safeZones:[{...spawn,radius:120},{...returnPoint,radius:80}],interactions:[returnPoint],returnPoint,
   // Rendering and traversal have different bounds: sky is artwork, never floor.
   visualCoverage:{tile:64,version:2}};
  return {spec,map,districts,slots};
 }
 const worlds=Object.fromEntries(specs.map(s=>[s.id,zone(s)]));
 const has=id=>typeof id==='string'&&Object.hasOwn(worlds,id);
 const map=worlds['skypiea-01'].map;
 let image=null;
 function prepare(){if(typeof Image!=='function')return null;if(!image){image=new Image();image.src=data.groundUrl;}return image;}
 function drawProp(ctx,p){
  const im=prepare();if(!im?.complete||!im.naturalWidth)return;
  const sx=im.naturalWidth/width,sy=im.naturalHeight/height;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();
  for(const [i,point] of p.polygon.entries())if(i)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);
  ctx.closePath();ctx.clip();
  ctx.drawImage(im,p.x*sx,p.y*sy,p.w*sx,p.h*sy,p.x,p.y,p.w,p.h);ctx.restore();
 }
 function ground(ctx,camera,w,h){
  const im=prepare();if(!im?.complete||!im.naturalWidth)return;
  const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
  const cw=Math.min(width,Math.ceil(camera.x+w+2))-x,ch=Math.min(height,Math.ceil(camera.y+h+2))-y;
  if(cw<=0||ch<=0)return;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(im,x*im.naturalWidth/width,y*im.naturalHeight/height,cw*im.naturalWidth/width,ch*im.naturalHeight/height,x,y,cw,ch);
  ctx.restore();
 }
 // Weather remains in the shared bounded ambient-weather pool. The complete
 // scene is painted once; only occluding silhouettes are redrawn by WorldDepth.
 function foreground(){}
 function environment(ctx,id=map.id){
  const p=worlds[id]?.map.returnPoint;if(!p)return;
  ctx.save();ctx.strokeStyle='#bdf7f4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,34,16,0,0,Math.PI*2);ctx.stroke();
  ctx.textAlign='center';ctx.font='bold 12px Georgia';ctx.lineWidth=3;ctx.strokeStyle='#173f50';ctx.fillStyle='#f9f1cb';
  ctx.strokeText('Voltar ao porto',p.x,p.y+37);ctx.fillText('Voltar ao porto',p.x,p.y+37);ctx.restore();
 }
 const api={data,map,specs,worlds,has,districts,slots,props,terrain,prepare,ground,foreground,drawProp,environment,get image(){return prepare();}};
 root.MareSkypiea=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
