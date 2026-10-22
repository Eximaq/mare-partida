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
    {id:'market-stall',x:1115,y:975,w:92,h:48},
    {id:'forge-chest-west',x:1655,y:1275,w:51,h:38},
    {id:'forge-chest-east',x:1722,y:1275,w:52,h:38},
    {id:'market-chest',x:1970,y:1470,w:38,h:39},
    {id:'dock-barrels-west',x:2268,y:1528,w:46,h:51},
    {id:'dock-barrels-east',x:2322,y:1528,w:44,h:51},
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
  // Only the roof/canopy pixels are copied from the existing flattened export.
  // A feet check ensures the same structure never hides a player standing in front.
  const upper=[
    {base:1095,polygon:[[1285,1010],[1360,899],[1445,920],[1510,1020],[1490,1050],[1300,1050]]},
    {base:1122,polygon:[[1720,1000],[1805,902],[1870,905],[1945,1025],[1915,1060],[1740,1060]]},
    {base:1322,polygon:[[1465,1200],[1530,1075],[1590,1070],[1685,1195],[1660,1230],[1480,1230]]},
    {base:1550,polygon:[[1655,1450],[1720,1340],[1795,1355],[1900,1450],[1870,1490],[1685,1490]]},
    {base:1324,polygon:[[2180,1210],[2240,1090],[2305,1100],[2380,1215],[2350,1250],[2200,1250]]},
    {base:1220,polygon:[[1190,1110],[1210,1060],[1250,1045],[1290,1070],[1300,1110],[1265,1140],[1210,1135]]},
    {base:1470,polygon:[[1260,1430],[1280,1390],[1330,1380],[1370,1410],[1370,1450],[1330,1470],[1280,1460]]},
    {base:1370,polygon:[[1810,1280],[1830,1220],[1880,1200],[1930,1240],[1930,1300],[1890,1320],[1830,1310]]}
  ].map(o=>({...o,x0:Math.min(...o.polygon.map(p=>p[0])),x1:Math.max(...o.polygon.map(p=>p[0])),y0:Math.min(...o.polygon.map(p=>p[1])),y1:Math.max(...o.polygon.map(p=>p[1]))}));
  function foreground(ctx,actors){
    if(!image?.complete||!image.naturalWidth)return;
    for(const o of upper){
      if(!actors.some(a=>a.y<o.base&&a.y>o.y0&&a.y-115<o.y1&&a.x+38>o.x0&&a.x-38<o.x1))continue;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();
      o.polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      ctx.drawImage(image,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0);
      ctx.restore();
    }
  }
  root.MareLobby={data,point,terrain,terrainWalkable,colliders,spawn,npcs,portals,paths,map,ground,foreground,image};
  if(typeof module!=='undefined')module.exports=root.MareLobby;
})(globalThis);
