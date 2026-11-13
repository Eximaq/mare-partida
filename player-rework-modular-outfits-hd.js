/* Original body layers + genuinely isolated authored equipment, at native density. */
(function(root){'use strict';
const canonical=b=>({masculino:'male',feminino:'female'})[b]||b;
const id=x=>x?.def??x;
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-modular-outfits-hd/assets/',allowCandidates=false,appearanceAPI=root.MareAppearance96}={}){
 if(index?.schema!=='rework-modular-outfits-hd-v1'||!vendor?.compositor)throw Error('Missing modular outfit dependencies');
 function resolve({body,direction,action,equipment={},appearance={},allowApprovedAppearance=false}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  if(!['walk','idle','attack-unarmed','attack-focus'].includes(action))return null;
  const canonicalEquipment={};for(const [key,value]of Object.entries(equipment)){const slot=({legs:'pants',coat:'torso'})[key]||key,selected=id(value);if(selected!=null&&!['none','original'].includes(selected))canonicalEquipment[slot]=Number(selected);}
  const exact=index.records.find(r=>r.approvedAppearance&&allowApprovedAppearance&&r.body===canonical(body)&&r.action===action&&r.direction===direction&&Object.keys(canonicalEquipment).length===Object.keys(r.equipment).length&&Object.entries(r.equipment).every(([slot,item])=>canonicalEquipment[slot]===item)&&Object.entries(r.approvedAppearance).every(([name,expected])=>appearance[name]===expected));
  if(exact)return exact;
  if(appearance.hair&&!['original'].includes(appearance.hair)||appearance.face&&!['original','face-gentle'].includes(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))return null;
  const matches=r=>!r.approvedAppearance&&r.body===canonical(body)&&r.direction===direction&&r.action===action&&(!r.candidate||allowCandidates)&&Object.keys(canonicalEquipment).length===Object.keys(r.equipment).length&&Object.entries(r.equipment).every(([slot,item])=>canonicalEquipment[slot]===item);
  let r=index.records.find(matches)||null;
  // A declared derived revision may supersede its exact parent, never another outfit.
  const visited=new Set();while(r&&!visited.has(r.id)){visited.add(r.id);const parent=r,d=parent.pack.directions[direction];const child=index.records.find(c=>c.sourceOutfitId===parent.id&&matches(c)&&JSON.stringify(c.pack.frame)===JSON.stringify(parent.pack.frame)&&JSON.stringify(c.pack.pivot)===JSON.stringify(parent.pack.pivot)&&c.pack.density===parent.pack.density&&JSON.stringify({...c.pack.directions[direction],layers:undefined})===JSON.stringify({...d,layers:undefined}));if(!child)break;r=child;}
  if(!r)return null;const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if(r.paletteSupportedMaterials&&(skin&&skin!=='original'&&!r.paletteSupportedMaterials.includes('skin')||hair&&hair!=='original'&&!r.paletteSupportedMaterials.includes('hair')))return null;
  if(skin&&skin!=='original'||hair&&hair!=='original'){const isolatedPants21=r.item===21&&r.body==='male'&&r.id.startsWith('male-pants21-');if(!r.paletteSourceMasks&&!isolatedPants21||skin&&skin!=='original'&&!appearanceAPI?.skins[skin]||hair&&hair!=='original'&&!appearanceAPI?.hairs[hair])return null;return {...r,isolatedPants21,id:r.id+':palette:'+String(skin||'original')+':'+String(hair||'original'),sourceId:r.id,colorAppearance:{skin:skin||'original',hairColor:hair||'original'}};}return r;
 }
 const sources=(r,frame)=>frame===undefined?r.sourceRefs:[...new Set(r.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean))];
 const requiredFiles=(r,{frame}={})=>r?[...new Set([...sources(r,frame),...(r.paletteRefs||[])])].map(s=>prefix+s+'.png'):[];
 function bindAnatomy(r,baseIndex){
  const d=r?.pack.directions[r.direction];
  if(!d||Object.keys(r.equipment||{}).length!==1||r.equipment.torso==null)return null;
  const original=baseIndex.records.find(b=>b.body===r.body&&b.direction===r.direction&&b.action===r.action&&b.hairStyle==='original');
  if(!original)return null;
  const authors=original.pack.directions[r.direction].layers;
  const ownership=new Map();
  for(const layer of d.layers.filter(l=>l.id.startsWith('base:'))){
   const author=authors.find(a=>a.id===layer.id.slice(5)&&a.slot===layer.slot&&
      (layer.frames||[layer.source]).every(source=>(a.frames||[a.source]).includes(source)));
   if(!author)return null;
   const kind=author.slot==='hair'?'hair':skinMaterials.ownership([author]);
   if(!kind||r.body==='female'&&!['body','foreground'].includes(author.slot))continue;
   ownership.set(layer,kind);
  }
  const sources=new Map();
  for(const [layer,kind] of ownership)for(const source of layer.frames||[layer.source]){
   if(sources.has(source)&&sources.get(source)!==kind)return null;
   sources.set(source,kind);
  }
  // Never apply a body's palette to a raster reused by clothing.
  if(d.layers.some(l=>!ownership.has(l)&&(l.frames||[l.source]).some(s=>sources.has(s))))return null;
  return sources.size?Object.fromEntries(sources):null;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r.colorAppearance||{},makeCanvas}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  const p=r?.pack,d=p?.directions?.[r.direction];if(!d||!Number.isInteger(frame)||frame<0||frame>=d.clip.frames)throw Error('Invalid modular authored frame');
  if(p.density!==4||ctx.canvas.width!==p.frame.width*4||ctx.canvas.height!==p.frame.height*4)throw Error('Native canvas dimensions required');
  const map=new Map();for(const s of sources(r,frame)){const image=images.get(prefix+s+'.png')||images.get(s);if(!image)throw Error('Missing original outfit asset '+s);map.set(s,image);}
  if(r.sourceRasterPadding){
   for(const [source,padding]of Object.entries(r.sourceRasterPadding)){
    const image=map.get(source);if(!image)continue;
    if(padding.sourceSize!==512||padding.offset!==64||image.width!==512||image.height!==512||ctx.canvas.width!==640||ctx.canvas.height!==640)throw Error('Invalid native source padding');
    const surface=makeCanvas?makeCanvas(640,640):ctx.canvas.ownerDocument?Object.assign(ctx.canvas.ownerDocument.createElement('canvas'),{width:640,height:640}):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(640,640):require('@napi-rs/canvas').createCanvas(640,640);
    surface.getContext('2d').drawImage(image,64,64);map.set(source,surface);
   }
  }
  if(r.baseMaterialSources){
   const eyes=root.MareReworkEyeStylesHD;
   const expression=r.body==='male'&&(eyes?.supports(appearance.face)||
    appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes?.maleSource(r);
   for(const [source,kind] of Object.entries(r.baseMaterialSources)){
    const image=map.get(source),palette=kind==='hair'?appearanceAPI?.hairs[appearance.hairColor]:appearanceAPI?.skins[appearance.skin||appearance.skinColor];
    if(!image||!palette&&expression?.source!==source)continue;
    const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');
    tc.drawImage(image,0,0);
    if(expression?.source===source){
     eyes.reshape(tc,appearance.face,expression.direction,expression.boxes);
     eyes.recolorIris(tc,expression,appearance.eyeColor);
    }
    if(palette){
     const data=tc.getImageData(0,0,tile.width,tile.height);
     const mask=kind==='hair'?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,tile.width,kind);
     data.data.set(appearanceAPI.recolor(data.data,mask,palette.ramp));
     tc.putImageData(data,0,0);
    }
    map.set(source,tile);
   }
  }
  if(r.isolatedPants21){
   for(const [source,image] of map){
    const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source);
    const hair=uses.every(l=>l.slot==='hair'),kind=skinMaterials.ownership(uses);
    const ramp=hair?appearanceAPI.hairs[appearance.hairColor]?.ramp:kind?appearanceAPI.skins[appearance.skin]?.ramp:null;
    if(!ramp)continue;
    const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');
    tc.drawImage(image,0,0);
    const data=tc.getImageData(0,0,tile.width,tile.height);
    const mask=hair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,tile.width,kind);
    data.data.set(appearanceAPI.recolor(data.data,mask,ramp));
    tc.putImageData(data,0,0);
    map.set(source,tile);
   }
  }
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
  if(r.mirrorLayerIDs?.length){
   // WEST base rasters remain EAST originals; only these identified base layers
   // are mirrored. Authored WEST garment frames are already facing WEST.
   const ids=new Set(r.mirrorLayerIDs),layers=pack.directions[r.direction].layers;
   if(r.direction!=='west'||[...ids].some(id=>!d.layers.some(l=>l.id===id)))throw Error('Invalid per-layer source mirror');
   ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
   for(const planned of vendor.compositor.plan(pack,r.direction,frame)){
    const l=layers.find(l=>l.id===planned.id);
    ctx.save();
    if(ids.has(l.id)){ctx.translate(p.pivot.x*8,0);ctx.scale(-1,1);}
    vendor.compositor.render(ctx,{...pack,directions:{[r.direction]:{...pack.directions[r.direction],layers:[l]}}},map,{direction:r.direction,frame,density:4,clear:false});
    ctx.restore();
   }
  }else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame,density:4});return {width:ctx.canvas.width,height:ctx.canvas.height,density:4,pivot:{x:p.pivot.x*4,y:p.pivot.y*4},logicalFrame:p.frame,source:r.id,frames:d.clip.frames,rest:d.rest,pose:d.poses[frame],status:r.status};
 }
 function renderWithHead(ctx,r,images,headTile,options={}){
  const d=r.pack.directions[r.direction],anchor=d.layers.find(l=>l.slot==='headBase');
  if(!anchor||headTile.width!==ctx.canvas.width||headTile.height!==ctx.canvas.height)throw Error('Separated native outfit head required');
  const source='native-outfit-head:'+r.id,layers=d.layers.filter(l=>!['headBase','face','hair'].includes(l.slot)).concat({...anchor,source,frames:undefined});
  const pack={...r.pack,directions:{[r.direction]:{...d,layers}}},adapted={...r,pack,sourceRefs:[...new Set(layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))]},map=new Map(images);
  map.set(prefix+source+'.png',headTile);
  return render(ctx,adapted,map,options);
 }
 return {resolve,bindAnatomy,requiredFiles,render,renderWithHead};
}
const api={create};root.MareReworkModularOutfitsHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
