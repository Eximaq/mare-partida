/* Original body layers + genuinely isolated authored equipment, at native density. */
(function(root){'use strict';
const canonical=b=>({masculino:'male',feminino:'female'})[b]||b;
const id=x=>x?.def??x;
function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-modular-outfits-hd/assets/',allowCandidates=false,appearanceAPI=root.MareAppearance96}={}){
 if(index?.schema!=='rework-modular-outfits-hd-v1'||!vendor?.compositor)throw Error('Missing modular outfit dependencies');
 function resolve({body,direction,action,equipment={},appearance={}}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  if(!['walk','idle','attack-unarmed','attack-focus'].includes(action))return null;
  const canonicalEquipment={};for(const [key,value]of Object.entries(equipment)){const slot=({legs:'pants',coat:'torso'})[key]||key,selected=id(value);if(selected!=null&&!['none','original'].includes(selected))canonicalEquipment[slot]=Number(selected);}
  if(appearance.hair&&!['original'].includes(appearance.hair)||appearance.face&&!['original','face-gentle'].includes(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))return null;
  const r=index.records.find(r=>r.body===canonical(body)&&r.direction===direction&&r.action===action&&(!r.candidate||allowCandidates)&&Object.keys(canonicalEquipment).length===Object.keys(r.equipment).length&&Object.entries(r.equipment).every(([slot,item])=>canonicalEquipment[slot]===item))||null;
  if(!r)return null;const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if(r.paletteSupportedMaterials&&(skin&&skin!=='original'&&!r.paletteSupportedMaterials.includes('skin')||hair&&hair!=='original'&&!r.paletteSupportedMaterials.includes('hair')))return null;
  if(skin&&skin!=='original'||hair&&hair!=='original'){if(!r.paletteSourceMasks||skin&&skin!=='original'&&!appearanceAPI?.skins[skin]||hair&&hair!=='original'&&!appearanceAPI?.hairs[hair])return null;return {...r,id:r.id+':palette:'+String(skin||'original')+':'+String(hair||'original'),sourceId:r.id,colorAppearance:{skin:skin||'original',hairColor:hair||'original'}};}return r;
 }
 const sources=(r,frame)=>frame===undefined?r.sourceRefs:[...new Set(r.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean))];
 const requiredFiles=(r,{frame}={})=>r?[...new Set([...sources(r,frame),...(r.paletteRefs||[])])].map(s=>prefix+s+'.png'):[];
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r.colorAppearance||{},makeCanvas}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  const p=r?.pack,d=p?.directions?.[r.direction];if(!d||!Number.isInteger(frame)||frame<0||frame>=d.clip.frames)throw Error('Invalid modular authored frame');
  if(p.density!==4||ctx.canvas.width!==p.frame.width*4||ctx.canvas.height!==p.frame.height*4)throw Error('Native canvas dimensions required');
  const map=new Map();for(const s of sources(r,frame)){const image=images.get(prefix+s+'.png')||images.get(s);if(!image)throw Error('Missing original outfit asset '+s);map.set(s,image);}
  if(r.paletteSourceMasks&&appearanceAPI){
   for(const [source,materials]of Object.entries(r.paletteSourceMasks)){
    const im=map.get(source);if(!im)continue;let tile=null,data=null;
    for(const [material,maskSource]of Object.entries(materials)){
     const color=material==='skin'?(appearance.skin||appearance.skinColor):appearance.hairColor;if(!color||color==='original')continue;
     const ramp=(material==='skin'?appearanceAPI.skins:appearanceAPI.hairs)[color]?.ramp;if(!ramp)throw Error('Unsupported outfit palette');
     const maskImage=images.get(prefix+maskSource+'.png')||images.get(maskSource);if(!maskImage)throw Error('Missing verified outfit palette mask');
     const surface=(w,h)=>makeCanvas?makeCanvas(w,h):ctx.canvas.ownerDocument?Object.assign(ctx.canvas.ownerDocument.createElement('canvas'),{width:w,height:h}):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):require('@napi-rs/canvas').createCanvas(w,h);
     if(!tile){tile=surface(im.width,im.height);tile.getContext('2d').drawImage(im,0,0);data=tile.getContext('2d').getImageData(0,0,im.width,im.height);}
     const mc=surface(im.width,im.height);mc.getContext('2d').drawImage(maskImage,0,0);const md=mc.getContext('2d').getImageData(0,0,im.width,im.height).data,mask=new Uint8Array(im.width*im.height);for(let i=0;i<mask.length;i++)mask[i]=md[i*4];
     data.data.set(appearanceAPI.recolor(data.data,mask,ramp));
    }
    if(tile){tile.getContext('2d').putImageData(data,0,0);map.set(source,tile);}
   }
  }
  // Garment silhouettes can be narrower than the naked calves in drawn attacks.
  // Occlude only that body layer at native resolution, never resize or rewrite assets.
  if(r.bodyOcclusion){
   const o=r.bodyOcclusion,l=d.layers.find(l=>l.id===o.layerId),key=l?.frames?.[frame]||l?.source;
   if(!key||l.binding.kind!=='fixed'||!Number.isInteger(o.belowPhysicalY)||o.belowPhysicalY<0||o.belowPhysicalY>ctx.canvas.height)throw Error('Invalid native body occlusion');
   const im=map.get(key);let surface;
   if(ctx.canvas.ownerDocument){surface=ctx.canvas.ownerDocument.createElement('canvas');surface.width=im.width;surface.height=im.height;}
   else if(typeof OffscreenCanvas!=='undefined')surface=new OffscreenCanvas(im.width,im.height);
   else if(typeof require==='function')surface=require('@napi-rs/canvas').createCanvas(im.width,im.height);
   else throw Error('Native body occlusion surface unavailable');
   const sc=surface.getContext('2d');sc.imageSmoothingEnabled=false;sc.drawImage(im,0,0);sc.clearRect(0,o.belowPhysicalY,surface.width,surface.height-o.belowPhysicalY);map.set(key,surface);
  }
  const pack=hiddenSlots.length?{...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}}:p;
  vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame,density:4});return {width:ctx.canvas.width,height:ctx.canvas.height,density:4,pivot:{x:p.pivot.x*4,y:p.pivot.y*4},logicalFrame:p.frame,source:r.id,frames:d.clip.frames,rest:d.rest,pose:d.poses[frame],status:r.status};
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkModularOutfitsHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
