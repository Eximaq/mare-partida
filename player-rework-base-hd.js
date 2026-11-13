/* Full authored rework source renderer. No resampling, inferred limbs or old body. */
(function(root){'use strict';
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-base-hd/assets/'}={}){
 if(index?.schema!=='rework-full-hd-v1'||!vendor?.compositor)throw Error('Missing HD base dependencies');
 const body=b=>({masculino:'male',feminino:'female'})[b]||b;
 function resolve({body:b,action,direction,appearance={},equipment={}}={}){
  // Compatibility means authored outfit, not unrestricted appearance coverage.
  for(const k of ['torso','coat','pants','legs','gloves','boots','cloak'])if(equipment[k]&&!['original','none'].includes(equipment[k]))return null;
  if(appearance.skin&&appearance.skin!=='original')return null;
  if(appearance.face&&!['original','face-gentle'].includes(appearance.face))return null;
  const hair=(appearance.hairStyle||appearance.hair||(action==='idle'?'cropped':'original')).replace(/^hair-/,'');
  return index.records.find(r=>r.body===body(b)&&r.action===action&&r.direction===direction&&r.hairStyle===hair)||null;
 }
 const sources=(r,frame)=>frame===undefined?r.sourceRefs:[...new Set(r.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean))];
 const requiredFiles=(r,{frame}={})=>r?sources(r,frame).map(s=>prefix+s+'.png'):[];
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance={},makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),appearanceAPI=root.MareAppearance96}={}){
  if(!r)throw Error('Missing supported HD source');const p=r.pack,d=p.directions[r.direction];
  if(!Number.isInteger(frame)||frame<0||frame>=d.clip.frames)throw Error('HD source frame unavailable');
  const map=new Map();for(const s of sources(r,frame)){const im=images.get(prefix+s+'.png')||images.get(s);if(!im)throw Error('Missing original asset '+s);map.set(s,im);}
  // Palette changes preserve native dimensions/alpha; source PNGs stay immutable.
  const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')&&appearanceAPI){
   for(const source of sources(r,frame)){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),hairLayer=uses.some(l=>l.slot==='hair'),skinLayer=uses.some(l=>['body','headBase','face'].includes(l.slot));
    const ramp=hairLayer?appearanceAPI.hairs[hair]?.ramp:skinLayer?appearanceAPI.skins[skin]?.ramp:null;if(!ramp&&!(hairLayer&&hairAnatomy?.records[source]))continue;
    const image=map.get(source),w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,tile=makeCanvas(w,h),cx=tile.getContext('2d');cx.drawImage(image,0,0);const data=cx.getImageData(0,0,w,h);const anatomical=hairLayer?hairAnatomy?.recolor(source,data.data,appearance,appearanceAPI):null;data.data.set(anatomical||appearanceAPI.recolor(data.data,appearanceAPI.materialMask(data.data,hairLayer?'hair':'skin'),ramp));cx.putImageData(data,0,0);map.set(source,tile);
   }
  }
  // compositor consumes original density4 PNGs, with no intermediate 1x canvas.
  const pack=hiddenSlots.length?{...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}}:p;
  if(r.mirrorX){const native=makeCanvas(p.frame.width*p.density,p.frame.height*p.density);vendor.compositor.render(native.getContext("2d"),pack,map,{direction:r.direction,frame,density:p.density});ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(native.width,0);ctx.scale(-1,1);ctx.drawImage(native,0,0);ctx.restore();}else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame,density:p.density});
  return {width:p.frame.width*p.density,height:p.frame.height*p.density,density:p.density,pivot:{x:p.pivot.x*p.density,y:p.pivot.y*p.density},logicalFrame:p.frame,source:r.id,frames:d.clip.frames,rest:d.rest,pose:d.poses[frame],mirrorX:!!r.mirrorX,status:r.status};
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkBaseHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
