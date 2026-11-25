'use strict';
// Detached art helpers only: no clocks, hitboxes, damage, rewards or live emission.
((root)=>{
 const cache=new Map();
 const origin=typeof document!=='undefined'&&document.currentScript?.src?new URL('.',document.currentScript.src):null;
 const effect=(id,kind)=>{
  const all=root.MarePreparedDungeonBossArtData?.effects;
  return all&&Object.hasOwn(all,id)&&Object.hasOwn(all[id],kind)?all[id][kind]:null;
 };
 function image(e){
  if(typeof Image==='undefined'||!e)return null;
  if(!cache.has(e.image)){
   const im=new Image();
   if(origin){const url=new URL(e.image,origin);url.searchParams.set('revision',e.png_sha256.slice(0,16));im.src=url.href;}
   else im.src=e.image;
   cache.set(e.image,im);
  }
  return cache.get(e.image);
 }
 const valid=(im,e)=>im?.complete&&im.naturalWidth===e.size*e.frames&&im.naturalHeight===e.size;
 async function prepare(id,kind){
  const e=effect(id,kind),im=image(e);
  if(!im)return false;
  try{if(!valid(im,e))await im.decode();return !!valid(im,e);}catch{cache.delete(e.image);return false;}
 }
 function draw(c,id,kind,x,y,{frame=0,scale=1,rotation=0}={}){
  const e=effect(id,kind);
  if(!e||!Number.isFinite(scale)||scale<=0||!Number.isFinite(rotation)||
     !Number.isFinite(x)||!Number.isFinite(y)||!Number.isInteger(frame)||frame<0||frame>=e.frames)return false;
  const im=image(e);if(!valid(im,e))return false;
  const s=Math.round(e.size*scale),offX=Math.round(e.anchor[0]*scale),offY=Math.round(e.anchor[1]*scale);
  if(s<1)return false;
  c.save();c.imageSmoothingEnabled=false;
  if(rotation){c.translate(Math.round(x),Math.round(y));c.rotate(rotation);x=0;y=0;}
  c.drawImage(im,e.size*frame,0,e.size,e.size,Math.round(x)-offX,Math.round(y)-offY,s,s);
  c.restore();return true;
 }
 const api=Object.freeze({effect,prepare,draw});
 root.MarePreparedDungeonBossFx=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
