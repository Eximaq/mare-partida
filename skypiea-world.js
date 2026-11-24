'use strict';
((root)=>{
 const data=root.MareSkypieaData||(typeof module!=='undefined'?require('./skypiea-map-data.js'):null);if(!data)return;
 const {width,height,rows,colliders,spawn,districts,slots,props}=data;
 const terrain=(x,y)=>rows[Math.floor(y/64)]?.[Math.floor(x/64)]||'.';
 const bridge=(x,y)=>(data.bridgeDecks??[]).some(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
 const terrainWalkable=(x,y)=>[[0,0],[-16,-20],[16,-20],[-16,0],[16,0]].every(([dx,dy])=>'sc'.includes(terrain(x+dx,y+dy))||bridge(x+dx,y+dy));
 const specs=data.specs??[{id:'skypiea-01',name:'Ilha dos Anjos',min:75,max:80,level:77,type:'satori',monster:'Satori',spawn,districts,slots}];
 function zone(spec){
  const {id,spawn,districts,slots}=spec,returnPoint={id:'return',...data.returnPoint,radius:40};
  const map={id,width,height,origin:{x:0,y:0},spawn,colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:16,
    navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-120,y:d.y-120,w:240,h:240})),safeZones:[{...spawn,radius:120}],
    interactions:[returnPoint],returnPoint,visualCoverage:{tile:64}};
  return {spec,map,districts,slots};
 }
 const worlds=Object.fromEntries(specs.map(s=>[s.id,zone(s)]));
 const has=id=>typeof id==='string'&&Object.hasOwn(worlds,id);
 const map=worlds['skypiea-01'].map;
 // Collision uses the Wang vertices above. Rendering uses the entire opaque
 // authored rectangle, including non-walkable sky and props over its edges.
 let image=null;
 const images=new Map(),overlayCache=new Map();
 function prepare(){
  if(typeof Image!=='function')return null;
  if(!image){
   image=new Image();image.src=data.groundUrl;
   for(const p of props)if(!images.has(p.url)){const mask=new Image();mask.src=p.url;images.set(p.url,mask);}
  }
  return image;
 }
 // Draw only the exact composed pixels where an original prop has alpha.
 // Plants, buildings and the arch still occlude actors by the original pivot.
 function drawProp(ctx,p){
  const mask=images.get(p.url);if(!image?.complete||!image.naturalWidth||!mask?.complete||!mask.naturalWidth)return;
  const x=Math.floor(p.x),y=Math.floor(p.y);
  let layer=overlayCache.get(p.id);
  if(!layer){
   layer=document.createElement('canvas');layer.width=Math.ceil(p.x+p.w)-x;layer.height=Math.ceil(p.y+p.h)-y;
   const g=layer.getContext('2d');g.imageSmoothingEnabled=false;
   g.drawImage(image,x,y,layer.width,layer.height,0,0,layer.width,layer.height);
   g.globalCompositeOperation='destination-in';g.drawImage(mask,p.x-x,p.y-y,p.w,p.h);
   overlayCache.set(p.id,layer);if(overlayCache.size>64)overlayCache.delete(overlayCache.keys().next().value);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(layer,x,y);ctx.restore();
 }
 function ground(ctx,camera,w,h){
  prepare();if(!image?.complete||!image.naturalWidth)return;
  const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),cw=Math.min(w+2,width-x),ch=Math.min(h+2,height-y);
  if(cw>0&&ch>0)ctx.drawImage(image,x,y,cw,ch,x,y,cw,ch);
 }
 function environment(ctx,id=map.id){const {returnPoint:{x,y}}=worlds[id].map;ctx.save();ctx.strokeStyle='#f8e6a8';ctx.beginPath();ctx.ellipse(x,y,28,12,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#604720';ctx.textAlign='center';ctx.font='bold 11px Georgia';ctx.fillText('Voltar ao porto',x,y+30);ctx.restore();}
 const api={data,map,specs,worlds,has,districts,slots,props,terrain,prepare,ground,drawProp,environment,get image(){return prepare();}};root.MareSkypiea=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
