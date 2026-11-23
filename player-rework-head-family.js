/* Approved head-family pieces on the live rig. No body snapshot is rendered. */
(function(root){'use strict';
const TYPES={'hair_user_adjustments_source-only_v1':'hairFemale','male_hair_user_adjustments_source-only_v1':'hairMale','headgear_user_adjustments_source-only_v1':'headFemale','male_headgear_user_adjustments_source-only_v1':'headMale'};
const path=s=>'tools/rework-accessories/assets/'+s+'.png';
function create(index,{appearanceAPI,vendor=root.ReworkAccessoryVendor,makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}}={}){
 if(index?.schema!=='rework-head-layer-index-v1'||!vendor||!appearanceAPI)throw Error('Missing rework head dependencies');
 let diagnostic='not-resolved';const families=new Map();
 // Some source-only helmets are supplied separately from the adjusted hairstyle.
 // Register both native rasters only when the skull and the two anchors coincide.
 const helmetPairs=new Map();
 function registeredHelmet(body,direction,style,item){
  const key=[body,direction,style,item].join('/');if(helmetPairs.has(key))return helmetPairs.get(key);
  const own=index.maleOriginalGear?.find(r=>r.body===body&&r.direction===direction&&r.item===item);
  if(!own)return null;
  const hair=index.records.find(r=>r.body===body&&r.direction===direction&&r.style===style&&r.item==null);
  const authored=index.records.find(r=>r.body===body&&r.style===style&&r.item===item&&r.headgearPolicy?.nose);
  if(!hair||!authored)return null;
  const dir=hair.entry.pack.directions[direction],gearDir=own.entry.pack.directions[direction],policy=gearDir.headgearPolicy;
  const skull=d=>d.layers.find(l=>l.slot==='headBase')?.source,gear=gearDir.layers.find(l=>l.id===policy?.gearId);
  const adjust=own.adjustmentRecord.adjustment,cal=authored.headgearPolicy;
  if(!gear||gear.binding?.kind!=='fixed'||own.density!==4||hair.density!==4||gearDir.renderMirrorFrom||dir.renderMirrorFrom||
     own.frame.width!==128||own.frame.height!==128||hair.frame.width!==128||hair.frame.height!==128||
     !skull(dir)||skull(dir)!==skull(gearDir)||!['NECK','NOSE'].every(j=>['x','y'].every(k=>dir.rest[j][k]===gearDir.rest[j][k]))||
     adjust.gearScale!==100||!Number.isFinite(adjust.gearX)||!Number.isFinite(adjust.gearY)||
     !['partial','full','none'].includes(policy.mode)||policy.mode!==cal.mode||!Number.isFinite(cal.nose.y-cal.hairline))return null;
  const registered={...hair,item,snapshot:hair.snapshot+'+'+own.snapshot,
   sourceRefs:[...new Set([...hair.sourceRefs,gear.source])],
   ownHelmet:{gear,mode:policy.mode,adjust,forehead:cal.nose.y-cal.hairline}};
  helmetPairs.set(key,registered);return registered;
 }
 function resolve({body,direction,look={}}){
  body=({masculino:'male',feminino:'female'})[body]||body;
  const unsupported=reason=>{diagnostic=reason;return null;};
  let style=look.hair?.replace(/^hair-/,'');if(style==='none')style='cropped';if(style==='original')style=look.originalHairStyle;
  if(!style)return unsupported('hair-style-not-mapped');
  if(look.face&&!['original','face-gentle','none'].includes(look.face))return unsupported('custom-face-not-mapped');
  if(look.eyeColor&&!['blue','original'].includes(look.eyeColor))return unsupported('custom-eye-color-not-mapped');
  const head=look.head;const item=head&&!['none','original'].includes(head)?Number(String(head).replace(/^(head|item|headgear)-/,'')):null;
  if(item!==null&&!Number.isFinite(item))return unsupported('head-item-not-mapped');
  const entries=index.records.filter(r=>r.body===body&&r.direction===direction&&r.style===style&&(item===null?r.item==null:r.item===item));
  if(!entries.length&&item!=null){const split=registeredHelmet(body,direction,style,item);if(split){diagnostic='registered-independent-hair-and-helmet';return split;}}
  if(entries.length!==1)return unsupported(entries.length?'ambiguous-source':'no-approved-source');
  const r=entries[0];if(r.entry.pack.directions[direction].renderMirrorFrom)return unsupported('mirror-source-not-supported');
  diagnostic=r.status==='adjustment-zero-candidate'?'adjustment-zero-candidate':'approved-head-family';return r;
 }
 function requiredFiles(r){return r?r.sourceRefs.map(path):[];}
 function compose(r,images,opts={}){
  if(!r)return null;const {look={},skinRamp,hairRamp,pose,padding=0,width=128,height=128}=opts;
  const density=4,rasterWidth=width*density,rasterHeight=height*density;
  if(!Number.isInteger(rasterWidth)||!Number.isInteger(rasterHeight)||rasterWidth<=0||rasterHeight<=0)throw Error('Invalid native raster');
  const normalized=pose?.find(p=>p.label==='NECK');const neck=opts.targetNeck||(normalized&&{x:normalized.x*128,y:normalized.y*128});if(!neck||!Number.isFinite(neck.x)||!Number.isFinite(neck.y))throw Error('Missing target logical NECK');
  const key=JSON.stringify([r.package,r.snapshot,r.direction,look.face==='none',look.hair==='none',skinRamp||null,hairRamp||null]);
  let family=families.get(key);
  if(!family){family={};
  const type=TYPES[r.package],entry=r.entry,dir=r.direction,src=new Map();for(const s of r.sourceRefs){const img=images instanceof Map?images.get(path(s))||images.get(s):images[path(s)]||images[s];if(!img)throw Error('Missing head asset '+s);src.set(s,img);}
  let pack,adjusted;
  if(type.startsWith('hair')){const a=vendor[type].adjustment(r.adjustmentRecord.adjustment,entry,dir);({pack,images:adjusted}=vendor.hairPreview.prepare(entry,dir,src,a,makeCanvas));}
  else{const a=vendor[type].adjustment(r.adjustmentRecord.adjustment);pack=vendor[type].apply(entry.pack,dir,a,entry);adjusted=vendor.headPreview.imagesForHair(pack,dir,src,a,makeCanvas);}
  if(r.ownHelmet){
   const d=pack.directions[dir],h=r.ownHelmet,nose=d.rest.NOSE;
   const headgearPolicy={gearId:h.gear.id,hairIds:d.layers.filter(l=>l.slot==='hair').map(l=>l.id),mode:h.mode,nose,
    hairline:nose.y-h.forehead,headAdjustment:{x:h.adjust.gearX,y:h.adjust.gearY,scale:100}};
   pack={...pack,directions:{[dir]:{...d,layers:[...d.layers,h.gear],headgearPolicy}}};
   adjusted=new Map(adjusted instanceof Map?adjusted:Object.entries(adjusted));adjusted.set(h.gear.source,src.get(h.gear.source));
  }
  const d=pack.directions[dir],gear=d.headgearPolicy?.gearId;
  for(const slot of ['headBase','face','hair','head']){
   const layers=d.layers.filter(l=>slot==='head'?l.id===gear:l.slot===slot&&l.id!==gear);
   const canvas=makeCanvas(512,512),map=new Map(adjusted instanceof Map?adjusted:Object.entries(adjusted));
   // Include transparent gear while rendering hair, preserving authored crown clipping.
   if(slot==='hair'&&gear){const g=d.layers.find(l=>l.id===gear);if(g){const blank=makeCanvas(512,512);layers.push({...g,source:'__mask-gear'});map.set('__mask-gear',blank);}}
   if(layers.length&&!((slot==='face'&&look.face==='none')||(slot==='hair'&&look.hair==='none')))vendor.compositor.render(canvas.getContext('2d'),{...pack,directions:{[dir]:{...d,layers}}},map,{direction:dir,frame:0,density:4});
   let pixels=canvas.getContext('2d').getImageData(0,0,512,512).data;
   const ramp=['headBase','face'].includes(slot)?skinRamp:slot==='hair'?hairRamp:null;
   if(ramp)pixels=appearanceAPI.recolor(pixels,appearanceAPI.materialMask(pixels,slot==='hair'?'hair':slot==='face'?'skin':'headSkin'),ramp);
   const colored=makeCanvas(512,512),cx=colored.getContext('2d'),data=cx.createImageData(512,512);data.data.set(pixels);cx.putImageData(data,0,0);
   // Preserve the native source raster. No 512→128 resampling occurs.
   family[slot]=colored;
  }
  families.set(key,family);while(families.size>16)families.delete(families.keys().next().value);
  }else{families.delete(key);families.set(key,family);}
  const result={},dx=Math.round((neck.x+padding-r.rest.NECK.x)*density),dy=Math.round((neck.y+padding-r.rest.NECK.y)*density);
  for(const [slot,tile]of Object.entries(family)){const out=makeCanvas(rasterWidth,rasterHeight),oc=out.getContext('2d');oc.imageSmoothingEnabled=false;oc.drawImage(tile,dx,dy);result[slot]=oc.getImageData(0,0,rasterWidth,rasterHeight).data;}
  Object.defineProperty(result,'raster',{value:{width:rasterWidth,height:rasterHeight,density,logicalWidth:width,logicalHeight:height},enumerable:false});
  return result;
 }
 return {resolve,requiredFiles,compose,composeNative:compose,get diagnostic(){return diagnostic;},get cachedFamilies(){return families.size;}};
}
const api={create};root.MareReworkHead=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
