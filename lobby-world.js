'use strict';
/* Existing 64px PixelLab Lobby map, exported without any new art generation. */
((root)=>{
  const data=root.MareLobbyMapData||(typeof module!=='undefined'?require('./lobby-map-data.js'):null);
  const TILE=data.tileSize, origin=data.sourceOrigin;
  const point=(sx,sy)=>({x:Math.round((sx-origin.x+.5)*TILE),y:Math.round((sy-origin.y+.5)*TILE)});
  const terrain=(x,y)=>data.rows[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]||'.';
  const passable=(x,y)=>'sgem'.includes(terrain(x,y));
  const colliders=[
    {id:'west-house',x:1310,y:1000,w:190,h:95},
    {id:'east-house',x:1730,y:1030,w:190,h:92},
    {id:'forge-house',x:1460,y:1210,w:210,h:112},
    {id:'market-house',x:1690,y:1460,w:195,h:90},
    {id:'dock-house',x:2190,y:1230,w:150,h:94},
    {id:'dock-cargo',x:2380,y:1010,w:190,h:130},
    {id:'square-monument',x:1550,y:1020,w:86,h:75},
    {id:'west-tree',x:1210,y:1200,w:52,h:40},
    {id:'south-tree',x:1270,y:1460,w:55,h:43},
    {id:'market-tree',x:1940,y:1490,w:54,h:48},
    {id:'north-palms',x:1440,y:560,w:82,h:48},
    {id:'west-palms',x:820,y:1150,w:90,h:45},
    {id:'south-palms',x:990,y:1700,w:90,h:48},
    {id:'east-palms',x:2200,y:1690,w:90,h:48}
  ];
  const terrainWalkable=(x,y,r=10)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>passable(x+dx,y+dy));
  const spawn=point(5,9);
  const npcs={luffy:point(20,6),nami:point(10,3),ryuma:point(6,7),donquixote:point(10,9)};
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
  root.MareLobby={data,point,terrain,terrainWalkable,colliders,spawn,npcs,portals,paths,map,ground,image};
  if(typeof module!=='undefined')module.exports=root.MareLobby;
})(globalThis);
