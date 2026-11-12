/* Approved head-family pieces on the live rig. No body snapshot is rendered. */
(function(root){'use strict';
const TYPES={'hair_user_adjustments_source-only_v1':'hairFemale','male_hair_user_adjustments_source-only_v1':'hairMale','headgear_user_adjustments_source-only_v1':'headFemale','male_headgear_user_adjustments_source-only_v1':'headMale'};
const path=s=>'tools/rework-accessories/assets/'+s+'.png';
function create(index,{appearanceAPI,vendor=root.ReworkAccessoryVendor,makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}}={}){
 if(index?.schema!=='rework-head-layer-index-v1'||!vendor||!appearanceAPI)throw Error('Missing rework head dependencies');
 let diagnostic='not-resolved';const families=new Map();
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
  if(entries.length!==1)return unsupported(entries.length?'ambiguous-source':'no-approved-source');
  const r=entries[0];if(r.entry.pack.directions[direction].renderMirrorFrom)return unsupported('mirror-source-not-supported');
  diagnostic=r.status==='adjustment-zero-candidate'?'adjustment-zero-candidate':'approved-head-family';return r;
 }
 function requiredFiles(r){return r?r.sourceRefs.map(path):[];}
 function compose(r,images,opts={}){
  if(!r)return null;const {look={},skinRamp,hairRamp,pose,padding=0,width=128,height=128}=opts;
  const neck=pose?.find(p=>p.label==='NECK');if(!neck)throw Error('Missing live NECK');
  const key=JSON.stringify([r.package,r.snapshot,r.direction,look.face==='none',look.hair==='none',skinRamp||null,hairRamp||null]);
  let family=families.get(key);
  if(!family){family={};
  const type=TYPES[r.package],entry=r.entry,dir=r.direction,src=new Map();for(const s of r.sourceRefs){const img=images instanceof Map?images.get(path(s))||images.get(s):images[path(s)]||images[s];if(!img)throw Error('Missing head asset '+s);src.set(s,img);}
  let pack,adjusted;
  if(type.startsWith('hair')){const a=vendor[type].adjustment(r.adjustmentRecord.adjustment,entry,dir);({pack,images:adjusted}=vendor.hairPreview.prepare(entry,dir,src,a,makeCanvas));}
  else{const a=vendor[type].adjustment(r.adjustmentRecord.adjustment);pack=vendor[type].apply(entry.pack,dir,a,entry);adjusted=vendor.headPreview.imagesForHair(pack,dir,src,a,makeCanvas);}
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
   const tile=makeCanvas(128,128),tc=tile.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(colored,0,0,512,512,0,0,128,128);family[slot]=tile;
  }
  families.set(key,family);while(families.size>16)families.delete(families.keys().next().value);
  }else{families.delete(key);families.set(key,family);}
  const result={},dx=Math.round(neck.x*128+padding-r.rest.NECK.x),dy=Math.round(neck.y*128+padding-r.rest.NECK.y);
  for(const [slot,tile]of Object.entries(family)){const out=makeCanvas(width,height),oc=out.getContext('2d');oc.imageSmoothingEnabled=false;oc.drawImage(tile,dx,dy);result[slot]=oc.getImageData(0,0,width,height).data;}
  return result;
 }
 return {resolve,requiredFiles,compose,get diagnostic(){return diagnostic;},get cachedFamilies(){return families.size;}};
}
const api={create};root.MareReworkHead=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
