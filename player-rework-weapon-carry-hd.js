/* Calibratable carry candidate. Exact source PNGs, full native canvas and authored walk bones. */
(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function create(baseIndex,carryIndex,{vendor=root.ReworkAccessoryVendor,basePrefix='tools/rework-base-hd/assets/',weaponPrefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(!vendor?.compositor)throw Error('Carry needs original compositor');const V=vendor.compositor;
 function resolve({item,body,action,direction,appearance={},equipment={}}={}){
  if(item==null)return null;
  if(![0,123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,71,72,73,74,12,13,2,3,15,1,68,67,70,69,117,109,111,17,122,4,5,113,114,115,116].includes(Number(item))||!['male','masculino'].includes(body)||!['walk','idle'].includes(action))return null;
  if(Object.entries(equipment).some(([k,v])=>k!=='weapon'&&v!=null&&!['original','none'].includes(v)))return null;
  if([123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,2,3,15,17,122,111,117].includes(Number(item))&&[appearance.skin,appearance.skinColor].some(v=>v&&v!=='original'))return null;
  let plan=carryIndex.records.find(r=>r.item===Number(item)&&r.direction===direction);if(!plan)return null;
  const hair=(appearance.hairStyle||appearance.hair||'original').replace(/^hair-/,'');
  const base=baseIndex.records.find(r=>r.body==='male'&&r.direction===direction&&r.action===action&&r.hairStyle===hair);if(!base)return null;
  if(direction==='west'&&!base.mirrorX){plan={...plan,parts:plan.parts.map(p=>({...p,mirrorSource:true,sourceBone:Object.fromEntries(Object.entries(p.sourceBone).map(([k,v])=>[k,{x:(p.source.nativeSize?.[0]||640)/4-v.x,y:v.y}])),targetRestBone:Object.fromEntries(Object.entries(p.targetRestBone).map(([k,v])=>[k,{x:128-v.x,y:v.y}]))}))};}
  const rest=base.pack.directions[direction].rest;
  for(const part of plan.parts)for(const name of [part.binding.a,part.binding.b])if(!rest[name]||Math.hypot(rest[name].x-part.targetRestBone[name].x,rest[name].y-part.targetRestBone[name].y)>.001)return null;
  return {id:`carry${item}-${base.id}`,item:Number(item),action,direction,base,plan,colorAppearance:appearance,status:'candidate-needs-visual-calibration'};
 }
 function requiredFiles(r,{frame}={}){const refs=r?(frame===undefined?r.base.sourceRefs:[...new Set(r.base.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean))]):[];return r?[...new Set([...refs.map(s=>basePrefix+s+'.png'),...r.plan.parts.map(p=>weaponPrefix+p.source.url)])]:[];}
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r?.colorAppearance||{},appearanceAPI=root.MareAppearance96}={}){
  if(!r)throw Error('Unsupported carry identity');const p=r.base.pack,d=p.directions[r.direction],pose=d.poses[frame];if(!pose)throw Error('No authored frame');const padding=r.plan.paddingPhysical??0;if(!Number.isInteger(padding)||padding<0)throw Error('Carry padding must be a nonnegative integer');const w=p.frame.width*4+2*padding,h=p.frame.height*4+2*padding;ctx.canvas.width=w;ctx.canvas.height=h;
  const canvas=r.base.mirrorX?makeCanvas(w,h):ctx.canvas,target=r.base.mirrorX?canvas.getContext('2d'):ctx;target.clearRect(0,0,w,h);target.imageSmoothingEnabled=false;target.save();target.translate(padding,padding);try{
  const map=new Map(r.base.sourceRefs.map(s=>[s,images.get(basePrefix+s+'.png')||images.get(s)]));const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')){if(!appearanceAPI)throw Error('Carry palette API unavailable');for(const [source,image] of map){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),isHair=uses.some(l=>l.slot==='hair'),skinKind=skinMaterials?.ownership(uses),ramp=isHair?appearanceAPI.hairs[hair]?.ramp:skinKind?appearanceAPI.skins[skin]?.ramp:null;if(!ramp&&!(isHair&&hairAnatomy?.records[source]))continue;const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const data=tc.getImageData(0,0,image.width,image.height);const anatomical=isHair?hairAnatomy?.recolor(source,data.data,appearance,appearanceAPI):null;data.data.set(anatomical||appearanceAPI.recolor(data.data,isHair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,image.width,skinKind),ramp));tc.putImageData(data,0,0);map.set(source,tile);}}
  const layers=V.plan(p,r.direction,frame).filter(l=>!hiddenSlots.includes(l.slot));const operations=layers.map(l=>({depth:l.depth,layer:l}));
  for(const part of r.plan.parts){const hand=layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);if(!hand)continue; // Lateral source has no authored far hand: do not float a disconnected far gauntlet.
   operations.push({depth:hand.depth+(part.depthOffset??.1),part});}
  // Fixed WEST garment rasters are already facing WEST. Compensate for the
  // base canvas reflection only when drawing those registered layers.
  for(const op of operations.sort((a,b)=>a.depth-b.depth)){
   if(op.layer){const original=d.layers.find(l=>l.id===op.layer.id);if(original.slot==='body'&&r.plan.parts.some(q=>q.replaceBoundLayer&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b))continue;const pack={...p,directions:{[r.direction]:{...d,layers:[original]}}};const cover=r.plan.parts.find(q=>q.hideHandBeyondWrist&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b);target.save();if(cover){const a=pose[cover.binding.a],b=pose[cover.binding.b],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,L=2000,x=b.x*4,y=b.y*4;target.beginPath();target.moveTo(x+nx*L,y+ny*L);target.lineTo(x-nx*L,y-ny*L);target.lineTo(x-nx*L-ux*L,y-ny*L-uy*L);target.lineTo(x+nx*L-ux*L,y+ny*L-uy*L);target.closePath();target.clip();}if(r.preMirroredLayers?.includes(original.id)){target.translate(p.frame.width*4,0);target.scale(-1,1);}if(r.plan.paddingPhysical!==undefined){const bodyTile=makeCanvas(p.frame.width*4,p.frame.height*4);V.render(bodyTile.getContext('2d'),pack,map,{direction:r.direction,frame,density:4,clear:false});target.drawImage(bodyTile,0,0);}else V.render(target,pack,map,{direction:r.direction,frame,density:4,clear:false});target.restore();continue;}
   const q=op.part,im=images.get(weaponPrefix+q.source.url);if(!im)throw Error('Missing isolated gauntlet');const a=q.binding.a,b=q.binding.b;
   // Wrist anchored rigid transform: no weapon raster scaling/stretch; follow authored wrist and forearm rotation.
   const m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]);target.save();const offset=q.calibrationOffsetPhysical||[0,0];target.transform(m[0],m[1],m[2],m[3],m[4]*4+offset[0],m[5]*4+offset[1]);if(q.source.sourceClip){const [x,y,cw,ch]=q.source.sourceClip;target.beginPath();target.rect(x,y,cw,ch);target.clip();}if(q.mirrorSource){target.translate(q.source.nativeSize?.[0]||640,0);target.scale(-1,1);}target.drawImage(im,0,0);target.restore();
  }
  }finally{target.restore();}if(r.base.mirrorX){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0);ctx.restore();}
  return {width:w,height:h,density:4,pivot:{x:p.pivot.x*4+padding,y:p.pivot.y*4+padding},frames:d.clip.frames,fps:d.clip.fps,frame,status:r.status,physicalScale:1,source:r.id,calibrationRequired:true};
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkWeaponCarryHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
