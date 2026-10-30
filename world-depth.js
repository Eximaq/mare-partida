'use strict';
/* Depth metadata and original-pixel overlays for flattened owner maps. */
((root)=>{
 const cache=new Map(),images=new Map(),overlays=new Map();let mask=null,cover=null;
 const assetIds=[...new Set([...(root.MareAlubarna?.props||[]).map(p=>p.assetId),...(root.MareAlabasta?.props||[]).map(p=>p.assetId),...(root.MareLobby?.depthObjects||[]).map(p=>p.assetId),...Object.values(root.MareNewIslandObjects||{}).flatMap(o=>o.assets),...['orange','loguetown'].flatMap(id=>root.MarePixelWorldMaps?.[id]?.source.objects.map(o=>o.assetId)||[])])];
 if(typeof Image==='function')for(const id of assetIds){const im=new Image();im.src='assets/map-depth/objects/'+id+'.png';images.set(id,im);}
 const ready=()=>[...images.values()].every(im=>im.complete&&im.naturalWidth>0);
 function maskedOverlay(p,source){const im=images.get(p.assetId);if(!im?.complete||!im.naturalWidth)return null;if(overlays.has(p))return overlays.get(p);const canvas=document.createElement('canvas');canvas.width=Math.ceil(p.w);canvas.height=Math.ceil(p.h);const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(source,p.x,p.y,p.w,p.h,0,0,p.w,p.h);c.globalCompositeOperation='destination-in';c.drawImage(im,0,0,p.w,p.h);overlays.set(p,canvas);if(overlays.size>64)overlays.delete(overlays.keys().next().value);return canvas;}

 function regions(id){if(cache.has(id))return cache.get(id);let items=[];
  if(id==='lobby'&&root.MareLobby){items=root.MareLobby.depthObjects.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,base:p.pivotY,tall:p.h>72,type:'lobby',assetId:p.assetId}));}
  else if(root.MareAlubarna?.worlds[id])items=root.MareAlubarna.props.filter(p=>p.h>40).map(p=>({...p,tall:p.h>96,type:'alubarna'}));
  else if(id==='alabasta'&&root.MareAlabasta)items=root.MareAlabasta.props.filter(p=>p.h>40).map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,base:p.base,tall:p.h>96,type:'alabasta',assetId:p.assetId}));
  else if(id==='dawn'&&root.MareDawn)items=root.MareDawn.props.map(p=>({id:p.id,x:p.bounds.x,y:p.bounds.y,w:p.bounds.width,h:p.bounds.height,base:p.y,tall:['house','tree'].includes(p.kind),type:'dawn',prop:p}));
  else if(id==='embers'&&root.MareEmber)items=root.MareEmber.props.filter(p=>!p.ground).map(p=>{const size=128*p.scale;return {id:p.id,x:p.drawX??p.x-size/2,y:p.drawY??p.y-size*.85,w:size,h:size,base:p.y,tall:size>80,type:'ember',prop:p};});
  else if(root.MarePixelWorldMaps?.[id]){items=root.MarePixelWorldMaps[id].props.map(p=>({id:p.id||p.placementId,x:p.x,y:p.y,w:p.width,h:p.height,base:p.bottomY,tall:p.height>96,type:'pixel',mapId:id,assetId:p.assetId}));if(id==='conchas')items.push(...(root.MareConchasStructures?.colliders||[]).map((p,i)=>({id:'fort-'+i,x:p.x,y:p.y-80,w:p.w,h:p.h+80,base:p.y+p.h,tall:true,type:'pixel',mapId:id})));}
  else if(root.MareNewIslands?.[id]){const world=root.MareNewIslands[id],source=root.MareNewIslandObjects[id];items=source.placements.map(([assetIndex,x,y,w,h],i)=>{const pt=world.sourceCell(x,y),tree=source.assets[assetIndex]==='21d6c94c-29cb-440d-87d7-f2e6e54fb923';return {id:id+'-'+i,x:pt.x-w*32,y:pt.y+32-h*64,w:w*64,h:h*64,base:pt.y+32,tall:h>1.5,tree,type:'island',mapId:id,assetId:source.assets[assetIndex]};});}
  const seen=new Set();items=items.filter(p=>{if(![p.x,p.y,p.w,p.h,p.base].every(Number.isFinite)||p.w<=0||p.h<=0)return false;const key=[p.type,p.x,p.y,p.w,p.h,p.base].join(':');if(seen.has(key))return false;seen.add(key);return true;});cache.set(id,items);return items;
 }
 function draw(ctx,p,actors){if(!actors.some(a=>root.MareWorld.occluded(a,[{...p,tall:true}],a.visualHeight||120,a.visualWidth||64)))return false;
  if(p.type==='dawn'){root.MareDawnRenderer.prop(ctx,p.prop,actors);return true;}
  if(p.type==='ember'){root.MareEmberRenderer.prop(ctx,p.prop);return true;}
  const image=p.type==='alubarna'?root.MareAlubarna.image:p.type==='alabasta'?root.MareAlabasta.image:p.type==='lobby'?root.MareLobby.image:p.type==='pixel'?root.MarePixelWorldMaps.imageCache[p.mapId==='conchas'?'conchasForeground':p.mapId]:root.MareNewIslands.images[p.mapId];
  if(!image?.complete||!image.naturalWidth)return false;
  if(p.mapId!=='conchas'){const overlay=maskedOverlay(p,image);if(!overlay)return false;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(overlay,p.x,p.y);ctx.restore();return true;}
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();
  if(p.tree)ctx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w/2,p.h/2,0,0,Math.PI*2);
  else ctx.rect(p.x,p.y,p.w,p.h);
  ctx.clip();ctx.drawImage(image,p.x,p.y,p.w,p.h,p.x,p.y,p.w,p.h);ctx.restore();return true;
 }
 function silhouette(ctx,actor,paint,{height=120,width=160,alpha=.48,occluders=null}={}){
  if(typeof document==='undefined')return false;mask ||= document.createElement('canvas');const w=Math.ceil(width),h=Math.ceil(height+32);if(mask.width!==w||mask.height!==h){mask.width=w;mask.height=h;}
  const c=mask.getContext('2d'),left=Math.floor(actor.x-w/2),top=Math.floor(actor.y-height);c.clearRect(0,0,w,h);c.save();c.imageSmoothingEnabled=false;c.translate(-left,-top);paint(c,actor.x,actor.y);c.restore();c.save();c.globalCompositeOperation='source-in';c.fillStyle='#edfff6';c.fillRect(0,0,w,h);c.restore();
  if(occluders){cover ||= document.createElement('canvas');if(cover.width!==w||cover.height!==h){cover.width=w;cover.height=h;}const o=cover.getContext('2d');o.clearRect(0,0,w,h);o.save();o.translate(-left,-top);for(const p of occluders)draw(o,p,[{...actor,visualHeight:height,visualWidth:width}]);o.restore();c.save();c.globalCompositeOperation='destination-in';c.drawImage(cover,0,0);c.restore();}
  ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(mask,left,top);ctx.restore();return true;
 }
 root.MareWorldDepth={regions,draw,silhouette,ready};if(typeof module!=='undefined')module.exports=root.MareWorldDepth;
})(globalThis);
