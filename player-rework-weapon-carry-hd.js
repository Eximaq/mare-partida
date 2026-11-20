/* Calibratable carry candidate. Exact source PNGs, full native canvas and authored walk bones. */
(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function create(baseIndex,carryIndex,{vendor=root.ReworkAccessoryVendor,basePrefix='tools/rework-base-hd/assets/',weaponPrefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(!vendor?.compositor)throw Error('Carry needs original compositor');const V=vendor.compositor;
 function resolveHair(base,style){
  if(style==='original')return {};
  const d=base.pack.directions[base.direction],target=d.layers.filter(l=>l.slot==='hair');
  if(style==='none')return {hairLayers:[]};
  const sourceDir=base.mirrorX?'east':base.direction;
  const hair=baseIndex.records.find(r=>r.body===base.body&&r.action==='idle'&&r.direction===sourceDir&&r.hairStyle===style);
  const source=hair?.pack.directions[sourceDir],layer=source?.layers.find(l=>l.slot==='hair');
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(target.length!==1||!layer||layer.binding.kind!=='fixed'||layer.frames||
     !same(base.pack.frame,hair.pack.frame)||base.pack.density!==hair.pack.density||
     !same(base.pack.pivot,hair.pack.pivot)||!['NECK','NOSE'].every(k=>same(d.rest[k],source.rest[k])))return null;
  return {hairLayers:[{...target[0],id:layer.id,source:layer.source}],hairSource:hair.id};
 }
 function verifiedMechanical119SouthPlan(p){
  const xy=(q,x,y)=>q?.x===x&&q.y===y,wh=(q,w,h)=>q?.length===2&&q[0]===w&&q[1]===h,
    bones=[['RIGHT SHOULDER',68.97607655502392,64.45933014354067],
      ['RIGHT ELBOW',65.30143540669857,75.86602870813397],['RIGHT ARM',63.464114832535884,89.41626794258373]],
    shas=['69546df73ee8ceba1a6432a57b715868ae669c49f03122969ce13cd694606dc7',
      '43562d1350ba4b1602f6c7e68387761930b9bac71c8e5d7874696648d431d629'];
  return p.item===119&&p.body==='male'&&p.direction==='south'&&p.sourceDirection==='south'&&
    p.targetWalkRecord==='male-walk-south-r7'&&wh(p.targetNativeCanvas,512,512)&&p.paddingPhysical==null&&
    p.mirrorEntireComposition===false&&p.segmentedArm===true&&p.canUseSameRegistrationForIdle===false&&p.parts.length===2&&
    p.parts.every((q,i)=>{const a=bones[i][0],b=bones[i+1][0],h=shas[i],s=q.source;
      return q.side==='RIGHT'&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&
        q.replaceBoundLayer===true&&!q.hideHandBeyondWrist&&!q.skinMaterial&&!q.mirrorSource&&q.depthOffset===0&&
        wh(q.calibrationOffsetPhysical,0,0)&&s?.sha256===h&&s.url==='assets/'+h+'.png'&&
        wh(s.size,640,640)&&wh(s.nativeSize,640,640)&&!s.sourceClip&&bones.slice(i,i+2).every(([k,x,y])=>
          xy(q.sourceBone?.[k],x,y)&&xy(q.targetRestBone?.[k],x-16,y-16));
    });
 }
 function resolve({item,body,action,direction,appearance={},equipment={},pureRelic32Saved=false,pureCompass16Saved=false,mechanical119SouthSaved=false}={}){
  if(item==null)return null;
  if(![0,123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,71,72,73,74,12,13,2,3,15,1,68,67,70,69,117,109,111,17,122,4,5,113,114,115,116].includes(Number(item))||!['male','masculino'].includes(body)||!['walk','idle'].includes(action))return null;
  if(Object.entries(equipment).some(([k,v])=>k!=='weapon'&&v!=null&&!['original','none'].includes(v)))return null;
  let plan=carryIndex.records.find(r=>r.item===Number(item)&&r.direction===direction);if(!plan)return null;
  const skin=appearance.skin||appearance.skinColor;
  const skinLocked=[123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,2,3,15,17,122,111,117].includes(Number(item));
  const item32SHA='b5ef89a85da05dae52d7151d74991cc81290932a9bc102856d71c985305991b8',part=plan.parts[0];
  const walks={north:'v7-male-walk-drawn-north-north',south:'male-walk-south-r7',east:'v7-male-walk-drawn-east-east',west:'v7-male-walk-drawn-east-east-mirror-west-candidate'},
   lateral=['east','west'].includes(direction),side=lateral?'RIGHT':'LEFT';
  const pure=Number(item)===32&&Object.hasOwn(walks,direction)&&pureRelic32Saved&&
    Object.keys(equipment).length===1&&equipment.weapon===32&&plan.targetWalkRecord===walks[direction]&&
    plan.item===32&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='original/equipment/00-unoccluded.png'&&part.source.sha256===item32SHA&&part.source.url==='assets/'+item32SHA+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,18]';
  const compass=Number(item)===16&&Object.hasOwn(walks,direction)&&pureCompass16Saved&&Object.keys(equipment).length===1&&equipment.weapon===16&&
    plan.item===16&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='Original equipment pixels under approved authored protection mask'&&
    part.source.sha256==='a5d7c7ee814eaf3c1e4ec9ae32c074eb6f53e879288b7b6eab65e468b73e91bd'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    [[part.binding.a,76],[part.binding.b,89]].every(([k,y])=>part.sourceBone?.[k]?.x===(direction==='west'?71.25:88.75)&&part.sourceBone[k]?.y===y)&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,14]';
  if(compass){
   // Original full equipment layer from the same W16 EAST F0 composite as the
   // former masked carry source, including pixels concealed by its original palm.
   const sha256='b9ff9fb23315eeae625bac311953a4fb1b1c63500045fba42be3f9954f70d0fd';
   plan={...plan,parts:[{...part,source:{...part.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'authored-ordered-16-east/0/equipment'}}]};
  }
  const mech=Number(item)===119&&direction==='south'&&mechanical119SouthSaved&&Object.keys(equipment).length===1&&equipment.weapon===119&&
    // Own F0 upper and lower arm are byte-exact to the signed anatomy+equipment
    // source and have zero contact with its independently ranked skin matte.
    verifiedMechanical119SouthPlan(plan);
  if(skin&&skin!=='original'&&skinLocked&&!pure&&!compass&&!mech&&!plan.parts.every(p=>p.skinMaterial?.sourceSHA256===p.source.sha256&&p.skinMaterial?.url))return null;
  const hair=(appearance.hairStyle||appearance.hair||'original').replace(/^hair-/,'');
  const base=baseIndex.records.find(r=>r.body==='male'&&r.direction===direction&&r.action===action&&r.hairStyle==='original');if(!base)return null;
  let relicEyes;
  if(pure||compass||mech){
   const d=base.pack.directions[direction],faces=d.layers.filter(x=>x.slot==='face'),north=direction==='north';
   if(base.id!==(action==='walk'?walks[direction]:'male-idle-original-'+direction+'-from-walk0')||!!base.mirrorX!==(direction==='west')||hair!=='original'||
      !base.headHairSeparated||!['headBase','hair','lower-redrawn',...(lateral?['handNear']:['handRight','handLeft'])].every(k=>d.layers.some(x=>x.id===k)))return null;
   const hairSources={north:'429fbd2edaed6ec4d1ad5aac24898967f731e2f30f522f73d2fb16931dcf3a06',
    south:'9f6887a18e8b7a60e6dd512e9174f8f5a627b66036dc785e13567340b1a70d93',
    east:'bc1e1701bfa4ebeef48a107262cf17e707a0393a0708e8072bd46b1d3b552d2f'};
   const source=hairSources[lateral?'east':direction],h=d.layers.filter(l=>l.slot==='hair'),mat=hairAnatomy?.records[source];
   if(h.length!==1||h[0].id!=='hair'||h[0].source!==source||h[0].frames||mat?.width!==512||mat?.height!==512||
      mat.direction!==(lateral?'east':direction)||!mat.skinRuns?.length||!root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp)return null;
   if(mech&&(!d.layers.some(l=>l.id==='armRight'&&l.depth===4&&l.binding?.a==='RIGHT SHOULDER'&&l.binding.b==='RIGHT ELBOW')||
      !d.layers.some(l=>l.id==='handRight'&&l.depth===6&&l.binding?.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM')))return null;
   if(north){if(faces.length)return null;}
   else{
    const sha=lateral?'8909af0e687972ad9153da86adb4e8374b47aaab46a1f751c344023446ba39dc':'81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449';
    const registry=root.MareReworkModularOutfitsHD,samples=lateral?registry?.sideIrisSamples('east'):registry?.southIrisSamples(),face=faces[0];
    if(faces.length!==1||face.source!==sha||face.frames?.some(h=>h!==sha)||samples?.length!==(lateral?18:45))return null;
    relicEyes={sha,samples,offset:lateral?0:64};
   }
  }
  const hairLayers=resolveHair(base,hair);
  if(!hairLayers)return null;
  if(direction==='west'&&!base.mirrorX){plan={...plan,parts:plan.parts.map(p=>({...p,mirrorSource:true,sourceBone:Object.fromEntries(Object.entries(p.sourceBone).map(([k,v])=>[k,{x:(p.source.nativeSize?.[0]||640)/4-v.x,y:v.y}])),targetRestBone:Object.fromEntries(Object.entries(p.targetRestBone).map(([k,v])=>[k,{x:128-v.x,y:v.y}]))}))};}
  const rest=base.pack.directions[direction].rest;
  for(const part of plan.parts)for(const name of [part.binding.a,part.binding.b])if(!rest[name]||Math.hypot(rest[name].x-part.targetRestBone[name].x,rest[name].y-part.targetRestBone[name].y)>.001)return null;
  return {id:`carry${item}-${base.id}${hair==='original'?'':':hair-'+hair}`,...hairLayers,...(pure?{relic32SavedPalette:true}:{}),...(compass?{compass16SavedPalette:true}:{}),...(mech?{mechanical119SouthSavedPalette:true}:{}),...(relicEyes?{relicEyes}:{}),item:Number(item),action,direction,base,plan,colorAppearance:appearance,status:'candidate-needs-visual-calibration'};
 }
 function requiredFiles(r,{frame}={}){const refs=r?(frame===undefined?[...r.base.sourceRefs]:r.base.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean)):[];if(r?.hairLayers)refs.push(...r.hairLayers.map(l=>l.source));return r?[...new Set([...refs.map(s=>basePrefix+s+'.png'),...r.plan.parts.flatMap(p=>[p.source.url,...(p.skinMaterial?[p.skinMaterial.url]:[])].map(url=>weaponPrefix+url))])]:[];}
 function applySkinMaterial(source,part,images,ramp,appearanceAPI){
  const mask=images.get(weaponPrefix+part.skinMaterial.url);
  if(part.skinMaterial.sourceSHA256!==part.source.sha256||!mask||mask.width!==source.width||mask.height!==source.height)throw Error('Invalid carry skin material');
  const tile=makeCanvas(source.width,source.height),ctx=tile.getContext('2d');
  ctx.drawImage(mask,0,0);
  const material=ctx.getImageData(0,0,source.width,source.height).data;
  ctx.clearRect(0,0,source.width,source.height);ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,source.width,source.height);
  const tones=new Uint8Array(material.length/4);
  for(let p=0;p<tones.length;p++){const i=p*4;if(material[i]&&pixels.data[i+3])tones[p]=skinMaterials.tone(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);}
  pixels.data.set(appearanceAPI.recolor(pixels.data,tones,ramp));ctx.putImageData(pixels,0,0);
  return tile;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r?.colorAppearance||{},appearanceAPI=root.MareAppearance96}={}){
  if(!r)throw Error('Unsupported carry identity');const source=r.base.pack,original=source.directions[r.direction],d=r.hairLayers?{...original,layers:original.layers.filter(l=>l.slot!=='hair').concat(r.hairLayers)}:original,p=r.hairLayers?{...source,directions:{...source.directions,[r.direction]:d}}:source,pose=d.poses[frame];if(!pose)throw Error('No authored frame');const padding=r.plan.paddingPhysical??0;if(!Number.isInteger(padding)||padding<0)throw Error('Carry padding must be a nonnegative integer');const w=p.frame.width*4+2*padding,h=p.frame.height*4+2*padding;ctx.canvas.width=w;ctx.canvas.height=h;
  const canvas=r.base.mirrorX?makeCanvas(w,h):ctx.canvas,target=r.base.mirrorX?canvas.getContext('2d'):ctx;target.clearRect(0,0,w,h);target.imageSmoothingEnabled=false;target.save();target.translate(padding,padding);try{
  const map=new Map([...r.base.sourceRefs,...(r.hairLayers||[]).map(l=>l.source)].map(s=>[s,images.get(basePrefix+s+'.png')||images.get(s)]));const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')){if(!appearanceAPI)throw Error('Carry palette API unavailable');for(const [source,image] of map){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),isHair=uses.some(l=>l.slot==='hair'),skinKind=uses.length&&uses.every(l=>r.skinRepairLayers?.includes(l.id))?'mixed':skinMaterials?.ownership(uses),ramp=isHair?appearanceAPI.hairs[hair]?.ramp:skinKind?appearanceAPI.skins[skin]?.ramp:null;if(!image||!ramp&&!(isHair&&hairAnatomy?.records[source]))continue;const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const data=tc.getImageData(0,0,image.width,image.height);const anatomical=isHair?hairAnatomy?.recolor(source,data.data,appearance,appearanceAPI):null;data.data.set(anatomical||appearanceAPI.recolor(data.data,isHair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,image.width,skinKind),ramp));tc.putImageData(data,0,0);map.set(source,tile);}}
  if(r.relicEyes){
   const {sha,samples,offset}=r.relicEyes,ramp=root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp;
   const src=images.get(basePrefix+sha+'.png')||images.get(sha),im=map.get(sha);
   if(ramp?.length!==5||src?.width!==512||src.height!==512||im?.width!==512||im.height!==512)throw Error('Missing exact Relic32 iris authority');
   const raw=makeCanvas(512,512),c=makeCanvas(512,512),rc=raw.getContext('2d'),cx=c.getContext('2d');rc.drawImage(src,0,0);cx.drawImage(im,0,0);
   const original=rc.getImageData(0,0,512,512).data,changed=cx.getImageData(0,0,512,512);
   for(const [x,y,R,G,B,A,tone] of samples){
    const i=((y-offset)*512+x-offset)*4;
    if(original[i]!==R||original[i+1]!==G||original[i+2]!==B||original[i+3]!==A||changed.data[i+3]!==A)throw Error('Relic32 unregistered iris pixel');
    const hex=parseInt(ramp[tone-1].slice(1),16);changed.data[i]=hex>>>16;changed.data[i+1]=(hex>>>8)&255;changed.data[i+2]=hex&255;
   }
   cx.putImageData(changed,0,0);map.set(sha,c);raw.width=1;
  }
  const eyes=root.MareReworkEyeStylesHD;
  const expression=!r.relic32SavedPalette&&!r.compass16SavedPalette&&eyes&&(eyes.supports(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes.maleSource(r.base);
  if(expression?.source){
   const image=map.get(expression.source),tile=makeCanvas(image.width,image.height),face=tile.getContext('2d');
   face.drawImage(image,0,0);
   eyes.reshape(face,appearance.face,expression.direction,expression.boxes);
   eyes.recolorIris(face,expression,appearance.eyeColor);
   map.set(expression.source,tile);
  }
  const layers=V.plan(p,r.direction,frame).filter(l=>!hiddenSlots.includes(l.slot));const operations=layers.map(l=>({depth:l.depth,layer:l}));
  for(const part of r.plan.parts){const hand=layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);if(!hand)continue; // Lateral source has no authored far hand: do not float a disconnected far gauntlet.
   operations.push({depth:hand.depth+(part.depthOffset??.1),part});}
  // Fixed WEST garment rasters are already facing WEST. Compensate for the
  // base canvas reflection only when drawing those registered layers.
  for(const op of operations.sort((a,b)=>a.depth-b.depth)){
   if(op.layer){const original=d.layers.find(l=>l.id===op.layer.id);if(original.slot==='body'&&r.plan.parts.some(q=>q.replaceBoundLayer&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b))continue;const pack={...p,directions:{[r.direction]:{...d,layers:[original]}}};const cover=r.plan.parts.find(q=>q.hideHandBeyondWrist&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b);target.save();if(cover){const a=pose[cover.binding.a],b=pose[cover.binding.b],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,L=2000,x=b.x*4,y=b.y*4;target.beginPath();target.moveTo(x+nx*L,y+ny*L);target.lineTo(x-nx*L,y-ny*L);target.lineTo(x-nx*L-ux*L,y-ny*L-uy*L);target.lineTo(x+nx*L-ux*L,y+ny*L-uy*L);target.closePath();target.clip();}if(r.preMirroredLayers?.includes(original.id)){target.translate(p.frame.width*4,0);target.scale(-1,1);}if(r.plan.paddingPhysical!==undefined){const bodyTile=makeCanvas(p.frame.width*4,p.frame.height*4);V.render(bodyTile.getContext('2d'),pack,map,{direction:r.direction,frame,density:4,clear:false});target.drawImage(bodyTile,0,0);}else V.render(target,pack,map,{direction:r.direction,frame,density:4,clear:false});target.restore();continue;}
   const q=op.part,im=images.get(weaponPrefix+q.source.url);if(!im)throw Error('Missing isolated equipment');
   const palette=appearanceAPI?.skins[skin]?.ramp;
   const partImage=palette&&q.skinMaterial?applySkinMaterial(im,q,images,palette,appearanceAPI):im;const a=q.binding.a,b=q.binding.b;
   // Wrist anchored rigid transform: no weapon raster scaling/stretch; follow authored wrist and forearm rotation.
   const m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]);target.save();const offset=q.calibrationOffsetPhysical||[0,0];target.transform(m[0],m[1],m[2],m[3],m[4]*4+offset[0],m[5]*4+offset[1]);if(q.source.sourceClip){const [x,y,cw,ch]=q.source.sourceClip;target.beginPath();target.rect(x,y,cw,ch);target.clip();}if(q.mirrorSource){target.translate(q.source.nativeSize?.[0]||640,0);target.scale(-1,1);}target.drawImage(partImage,0,0);target.restore();
  }
  }finally{target.restore();}if(r.base.mirrorX){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0);ctx.restore();}
  return {width:w,height:h,density:4,pivot:{x:p.pivot.x*4+padding,y:p.pivot.y*4+padding},frames:d.clip.frames,fps:d.clip.fps,frame,status:r.status,physicalScale:1,source:r.id,calibrationRequired:true};
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkWeaponCarryHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
