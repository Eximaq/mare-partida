'use strict';
((root)=>{
 const data=root.MareSkypieaData||(typeof module!=='undefined'?require('./skypiea-map-data.js'):null);if(!data)return;
 const {width,height,rows,colliders,spawn,districts,slots,props}=data;
 const terrain=(x,y)=>rows[Math.floor(y/64)]?.[Math.floor(x/64)]||'.';
 const bridge=(x,y)=>(data.bridgeDecks??[]).some(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
 const terrainWalkable=(x,y)=>[[0,0],[-16,-20],[16,-20],[-16,0],[16,0]].every(([dx,dy])=>'sc'.includes(terrain(x+dx,y+dy))||bridge(x+dx,y+dy));
 const specs=data.specs??[{id:'skypiea-01',name:'Ilha dos Anjos',min:75,max:80,level:77,type:'satori',monster:'Satori',spawn,districts,slots}];
 function zone(spec){
  const {id,spawn,districts,slots}=spec,returnPoint={id:'return',...spawn,radius:40};
  const map={id,width,height,origin:{x:0,y:0},spawn,colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:16,
    navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-120,y:d.y-120,w:240,h:240})),safeZones:[{...spawn,radius:120}],
    interactions:[returnPoint],returnPoint,visualCoverage:{rows,tile:64}};
  return {spec,map,districts,slots};
 }
 const worlds=Object.fromEntries(specs.map(s=>[s.id,zone(s)]));
 const has=id=>typeof id==='string'&&Object.hasOwn(worlds,id);
 const map=worlds['skypiea-01'].map;
 let image=null;const images=new Map();
 function prepare(){if(typeof Image!=='function')return null;if(!image){image=new Image();image.src=data.groundUrl??'assets/skypiea/ground.png';for(const p of props)if(!images.has(p.url)){const im=new Image();im.src=p.url;images.set(p.url,im);}}return image;}
 function drawProp(ctx,p,time=0,reduced=false){const im=images.get(p.url);if(!im?.complete||!im.naturalWidth)return;const phase=p.x*.013+p.y*.007,dx=p.cloud&&!reduced?Math.sin(time*.16+phase)*12:0,dy=p.cloud&&!reduced?Math.sin(time*.12+phase)*4:0;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=p.cloud?.72:1;ctx.drawImage(im,p.x+dx,p.y+dy,p.w,p.h);ctx.restore();}
 function ground(ctx,camera,w,h){prepare();if(image?.complete&&image.naturalWidth){const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),cw=Math.min(w+2,width-x),ch=Math.min(h+2,height-y);if(cw>0&&ch>0)ctx.drawImage(image,x,y,cw,ch,x,y,cw,ch);}for(const p of props)if(!p.cloud&&p.x+p.w>camera.x&&p.x<camera.x+w&&p.y+p.h>camera.y&&p.y<camera.y+h)drawProp(ctx,p);}
 function foreground(ctx,camera,w,h,time,reduced){for(const p of props)if(p.cloud&&p.x+p.w+16>camera.x&&p.x-16<camera.x+w&&p.y+p.h+8>camera.y&&p.y-8<camera.y+h)drawProp(ctx,p,time,reduced);}
 function environment(ctx,id=map.id){const {spawn}=worlds[id].map;ctx.save();ctx.strokeStyle='#f8e6a8';ctx.beginPath();ctx.ellipse(spawn.x,spawn.y,28,12,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#604720';ctx.textAlign='center';ctx.font='bold 11px Georgia';ctx.fillText('Voltar ao porto',spawn.x,spawn.y+30);ctx.restore();}
 const api={data,map,specs,worlds,has,districts,slots,props,terrain,prepare,ground,foreground,drawProp,environment,get image(){return prepare();}};root.MareSkypiea=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
