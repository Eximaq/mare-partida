'use strict';
/* Visual material plan only. The logical Orange map and all gameplay contracts are read-only. */
((root)=>{
  const A=root.MareTerrain||(typeof require==='function'?require('./terrain-autotile.js'):null);
  function surface(model,layout={}){
    const cells=new Map(),distance=new Map(),queue=[];
    const key=(x,y)=>x+','+y,water=(x,y)=>[model.WATER,model.WOOD].includes(model.at(x,y));
    // A narrow beach and grass verge separate incompatible materials before sprite selection.
    // This prevents three-terrain junctions; it does not change walkability or cell ownership.
    for(let y=-1;y<=model.ROWS;y++)for(let x=-1;x<=model.COLS;x++)if(water(x,y)){distance.set(key(x,y),0);queue.push([x,y]);}
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i],d=distance.get(key(x,y));if(d>=4)continue;
      for(const [dx,dy] of A.DIRECTIONS){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=model.COLS||ny>=model.ROWS||distance.has(k))continue;distance.set(k,d+1);queue.push([nx,ny]);}
    }
    for(let y=0;y<model.ROWS;y++)for(let x=0;x<model.COLS;x++){
      const logical=model.at(x,y),d=distance.get(key(x,y))??4;
      const value=water(x,y)?'water':d===1?'sand':logical===model.STREET&&d>=3?'stone':'grass';cells.set(key(x,y),value);
    }
    // Planned soil areas: sheltered ground beside the tavern and a sandy quay workyard.
    // One-cell material buffers avoid unsupported triple junctions without hiding them.
    function paint(r,material,verge=false){for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(!water(x,y)&&(!verge||distance.get(key(x,y))>1))cells.set(key(x,y),material);}
    for(const area of layout.workyards||[]){paint(area.verge,'grass',true);paint(area.sand,'sand');paint(area.soil,'dirt');}
    for(const area of layout.soil||[])paint(area,'dirt');
    return{at:(x,y)=>cells.get(key(x,y))||'water',distance:(x,y)=>distance.get(key(x,y))??4};
  }
  function configure(model,manifest,images){
    if(manifest.world_tile_size!==model.TILE||manifest.chunk_size%model.TILE)throw Error('Terrain/world grid mismatch');
    const pairs=Object.values(manifest.sets).map(s=>({...s,image:images[s.url],rules:A.wang({tiles:s.tiles})}));
    if(pairs.some(s=>!s.image?.naturalWidth))throw Error('Missing terrain atlas');
    const bases={};for(const [name,source] of Object.entries(manifest.bases)){const s=manifest.sets[source.set],p=pairs.find(p=>p.url===s.url);bases[name]={image:p.image,rect:p.rules.get(source.mask)};}
    const variants={};for(const [material,urls] of Object.entries(manifest.variants||{}))variants[material]=urls.map(url=>({image:images[url],rect:{x:0,y:0,width:32,height:32}}));
    const plan=surface(model,manifest.layout),quads=new Map(),joints=new Map();
    for(let y=-1;y<model.ROWS;y++)for(let x=-1;x<model.COLS;x++){
      const values=A.corners(plan.at,x,y),tile=A.choose(values,pairs,bases);
      if(tile.uniform&&variants[tile.material]?.length&&A.hash(x,y,619)%11===0){const v=variants[tile.material][A.hash(x,y,827)%variants[tile.material].length];if(v.image?.naturalWidth)Object.assign(tile,v);}
      quads.set(x+','+y,tile);
      const physical=A.corners(model.at,x,y);
      // Timber structures keep straight architectural edges over sea. On land, complete
      // authored sand/wood tiles form the quay ramp. Never draw sand backgrounds onto sea.
      if(physical.includes(model.WOOD)&&physical.every(t=>t!==model.WATER)&&physical.some(t=>t!==model.WOOD)){
        const land=physical.map(t=>t===model.WOOD?'wood':'sand');joints.set(x+','+y,A.choose(land,pairs,bases));
      }
    }
    return{model,manifest,bases,pairs,variants,plan,quads,joints};
  }
  function drawRegion(c,config,originX,originY,width,height){
    const {model,quads,joints,bases}=config,size=model.TILE;c.imageSmoothingEnabled=false;
    const left=Math.floor(originX/size)-1,top=Math.floor(originY/size)-1,right=Math.ceil((originX+width)/size),bottom=Math.ceil((originY+height)/size);
    // Base layer is the animated ocean in the caller. Opaque authored sprites cover shore/land.
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const tile=quads.get(x+','+y);if(!tile||tile.uniform&&tile.material==='water')continue;
      A.draw(c,tile,x*size+size/2-originX,y*size+size/2-originY,size);
    }
    for(let y=Math.max(0,top);y<Math.min(model.ROWS,bottom);y++)for(let x=Math.max(0,left);x<Math.min(model.COLS,right);x++)if(model.at(x,y)===model.WOOD)A.draw(c,bases.wood,x*size-originX,y*size-originY,size);
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const tile=joints.get(x+','+y);if(tile)A.draw(c,tile,x*size+size/2-originX,y*size+size/2-originY,size);}
  }
  function drawChunk(c,cx,cy,config){const n=config.manifest.chunk_size;drawRegion(c,config,cx*n,cy*n,n,n);}
  root.MareOrangeTerrain=Object.freeze({surface,configure,drawRegion,drawChunk});
  if(typeof module!=='undefined')module.exports=root.MareOrangeTerrain;
})(globalThis);
