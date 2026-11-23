'use strict';
const assert=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const skin=require('../player-rework-skin-hd.js'),prefix='tools/rework-base-hd/assets/';
function read(image){
 const c=cv.createCanvas(512,512),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
 const out=ctx.getImageData(0,0,512,512);c.width=1;return out;
}
// Project the original attack into walking coordinates. Only the opaque
// samples shared by the signed neck and the walk-head difference belong
// to the saved skin. Hair, eyes and clothing are composed afterwards.
function referenceWalkHead(images,neck,r,markers){
 assert.equal(neck.source,'961e610a5767deace01e30068b84874cda5a3701aaf2b2aaceff40314d02af7c');
 const own=r.ownership,source=read(images.get(prefix+neck.source+'.png')).data;
 const walk=read(images.get(prefix+own.walkHead+'.png')),w=walk.data;
 const composite=cv.createCanvas(640,640),ctx=composite.getContext('2d');
 for(const l of [...own.attackLayers].sort((a,b)=>a.depth-b.depth))ctx.drawImage(images.get(prefix+l.source+'.png'),0,0);
 const attack=ctx.getImageData(64,64,512,512).data;composite.width=1;
 const api=global.MareAppearance96,tinted=api.recolor(source,skin.mask(source,512,'anatomy'),api.skins[r.skinColor].ramp);
 const [x0,y0,x1,y1]=own.walkDifferenceBounds;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const k=(y*512+x)*4;
  if(source[k+3]===255&&[0,1,2,3].every(j=>w[k+j]===source[k+j])&&
     [0,1,2,3].some(j=>w[k+j]!==attack[k+j])){
   const color=tinted.slice(k,k+4);
   if(markers){
    // Reference-only label. Keep a precolored neck sample out of the
    // historical renderer's one-pixel hair palette pass.
    const tag=markers.colors.findIndex(c=>c.every((v,i)=>v===color[i]));
    const id=tag<0?markers.colors.push(color)-1:tag;assert(id<256);
    w.set([1,250,id,255],k);
   }else w.set(color,k);
  }
 }
 const tile=cv.createCanvas(512,512);tile.getContext('2d').putImageData(walk,0,0);return tile;
}
async function referenceApi(useSavedSkin){
 const real=global.MareFemaleNamedHairHD;
 global.MareFemaleNamedHairHD={create(...args){
  const registry=real.create(...args),primed=new Set();
  function head(base,r,images){
   const d=base.pack.directions.south,neck=d?.layers.find(l=>l.id==='chest-neck-rigid');
   if(!neck||primed.has(r.id))return registry.compose(base,r,images);
   // Compose the historical head in isolation, then draw the original body
   // with its full neck and arm planes. Each reference renderer has its own cache.
   const pack={...base.pack,directions:{...base.pack.directions,south:{...d,layers:d.layers.filter(l=>l!==neck)}}};
   const markers=useSavedSkin&&r.style==='original'&&r.hairColor?{colors:[]}:null;
   if(useSavedSkin){images=new Map(images);images.set(prefix+r.ownership.walkHead+'.png',referenceWalkHead(images,neck,r,markers));}
   const palette=global.MareAppearance96;
   if(markers)global.MareAppearance96={...palette,recolor(src,mask,ramp){
    if(src.length===4&&src[0]===1&&src[1]===250&&src[3]===255){
     const target=markers.colors[src[2]];assert(target);return target;
    }
    return palette.recolor(src,mask,ramp);
   }};
   try{const tile=registry.compose({...base,pack},r,images);primed.add(r.id);return tile;}
   finally{if(markers)global.MareAppearance96=palette;}
  }
  return {...registry,compose:head,render(ctx,base,r,imgs,opts){head(base,r,imgs);return registry.render(ctx,base,r,imgs,opts);}};
 }};
 try{const api=make();await api.ready;return api;}finally{global.MareFemaleNamedHairHD=real;}
}
module.exports={read,referenceApi};
