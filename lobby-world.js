'use strict';
/* Existing 64px PixelLab Lobby map, exported without any new art generation. */
((root)=>{
  const data=root.MareLobbyMapData||(typeof module!=='undefined'?require('./lobby-map-data.js'):null);
  const TILE=data.tileSize, origin=data.sourceOrigin;
  const point=(sx,sy)=>({x:Math.round((sx-origin.x+.5)*TILE),y:Math.round((sy-origin.y+.5)*TILE)});
  const terrain=(x,y)=>data.rows[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]||'.';
  const passable=(x,y)=>'sgem'.includes(terrain(x,y));
  const placements=[[23,7,4,4],[23,10,4,4],[24,3,3.6,3.6],[19,1,0.8,0.8],[20,1,0.8,0.8],[21,1,0.8,0.8],[22,2,0.8,0.8],[19,1,0.8,0.8],[20,1,0.8,0.8],[21,1,0.8,0.8],[22,1,0.8,0.8],[19,1,0.8,0.8],[19,1,0.8,0.8],[22,1,0.8,0.8],[21,1,0.8,0.8],[21,1,0.8,0.8],[17,5,3.8,3.7],[6,5,3.7,3.7],[20,3,3.9,2.7],[20,-3,1.6,3.5],[10,2,3.8,3.5],[4,16,3.3,3.4],[13,15,3.3,3.4],[16,13,3.3,3.4],[5,-6,3.3,3.4],[-3,13,3.3,3.4],[-5,4,3.3,3.4],[18,-4,3.3,3.4],[10,-1,0.8,0.8],[9,-1,0.8,0.8],[10,-1,0.8,0.8],[-4,-2,0.5,0.5],[-2,-4,0.5,0.5],[-5,9,0.5,0.5],[18,-2,0.5,0.5],[19,-2,0.5,0.5],[7,-5,1,1.1],[8,-5,1,1.1],[6,-1,1,1.1],[7,-1,1,1.1],[14,5,1,1.1],[16,0,1,1.1],[16,1,1,1.1],[-6,-1,0.5,0.5],[16,-5,0.5,0.5],[-5,-4,0.5,0.5],[0,14,0.5,0.5],[0,-5,0.5,0.5],[10,4,0.5,0.5],[18,1,0.5,0.5],[9,9,3.7,3.3],[0,1,2,1.9],[9,4,0.5,0.5],[19,11,0.5,0.5],[10,16,0.5,0.5],[8,5,1,1],[9,5,1,1],[13,8,1,1],[18,9,0.8,0.8],[17,9,0.8,0.8],[0,10,0.3,1.2],[14,3,0.3,1.2],[14,-1,0.3,1.2],[11,3,0.3,1.2],[12,10,0.3,1.2],[7,8,0.3,1.2],[5,5,0.3,1.2],[-1,1,0.3,1.2],[-1,6,0.3,1.2],[14,8,0.3,1.2],[17,5,0.3,1.2],[17,9,0.3,1.2],[12,-4,0.3,1.2],[3,-3,0.3,1.2],[-6,0,0.5,0.5],[-3,0,0.5,0.5],[-3,-3,0.5,0.5],[-5,11,0.5,0.5],[15,13,0.5,0.5],[17,-4,0.5,0.5],[10,13,0.5,0.5],[1,2,1.5,1.6],[11,5,1.5,1.6],[12,9,1.5,1.6],[2,8,1.5,1.6],[-5,-1,1,1],[8,3,1.1,1.1],[7,8,1.1,1.1],[6,1,2,4],[3,2,3.8,3.8],[3,4,1,1],[2,4,1,1],[1,4,1,1],[3,5,1,1]];
  const objectRects=placements.map(([sx,sy,w,h])=>({x:Math.round((sx-origin.x)*TILE),y:Math.round((sy-origin.y)*TILE),w:Math.round(w*TILE),h:Math.round(h*TILE)}));
  const colliders=objectRects.map((o,i)=>({id:'pixellab-'+i,x:Math.round(o.x+o.w*.17),y:Math.round(o.y+o.h*.68),w:Math.max(16,Math.round(o.w*.66)),h:Math.max(16,Math.round(o.h*.3))}));
  const terrainWalkable=(x,y,r=10)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>passable(x+dx,y+dy));
  const spawn=point(5,9);
  const npcs={luffy:point(20,6),nami:point(10,3),ryuma:{x:point(6,7).x-16,y:point(6,7).y-16},donquixote:point(10,9)};
  const portals=[{id:'world-map',kind:'hunt',...point(21,8),radius:46}];
  const paths=[spawn,point(3,2),point(12,8),point(20,7)];
  const map={id:'lobby',width:data.width*TILE,height:data.height*TILE,origin:{x:0,y:0},spawn,
    colliders,terrainWalkable,navigationGoals:paths,spawnZones:[],safeZones:[{...spawn,radius:140}],
    interactions:portals,navigationCell:32};
  const image=typeof Image!=='undefined'?new Image():null;
  if(image)image.src='assets/lobby-map.png';
  function ground(ctx,camera,width,height){
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete&&image.naturalWidth){
      const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
      const w=Math.min(width+2,map.width-x),h=Math.min(height+2,map.height-y);
      if(w>0&&h>0)ctx.drawImage(image,x,y,w,h,x,y,w,h);
    }else{ctx.fillStyle='#087bd0';ctx.fillRect(camera.x,camera.y,width,height);}
    ctx.restore();
  }
  function foreground(ctx,hero){
    if(!image?.complete||!image.naturalWidth)return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const o of objectRects){const x=Math.max(o.x,hero.x-42),y=Math.max(o.y,hero.y-98),right=Math.min(o.x+o.w,hero.x+42),bottom=Math.min(o.y+o.h,hero.y+12);if(right>x&&bottom>y)ctx.drawImage(image,x,y,right-x,bottom-y,x,y,right-x,bottom-y);}
    ctx.restore();
  }
  root.MareLobby={data,point,terrain,terrainWalkable,colliders,spawn,npcs,portals,paths,map,ground,foreground,image};
  if(typeof module!=='undefined')module.exports=root.MareLobby;
})(globalThis);
