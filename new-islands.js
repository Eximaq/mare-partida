'use strict';
/* Existing PixelLab terrain grids and full-resolution map exports. No runtime art service. */
((root)=>{
  const TILE=64, sources=root.MareNewIslandData;
  const placedObjects=root.MareNewIslandObjects||(typeof module!=='undefined'?require('./new-islands-objects.js'):null);
  const definitions={
    rare:{wood:'ei',walkable:'eicrag',preferred:{x:12,y:4},sectors:[['entrada','Cais de Madeira',16,5],['subbosque','Bosque dos Cocox',23,10],['mata-fechada','Mata Fechada',31,17],['copa-antiga','Copa Antiga',43,9]]},
    syrup:{walkable:'ugm',south:'u',sectors:[['entrada','Estrada do Sul',11,4],['vila-baixa','Vila Baixa',9,-9],['praça','Praça dos Gatos',2,-17],['bosque','Bosque de Syrup',19,-20]]},
    baratie:{walkable:'cht',south:'c',sectors:[['entrada','Salão Sul',1,-1],['salão','Salão de Jantar',1,-6],['convés','Convés Principal',5,-11],['cozinha','Cozinha',1,-17]]},
    arlong:{wood:'c',walkable:'ch',preferred:{x:12,y:8},sectors:[['entrada','Passarela do Porto',12,5],['ala-oeste','Ala Oeste',7,1],['ala-leste','Ala Leste',17,1],['palacio','Praça do Palácio',12,-3]]}
  };
  function create(id){
    const data=sources[id],def=definitions[id],{rows,width,height,sourceOrigin}=data;
    const at=(x,y)=>x<0||y<0||x>=width||y>=height?'.':rows[y][x];
    const cell=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
    const sourceCell=(x,y)=>cell(x-sourceOrigin.x,y-sourceOrigin.y);
    const colliders=placedObjects[id].placements.map(([assetIndex,sx,sy,sw,sh],index)=>{
      const asset=placedObjects[id].assets[assetIndex];
      const tree=asset==='21d6c94c-29cb-440d-87d7-f2e6e54fb923';
      const counter=id==='baratie'&&asset==='6b548885-4803-4c22-b874-cacbaf37b87b';
      const w=tree?28:Math.max(16,Math.round(sw*TILE*(counter ? .75 : .72)));
      const h=tree?24:Math.max(14,Math.round(sh*TILE*(counter ? .32 : .42)));
      const center=sourceCell(sx,sy);
      return {id:id+'-object-'+index,x:Math.round(center.x-w/2),y:Math.round(center.y+11-h),w,h};
    }).filter((o,index)=>o.x+o.w>0&&o.y+o.h>0&&o.x<width*TILE&&o.y<height*TILE&&(id!=='arlong'||def.walkable.includes(at(placedObjects[id].placements[index][1]-sourceOrigin.x,placedObjects[id].placements[index][2]-sourceOrigin.y))));
    const blocked=(x,y,r=10)=>colliders.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h);
    const valid=(x,y,allowed=def.walkable)=>allowed.includes(at(x,y));
    const clear=(x,y,allowed)=>valid(x,y,allowed)&&!blocked(cell(x,y).x,cell(x,y).y)&&valid(x-1,y,allowed)&&valid(x+1,y,allowed)&&valid(x,y-1,allowed)&&valid(x,y+1,allowed);
    const closest=(x,y,allowed=def.walkable,requireNeighbors=true)=>{
      let best=null,score=Infinity;
      for(let cy=1;cy<height-1;cy++)for(let cx=1;cx<width-1;cx++){
        if(!(requireNeighbors?clear(cx,cy,allowed):valid(cx,cy,allowed)&&!blocked(cell(cx,cy).x,cell(cx,cy).y)))continue;
        const d=(cx-x)**2+(cy-y)**2;
        if(d<score){score=d;best={tx:cx,ty:cy,...cell(cx,cy)};}
      }
      return best;
    };
    let spawn;
    if(def.wood){
      const x=def.preferred.x-sourceOrigin.x,y=def.preferred.y-sourceOrigin.y;
      spawn=closest(x,y,def.wood,false);
    }else{
      const allowed=def.south,candidates=[];
      for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)if(clear(x,y,allowed))candidates.push({x,y});
      const deepest=Math.max(...candidates.map(p=>p.y));
      const chosen=candidates.filter(p=>p.y>=deepest-2).sort((a,b)=>Math.abs(a.x-width/2)-Math.abs(b.x-width/2))[0];
      spawn=chosen&&{tx:chosen.x,ty:chosen.y,...cell(chosen.x,chosen.y)};
    }
    if(!spawn)throw Error('No valid player spawn on '+id);
    const districts=def.sectors.map(([sectorId,name,sx,sy])=>{
      const point=closest(sx-sourceOrigin.x,sy-sourceOrigin.y);
      if(!point)throw Error('No monster sector on '+id);
      return {id:sectorId,name,x:point.x,y:point.y,tx:point.tx,ty:point.ty};
    });
    const returnPoint={id:'return',x:spawn.x,y:spawn.y,radius:40};
    const ground=(x,y,r=0)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>valid(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE)));
    const map={id,width:width*TILE,height:height*TILE,origin:{x:0,y:0},spawn:cell(spawn.tx,spawn.ty),colliders,terrainWalkable:ground,navigationGoals:districts,spawnZones:districts.map(d=>({id:d.id,x:d.x-160,y:d.y-160,w:320,h:320})),safeZones:[{x:spawn.x,y:spawn.y,radius:140}],interactions:[returnPoint],navigationCell:32};
    return {id,data,at,valid,cell,sourceCell,closest,spawn:map.spawn,districts,returnPoint,map};
  }
  const islands=Object.fromEntries(Object.keys(definitions).map(id=>[id,create(id)]));
  const images={};
  if(typeof Image!=='undefined')for(const id of Object.keys(islands)){const image=new Image();image.src='assets/new-islands/'+id+'-map.png';images[id]=image;}
  function ground(ctx,id,camera,width,height){
    const image=images[id],map=islands[id]?.map;if(!map)return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete&&image.naturalWidth){const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),w=Math.min(width+2,map.width-x),h=Math.min(height+2,map.height-y);if(w>0&&h>0)ctx.drawImage(image,x,y,w,h,x,y,w,h);}
    else{ctx.fillStyle=id==='rare'||id==='arlong'?'#116f85':id==='syrup'?'#4d823c':'#69442d';ctx.fillRect(camera.x,camera.y,width,height);}
    ctx.restore();
  }
  function environment(ctx,id,time){const p=islands[id]?.returnPoint;if(!p)return;ctx.save();ctx.strokeStyle='#ead8a4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,28+Math.sin(time*2),12,0,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#fff2cf';ctx.fillText('Voltar ao porto',p.x,p.y+30);ctx.restore();}
  root.MareNewIslands={...islands,ground,environment,images};
  if(typeof module!=='undefined')module.exports=root.MareNewIslands;
})(globalThis);
