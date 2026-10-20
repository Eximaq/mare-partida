'use strict';
/* Shared sprite-based terrain rules. No DOM, collision, camera or save dependencies. */
((root)=>{
  const DIRECTIONS=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
  const hash=(x,y,seed=0)=>{let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed,1442695041))|0;n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;};
  function neighbors(at,x,y,includes){return DIRECTIONS.reduce((mask,[dx,dy],i)=>mask|(includes(at(x+dx,y+dy))?1<<i:0),0);}
  function blobMask(mask){
    let result=mask&15;
    for(const [corner,a,b] of [[16,1,2],[32,2,4],[64,4,8],[128,8,1]])if((mask&corner)&&(mask&a)&&(mask&b))result|=corner;
    return result;
  }
  const BLOB47=Object.freeze([...new Set(Array.from({length:256},(_,i)=>blobMask(i)))].sort((a,b)=>a-b));
  function rect(r){if(!r||!['x','y','width','height'].every(k=>Number.isInteger(r[k])&&r[k]>=0)||!r.width||!r.height)throw Error('Invalid native atlas rectangle');return Object.freeze({...r});}
  function wang(metadata){
    const entries=metadata.tileset_data?.tiles||metadata.tiles,tiles=new Map();
    for(const t of entries||[]){
      const c=t.corners;if(!c||['NW','NE','SW','SE'].some(k=>!['lower','upper'].includes(c[k])))throw Error('Flat Wang set requires binary corners');
      const key=(c.NW==='upper'?8:0)|(c.NE==='upper'?4:0)|(c.SW==='upper'?2:0)|(c.SE==='upper'?1:0);
      if(tiles.has(key))throw Error('Duplicate Wang rule; extended sets need their explicit placement patterns');
      tiles.set(key,rect(t.bounding_box));
    }
    if(tiles.size!==16)throw Error('Incomplete Wang16 set');return tiles;
  }
  function blob(metadata){
    const tiles=new Map();for(const t of metadata.tiles||[]){if(!BLOB47.includes(t.mask)||tiles.has(t.mask))throw Error('Invalid blob47 placement rule');tiles.set(t.mask,rect(t.bounding_box));}
    if(tiles.size!==47)throw Error('All 47 authored sprites are required');return tiles;
  }
  function corners(at,x,y){return[at(x,y),at(x+1,y),at(x,y+1),at(x+1,y+1)];}
  function choose(values,pairs,bases){
    const materials=[...new Set(values)];
    if(materials.length===1){const base=bases[materials[0]];if(!base)throw Error('Missing base '+materials[0]);return{...base,material:materials[0],uniform:true};}
    const pair=pairs.find(p=>materials.length===2&&materials.every(m=>m===p.lower||m===p.upper));
    if(!pair)throw Error('Missing authored transition: '+materials.join('/'));
    const mask=values.reduce((key,m,i)=>key|(m===pair.upper?[8,4,2,1][i]:0),0);
    return{image:pair.image,rect:pair.rules.get(mask),mask,lower:pair.lower,upper:pair.upper,uniform:false};
  }
  function draw(c,t,x,y,size){const r=t.rect;c.drawImage(t.image,r.x,r.y,r.width,r.height,x,y,size,size);}
  // A logical-cell neighborhood maps to four dual-grid quads. Together they use all eight neighbors.
  // Each dual quad is a COMPLETE authored Wang sprite; no generated polygon/quarter masks.
  function quads(cx,cy,chunkSize,tileSize,callback){
    const n=chunkSize/tileSize;if(!Number.isInteger(n))throw Error('Chunk size must divide by world tile size');
    for(let y=cy*n-1;y<cy*n+n;y++)for(let x=cx*n-1;x<cx*n+n;x++)callback(x,y,x*tileSize+tileSize/2-cx*chunkSize,y*tileSize+tileSize/2-cy*chunkSize);
  }
  root.MareTerrain=Object.freeze({DIRECTIONS,BLOB47,hash,neighbors,blobMask,wang,blob,corners,choose,draw,quads});
  if(typeof module!=='undefined')module.exports=root.MareTerrain;
})(globalThis);
