'use strict';
/* Static integration of already-published PixelLab maps. No runtime generation. */
((root)=>{
  const data=root.MarePixelWorldMapsData;
  if(!data)return;
  const CELL=64,walkable={orange:new Set(['c','g','e','m','u']),loguetown:new Set(['v','c','u','i'])};
  const imageCache={};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const worldPoint=(source,cell)=>({x:(cell[0]-source.minX+.5)*CELL,y:(cell[1]-source.minY+.5)*CELL});
  function objectCollider(source,object){
    const width=Math.max(18,Math.min(96,object.widthCells*CELL*.58));
    const height=Math.max(16,Math.min(52,object.heightCells*CELL*.28));
    const center=worldPoint(source,[object.cellX,object.cellY]);
    const bottom=(object.cellY-source.minY+1)*CELL;
    return {id:'pixellab-object-'+object.id,x:Math.round(center.x-width/2),y:Math.round(bottom-height),w:Math.round(width),h:Math.round(height),isSolid:true,footprint:true,sourceId:object.id};
  }
  function terrainCell(source,x,y){
    const col=Math.floor(x/CELL),row=Math.floor(y/CELL);
    if(col<0||row<0||col>=source.columns||row>=source.rows)return '';
    return [...source.terrain[row]][col]||'';
  }
  function openAt(source,colliders,x,y){
    const foot={w:32,h:20},points=[
      [x-foot.w/2+1,y-foot.h+1],[x+foot.w/2-1,y-foot.h+1],
      [x-foot.w/2+1,y-1],[x+foot.w/2-1,y-1]
    ];
    if(points.some(([px,py])=>!walkable[source.id].has(terrainCell(source,px,py))))return false;
    return !colliders.some(o=>x-foot.w/2<o.x+o.w&&x+foot.w/2>o.x&&y-foot.h<o.y+o.h&&y>o.y);
  }
  function nearestOpen(source,colliders,cell,maxRing=8){
    const origin=worldPoint(source,cell);
    if(openAt(source,colliders,origin.x,origin.y))return origin;
    for(let ring=1;ring<=maxRing;ring++){
      for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
        const point=worldPoint(source,[cell[0]+dx,cell[1]+dy]);
        if(openAt(source,colliders,point.x,point.y))return point;
      }
    }
    return origin;
  }
  function createMap(source,options){
    const colliders=source.objects.map(object=>objectCollider(source,object));
    const map={
      id:source.id,width:source.columns*CELL,height:source.rows*CELL,origin:{x:0,y:0},cellSize:CELL,navigationCell:24,
      pixelLabId:source.pixelLabId,playerFootprint:{w:32,h:20},
      spawn:nearestOpen(source,colliders,options.spawnCell),
      returnPoint:nearestOpen(source,colliders,options.returnCell||options.spawnCell),
      colliders,
      terrainWalkable(x,y){
        const footprint=map.playerFootprint,points=[
          [x-footprint.w/2+1,y-footprint.h+1],[x+footprint.w/2-1,y-footprint.h+1],
          [x-footprint.w/2+1,y-1],[x+footprint.w/2-1,y-1]
        ];
        return points.every(([px,py])=>walkable[source.id].has(terrainCell(source,px,py)));
      }
    };
    const districts=options.districts.map(d=>({...d,...nearestOpen(source,colliders,d.cell),min:options.level,max:options.level,roles:[...options.roles]}));
    return {map,source,spawnCell:options.spawnCell,returnPoint:map.returnPoint,districts};
  }
  const orange=createMap(data.orange,{spawnCell:[3,11],returnCell:[2,11],level:13,roles:['mr3','cabaji'],districts:[
    {id:'cais',name:'Cais das Laranjeiras',cell:[3,11]},
    {id:'rua',name:'Rua dos Navegantes',cell:[5,2]},
    {id:'praca',name:'Praça dos Toldos',cell:[13,0]},
    {id:'armazens',name:'Armazéns da Enseada',cell:[18,7]},
    {id:'jardins',name:'Jardins do Porto',cell:[22,-7]}
  ]});
  const loguetown=createMap(data.loguetown,{spawnCell:[10,10],returnCell:[10,10],level:40,roles:['marinheiro'],districts:[
    {id:'cais',name:'Entrada Sul',cell:[10,10]},
    {id:'avenida',name:'Avenida Central',cell:[0,2]},
    {id:'praca',name:'Praça da Torre',cell:[2,-5]},
    {id:'jardins',name:'Jardins do Quartel',cell:[0,-18]}
  ]});
  if(typeof Image==='function'){
    for(const [id,url] of Object.entries({orange:'assets/world-maps/orange.png',loguetown:'assets/world-maps/loguetown.png'})){
      const image=new Image();image.src=url;imageCache[id]=image;
    }
    const water=new Image();water.src='assets/dawn-manual/water.png';imageCache.water=water;
  }
  function ground(ctx,id,camera,width,height){
    const image=imageCache[id],map=(id==='orange'?orange:loguetown).map;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(id==='orange'&&imageCache.water?.complete&&imageCache.water.naturalWidth){
      ctx.fillStyle=ctx.createPattern(imageCache.water,'repeat');
    }else ctx.fillStyle=id==='orange'?'#167fa8':'#30383d';
    ctx.fillRect(camera.x,camera.y,width,height);
    if(image?.complete&&image.naturalWidth){
      const sx=clamp(camera.x,0,map.width),sy=clamp(camera.y,0,map.height);
      const sw=Math.min(width,map.width-sx),sh=Math.min(height,map.height-sy);
      if(sw>0&&sh>0)ctx.drawImage(image,sx,sy,sw,sh,sx,sy,sw,sh);
    }
    ctx.restore();
  }
  function visualBounds(source,object){
    const w=Math.max(CELL,object.widthCells*CELL),h=Math.max(CELL,object.heightCells*CELL),center=worldPoint(source,[object.cellX,object.cellY]);
    return {x:center.x-w/2,y:center.y+CELL/2-h,w,h};
  }
  function depthProp(ctx,id,object){
    const source=id==='orange'?data.orange:data.loguetown,image=imageCache[id];
    if(!image?.complete||!image.naturalWidth)return;
    const w=Math.max(1,object.widthCells*CELL),h=Math.max(1,object.heightCells*CELL);
    const center=worldPoint(source,[object.cellX,object.cellY]),x=Math.round(center.x-w/2),y=Math.round(center.y+CELL/2-h);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(image,x,y,w,h,x,y,w,h);ctx.restore();
  }
  function environment(ctx,id,time,reduced=false){
    const destination=(id==='orange'?orange:loguetown).returnPoint;
    ctx.save();ctx.strokeStyle='#d7e8c4';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(destination.x,destination.y,reduced?24:24+Math.sin(time*2),10,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#f3e3bd';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillText('Voltar ao Lobby',destination.x,destination.y+28);ctx.restore();
  }
  const api={orange,loguetown,ground,depthProp,visualBounds,environment,worldPoint,objectCollider,imageCache,
    stats:()=>Object.fromEntries(['orange','loguetown'].map(id=>{const image=imageCache[id];return [id,{loaded:!!(image?.complete&&image.naturalWidth),colliders:(id==='orange'?orange:loguetown).map.colliders.length}];}))};
  root.MarePixelWorldMaps=api;
  root.MarePixelMapRenderer=Object.freeze({ground,depthProp,environment,stats:api.stats});
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
