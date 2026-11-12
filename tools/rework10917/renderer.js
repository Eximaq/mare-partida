/* Isolated DRAWN8 review adapter. No gameplay timeline, old-base fallback or save writes. */
(function(root){
'use strict';
function create(manifest,{review=false,loadImage}={}){
 if(manifest.schema!=='drawn8-authored-review-v1'||manifest.productionEnabled!==false)throw Error('Review-only manifest required');
 const cache=new Map(),pending=new Map();
 function resolve(q){
  if(review!==true||!q||!Number.isInteger(q.state))return null;
  const item=manifest.items[String(q.item)];
  if(!item||q.body!==item.body||q.direction!==item.direction||q.appearance!==item.appearance)return null;
  const frame=item.frames.find(f=>f.state===q.state);
  return frame?{item,frame,key:frame.approved}:null;
 }
 async function prepare(q){
  const v=resolve(q);if(!v)return false;if(cache.has(v.key))return true;
  if(!pending.has(v.key))pending.set(v.key,Promise.resolve().then(()=>loadImage(v.key)).then(image=>{
   if(image.width!==v.item.frame[0]*v.item.density||image.height!==v.item.frame[1]*v.item.density)throw Error('Invalid frame dimensions');
   cache.set(v.key,image);return true;
  }).finally(()=>pending.delete(v.key)));
  return pending.get(v.key);
 }
 function draw(ctx,q,{x=0,y=0,scale=1}={}){
  const v=resolve(q),im=v&&cache.get(v.key);if(!im)return false;
  if(![x,y,scale].every(Number.isFinite)||scale<=0)return false;
  const [w,h]=v.item.frame,[px,py]=v.item.pivot;
  ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(im,0,0,im.width,im.height,x-px*scale,y-py*scale,w*scale,h*scale);}finally{ctx.restore();}return true;
 }
 return Object.freeze({prepare,draw});
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.MareRework10917Review=api;
})(typeof globalThis!=='undefined'?globalThis:this);
