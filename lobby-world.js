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
    {id:'forge-chest-west',x:1740,y:928,w:52,h:38},
    {id:'forge-chest-east',x:1810,y:900,w:52,h:38},
    {id:'market-chest',x:2380,y:1250,w:64,h:42},
    {id:'dock-barrels-west',x:2268,y:1528,w:46,h:51},
    {id:'dock-barrels-east',x:2322,y:1528,w:44,h:51},
    {id:'square-monument',x:1550,y:1068,w:98,h:96},
    {id:'west-tree',x:1215,y:1080,w:72,h:48},
    {id:'south-tree',x:1270,y:1460,w:55,h:43},
    {id:'market-tree',x:1850,y:1235,w:75,h:55},
    {id:'central-palms',x:1310,y:1250,w:75,h:62},
    ...[[1378,840],[1976,748],[2052,928],[1240,998],[1240,1600],[1660,1514],[2004,1600],[2134,1260]].map(([x,y],i)=>({id:'lamp-'+i,x:x-12,y:y-14,w:24,h:28})),
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
    {base:1324,polygon:[[2180,1210],[2240,1090],[2305,1100],[2380,1215],[2350,1250],[2200,1250]]}
  ].map(o=>({...o,x0:Math.min(...o.polygon.map(p=>p[0])),x1:Math.max(...o.polygon.map(p=>p[0])),y0:Math.min(...o.polygon.map(p=>p[1])),y1:Math.max(...o.polygon.map(p=>p[1]))}));
  // The PixelLab export is flattened. Reuse its exact pixels for the portions
  // of each object that may cover a character, ordered by the ground footprint.
  const depthObjects=colliders.filter(o=>o.id.includes('tree')||o.id.includes('palms')).map(o=>{
    const tree=o.id.includes('tree')||o.id.includes('palms');
    const chest=o.id.includes('chest')||o.id.includes('barrels');
    const spread=tree?54:chest?10:30, rise=tree?125:chest?52:105;
    return {...o,pivotY:o.y+o.h,x0:o.x-spread,x1:o.x+o.w+spread,y0:o.y-rise,y1:o.y+o.h};
  });
  function depthProp(ctx,o){
    if(!image?.complete||!image.naturalWidth)return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.beginPath();
    if(o.id.includes('tree')||o.id.includes('palms')){
      ctx.ellipse((o.x0+o.x1)/2,o.y-42,(o.x1-o.x0)/2,Math.max(25,(o.y-o.y0)*.67),0,0,Math.PI*2);
      ctx.rect(o.x,o.y-35,o.w,o.h+35);
    }else ctx.rect(o.x0,o.y0,o.x1-o.x0,o.y1-o.y0);
    ctx.clip();ctx.drawImage(image,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0);
    ctx.restore();
  }
  // Depth uses the contact point at the ground, independently from each
  // sprite's visual height or collider dimensions (including multi-tile art).
  function pivotY(entity){
    if(Number.isFinite(entity.pivotY))return entity.pivotY;
    if(Number.isFinite(entity.pivotOffsetY))return entity.y+entity.pivotOffsetY;
    if(entity.isCharacter)return entity.y+(entity.height||0);
    return entity.y+(entity.collider?.h??entity.height??0);
  }
  function sortDepth(items){return [...items].sort((a,b)=>pivotY(a)-pivotY(b));}
  function foreground(ctx,actors){
    if(!image?.complete||!image.naturalWidth)return;
    for(const o of upper){
      if(!actors.some(a=>pivotY(a)<o.base&&pivotY(a)>o.y0&&pivotY(a)-115<o.y1&&a.x+38>o.x0&&a.x-38<o.x1))continue;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();
      o.polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      ctx.drawImage(image,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0,o.x0,o.y0,o.x1-o.x0,o.y1-o.y0);
      ctx.restore();
    }
  }
  root.MareLobby={data,point,terrain,terrainWalkable,colliders,depthObjects,depthProp,spawn,npcs,portals,paths,map,ground,foreground,pivotY,sortDepth,image};
  if(typeof module!=='undefined')module.exports=root.MareLobby;
})(globalThis);
