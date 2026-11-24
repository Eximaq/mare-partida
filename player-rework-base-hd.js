/* Full authored rework source renderer. No resampling, inferred limbs or old body. */
(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function applyPunchProfileIris(r,d,images,map,prefix,appearance,makeCanvas){
  // The weapon and the empty hand use this same isolated 640px profile.
  // Skin recoloring runs before the signed iris ranks, including its dark edge.
  const profileFace={south:'6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a',east:'9add51bf7602618f2e937cf31d851346a02afc248da8490ae5ea7ea322fabde2',
   west:'0dc6cfcac5a2cf85ea30b0d88bdfd08e3fb7574110b115fb230ff8adce03b464'}[r.direction];
  const face=d.layers.find(l=>l.slot==='face'),ramp=root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp;
  if(r.body==='male'&&r.action==='attack-unarmed'&&profileFace&&ramp&&appearance.face==='original'&&
     (face?.source===profileFace||face?.source==='assets/'+profileFace+'.png'||face?.source==='modular-assets/'+profileFace+'.png')&&!face.frames&&face.binding?.a==='NECK'&&face.binding.b==='NOSE'){
   const src=face.source,raw=images.get(prefix+src+'.png')||images.get(src);
   const pigments=root.MareReworkModularOutfitsHD||(typeof require==='function'?require('./player-rework-modular-outfits-hd.js'):null);
   const front=r.direction==='south',offset=front?0:64,samples=front?pigments?.southIrisSamples():pigments?.sideIrisSamples(r.direction);
   if(raw?.width!==640||raw.height!==640||samples?.length!==(front?45:18))throw Error('Missing registered punch iris material');
   const tile=makeCanvas(640,640),ctx=tile.getContext('2d');
   ctx.drawImage(raw,0,0);const old=ctx.getImageData(0,0,640,640).data;
   ctx.clearRect(0,0,640,640);ctx.drawImage(map.get(src),0,0);const frame=ctx.getImageData(0,0,640,640);
   for(const [x,y,red,green,blue,alpha,rank] of samples){
    const pos=((y+offset)*640+x+offset)*4,shade=parseInt(ramp[rank-1].slice(1),16);
    if(old[pos]!==red||old[pos+1]!==green||old[pos+2]!==blue||old[pos+3]!==alpha||frame.data[pos+3]!==alpha)
     throw Error('Punch face differs from the registered iris');
    frame.data[pos]=shade>>>16;frame.data[pos+1]=(shade>>>8)&255;frame.data[pos+2]=shade&255;
   }
   ctx.putImageData(frame,0,0);map.set(src,tile);
  }
}
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
 function materialSources(r,images,{frame=0,appearance={},femaleAnatomyPalette=false,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),appearanceAPI=root.MareAppearance96,afterMaterialSource}={}){
  if(!r)throw Error('Missing supported HD source');const p=r.pack,d=p.directions[r.direction];
  if(!Number.isInteger(frame)||frame<0||frame>=d.clip.frames)throw Error('HD source frame unavailable');
  const map=new Map();for(const s of sources(r,frame)){const im=images.get(prefix+s+'.png')||images.get(s);if(!im)throw Error('Missing original asset '+s);map.set(s,im);}
  const originalMap=afterMaterialSource?new Map(map):null;
  const eyes=root.MareReworkEyeStylesHD;
  const expression=eyes&&(eyes.supports(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes.maleSource(r);
  // Palette changes preserve native dimensions/alpha; source PNGs stay immutable.
  const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')&&appearanceAPI){
   for(const source of sources(r,frame)){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),hairLayer=uses.some(l=>l.slot==='hair'),skinKind=uses.length&&uses.every(l=>r.skinRepairLayers?.includes(l.id))?'mixed':femaleAnatomyPalette&&uses.some(l=>l.slot==='headBase')?null:skinMaterials?.ownership(uses);
    const hairSource=hairLayer&&source==='assets/4d7b8fa3090367f80f4ded64a1bbc2c0759f3a1d2402ec9e8be112333c0297a7.png'?source.slice(7,-4):source;
    const ramp=hairLayer?appearanceAPI.hairs[hair]?.ramp:skinKind?appearanceAPI.skins[skin]?.ramp:null;if(!ramp&&!(hairLayer&&hairAnatomy?.records[hairSource]))continue;
    const image=map.get(source),w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,tile=makeCanvas(w,h),cx=tile.getContext('2d');cx.drawImage(image,0,0);const data=cx.getImageData(0,0,w,h);const anatomical=hairLayer?hairAnatomy?.recolor(hairSource,data.data,appearance,appearanceAPI):null;
    const ranks=hairLayer?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,w,skinKind);
    if(!hairLayer&&skin&&skin!=='original'&&skin!=='light'&&r.body==='female'&&r.action==='attack-unarmed'&&r.direction==='south'&&
       (r.sourceId||r.id.split(':')[0])==='v7-female-punch-south-ownership-candidate-south'&&r.sourcePackSHA256==='aeff7d06dc08041ceec37c11cd0b3e2cf1f970a5bb1d0c449d3aa78638e09ef9'&&
       r.hairStyle==='original'&&source===skinMaterials.boundedSouthForeheadSource&&uses.length===1&&uses[0].id==='face'&&
       uses[0].binding?.kind==='rigid'&&uses[0].binding.a==='NECK'&&uses[0].binding.b==='NOSE'&&
       p.density===4&&p.pivot.x===80&&p.pivot.y===128&&d.clip.frames===8&&d.clip.fps===12&&d.clip.contactFrame===4)
      skinMaterials.boundedSouthForehead(source,data.data,ranks,w,h);
    data.data.set(anatomical||appearanceAPI.recolor(data.data,ranks,ramp));cx.putImageData(data,0,0);map.set(source,tile);
   }
  }

  if(r.body==='female'&&r.action==='attack-unarmed'&&r.direction==='south'&&
     (r.sourceId||r.id.split(':')[0])==='v7-female-punch-south-ownership-candidate-south'&&r.sourcePackSHA256==='aeff7d06dc08041ceec37c11cd0b3e2cf1f970a5bb1d0c449d3aa78638e09ef9'&&
     p.density===4&&p.frame.width===160&&p.pivot.x===80&&p.pivot.y===128&&d.clip.frames===8&&d.clip.fps===12&&
     skin&&skin!=='original'&&skin!=='light'&&appearanceAPI?.skins[skin]?.ramp){
   const top=d.layers.find(l=>l.id==='top'&&l.slot==='top'&&l.binding?.kind==='fixed');
   const sha=top?.frames?.[frame];
   if(sha&&skinMaterials.boundedSouthTop[sha]){
    const image=map.get(sha);if(image?.width!==640||image.height!==640)throw Error('Missing pinned female punch South top');
    const c=makeCanvas(640,640),x=c.getContext('2d');x.drawImage(image,0,0);
    const px=x.getImageData(0,0,640,640),m=skinMaterials.boundedSouthTopMask(sha,px.data,640,640);
    px.data.set(appearanceAPI.recolor(px.data,m,appearanceAPI.skins[skin].ramp));x.putImageData(px,0,0);
    map.set(sha,c);
   }
  }
  if(expression?.source){
   const image=map.get(expression.source);
   const tile=makeCanvas(image.width,image.height),face=tile.getContext('2d');
   face.drawImage(image,0,0);
   eyes.recolorIris(face,expression,appearance.eyeColor);
   eyes.reshape(face,appearance.face,expression.direction,expression.boxes);
   map.set(expression.source,tile);
  }
  // Restore the saved blue iris on the exact bare source before its native
  // neck transform. It must not change when the player removes a Cetro.
  const side=r.direction,west=side==='west',south=side==='south',
   faceSHA=south?'81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449':
    '8909af0e687972ad9153da86adb4e8374b47aaab46a1f751c344023446ba39dc',
   nativeId=r.action==='idle'?'male-idle-original-'+side+'-from-walk0':r.action==='walk'?
    (south?'male-walk-south-r7':west?'v7-male-walk-drawn-east-east-mirror-west-candidate':'v7-male-walk-drawn-east-east'):null,
   face=d.layers.filter(l=>l.slot==='face');
  if(nativeId&&['east','west','south'].includes(side)&&r.body==='male'&&r.hairStyle==='original'&&
     r.sourceId===nativeId&&r.id.startsWith(nativeId+':original:none:')&&!!r.mirrorX===west&&
     r.sourcePackSHA256===(south?'44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c':
     '5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a')&&
     p.density===4&&p.frame.width===128&&p.frame.height===128&&p.pivot.x===64&&p.pivot.y===112&&
     ((r.action==='idle'&&d.clip.frames===1&&d.clip.fps===1&&!d.clip.loop)||(r.action==='walk'&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop))&&
     appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
     appearance.hairStyle==='original'&&appearance.hairColor==='black'&&appearance.eyeStyle==='original'&&appearance.face==='original'&&appearance.eyeColor==='blue'&&
     face.length===1&&face[0].id==='face'&&face[0].depth===(south?8:5)&&face[0].source===faceSHA&&!face[0].frames&&
     face[0].binding?.kind==='rigid'&&face[0].binding.a==='NECK'&&face[0].binding.b==='NOSE'){
   const authority=root.MareReworkModularOutfitsHD,samples=south?authority?.southIrisSamples?.():authority?.sideIrisSamples?.('east'),
    ramp=root.MareCharacterAppearance?.eyes?.blue?.ramp,offset=south?64:0,
    original=images.get(prefix+faceSHA+'.png')||images.get(faceSHA),tinted=map.get(faceSHA);
   if(samples?.length!==(south?45:18)||ramp?.length!==5||[original,tinted].some(im=>im?.width!==512||im.height!==512))throw Error('Missing signed v7 lateral iris authority');
   const raw=makeCanvas(512,512),paint=makeCanvas(512,512),rc=raw.getContext('2d'),pc=paint.getContext('2d');
   rc.drawImage(original,0,0);pc.drawImage(tinted,0,0);
   const orig=rc.getImageData(0,0,512,512).data,out=pc.getImageData(0,0,512,512);
   for(const [x,y,R,G,B,A,rank] of samples){
    const k=((y-offset)*512+x-offset)*4;
    if(orig[k]!==R||orig[k+1]!==G||orig[k+2]!==B||orig[k+3]!==A||out.data[k+3]!==A)throw Error('Unregistered v7 lateral iris pixel');
    const hex=parseInt(ramp[rank-1].slice(1),16);
    out.data[k]=hex>>>16;out.data[k+1]=(hex>>>8)&255;out.data[k+2]=hex&255;
   }
   pc.putImageData(out,0,0);map.set(faceSHA,paint);raw.width=1;
  }

  // Same authored neckline material as the signed PR26 World receiver.
  const topSHA='e4ea751c39eeeaa647fe708b15ef22c25214aadeddd63ca2ad4a5740b98aa24b', nativeTop=d.layers.filter(l=>l.id==='top');
  if(r.body==='female'&&r.direction==='north'&&r.action==='idle'&&r.sourceId==='female-idle-original-north-from-walk0'&&
     r.id.startsWith('female-idle-original-north-from-walk0:')&&r.sourcePackSHA256==='ade447b6abe83494aa78833f9ed051b36251c9fc5a97af9d3c38b99933091dbc'&&
     nativeTop.length===1&&JSON.stringify(nativeTop[0])===JSON.stringify({"id":"top","slot":"top","source":"e4ea751c39eeeaa647fe708b15ef22c25214aadeddd63ca2ad4a5740b98aa24b","frames":["e4ea751c39eeeaa647fe708b15ef22c25214aadeddd63ca2ad4a5740b98aa24b"],"binding":{"kind":"fixed"},"depth":3})&&
     JSON.stringify(d.clip)===JSON.stringify({"frames":1,"fps":1,"loop":false})&&p.density===4&&p.frame.width===128&&p.frame.height===128&&
     p.pivot.x===64&&p.pivot.y===112&&skin&&skin!=='original'&&skin!=='light'&&appearanceAPI?.skins[skin]?.ramp){
   const image=map.get(topSHA);if(image?.width!==512||image.height!==512)throw Error('Missing signed female idle North top');
   const tile=makeCanvas(512,512),c=tile.getContext('2d');c.drawImage(image,0,0);
   const px=c.getImageData(0,0,512,512),m=new Uint8Array(512*512);
   for(const pos of [86251,86252,86262,86263,86264,86277,86278,86279,86280,86289,86290,86763,86764,86775,86776,86777,86778,86779,86789,86790,86791,86801,86802,87275,87276,87290,87291,87299,87300,87313,87314,87787,87788,87825,87826,88299,88300,88337,88338,88811,88812,88849,88850,89323,89324,89835,89836,90347,90348,90385,90386,90387,90859,90860,90898,90899,91371,91411,92435,92436,92907,92947,92948,93417,93418,93419,93460,93461,93929,93930,93972,93973,94440,94441,94442,94484,94485,94486,94951,94952,94953,94997,94998,95459,95460,95462,95463,95464,95510,95511,95971,95972,95974,95975,96022,96023,96483,96484,99556,99557,100068,100069,100580,100581,101603,101604,102115,102116,102626,102627,103138,103139,103650,103651,104162,104163,104674]){const i=pos*4;
    if(!px.data[i+3])throw Error('Signed female idle North material outside top');
    m[pos]=skinMaterials.tone(px.data[i],px.data[i+1],px.data[i+2]);
   }
   px.data.set(appearanceAPI.recolor(px.data,m,appearanceAPI.skins[skin].ramp));c.putImageData(px,0,0);map.set(topSHA,tile);
  }
  // Only the exact exposed skin sites of the signed PR25 top, not fabric.
  const carryTop='97611d634123caab186a59c2d0dcd085183073c4718247bb1e30a26571fa8431';
  const layer=d.layers.filter(l=>l.slot==='top');
  if(r.boundedCetroSouthCarry===true&&r.body==='female'&&r.direction==='south'&&
     ((r.action==='idle'&&r.sourceId==='female-idle-original-south-from-walk0'&&d.clip.frames===1&&d.clip.fps===1&&!d.clip.loop)||
      (r.action==='walk'&&r.sourceId==='v7-female-walk-drawn-all-south'&&d.clip.frames===8&&d.clip.fps===8&&d.clip.loop))&&
     p.density===4&&p.frame.width===128&&p.frame.height===128&&
     layer.length===1&&layer[0].id==='tank-top-rigid'&&layer[0].source===carryTop&&!layer[0].frames&&
     layer[0].binding?.kind==='rigid'&&layer[0].binding.a==='NECK'&&layer[0].binding.b==='NOSE'&&
     skin&&skin!=='original'&&skin!=='light'&&appearanceAPI?.skins[skin]?.ramp){
    const image=map.get(carryTop);if(image?.width!==512||image.height!==512)throw Error('Missing signed Cetro South carry top');
    const tile=makeCanvas(512,512),c=tile.getContext('2d');c.drawImage(image,0,0);
    const px=c.getImageData(0,0,512,512),m=new Uint8Array(512*512);
    for(const j of [86767,86768,86769,86770,87279,87280,87281,87282,87314,87320,87790,87791,87792,87793,87794,87832,87833,88303,88304,88305,88306,88344,88345,88814,88815,88816,88817,88818,88856,88857,89327,89328,89329,89330,89368,89369,89839,89840,89841,89842,89873,89880,89881,90343,90351,90352,90353,90354,90392,90393,90863,90864,90865,90904,90905,91375,91376,91377,91416,91417,91887,91888,91889,91928,91929,92400,92401,92441,92902,92912,92913,92953,92954,93414,93424,93425,93465,93466,93926,93936,93937,93977,93978,94448,94449,94480,94960,94961,94992,95472,95473,95474,95984,95985,95986,95987,96497,96498,96499,96500,97011,97012,97038,97523,97524,97525,97549,97550,98059,98551,98552,98553,98554,98555,98556,98557,98558,98559,98560,98561,98562,98563,98564,98565,98566,98567,98568,98569,99071,99073]){
      const i=j*4;if(!px.data[i+3])throw Error('Signed Cetro South neckline material outside top');
      m[j]=skinMaterials.tone(px.data[i],px.data[i+1],px.data[i+2]);
    }
    px.data.set(appearanceAPI.recolor(px.data,m,appearanceAPI.skins[skin].ramp));
    c.putImageData(px,0,0);map.set(carryTop,tile);
  }
  applyPunchProfileIris(r,d,images,map,prefix,appearance,makeCanvas);
  if(afterMaterialSource)for(const [source,image] of map)map.set(source,afterMaterialSource(source,image,originalMap.get(source)));
  return map;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance={},femaleAnatomyPalette=false,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),appearanceAPI=root.MareAppearance96,afterMaterialSource}={}){
  const map=materialSources(r,images,{frame,appearance,femaleAnatomyPalette,makeCanvas,appearanceAPI,afterMaterialSource});
  const p=r.pack,d=p.directions[r.direction];
  // compositor consumes original density4 PNGs, with no intermediate 1x canvas.
  const pack=hiddenSlots.length?{...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}}:p;
  if(r.mirrorX){const native=makeCanvas(p.frame.width*p.density,p.frame.height*p.density);const nativeCtx=native.getContext('2d'),options={direction:r.direction,frame,density:p.density};
   if(r.preMirroredLayers?.length){
    const local=pack.directions[r.direction],parts=new Map(local.layers.map(l=>[l.id,l]));
    for(const op of vendor.compositor.plan(pack,r.direction,frame)){
     const layer=parts.get(op.id);nativeCtx.save();
     if(r.preMirroredLayers.includes(op.id)){nativeCtx.translate(native.width,0);nativeCtx.scale(-1,1);}
     try{vendor.compositor.render(nativeCtx,{...pack,directions:{[r.direction]:{...local,layers:[layer]}}},map,{...options,clear:false});}
     finally{nativeCtx.restore();}
    }
   }else vendor.compositor.render(nativeCtx,pack,map,options);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(native.width,0);ctx.scale(-1,1);ctx.drawImage(native,0,0);ctx.restore();}else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame,density:p.density});
  return {width:p.frame.width*p.density,height:p.frame.height*p.density,density:p.density,pivot:{x:p.pivot.x*p.density,y:p.pivot.y*p.density},logicalFrame:p.frame,source:r.id,frames:d.clip.frames,rest:d.rest,pose:d.poses[frame],mirrorX:!!r.mirrorX,status:r.status};
 }
 return {resolve,requiredFiles,materialSources,render};
}
const api={create};root.MareReworkBaseHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
