/* Strict native overlay adapter. Original body/weapon PNGs are never modified. */
(function(root){'use strict';
const hash=s=>String(s||'').match(/[a-f0-9]{64}/)?.[0];
function adapt(weapon,outfit,{assetPrefix='../rework-modular-outfits-hd/assets/',bootsOutfit=null}={}){
 const c=outfit?.overlayContract,b=weapon?.basePack,p=b?.pack,d=p?.directions?.[weapon?.direction];
 if(!Number.isInteger(weapon?.item)||weapon.body!=='male'||!p||!d||!c||c.schema!=='native-equipment-overlay-v1'||c.item!==133||c.slot!=='pants'||c.action!=='attack-unarmed'||outfit.body!==weapon.body||c.direction!==weapon.direction||c.density!==p.density||c.binding?.kind!=='fixed')return null;
 const bodyLayer=d.layers.find(l=>l.id==='skin-arms-phase'),frames=bodyLayer?.frames;
 if(bodyLayer?.binding?.kind!=='fixed'||p.frame.width*4!==640||p.frame.height*4!==640||weapon.nativeCanvas?.[0]!==640||weapon.nativeCanvas?.[1]!==640)return null;
 if(!frames||frames.length!==c.bodyFrames.length||frames.some((f,i)=>hash(f)!==c.bodyFrames[i])||b.originalSHA256!==c.baseSourcePackSHA256)return null;
 if(!hash(c.paddedSourceSHA256)||c.depth!==2)return null;
 const r=JSON.parse(JSON.stringify(weapon)),rd=r.basePack.pack.directions[r.direction],key=c.paddedSourceSHA256;
 rd.layers.push({id:'pants133-native-overlay',slot:'pants',source:key,depth:c.depth,binding:{kind:'fixed'}});
 r.basePack.images[key]=assetPrefix+key+'.png';
 // Drop only naked-source rounding corrections. Authored replacement masks may be
 // the entire weapon/hand and MUST remain above the garment.
 r.states=r.states.map(s=>({...s,layers:s.layers.filter(l=>l.role!=='rounding-correction'),canvasRoundingPatch:[],rgbaExact:false}));
 if(bootsOutfit){
  if(bootsOutfit.equipment?.boots!==9||bootsOutfit.equipment?.pants!==133||Object.keys(bootsOutfit.equipment).length!==2||bootsOutfit.body!==weapon.body||bootsOutfit.direction!==weapon.direction||bootsOutfit.action!=='attack-unarmed'||bootsOutfit.bootsOverlay?.baseRecord!==outfit.id)return null;
  const bd=bootsOutfit.pack.directions[weapon.direction],ids=bootsOutfit.bootsOverlay.sourceLayerIds,layers=bd.layers.filter(l=>ids.includes(l.id));if(layers.length!==ids.length||layers.some(l=>l.binding?.kind!=='fixed'||l.frames||!hash(l.source)))return null;
  for(const layer of layers){rd.layers.push({...layer,slot:'pants',depth:2.5});r.basePack.images[layer.source]=assetPrefix+layer.source+'.png';}
  r.bootsOverlay={item:9,sourceRecord:bootsOutfit.id,sourceLayerIds:ids,candidate:true};
 }
 r.id+='-pants133-candidate';r.equipment={weapon:weapon.item,pants:133,...(bootsOutfit?{boots:9}:{})};r.outfitOverlay={id:outfit.id,sourceSHA256:key,bodyFramesVerified:true,candidate:true,requiresVisualCalibration:true};
 return r;
}
function adaptSword(weapon,outfits,{coat,baseIndex,appearance}){
 const dir=weapon?.direction;
 if(weapon?.body!=='male')return null;
 const north=weapon.id==='sword0-north-historical-attack';
 if(!north&&(!['east','west'].includes(dir)||!weapon.states.every(s=>s.attachment&&!s.layers.length&&!s.canvasRoundingPatch?.length)))return null;
 const base=north&&baseIndex.records.find(r=>r.id==='v7-sword-north-modular8-north');
 if(north&&(!base||weapon.states.length!==base.pack.directions[dir].clip.frames||
    !weapon.states.every((s,i)=>s.state===String(i)&&s.layers.length===2&&s.layers.every(l=>l.operation==='source-over'))))return null;
 const b=north?{pack:base.pack,images:Object.fromEntries(base.sourceRefs.map(sha=>[sha,'../rework-base-hd/assets/'+sha+'.png']))}:weapon.basePack;
 const p=b?.pack,d=p?.directions[dir];
 if(!d)return null;
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const outfit=coat==null?null:outfits.records.find(r=>r.id==='male-torso'+coat+'-'+dir+'-frozen-attack-native-candidate');
 if(coat!=null&&(!outfit||outfit.equipment.torso!==coat||!eq(outfit.pack.frame,p.frame)||!eq(outfit.pack.pivot,p.pivot)))return null;
 const images={...b.images},padding={},mirrors=[];
 let layers=[...d.layers];
 const rest={...d.rest},poses=d.poses.map(pose=>({...pose}));
 if(outfit){
  const donor=outfit.pack.directions[dir];
  const cloth=donor.layers.filter(l=>!l.id.startsWith('base:'));
  for(const layer of cloth){
   const {kind,a,b:other}=layer.binding;
   const pad=outfit.sourceRasterPadding?.[layer.source];
   if(!layer.id.startsWith('coat'+coat+'-')||kind!=='rigid'||layer.frames||!a?.startsWith('cloth:')||!other?.startsWith('cloth:')||pad?.sourceSize!==512||pad.offset!==64)return null;
   for(const name of [a,other]){
    const bone=name.slice(6);
    if(!donor.rest[name]||!poses.every(pose=>pose[bone]))return null;
    rest[name]=donor.rest[name];
    for(const pose of poses)pose[name]=pose[bone];
   }
   images[layer.source]='../rework-modular-outfits-hd/assets/'+layer.source+'.png';
   padding[layer.source]=64;
  }
  if(!cloth.length)return null;
  layers.push(...cloth);
  mirrors.push(...(outfit.mirrorLayerIDs||[]));
 }
 const style=(appearance.hair||'original').replace(/^hair-/,'');
 if(style!=='original'){
  const hair=layers.find(l=>l.slot==='hair');
  if(!hair||hair.binding.kind!=='rigid'||hair.binding.a!=='NECK'||hair.binding.b!=='NOSE')return null;
  layers=layers.filter(l=>l!==hair);
  if(style!=='none'){
   const source=baseIndex.records.find(r=>r.body==='male'&&r.action==='idle'&&r.direction===dir&&r.hairStyle===style);
   const sd=source?.pack.directions[dir],layer=sd?.layers.find(l=>l.slot==='hair');
   if(!layer||layer.binding.kind!=='fixed'||layer.frames||source.pack.density!==4||
      p.frame.width-source.pack.frame.width!==32||p.frame.height-source.pack.frame.height!==32||
      !['NECK','NOSE'].every(k=>d.rest[k].x-sd.rest[k].x===16&&d.rest[k].y-sd.rest[k].y===16))return null;
   images[layer.source]='../rework-base-hd/assets/'+layer.source+'.png';
   padding[layer.source]=64;
   layers.push({...hair,source:layer.source});
  }
 }
 // NORTH stores the blade and an already composed body separately. Keep the
 // blade behind the modular body, as in the original layer order.
 const states=north?weapon.states.map(s=>({...s,layers:[],attachment:{...s.layers[0],depth:-1,matrix:[1,0,0,1,0,0]}})):weapon.states;
 return {...weapon,states,id:weapon.id+(coat==null?'':'-coat'+coat)+'-adapted-'+style,basePack:{...b,images,pack:{...p,directions:{...p.directions,[dir]:{...d,layers,rest,poses}}}},
  adaptedCoat:outfit?.id,sourceRasterPadding:padding,mirrorLayerIDs:mirrors,colorAppearance:appearance};
}
const api={adapt,adaptSword};root.MareReworkOutfitOverlayHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
