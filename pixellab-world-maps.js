'use strict';
/* Static integration of already-published PixelLab maps. No runtime generation. */
((root)=>{
  if(typeof module!=='undefined'){
    if(!root.MarePixelWorldMapsData)require('./pixellab-world-maps-data.js');
    if(!root.MarePixelConchasData)require('./conchas-pixellab-data.js');
  }
  const data={...(root.MarePixelWorldMapsData||{}),...(root.MarePixelConchasData?{conchas:root.MarePixelConchasData}:{})};
  if(!data.orange||!data.loguetown||!data.conchas)return;
  const CELL=64,walkable={orange:new Set(['c','g','e','m','u']),loguetown:new Set(['v','c','u','i']),conchas:new Set(['c','g','m','u','e'])};
  const imageCache={};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const worldPoint=(source,cell)=>({x:(cell[0]-source.minX+.5)*CELL,y:(cell[1]-source.minY+.5)*CELL});
  function objectCollider(source,object){
    if(source.id==='conchas'){
      const left=(object.cellX-source.minX)*CELL,top=(object.cellY-source.minY)*CELL;
      const footprintWidth=object.widthCells*CELL,footprintHeight=object.heightCells*CELL;
      const wall=['36a93476-fbe2-49db-83f6-2aa8d96f65a4','76a7682f-2c3d-433d-ba02-72e77e0f1911'].includes(object.assetId);
      const width=Math.max(8,Math.round(footprintWidth*(wall?1:.65))),height=wall?(object.widthCells===1?CELL:24):Math.max(8,Math.min(32,Math.round(footprintHeight*.2)));
      return {id:'pixellab-object-'+object.placementId,x:Math.round(left+(footprintWidth-width)/2),y:Math.round(top+CELL-height),w:width,h:height,isSolid:true,footprint:true,sourceId:object.placementId};
    }
    const width=Math.max(18,Math.min(96,object.widthCells*CELL*.58));
    const height=Math.max(16,Math.min(52,object.heightCells*CELL*.28));
    const center=worldPoint(source,[object.cellX,object.cellY]);
    const bottom=(object.cellY-source.minY+1)*CELL;
    return {id:'pixellab-object-'+object.id,x:Math.round(center.x-width/2),y:Math.round(bottom-height),w:Math.round(width),h:Math.round(height),isSolid:true,footprint:true,sourceId:object.id};
  }
  function terrainCell(source,x,y){
    const col=Math.floor(x/CELL),row=Math.floor(y/CELL);
    if(col<0||row<0||col>=source.columns||row>=source.rows)return '';
    return source.terrain[row][col]||'';
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
    const props=source.objects.map(object=>{
      // PixelLab stands_on is the bottom cell, not the top of the sprite.
      const x=(object.cellX-source.minX)*CELL,y=(object.cellY-source.minY+1-object.heightCells)*CELL;
      return {...object,x,y,width:object.widthCells*CELL,height:object.heightCells*CELL,bottomY:y+object.heightCells*CELL};
    }).sort((a,b)=>a.bottomY-b.bottomY||a.layer-b.layer);
    return {map,source,spawnCell:options.spawnCell,returnPoint:map.returnPoint,districts,props};
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
  const conchas=createMap(data.conchas,{spawnCell:[11,24],returnCell:[11,26],level:8,roles:['helmeppo'],districts:[
    {id:'areia-sul',name:'Areia Sul',cell:[11,24]},
    {id:'caminho-central',name:'Caminho Central',cell:[12,20]},
    {id:'ruas-do-porto',name:'Ruas do Porto',cell:[12,16]},
    {id:'praca-das-conchas',name:'Praça das Conchas',cell:[12,10]}
  ]});
  // The authoritative PixelLab projection already includes all scenery layers.
  conchas.projectionBaked=true;
  if(typeof Image==='function'){
    for(const [id,url] of Object.entries({orange:'assets/world-maps/orange.png',loguetown:'assets/world-maps/loguetown.png',conchas:'assets/world-maps/conchas/projection.png'})){
      const image=new Image();image.src=url;imageCache[id]=image;
    }
    for(const object of conchas.props){const key='object-'+object.assetId;if(!imageCache[key]){const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}if(right>=left)image.contentBounds={x:left,y:top,w:right-left+1,h:bottom-top+1};};image.src='assets/world-maps/conchas/objects/'+object.assetId+'.png';imageCache[key]=image;}object.image=imageCache[key];}
    const water=new Image();water.src='assets/dawn-manual/water.png';imageCache.water=water;
    const foregroundImage=new Image();foregroundImage.src='assets/world-maps/conchas/foreground.png';imageCache.conchasForeground=foregroundImage;
  }
  function ground(ctx,id,camera,width,height){
    const world=id==='conchas'?conchas:id==='orange'?orange:loguetown;
    const image=imageCache[id],map=world.map;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if((id==='orange'||id==='conchas')&&imageCache.water?.complete&&imageCache.water.naturalWidth){
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
  function environment(ctx,id,time,reduced=false){
    const destination=(id==='conchas'?conchas:id==='orange'?orange:loguetown).returnPoint;
    ctx.save();ctx.strokeStyle='#d7e8c4';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(destination.x,destination.y,reduced?24:24+Math.sin(time*2),10,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#f3e3bd';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillText('Voltar ao Lobby',destination.x,destination.y+28);ctx.restore();
  }
  function foreground(ctx,camera,width,height){
    const image=imageCache.conchasForeground;if(!image?.complete||!image.naturalWidth)return;
    const sx=clamp(camera.x,0,conchas.map.width),sy=clamp(camera.y,0,conchas.map.height),sw=Math.min(width,conchas.map.width-sx),sh=Math.min(height,conchas.map.height-sy);
    if(sw<=0||sh<=0)return;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,sw,sh,sx,sy,sw,sh);ctx.restore();
  }
  function prop(ctx,object){const image=object.image||imageCache['object-'+object.assetId];if(!image?.complete||!image.naturalWidth)return false;const crop=image.contentBounds||{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight},scale=Math.min(object.width/crop.w,object.height/crop.h),w=crop.w*scale,h=crop.h*scale;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(object.x+(object.width-w)/2),Math.round(object.bottomY-h),w,h);ctx.restore();return true;}
  function actorOverlapsProp(actor,bounds){const bottom=bounds.y+bounds.h;return actor.y<bottom&&actor.y>bounds.y&&actor.x+35>bounds.x&&actor.x-35<bounds.x+bounds.w&&actor.y-120<bottom;}
  const api={orange,loguetown,conchas,ground,environment,prop,actorOverlapsProp,worldPoint,objectCollider,imageCache,
    stats:()=>Object.fromEntries(['orange','loguetown','conchas'].map(id=>{const image=imageCache[id],world=id==='conchas'?conchas:id==='orange'?orange:loguetown;return [id,{loaded:!!(image?.complete&&image.naturalWidth),colliders:world.map.colliders.length,objects:world.props.length||0,loadedObjects:world.props.filter(o=>o.image?.complete&&o.image.naturalWidth).length}];}))};
  root.MarePixelWorldMaps=api;
  root.MarePixelMapRenderer=Object.freeze({ground,environment,foreground,prop,actorOverlapsProp,stats:api.stats});
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
