'use strict';
/* Desert navigation and original-pixel scenery; no generation at runtime. */
((root)=>{
 const data=root.MareAlabastaData||(typeof module!=='undefined'?require('./alabasta-map-data.js'):null);if(!data)return;
 const rows=data.rows,CELL=64,width=5184,height=4608;
 const terrain=(x,y)=>rows[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]||'.';
 const props=data.objects.filter(p=>p.status==='ok'&&[p.x,p.y,p.w,p.h].every(Number.isFinite)&&p.w>0&&p.h>0);
 const walls=[];for(let y=0;y<rows.length;y++)for(let x=0;x<81;){if(!'ao'.includes(rows[y][x])){x++;continue;}const first=x;while(x<81&&'ao'.includes(rows[y][x]))x++;walls.push({id:'sand-wall-'+y+'-'+first,x:first*CELL-4,y:y*CELL-4,w:(x-first)*CELL+8,h:CELL+8,isSolid:true,blocksMovement:true,blocksProjectiles:true,terrainId:2});}
 const objectColliders=props.map(p=>({id:'alabasta-'+p.id,x:Math.round(p.x+p.w/2-p.footWidth/2),y:Math.round(p.base-p.footHeight),w:p.footWidth,h:p.footHeight,isSolid:true,blocksMovement:true,blocksProjectiles:p.blocksProjectiles,sourceId:p.id}));
 const terrainBlocks=[];for(let y=0;y<rows.length;y++)for(let x=0;x<81;){if('scao'.includes(rows[y][x])){x++;continue;}const first=x;while(x<81&&!'scao'.includes(rows[y][x]))x++;terrainBlocks.push({id:'desert-terrain-'+y+'-'+first,x:first*CELL,y:y*CELL,w:(x-first)*CELL,h:CELL,isSolid:true,blocksMovement:true,blocksProjectiles:false});}
 const colliders=[...walls,...terrainBlocks,...objectColliders];
 const terrainWalkable=(x,y)=>[[0,0],[-15,-19],[15,-19],[-15,0],[15,0]].every(([dx,dy])=>'sc'.includes(terrain(x+dx,y+dy)));
 const open=(x,y)=>terrainWalkable(x,y)&&!colliders.some(c=>x+16>c.x&&x-16<c.x+c.w&&y>c.y&&y-20<c.y+c.h);
 function closest(sx,sy){const px=(sx+34+.5)*CELL,py=(sy+47+.5)*CELL;let best=null,score=Infinity;for(let y=16;y<height;y+=32)for(let x=16;x<width;x+=32){const d=(x-px)**2+(y-py)**2;if(d<score&&open(x,y)){score=d;best={x,y};}}if(!best)throw Error('No clear desert spawn');return best;}
 const spawn=closest(4,13),districts=[['entrada','Entrada do Deserto',4,10],['oeste','Oásis do Oeste',-13,-13],['norte','Templos do Norte',5,-30],['leste','Dunas do Leste',25,-13],['sul','Santuário do Sul',8,1]].map(([id,name,x,y])=>({id,name,...closest(x,y)}));
 const returnPoint={id:'return',...spawn,radius:40};
 const map={id:'alabasta',width,height,origin:{x:0,y:0},spawn,colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:32,navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-160,y:d.y-160,w:320,h:320})),safeZones:[{...spawn,radius:140}],interactions:[returnPoint],returnPoint};
 const image=typeof Image==='function'?new Image():null;if(image)image.src='assets/alabasta/map.png';
 function ground(ctx,camera,w,h){ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#201e20';ctx.fillRect(camera.x,camera.y,w,h);if(image?.complete&&image.naturalWidth){const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),cw=Math.min(w+2,width-x),ch=Math.min(h+2,height-y);if(cw>0&&ch>0)ctx.drawImage(image,x,y,cw,ch,x,y,cw,ch);}ctx.restore();}
 function environment(ctx,time){ctx.save();ctx.strokeStyle='#ead8a4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(spawn.x,spawn.y,28+Math.sin(time*2),12,0,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#fff2cf';ctx.fillText('Voltar ao porto',spawn.x,spawn.y+30);ctx.restore();}
 const api={map,rows,props,walls,terrain,closest,districts,returnPoint,image,ground,environment};root.MareAlabasta=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
