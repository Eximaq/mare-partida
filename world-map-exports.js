'use strict';
/* Geometry shared by the browser and the authoritative navigation catalog. */
((root)=>{
  if(typeof module!=='undefined')require('./world-map-exports-data.js');
  const data=root.MareMapExportData;
  const step=16;
  const mapKey=id=>id?.startsWith('alubarna-')?'alubarna':id==='beach'?'dawn':id==='swamp'?'conchas':id;
  const get=id=>data[mapKey(id)];
  const imageCache=new Map();
  const base=typeof document==='undefined'?null:document.currentScript?.src;
  const square=(x,y,w,h)=>({x,y,w,h});
  function colliders(source) {
    return source.props.filter(p=>p.ground.w>0&&p.ground.h>0&&!p.decoration)
      .flatMap(p=>(p.feet||[p.ground]).map((foot,i)=>({id:i?p.id+'-'+i:p.id,...foot,blocksProjectiles:p.h>=96})));
  }
  function crossesBlockedTile(rows,ax,ay,bx,by){
    let x=Math.floor(ax/step),y=Math.floor(ay/step);
    const endX=Math.floor(bx/step),endY=Math.floor(by/step);
    const dx=bx-ax,dy=by-ay,stepX=Math.sign(dx),stepY=Math.sign(dy);
    const deltaX=dx?step/Math.abs(dx):Infinity,deltaY=dy?step/Math.abs(dy):Infinity;
    let nextX=dx?((x+(stepX>0?1:0))*step-ax)/dx:Infinity;
    let nextY=dy?((y+(stepY>0?1:0))*step-ay)/dy:Infinity;
    const blocked=(col,row)=>rows[row]?.[col]!=='g';
    while(!blocked(x,y)){
      if(x===endX&&y===endY)return false;
      if(y===endY||x!==endX&&nextX<nextY){x+=stepX;nextX+=deltaX;}
      else if(x===endX||nextY<nextX){y+=stepY;nextY+=deltaY;}
      else{
        if(blocked(x+stepX,y)||blocked(x,y+stepY))return true;
        x+=stepX;y+=stepY;nextX+=deltaX;nextY+=deltaY;
      }
    }
    return true;
  }
  const footprintOffsets=r=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[-r,0],[r,0],[0,-r],[0,r]];
  function build(id,old={}){
    const source=get(id), {width,height,rows}=source;
    const blocked=colliders(source);
    const pass=(x,y)=>rows[Math.floor(y/step)]?.[Math.floor(x/step)]==='g';
    const ground=(x,y,r=10)=>footprintOffsets(r).every(([dx,dy])=>pass(x+dx,y+dy));
    const segmentBlocked=(a,b,r)=>footprintOffsets(r).some(([dx,dy])=>crossesBlockedTile(rows,a.x+dx,a.y+dy,b.x+dx,b.y+dy));
    return {...old,id,width,height,origin:{x:0,y:0},navigationCell:step,
      spawn:source.spawn,colliders:blocked,terrainWalkable:ground,segmentBlocked,
      visualCoverage:{rows:source.coverage,tile:step,version:2},
      navigationGoals:source.goals||[],
      interactions:source.interactions||[],
      returnPoint:source.returnPoint,
      safeZones:source.safeZones||[],
      spawnZones:(source.districts||[]).map(p=>({id:p.id,...square(p.x-160,p.y-160,320,320)}))
    };
  }
  function install(maps){
    for(const id of [...Object.keys(maps),'marineford']){
      if(!get(id))continue;
      const map=build(id,maps[id]);
      if(maps[id])Object.assign(maps[id],map);
      else maps[id]=map;
    }
    const {lobby,dawn,alubarna}=data;
    if(root.MareLobby&&lobby.npcs){
      Object.assign(root.MareLobby.npcs,lobby.npcs);
      root.MareLobby.portals.splice(0,root.MareLobby.portals.length,...lobby.interactions);
    }
    if(root.MareDawn&&dawn.returnPoint)Object.assign(root.MareDawn.returnPoint,dawn.returnPoint);
    const update=(world,source)=>{
      if(world?.returnPoint&&source?.returnPoint)Object.assign(world.returnPoint,source.returnPoint);
      if(world?.districts&&source?.districts)for(const point of world.districts){
        const replacement=source.districts.find(p=>p.id===point.id);
        if(replacement)Object.assign(point,replacement);
      }
    };
    update(root.MareDawn,dawn);
    for(const collection of [root.MarePixelWorldMaps,root.MareNewIslands])for(const id of Object.keys(data))update(collection?.[id],data[id]);
    for(const world of Object.values(root.MareAlubarna?.worlds||{}))update(world,alubarna);
    if(root.MareQuestDungeonWorld&&data['quest-dungeons'].chest){
      Object.assign(root.MareQuestDungeonWorld.chest,data['quest-dungeons'].chest);
      Object.assign(root.MareQuestDungeonWorld.enemySpawn,data['quest-dungeons'].enemySpawn);
    }
  }
  function prepare(id){
    const key=mapKey(id);
    let img=imageCache.get(key);
    if(img)imageCache.delete(key);
    else{
      img=new Image();
      const url='assets/exported-maps/'+key+'/map.png';
      img.src=base?new URL(url,base).href:url;
    }
    imageCache.set(key,img);
    if(imageCache.size>3)imageCache.delete(imageCache.keys().next().value);
    return img;
  }
  function ground(ctx,id,camera,w,h){
    const img=prepare(id);
    if(!img.complete||!img.naturalWidth)return;
    const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
    const width=Math.min(w+2,img.naturalWidth-x),height=Math.min(h+2,img.naturalHeight-y);
    if(width>0&&height>0)ctx.drawImage(img,x,y,width,height,x,y,width,height);
  }
  root.MareMapExports={get,build,install,prepare,ground};
  if(typeof module!=='undefined')module.exports=root.MareMapExports;
})(globalThis);
