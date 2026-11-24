/* Named female hair on the ORIGINAL face. Explicit semantic fringe ownership; no color guessing. */
(function(root){'use strict';
const localLateralForehead={"source":{"west":"9f2d13b556a604d9bd162d00386e788b9fe0c482a6d1bac35c67e5a9992d2032","east":"5843eab2f9d0d5f4520abf1b5d605301a1f80887422caeb252ca8073f7cef773"},"rows":[[323,198,3,210,114,76,255],[324,198,2,183,84,56,255],[322,199,2,141,58,38,255],[323,199,2,169,79,55,255],[322,200,3,182,98,66,255],[322,201,3,191,103,70,255],[305,202,4,244,162,104,255],[306,202,3,184,118,85,255],[321,202,3,219,129,85,255],[322,202,2,169,85,57,255],[304,203,4,241,159,99,255],[305,203,4,241,164,106,255],[321,203,3,191,100,65,255],[322,203,2,160,77,49,255],[303,204,4,244,165,108,255],[304,204,4,250,172,113,255],[321,204,2,148,69,46,255],[322,204,2,160,80,54,255],[303,205,4,245,167,109,255],[304,205,4,251,180,125,255],[320,205,3,186,99,66,255],[321,205,2,152,77,50,255],[303,206,4,250,169,110,255],[320,206,3,205,121,78,255],[321,206,2,173,92,63,255],[319,207,4,232,148,99,255],[320,207,3,225,141,97,255],[321,207,4,227,147,99,255],[305,208,3,193,113,73,255],[306,208,3,191,109,72,255],[307,208,3,221,131,83,255],[320,208,4,243,164,104,255],[321,208,4,244,165,106,255],[309,209,4,237,147,94,255],[320,209,4,250,166,107,255],[309,210,4,239,150,97,255],[310,210,4,242,150,97,255],[311,210,4,242,157,103,255],[309,211,4,246,159,104,255],[310,211,4,247,160,104,255],[311,211,3,219,138,90,255]]};

const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const BP='tools/rework-base-hd/assets/',HP='tools/rework-accessories/assets/';
const SOUTH_NECK_SOURCE='961e610a5767deace01e30068b84874cda5a3701aaf2b2aaceff40314d02af7c',SOUTH_WALK_HEAD_SOURCE='b4dc10ba2d5cf91f2b3217536e4d6beee5d915bef54707390fc076129d3147e6';
function northNeckContact(base,r,images,back,tc,makeCanvas){
 const o=r.ownership;
 if(!r.northNeckContact||!r.fused||base.direction!=='north'||base.pack.density!==4||base.pack.frame.width!==128||base.pack.frame.height!==128||o.walkHead!=='510d5b548e70298448280c92c96495542aaa267096e832c1a4c370b499416960'||o.cleanHead!=='166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb')return;
 const source=images.get(BP+o.walkHead+'.png');if(!source||source.width!==512||source.height!==512)throw Error('Invalid NORTH neck contact source');
 const walk=makeCanvas(512,512),wc=walk.getContext('2d');wc.drawImage(source,0,0);
 const old=wc.getImageData(0,0,512,512).data,result=tc.getImageData(0,0,512,512),out=result.data;
 // Use the separated neck already in the clean head, positioned five native
 // pixels lower. Do not move the head, reshape hair, or scale a source layer.
 for(let y=165;y<=169;y++)for(let x=241;x<=273;x++){
  const i=(y*512+x)*4,donor=((y-5+64)*640+x+64)*4;
  const gap=r.style!=='original'&&y<=166&&x>=244&&x<=269&&out[i+3]===0;
  const restore=r.style!=='original'&&y>=167&&x>=242&&x<=270&&out[i+3]===255&&old[i+3]===255&&[0,1,2].every(c=>out[i+c]===old[i+c]);
  if(!gap&&!restore)continue;
  if(back[donor+3]!==255)throw Error('NORTH neck contact has no opaque original backing');
  out.set(back.subarray(donor,donor+4),i);
 }
 tc.putImageData(result,0,0);walk.width=1;
}
function profileNeckRestore(base,r,wa,i,x,y){
 if(!r.profileNeckRestore||!r.skinColor||!['east','west'].includes(base.direction))return null;
 const sources={east:'202352cb972f4fe437ca7fd43aa4d848b88a4fc98dcfc6393bb5fd0b4c1e16bd',west:'33cd3e581abb50daa48b73e462fb0e267d492b91eb061fafc075dad6a0a4421b'};
 if(r.ownership.walkHead!==sources[base.direction]||y<166||y>169||wa[i+3]!==255)return null;
 const api=root.MareAppearance96,pixel=wa.slice(i,i+4),tone=skinMaterials.tone(...pixel.subarray(0,3));
 return api.recolor(pixel,new Uint8Array([tone]),api.skins[r.skinColor].ramp);
}
function create(index,ownership,{baseRegistry,makeCanvas}={}){
 if(ownership?.schema!=='female-original-face-named-hair-v1'||!baseRegistry||!makeCanvas)throw Error('Female original-face dependencies missing');
 const cache=new Map();
 const gearRaster=(record,layer)=>{
  const approved=ownership.approvedGearRasters?.[record.snapshot];
  return approved?.originalLayer===layer.source&&approved.item===record.item&&approved.style===record.style&&approved.direction===record.direction?approved.source:layer.source;
 };
 // A gait slot is independent only when every existing hair recipe
 // agrees on the raw raster and authored occlusion policy. Recipes keep
 // controlling attachment and hair alpha, not source-art selection.
 const gaitGearPolicies={18:'partial',19:'full',129:'partial',136:'full',
  143:'partial',150:'partial',164:'none',171:'partial',178:'none'};
 const gaitGearScope=(item,direction)=>Object.hasOwn(gaitGearPolicies,item)&&
  (![18,19].includes(item)||direction==='south');
 const ownHelmetRows=[];
 for(const direction of ['north','south','east','west'])for(const [key,policy] of Object.entries(gaitGearPolicies)){
  const item=Number(key);
  if(!gaitGearScope(item,direction))continue;
  const donors=[...index.records,...(ownership.historicalGear||[])].filter(r=>r.body==='female'&&r.direction===direction&&r.item===item);
  const gear=donors.map(r=>{
   const l=r.layers.find(x=>x.id===r.headgearPolicy?.gearId);
   return r.headgearPolicy?.mode===policy&&l?.binding?.kind==='fixed'&&
    /^[a-f0-9]{64}$/.test(l.source)&&gearRaster(r,l)===l.source?l.source:null;
  });
  if(!gear.length||!gear[0]||!gear.every(h=>h===gear[0]))continue;
  const source=Object.freeze({source:gear[0],policy});
  for(const action of ['idle','walk'])ownHelmetRows.push({slot:'head',item,body:'female',action,direction,source});
 }
 const ownHelmetIndex=root.MareReworkModularOutfitsHD?.createOwnLayerIndex(ownHelmetRows);
 function resolveOwnHelmetSource(request){return ownHelmetIndex?.resolve(request)||{state:'unknown',key:null};}
 const renderGearRaster=(r,l)=>r.ownHelmetSource?.source?.source||
  (r.gearPolicy==='approved-same-hairstyle-policy'?gearRaster(r.gearRecord,l):l.source);
 // Only the submitted female hair rows, never the zero placeholders or a
 // helmet's own hair calibration. Keep the editor's native pivot/transform
 // in the source frame; the actor's NECK translation is applied separately.
 function renderArchivedHairFit(ctx,base,r,images,dx,dy){
  const src=r.source,record=src.adjustmentRecord,dir=base.direction,target=record?.target;
  if(r.gearRecord||src.item!=null||src.package!=='hair_user_adjustments_source-only_v1'||
     src.status!=='approved-adjustment'||!Number.isSafeInteger(record?.sourceAdjustmentIndex))return false;
  if(!target||src.body!=='female'||target.body!==src.body||src.direction!==dir||target.direction!==dir||
     target.style!==src.style||target.snapshot!==src.snapshot||target.packSHA256!==src.packSHA256||
     target.item!=null||record.package!==src.package)throw Error('Inconsistent approved female hair target');
  const vendor=root.ReworkAccessoryVendor,entry=src.entry,a=vendor.hairFemale.adjustment(record.adjustment,entry,dir);
  const raw=new Map(src.layers.filter(l=>l.slot==='hair').map(l=>[l.source,get(images,HP+l.source+'.png')]));
  const adjusted=vendor.hairPreview.prepare(entry,dir,raw,a,makeCanvas),d=adjusted.pack.directions[dir];
  const overlay=makeCanvas(512,512),layers=d.layers.filter(l=>l.slot==='hair');
  vendor.compositor.render(overlay.getContext('2d'),{...adjusted.pack,directions:{[dir]:{...d,layers}}},adjusted.images,{direction:dir,frame:0,density:4});
  ctx.drawImage(overlay,dx,dy);overlay.width=1;
  for(const [key,image] of adjusted.images)if(!raw.has(key))image.width=1;
  return true;
 }
 function resolve(base,options={}){
  const r=resolveOwned(base,options),{appearance={}}=options;
  const sha='f6be0704c6dd7e6347ccf48d60249904f77399801bcf2148701d695e6b342064';
  if(!r||base.body!=='female'||base.action!=='walk'||base.direction!=='south'||
     (base.sourceId??base.id)!=='v7-female-walk-drawn-all-south'||
     appearance.version!==1||appearance.eyeColor!=='blue'||(appearance.eyeStyle??appearance.face)!=='original'||
     r.style!=='cropped'||r.eyeStyle||r.eyeColor||r.gearRecord||!r.fused||r.sourceScale!==1||
     r.ownership.walkHead!==SOUTH_WALK_HEAD_SOURCE||
     r.ownership.attackLayers.filter(l=>l.id==='iris'&&l.slot==='face'&&l.source===sha).length!==1)return r;
  return {...r,id:r.id+':registered-blue-iris',eyeColor:'blue',registeredBlueIris:sha,
   faceProtectedExact:false,faceProtectedExceptIris:!r.skinColor};
 }
 function resolveOwned(base,{hair,head,appearance={}}={}){
 const item=Number(head);
 const ownHelmet=gaitGearScope(item,base.direction)&&['idle','walk'].includes(base.action)
  ?resolveOwnHelmetSource({slot:'head',item,body:base.body,action:base.action,direction:base.direction}):null;
 if(ownHelmet&&(ownHelmet.state!=='available'||ownHelmet.mirrorX))return null;
 const eyeStyle=root.MareReworkEyeStylesHD?.supports(appearance.face)?appearance.face:null;const skinColor=appearance.skin||appearance.skinColor;const customSkin=skinColor&&skinColor!=='original';if(customSkin&&base.equipment&&!base.baseMaterialSources)return null;const selectedStyle=String(hair||'original').replace(/^hair-/,'');const style=Number(head)===19&&selectedStyle==='original'?'none':selectedStyle;if(base.body!=='female'||(style==='original'&&head==null&&!eyeStyle&&!customSkin&&(!appearance.hairColor||appearance.hairColor==='original')&&(!appearance.eyeColor||['original','blue'].includes(appearance.eyeColor)))||customSkin&&!root.MareAppearance96?.skins[skinColor])return null;const eyeColor=appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor)?appearance.eyeColor:null;if(eyeColor&&!root.MareCharacterAppearance?.eyes[eyeColor])return null;const hairColor=appearance.hairColor&&appearance.hairColor!=='original'?appearance.hairColor:null;if(hairColor&&!root.MareAppearance96?.hairs[hairColor])return null;const d=base.pack.directions[base.direction],o=ownership.directions[base.direction],headLayers=d.layers.filter(l=>['headBase','face','hair'].includes(l.slot));if(!o||!headLayers.length||headLayers.some(l=>(l.frames&&l.frames.some(s=>s!==l.source))||!['rigid','fixed'].includes(l.binding?.kind)||(l.binding.kind==='rigid'&&(l.binding.a!=='NECK'||l.binding.b!=='NOSE'))))return null;const fused=headLayers.length===1&&headLayers[0].source===o.walkHead,separate=headLayers.length===o.attackLayers.length&&headLayers.every(l=>o.attackLayers.some(q=>q.source===l.source&&q.slot===l.slot));if(!fused&&!separate)return null;const source=['original','none'].includes(style)?null:index.records.find(r=>r.body==='female'&&r.direction===base.direction&&r.style===style&&r.item==null);if(!['original','none'].includes(style)&&!source)return null;const rows=head==null?[]:[...index.records,...(ownership.historicalGear||[])].filter(r=>r.body==='female'&&r.direction===base.direction&&r.item===Number(head));const exact=style==='none'?null:rows.find(r=>r.style===style),gearRecord=exact||rows.sort((a,b)=>Math.abs((a.adjustmentRecord.adjustment.gearScale??100)-100)-Math.abs((b.adjustmentRecord.adjustment.gearScale??100)-100))[0];if(head!=null&&!gearRecord)return null;
 if(ownHelmet){
  const raw=gearRecord.layers.find(l=>l.id===gearRecord.headgearPolicy?.gearId);
  if(gearRecord.headgearPolicy?.mode!==ownHelmet.source.policy||raw?.source!==ownHelmet.source.source||
     gearRaster(gearRecord,raw)!==raw.source)return null;
 }
 return {...(ownHelmet?{ownHelmetSource:ownHelmet}:{}),id:base.id+':female-original-face:'+style+':'+(head??'none')+(hairColor?':hair-palette:'+hairColor:'')+(eyeColor?':eye-palette:'+eyeColor:'')+(eyeStyle?':'+eyeStyle:'')+(customSkin?':skin-palette:'+skinColor:''),style,hairColor,eyeColor,eyeStyle,skinColor:customSkin?skinColor:null,source:exact||source,gearRecord,gearPolicy:exact?'approved-same-hairstyle-policy':'source-alpha-only',ownership:o,fused,status:'semantic-fringe-ownership-candidate',faceProtectedExact:!eyeColor&&!eyeStyle&&!customSkin,faceProtectedExceptIris:!!eyeColor&&!eyeStyle&&!customSkin,sourceScale:1};}
 function requiredFiles(r){return [...new Set([...(r.fused&&r.skinColor&&r.ownership.walkHead===SOUTH_WALK_HEAD_SOURCE?[BP+SOUTH_NECK_SOURCE+'.png']:[]),...r.ownership.attackLayers.map(l=>BP+l.source+'.png'),BP+r.ownership.walkHead+'.png',BP+r.ownership.cleanHead+'.png',...(r.source?.layers||[]).filter(l=>l.slot==='hair').map(l=>HP+l.source+'.png'),...(r.gearRecord?r.gearRecord.layers.filter(l=>l.id===r.gearRecord.headgearPolicy?.gearId).map(l=>HP+renderGearRaster(r,l)+'.png'):[])])];}
 const get=(images,p)=>{const im=images.get(p);if(!im)throw Error('Missing female face dependency '+p);return im;};
 function southNeckMaterial(base,r,images){const o=r.ownership;const neckLayer=base.pack.directions[base.direction].layers.find(l=>l.id==='chest-neck-rigid'&&l.source===SOUTH_NECK_SOURCE&&!l.frames&&l.binding?.kind==='rigid'&&l.binding.a==='NECK'&&l.binding.b==='NOSE');if(r.skinColor&&base.body==='female'&&base.direction==='south'&&o.walkHead===SOUTH_WALK_HEAD_SOURCE&&neckLayer&&base.pack.density===4&&base.pack.frame.width===128&&base.pack.frame.height===128&&base.pack.directions.south.layers.some(l=>l.slot==='headBase'&&l.source===o.walkHead&&l.binding?.kind==='rigid'&&l.binding.a==='NECK'&&l.binding.b==='NOSE')){const nc=makeCanvas(512,512);nc.getContext('2d').drawImage(get(images,BP+neckLayer.source+'.png'),0,0);const neckPixels=nc.getContext('2d').getImageData(0,0,512,512).data;nc.width=1;const neckColored=root.MareAppearance96.recolor(neckPixels,skinMaterials.mask(neckPixels,512,'anatomy'),root.MareAppearance96.skins[r.skinColor].ramp);return {neckPixels,neckColored};}return {};}
 function compose(base,r,images){const key=r.id;if(cache.has(key))return cache.get(key);if(r.hairColor&&r.style!=='original'){images=new Map(images);for(const sha of new Set((r.source?.layers||[]).filter(l=>l.slot==='hair').map(l=>l.source))){const image=get(images,HP+sha+'.png'),tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const pixels=tc.getImageData(0,0,tile.width,tile.height),api=root.MareAppearance96;pixels.data.set(api.recolor(pixels.data,api.materialMask(pixels.data,'hair'),api.hairs[r.hairColor].ramp));tc.putImageData(pixels,0,0);images.set(HP+sha+'.png',tile);}}const o=r.ownership,composite=makeCanvas(640,640),cx=composite.getContext('2d'),original=makeCanvas(640,640),ox=original.getContext('2d'),clean=makeCanvas(640,640),cl=clean.getContext('2d');cl.drawImage(get(images,BP+o.cleanHead+'.png'),0,0);for(const l of [...o.attackLayers].sort((a,b)=>a.depth-b.depth)){ox.drawImage(get(images,BP+l.source+'.png'),0,0);if(l.slot!=='hair'){let image=get(images,BP+l.source+'.png');if(l.id==='iris'&&r.eyeColor){const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const pixels=tc.getImageData(0,0,tile.width,tile.height),api=root.MareAppearance96;
   const irisMask=api.materialMask(pixels.data,'iris');
   if(r.registeredBlueIris){
    if(r.eyeColor!=='blue'||r.registeredBlueIris!==l.source)throw Error('Missing exact blue iris authoring');
    // The separated iris raster has brown pigment, neutral catchlights
    // and black pupil ink. Leave the latter two unchanged.
    for(let p=0;p<irisMask.length;p++){
     if(!irisMask[p])continue;
     const i=p*4,R=pixels.data[i],G=pixels.data[i+1],B=pixels.data[i+2];
     if(!(R>G+10&&G>B))irisMask[p]=0;
    }
   }
   pixels.data.set(api.recolor(pixels.data,irisMask,root.MareCharacterAppearance.eyes[r.eyeColor].ramp));
tc.putImageData(pixels,0,0);image=tile;}if(r.skinColor && (l.slot==='headBase'||l.id==='face')){
  const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d'),api=root.MareAppearance96;
  tc.drawImage(image,0,0);
  const pixels=tc.getImageData(0,0,tile.width,tile.height);
  const mask=skinMaterials.mask(pixels.data,tile.width,l.slot==='headBase'?'anatomy':'mixed');
  const iris=o.attackLayers.find(layer=>layer.id==='iris');
  if(iris){
   const irisTile=makeCanvas(tile.width,tile.height),irisContext=irisTile.getContext('2d');
   irisContext.drawImage(get(images,BP+iris.source+'.png'),0,0);
   const irisPixels=irisContext.getImageData(0,0,tile.width,tile.height).data;
   for(let i=0;i<mask.length;i++)if(irisPixels[i*4+3])mask[i]=0;
  }
  if(!r.daggerNativeHead||l.id==='face')for(const [y,left,right] of o.fringeSpans)mask.fill(0,y*tile.width+left,y*tile.width+right+1);
  // User-authorized material retouch. The exact native garment and
  // fringe raster stay untouched outside the hand-traced forehead.
  const punchSouthNativeOff=base.body==='female'&&base.action==='attack-unarmed'&&base.direction==='south'&&
   base.sourceId==='v7-female-punch-south-ownership-candidate-south'&&base.id.startsWith('v7-female-punch-south-ownership-candidate-south:')&&base.sourcePackSHA256==='aeff7d06dc08041ceec37c11cd0b3e2cf1f970a5bb1d0c449d3aa78638e09ef9'&&
   base.pack.density===4&&base.pack.pivot.x===80&&base.pack.pivot.y===128&&
   base.pack.directions.south.clip.frames===8&&base.pack.directions.south.clip.fps===12;
  if((r.localCetroForehead||punchSouthNativeOff)&&base.direction==='south'&&r.style==='original'&&r.skinColor!=='light'&&l.id==='face'&&l.source===skinMaterials.boundedSouthForeheadSource)
   skinMaterials.boundedSouthForehead(l.source,pixels.data,mask,tile.width,tile.height);
  if(r.localCetroForehead&&r.style==='original'&&r.skinColor!=='light'&&l.id==='face'&&localLateralForehead.source[base.direction]===l.source){
   if(tile.width!==640||tile.height!==640)throw Error('Changed lateral face registration');
   for(const [wx,y,rank,R,G,B,A] of localLateralForehead.rows){
    const x=base.direction==='west'?wx:639-wx,p=y*640+x,i=4*p;
    if(pixels.data[i]!==R||pixels.data[i+1]!==G||pixels.data[i+2]!==B||pixels.data[i+3]!==A)throw Error('Lateral forehead source changed');
    mask[p]=rank;
   }
  }
  if(r.daggerNativeHead&&l.id==='face'&&r.style==='original'&&r.hairColor){
   const fringe=api.materialMask(pixels.data,'hair'),own=new Uint8Array(fringe.length);
   for(const [y,left,right] of o.fringeSpans)for(let x=left;x<=right;x++){
    const i=y*tile.width+x;if(!mask[i]&&pixels.data[4*i+3])own[i]=fringe[i];
   }
   pixels.data.set(api.recolor(pixels.data,own,api.hairs[r.hairColor].ramp));
  }
  pixels.data.set(api.recolor(pixels.data,mask,api.skins[r.skinColor].ramp));
  tc.putImageData(pixels,0,0);
  image=tile;
 }cx.drawImage(image,0,0);}}
 if(r.eyeStyle)root.MareReworkEyeStylesHD.reshape(cx,r.eyeStyle,base.direction,root.MareReworkEyeStylesHD.femaleBoxes[base.direction]);
 if(r.style==='original')for(const layer of o.attackLayers.filter(l=>l.slot==='hair')){
  const image=get(images,BP+layer.source+'.png');
  if(!r.hairColor&&!r.skinColor){cx.drawImage(image,0,0);continue;}
  const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d'),api=root.MareAppearance96;
  tc.drawImage(image,0,0);
  const pixels=tc.getImageData(0,0,tile.width,tile.height);
  const skin=skinMaterials.mask(pixels.data,tile.width,'mixed',skinMaterials.femaleHairSkinZones[base.direction]);
  if(r.hairColor){
   const hair=api.materialMask(pixels.data,'hair');
   for(let i=0;i<skin.length;i++)if(skin[i])hair[i]=0;
   pixels.data.set(api.recolor(pixels.data,hair,api.hairs[r.hairColor].ramp));
  }
  if(r.skinColor)pixels.data.set(api.recolor(pixels.data,skin,api.skins[r.skinColor].ramp));
  tc.putImageData(pixels,0,0);
  cx.drawImage(tile,0,0);
 }
 const data=cx.getImageData(0,0,640,640),back=cl.getImageData(0,0,640,640);if(r.skinColor){const api=root.MareAppearance96;back.data.set(api.recolor(back.data,skinMaterials.mask(back.data,640,'anatomy'),api.skins[r.skinColor].ramp));}for(const[y,x0,x1]of (r.style==='original'?[]:o.fringeSpans))for(let x=x0;x<=x1;x++){const i=(y*640+x)*4;if(back.data[i+3]!==255)throw Error('Fringe has no original opaque backing');data.data.set(back.data.subarray(i,i+4),i);}cx.putImageData(data,0,0);
 const w=base.pack.frame.width*4,h=base.pack.frame.height*4,tile=makeCanvas(w,h),tc=tile.getContext('2d'),padding=r.fused?-64:0;tc.drawImage(composite,padding,padding);
 if(r.fused){const walk=makeCanvas(512,512),wc=walk.getContext('2d');wc.drawImage(get(images,BP+o.walkHead+'.png'),0,0);const wa=wc.getImageData(0,0,512,512),project=ox.getImageData(64,64,512,512),result=tc.getImageData(0,0,512,512),[x0,y0,x1,y1]=o.walkDifferenceBounds;const {neckPixels,neckColored}=southNeckMaterial(base,r,images);for(let i=0;i<wa.data.length;i+=4){const different=wa.data[i+3]!==project.data[i+3]||(wa.data[i+3]&&[0,1,2].some(c=>wa.data[i+c]!==project.data[i+c]));if(different){const px=i/4,x=px%512,y=Math.floor(px/512);if(x<x0||x>x1||y<y0||y>y1)throw Error('Unexpected original neck ownership difference');const profileNeck=profileNeckRestore(base,r,wa.data,i,x,y);if(profileNeck){result.data.set(profileNeck,i);}else if(neckPixels&&neckPixels[i+3]===255&&wa.data[i+3]===255&&[0,1,2].every(c=>neckPixels[i+c]===wa.data[i+c])){result.data.set(neckColored.subarray(i,i+4),i);}else if(r.style==='original'&&r.hairColor&&wa.data[i+3]){const api=root.MareAppearance96;const pixel=wa.data.slice(i,i+4);const mask=api.materialMask(pixel,'hair');result.data.set(api.recolor(pixel,mask,api.hairs[r.hairColor].ramp),i);}else result.data.set(wa.data.subarray(i,i+4),i);}}tc.putImageData(result,0,0);walk.width=1;}
 const d=base.pack.directions[base.direction];
 if(r.source){const dx=Math.round((d.rest.NECK.x-r.source.rest.NECK.x)*4),dy=Math.round((d.rest.NECK.y-r.source.rest.NECK.y)*4);if(r.gearRecord&&r.gearPolicy==='approved-same-hairstyle-policy'){const g=r.gearRecord,a=root.ReworkAccessoryVendor.headFemale.adjustment(g.adjustmentRecord.adjustment),entry=JSON.parse(JSON.stringify(g.entry)),dir=entry.pack.directions[base.direction];dir.headgearPolicy.headAdjustment={x:0,y:0,scale:100,...dir.headgearPolicy.headAdjustment};const pack=root.ReworkAccessoryVendor.headFemale.apply(entry.pack,base.direction,a,entry),pd=pack.directions[base.direction];pd.layers=pd.layers.filter(l=>l.slot==='hair'||l.id===pd.headgearPolicy.gearId);const raw=new Map(pd.layers.map(l=>[l.source,get(images,HP+(l.id===pd.headgearPolicy.gearId?renderGearRaster(r,l):l.source)+'.png')])),adjusted=root.ReworkAccessoryVendor.headPreview.imagesForHair(pack,base.direction,raw,a,makeCanvas),overlay=makeCanvas(512,512);root.ReworkAccessoryVendor.compositor.render(overlay.getContext('2d'),pack,adjusted,{direction:base.direction,frame:0,density:4});tc.drawImage(overlay,dx,dy);overlay.width=1;for(const[k,v]of adjusted)if(raw.get(k)!==v&&v.getContext)v.width=1;}else if(!renderArchivedHairFit(tc,base,r,images,dx,dy))for(const l of r.source.layers.filter(l=>l.slot==='hair').sort((a,b)=>a.depth-b.depth))tc.drawImage(get(images,HP+l.source+'.png'),dx,dy);}
 if(r.gearRecord&&r.gearPolicy==='source-alpha-only'){const g=r.gearRecord,a=g.adjustmentRecord.adjustment,prior=g.headgearPolicy?.headAdjustment||{},gear=g.layers.find(l=>l.id===g.headgearPolicy?.gearId);if(!gear)throw Error('Missing native gear ownership');const dx=Math.round((d.rest.NECK.x-g.rest.NECK.x+(a.gearX||0)+(prior.x||0))*4),dy=Math.round((d.rest.NECK.y-g.rest.NECK.y+(a.gearY||0)+(prior.y||0))*4);tc.drawImage(get(images,HP+renderGearRaster(r,gear)+'.png'),dx,dy);}
 // Candidate directional neck attachment: native pixels translated only into
 // the transparent junction, never replace face, hair or a clothing pixel.
 if(r.profileNeckBridge&&r.fused&&['east','west'].includes(base.direction)){
  const expected={east:'202352cb972f4fe437ca7fd43aa4d848b88a4fc98dcfc6393bb5fd0b4c1e16bd',west:'33cd3e581abb50daa48b73e462fb0e267d492b91eb061fafc075dad6a0a4421b'};
  if(o.walkHead!==expected[base.direction])throw Error('Profile neck bridge source mismatch');
  const neck=makeCanvas(512,512),nx=neck.getContext('2d');nx.drawImage(get(images,BP+o.walkHead+'.png'),0,0);const source=nx.getImageData(0,0,512,512).data,result=tc.getImageData(0,0,512,512),[left,,right]=o.walkDifferenceBounds,api=root.MareAppearance96;
  for(let y=163;y<=165;y++)for(let x=left;x<=right;x++){
   const target=(y*512+x)*4,donor=((y+3)*512+x)*4;
   if(result.data[target+3]!==0||source[donor+3]!==255)continue;
   let pixel=source.slice(donor,donor+4);if(r.skinColor)pixel=api.recolor(pixel,new Uint8Array([skinMaterials.tone(...pixel.subarray(0,3))]),api.skins[r.skinColor].ramp);
   result.data.set(pixel,target);
  }
  tc.putImageData(result,0,0);neck.width=1;
 }
 northNeckContact(base,r,images,back.data,tc,makeCanvas);
 composite.width=1;original.width=1;clean.width=1;cache.set(key,tile);while(cache.size>24){const old=cache.keys().next().value;cache.get(old).width=1;cache.delete(old);}return tile;}
 function render(ctx,base,r,images,options={}){const d=base.pack.directions[base.direction],head=d.layers.find(l=>l.slot==='headBase'),source='female-original-face-memory:'+r.id,tile=compose(base,r,images),layers=d.layers.filter(l=>!['headBase','face','hair'].includes(l.slot)).concat({...head,source,frames:undefined}),pack={...base.pack,directions:{[base.direction]:{...d,layers}}},adapted={...base,pack,sourceRefs:[...new Set(layers.flatMap(l=>l.frames||[l.source]))]},map=new Map(images);map.set(BP+source+'.png',tile);return baseRegistry.render(ctx,adapted,map,{...options,femaleAnatomyPalette:!!r.skinColor});}
 return {resolve,resolveOwnHelmetSource,requiredFiles,compose,render};
}
const api={create};root.MareFemaleNamedHairHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
