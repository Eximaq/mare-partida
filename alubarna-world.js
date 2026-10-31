'use strict';
/* Five independent destinations share the owner's native image and geometry. */
((root)=>{
 const data=root.MareAlubarnaData||(typeof module!=='undefined'?require('./alubarna-map-data.js'):null);if(!data)return;
 const {width,height,rows,props,colliders,spawn,districts,specs}=data,CELL=64;
 const terrain=(x,y)=>rows[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]||'.';
 const terrainWalkable=(x,y)=>[[0,0],[-16,-20],[16,-20],[-16,0],[16,0]].every(([dx,dy])=>'wchougrm'.includes(terrain(x+dx,y+dy)));
 const worlds=Object.fromEntries(specs.map(s=>{
  const returnPoint={id:'return',...spawn,radius:40};
  const map={id:s.id,width,height,origin:{x:0,y:0},spawn:{...spawn},colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:32,navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-150,y:d.y-150,w:300,h:300})),safeZones:[{...spawn,radius:140}],interactions:[returnPoint],returnPoint};
  return [s.id,{map,districts,slots:data.slots.map((p,i)=>({...p,id:s.id+'-'+p.sector+'-'+i,type:s.type}))}];
 }));
 let image=null;function prepare(){if(!image&&typeof Image==='function'){image=new Image();image.src='assets/alubarna/map.png';}return image;}
 function ground(ctx,camera,w,h){prepare();ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#201e20';ctx.fillRect(camera.x,camera.y,w,h);if(image?.complete&&image.naturalWidth){const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),cw=Math.min(w+2,width-x),ch=Math.min(h+2,height-y);if(cw>0&&ch>0)ctx.drawImage(image,x,y,cw,ch,x,y,cw,ch);}ctx.restore();}
 function environment(ctx,time){ctx.save();ctx.strokeStyle='#ead8a4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(spawn.x,spawn.y,28+Math.sin(time*2),12,0,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#fff2cf';ctx.fillText('Voltar ao porto',spawn.x,spawn.y+30);ctx.restore();}
 const api={data,worlds,specs,props,rows,terrain,get image(){return prepare();},prepare,ground,environment};root.MareAlubarna=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
