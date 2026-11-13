/* Whole authored HD bases in the normal player path. Source pixels stay native; only the final world draw uses the approved monster-scale transform. */
(function(root){'use strict';
const identityKey=p=>JSON.stringify([p.appearance96||{},p.equipment||{},!!p.zoanTransformed,!!root.MareHeadgear?.hidden(p)]);
// Approved comparison: the 374px-tall rifle115 source draws at 105px, like the Marinheiro.
// A fixed factor across every pose prevents frame-to-frame breathing; assets and composition stay HD.
const WORLD_SCALE=105/374;
const canonical=b=>['female','feminino'].includes(b)?'female':'male';
function create({baseURL=root.location?.href,onChange=()=>{},fetchJSON=async path=>{const r=await fetch(new URL(path,baseURL));if(!r.ok)throw Error('HD index HTTP '+r.status);return r.json();},loadImage=null,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 let baseIndex,outfitIndex,swordSouth,registry,femaleNamedHairRegistry,femaleRegistry,weaponRegistry,headRegistry,headCompat,originalHairGearRegistry,assetStore,outfitRegistry,outfitStore,carryRegistry,combinedCarryRegistry,weaponStore,state='loading',last=null,error=null;const cache=new Map(),pending=new Map(),failures=new Map(),lastRendered=new Map();
 const imageLoader=loadImage||(async path=>{if(path.startsWith('tools/rework-base-hd/assets/'))return assetStore.load(path);if(path.startsWith('tools/rework-modular-outfits-hd/assets/'))return outfitStore.load(path);if(path.startsWith('tools/rework-weapon-layers-hd/assets/'))return weaponStore.load(path);const im=new Image();im.src=new URL(path,baseURL);await im.decode();return im;});
 const imageRequests=new Map();
 function loadShared(path){
  if(!imageRequests.has(path))imageRequests.set(path,Promise.resolve().then(()=>imageLoader(path)).finally(()=>imageRequests.delete(path)));
  return imageRequests.get(path);
 }
 const ready=Promise.all([fetchJSON('tools/rework-base-hd/index.json'),fetchJSON('tools/rework-weapon-layers-hd/index.json'),fetchJSON('tools/rework-accessories/head-layer-index.json'),fetchJSON('tools/rework-base-hd/archives/archive-index.json'),fetchJSON('tools/rework-modular-outfits-hd/index.json'),fetchJSON('tools/rework-modular-outfits-hd/archives/archive-index.json'),fetchJSON('tools/rework-weapon-layers-hd/carry-binding-plan.json'),fetchJSON('tools/rework-weapon-layers-hd/archives/archive-index.json'),fetchJSON('tools/rework-accessories/female-original-face-ownership.json')]).then(([index,weapons,heads,archives,outfits,outfitArchives,carry,weaponArchives,femaleOwnership])=>{baseIndex=index;outfitIndex=outfits;swordSouth=weapons.modularSwordSouth;registry=root.MareReworkBaseHD.create(index);femaleNamedHairRegistry=root.MareFemaleNamedHairHD?.create(heads,femaleOwnership,{baseRegistry:registry,makeCanvas});femaleRegistry=root.MareReworkFemaleEquipmentHD?.create({schema:'female-native-equipment-registration-v1',records:weapons.femaleRegistrations||[]},{outfits,appearanceRegistry:femaleNamedHairRegistry});assetStore=root.MareReworkHDAssets?.create(archives,{baseURL});weaponRegistry=root.MareReworkWeaponNativeHD?.create(weapons,{makeCanvas});headRegistry=root.MareReworkHead?.create(heads,{appearanceAPI:{recolor:(...a)=>root.MareAppearance96.recolor(...a),materialMask:(...a)=>root.MareAppearance96.materialMask(...a)},makeCanvas});headCompat=root.MareNativeHeadCompat?.create({makeCanvas});originalHairGearRegistry=root.MareOriginalHairHelmetsHD?.create(heads,{compat:headCompat,makeCanvas});outfitRegistry=root.MareReworkModularOutfitsHD?.create(outfits,{allowCandidates:true});carryRegistry=root.MareReworkWeaponCarryHD?.create(index,carry,{makeCanvas});combinedCarryRegistry=root.MareReworkOutfitCarryOverlayHD?.create(carryRegistry,outfits);weaponStore=root.MareReworkHDAssets?.create(weaponArchives,{baseURL,prefix:'tools/rework-weapon-layers-hd/archives/'});outfitStore=root.MareReworkHDAssets?.create(outfitArchives,{baseURL,prefix:'tools/rework-modular-outfits-hd/archives/'});state='ready';onChange();}).catch(e=>{state='failed';error=e.message;onChange();});
 function select(player,o){
  const raw=player?.appearance96||{},style=raw.eyeStyle??raw.face;
  const eyes=root.MareReworkEyeStylesHD;
  const color=raw.eyeColor,customColor=color&&!['original','blue'].includes(color);
  if(!eyes?.supports(style)&&!customColor)return selectBase(player,o);
  if(style&&!['original','face-gentle'].includes(style)&&!eyes?.supports(style))return null;
  const isFemale=canonical(raw.gender??raw.body)==='female';
  if(isFemale)return selectBase(player,o);
  if(customColor&&!root.MareCharacterAppearance?.eyes[color])return null;
  const original={...player,appearance96:{...raw,eyeStyle:'original',face:'original',eyeColor:'original'}};
  const record=selectBase(original,o);
  if(!record)return null;
  const base=['carry','outfit-carry'].includes(record.hdKind)?record.base:
    record.hdKind==='weapon'&&record.sourceRasterPadding?{...record,pack:record.basePack.pack}:record;
  if(!base.pack||!eyes?.maleSource(base)||record.hdKind&&!['carry','outfit-carry','weapon'].includes(record.hdKind))return null;
  return {...record,id:record.id+':eyes:'+(style||'original')+':'+(color||'original'),eyeStyle:style,colorAppearance:{...record.colorAppearance,face:style,eyeColor:color}};
 }
 function selectBase(player,o){
  if(!registry||player?.zoanTransformed)return null;
  if(['combat-idle','guard','hurt','death'].includes(o.action))return select(player,{...o,action:'idle'});
  if(['attack','skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(o.action)){const candidates=o.weaponless||player.equipment?.weapon==null?['attack-unarmed']:['attack-unarmed','attack-firearm','attack-focus','attack-sword','attack-daggers','attack-tech'];for(const action of candidates){const r=select(player,{...o,action});if(r)return {...r,resolvedAction:action};}return null;}
  const raw=player.appearance96||{};const a={...raw,body:raw.gender??raw.body,hair:raw.hairStyle??raw.hair,face:raw.eyeStyle??raw.face,skin:raw.skinColor??raw.skin};const equipment=Object.fromEntries(Object.entries(player.equipment||{}).filter(([slot])=>!['necklace','ring','belt','charm','cloak','akuma_no_mi','visual_completo'].includes(slot)));for(const [k,v]of Object.entries(equipment))if(v==null||['none','original'].includes(v))delete equipment[k];if(o.weaponless)delete equipment.weapon;if(root.MareHeadgear?.hidden(player))delete equipment.head;
  const customFemaleFace=canonical(a.body)==='female'&&root.MareReworkEyeStylesHD?.supports(a.face);
  if(a.face&&!['original','face-gentle'].includes(a.face)&&!customFemaleFace||a.eyeColor&&!['original','blue'].includes(a.eyeColor)&&(canonical(a.body)!=='female'||!root.MareCharacterAppearance?.eyes[a.eyeColor]))return null;
  if(a.skin&&a.skin!=='original'&&!root.MareAppearance96?.skins[a.skin]||a.hairColor&&a.hairColor!=='original'&&!root.MareAppearance96?.hairs[a.hairColor])return null;
  const outfit=outfitRegistry?.resolve({body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment});if(outfit)return {...outfit,hdKind:'outfit'};
  // A separated original head can carry the existing named hair/helmet while
  // the exact outfit keeps its own layers, source archive and authored poses.
  // Do not infer a clean head from a baked clothed composite.
  if(canonical(a.body)==='female'&&(customFemaleFace||equipment.head!=null||a.hair&&a.hair!=='original'||a.eyeColor&&!['original','blue'].includes(a.eyeColor))){
   const clothes=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='head'));
   const originalOutfit=outfitRegistry?.resolve({body:'female',action:o.action,direction:o.direction,appearance:{...a,hair:'original',face:'original',eyeColor:'original'},equipment:clothes});
   const named=originalOutfit&&femaleNamedHairRegistry?.resolve(originalOutfit,{hair:a.hair||'original',head:equipment.head?.def??equipment.head,appearance:a});
   if(named)return {...originalOutfit,id:named.id,sourceId:originalOutfit.id,hdKind:'outfit',femaleNamedHairRecord:named,colorAppearance:a};
  }
  // Reuse an isolated outfit only with a pixel-identical authored head contract.
  if(canonical(a.body)==='male'&&(equipment.head!=null||a.hair&&a.hair!=='original')){
   const clothes=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='head'));
   const garment=outfitRegistry?.resolve({body:'male',action:o.action,direction:o.direction,appearance:{...a,hair:'original'},equipment:clothes});
   if(garment?.pack.directions[garment.direction].layers.some(l=>l.slot==='headBase')){
    const hair=a.hair||'original',headItem=equipment.head?.def??equipment.head,headLook={...a,hair,head:headItem!=null?'head-'+headItem:'original'};
    const head=Number(headItem)===19?null:headRegistry?.resolve({body:'male',direction:o.direction,look:headLook});
    const gear=!head&&hair==='original'&&headItem!=null?originalHairGearRegistry?.resolve({body:'male',direction:o.direction,item:headItem,look:headLook}):null;
    if(head||gear)return {...garment,id:garment.id+':head:'+hair+':'+(headItem??'none'),hdKind:'outfit',colorAppearance:a,headRecord:head,gearOnlyRecord:gear,headLook};
   }
  }
  const weapon=equipment.weapon?.def??equipment.weapon;
  const other=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='weapon').map(([slot,v])=>[slot,v?.def??v]));
  const nativeWeapon=weaponRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:other,allowExactComposite:!player.__reworkSubset});
  if(nativeWeapon?.exactComposite&&nativeWeapon.timeline?.length&&nativeWeapon.fps)return {...nativeWeapon,hdKind:'weapon'};
  const female=femaleRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment});if(female)return {...female,hdKind:'female-equipment'};
  if(customFemaleFace&&Object.keys(equipment).some(slot=>slot!=='head'))return null;
  if([109,15,111,112,117].includes(Number(weapon))&&Number(equipment.legs?.def??equipment.pants?.def)===133&&Object.keys(equipment).every(k=>['weapon','legs','pants','boots'].includes(k))&&(equipment.boots==null||Number(equipment.boots?.def??equipment.boots)===9)){const garment=outfitRegistry?.resolve({body:canonical(a.body),direction:o.direction,action:o.action,appearance:{hair:'original'},equipment:{pants:133}}),baseWeapon=weaponRegistry?.resolve({item:Number(weapon),body:canonical(a.body),direction:o.direction,action:o.action,appearance:a,equipment:{}}),bootGarment=equipment.boots?outfitRegistry?.resolve({body:canonical(a.body),direction:o.direction,action:o.action,appearance:{hair:'original'},equipment:{pants:133,boots:9}}):null,combined=(!equipment.boots||bootGarment)?root.MareReworkOutfitOverlayHD?.adapt(baseWeapon,garment,{bootsOutfit:bootGarment}):null;if(combined)return {...combined,hdKind:'weapon'};const bareCarry=carryRegistry?.resolve({item:Number(weapon),body:canonical(a.body),direction:o.direction,action:o.action,appearance:a,equipment:{weapon:Number(weapon)}}),dressedCarry=combinedCarryRegistry?.adapt(bareCarry,{boots:equipment.boots?9:null});if(dressedCarry)return {...dressedCarry,hdKind:'outfit-carry',pack:dressedCarry.base.pack,body:dressedCarry.base.body};}
  const headItem=equipment.head?.def??equipment.head;
  const withCarryHead=(record,kind)=>{
   if(!record)return null;
   const carry={...record,hdKind:kind,pack:record.base.pack,body:record.base.body};
   if(headItem==null)return carry;
   const hair=a.hair||'original',headLook={...a,hair,head:'head-'+headItem};
   const head=Number(headItem)===19?null:headRegistry?.resolve({body:'male',direction:o.direction,look:headLook});
   const gear=!head?originalHairGearRegistry?.resolve({body:'male',direction:o.direction,item:headItem,look:headLook,allowNamedHair:true}):null;
   if(!head&&!gear)return null;
   return {...carry,id:carry.id+':head:'+headItem,headRecord:head,gearOnlyRecord:gear,headLook,mirrorX:record.base.mirrorX};
  };
  const pants=equipment.legs??equipment.pants,pantsId=Number(pants?.def??pants);
  if(weapon!=null&&(equipment.coat!=null||[21,22,133,140,147,154,161,175,182].includes(pantsId))&&Object.keys(equipment).every(slot=>['weapon','coat','legs','pants','head','boots'].includes(slot))&&
     (equipment.boots==null||pantsId===133&&Number(equipment.boots.def??equipment.boots)===9)){
   let dressed=carryRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:{weapon}});
   if(equipment.coat!=null)dressed=combinedCarryRegistry?.adaptIsolatedCoat(dressed,{coat:Number(equipment.coat.def??equipment.coat)});
   if(pantsId===133&&equipment.coat==null)dressed=combinedCarryRegistry?.adapt(dressed,{boots:equipment.boots!=null?9:null});
   else if(pants!=null)dressed=combinedCarryRegistry?.adaptIsolatedPants(dressed,pantsId);
   const equipped=withCarryHead(dressed,'outfit-carry');
   if(equipped)return equipped;
  }
  const carried=carryRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='head').map(([k,v])=>[k,v?.def??v]))});
  const carryWithHead=withCarryHead(carried,'carry');
  if(carryWithHead)return carryWithHead;
  // The archived sword-0 cycle is already exact for its original identity.
  // Use the modular registration only for identities the archive cannot express.
  if(canonical(a.body)==='male'&&Number(weapon)===0&&o.action==='attack-sword'&&o.direction==='south'&&
     Object.keys(equipment).length===1&&!player.__reworkSubset){
   const nativeField=(aliases,defaults)=>aliases.every(key=>a[key]==null||defaults.includes(a[key]));
   // Fixed-palette archives must not override an explicit saved color.
   if(nativeField(['hair','hairStyle','face','eyeStyle'],['original'])&&
      nativeField(['skin','skinColor'],['original'])&&nativeField(['hairColor'],['original'])&&
      nativeField(['eyeColor'],['original'])){
    const approved=weaponRegistry?.resolve({item:0,body:'male',action:o.action,direction:'south'});
    if(approved?.id==='sword0-south-historical-attack')return {...approved,hdKind:'weapon'};
   }
  }
  const approvedSouthAction={0:'attack-sword',5:'attack-firearm',111:'attack-unarmed',119:'attack-unarmed'}[weapon];
  if(canonical(a.body)==='male'&&o.direction==='south'&&o.action===approvedSouthAction&&
     Object.keys(equipment).length===1&&!player.__reworkSubset){
   const source=weaponRegistry?.approvedSouth(weapon);
   const adapted=root.MareReworkOutfitOverlayHD?.adaptApprovedSouth(source,{baseIndex,appearance:a});
   if(adapted)return {...adapted,hdKind:'weapon'};
  }
  if(canonical(a.body)==='male'&&[0,1,67,68,69,70].includes(Number(weapon))&&o.action==='attack-sword'&&
     (['east','west'].includes(o.direction)||Number(weapon)===0&&['north','south'].includes(o.direction))&&(o.direction==='south'||equipment.coat!=null||[a.hair,a.skin,a.hairColor,a.eyeColor].some(v=>v&&!['original','blue'].includes(v)))&&
     Object.keys(equipment).every(slot=>['weapon','coat'].includes(slot))){
   const original=o.direction==='south'?swordSouth:weaponRegistry?.resolve({item:weapon,body:'male',action:o.action,direction:o.direction});
   const adapted=root.MareReworkOutfitOverlayHD?.adaptSword(original,outfitIndex,{coat:equipment.coat?.def??equipment.coat,baseIndex,appearance:a});
   if(adapted)return {...adapted,hdKind:'weapon'};
  }
  const separatedArmSource=o.direction==='south'&&(Number(weapon)===109&&o.action==='attack-unarmed'||Number(weapon)===17&&o.action==='attack-focus')
   ||o.direction==='north'&&Number(weapon)===15&&o.action==='attack-unarmed';
  if(canonical(a.body)==='male'&&separatedArmSource&&Object.keys(equipment).length===1){
   const source=weaponRegistry?.resolve({item:weapon,body:'male',action:o.action,direction:o.direction});
   const adapted=root.MareReworkOutfitOverlayHD?.adaptSeparatedArms(source,{baseIndex,appearance:a});
   if(adapted)return {...adapted,hdKind:'weapon'};
  }
  if(nativeWeapon?.timeline?.length&&nativeWeapon.fps)return {...nativeWeapon,hdKind:'weapon'};
  const approvedNorth=o.direction==='north'&&(
   o.action==='attack-daggers'&&[12,13,71,72,73,74].includes(Number(weapon))||
   o.action==='attack-sword'&&Number(weapon)===69);
  if(canonical(a.body)==='male'&&approvedNorth&&Object.keys(equipment).length===1){
   const source=weaponRegistry?.resolve({item:weapon,body:'male',action:o.action,direction:o.direction});
   const adapted=root.MareReworkOutfitOverlayHD?.adaptApprovedNorth(source,{baseIndex,appearance:a});
   if(adapted)return {...adapted,hdKind:'weapon'};
  }
  // Unknown saved identities are NOT a wildcard. Never hide equipped items in an unarmed base.
  if(Object.entries(equipment).some(([slot,item])=>slot!=='head'&&item!=null))return null;
  if(a.skin&&a.skin!=='original'&&!root.MareAppearance96?.skins[a.skin])return null;
  if(a.eyeColor&&!['original','blue'].includes(a.eyeColor)&&(canonical(a.body)!=='female'||!root.MareCharacterAppearance?.eyes[a.eyeColor])||a.hairColor&&a.hairColor!=='original'&&!root.MareAppearance96?.hairs[a.hairColor])return null;
  if(a.face&&!['original','face-gentle'].includes(a.face)&&!customFemaleFace)return null;
  let action=o.action||'idle';if(['combat-idle','guard','hurt','death'].includes(action))action='idle';if(['skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(action))action='attack-unarmed';if(action==='punch'||action==='attack')action='attack-unarmed';if(action==='focus')action='attack-focus';
  const hair=a.hair||'original';
  // Original is only resolved when explicitly present in source metadata. No cropped substitution.
  let r=registry.resolve({body:canonical(a.body),direction:o.direction,action,appearance:{hair:canonical(a.body)==='female'?'original':hair,skin:'original',face:customFemaleFace?'original':a.face},equipment:{}});
  if(!r&&hair!=='original')r=registry.resolve({body:canonical(a.body),direction:o.direction,action,appearance:{hair:'original',skin:'original',face:customFemaleFace?'original':a.face},equipment:{}});
  if(!r)return null;
  const hasSeparateHair=r.pack.directions[r.direction].layers.some(l=>l.slot==='hair');

  const femalePalette=canonical(a.body)==='female'&&[a.skin,a.hairColor].some(value=>value&&value!=='original');
  const needHead=customFemaleFace||femalePalette||headItem!=null||hair!=='original'||r.hairStyle!==hair.replace(/^hair-/,'')||a.eyeColor&&!['original','blue'].includes(a.eyeColor);
  const headLook={...a,hair,head:headItem!=null?'head-'+headItem:'original'};
  const femaleNamed=needHead?femaleNamedHairRegistry?.resolve(r,{hair,head:headItem,appearance:a}):null;
  if(!hasSeparateHair&&!femaleNamed&&((a.hairColor&&a.hairColor!=='original')||(a.skin&&a.skin!=='original')))return null;
  const head=needHead&&!femaleNamed?headRegistry?.resolve({body:canonical(a.body),direction:o.direction,look:headLook}):null;
  const gearOnly=needHead&&!head&&hasSeparateHair&&hair==='original'&&headItem!=null?originalHairGearRegistry?.resolve({body:canonical(a.body),direction:o.direction,item:headItem,look:headLook}):null;
  if((customFemaleFace||femalePalette)&&!femaleNamed)return null;
  if(needHead&&((!head&&!gearOnly&&!femaleNamed)||(!femaleNamed&&!headCompat)))return null;
  return {...r,id:r.id+':'+hair+':'+(headItem??'none')+':'+(a.skin||'original')+':'+(a.hairColor||'original')+(femaleNamed?.eyeColor?':eye-palette:'+femaleNamed.eyeColor:'')+(femaleNamed?.eyeStyle?':'+femaleNamed.eyeStyle:''),eyeStyle:femaleNamed?.eyeStyle,sourceId:r.id,colorAppearance:a,headRecord:head,gearOnlyRecord:gearOnly,femaleNamedHairRecord:femaleNamed,headLook};
 }
 function frameFor(r,o){const timeline=r.hdKind==='weapon'?r.timeline:null,clip=r.hdKind==='weapon'?{frames:timeline.length,fps:r.fps,loop:false}:r.pack.directions[r.direction].clip;const tick=Number.isFinite(o.progress)?Math.floor(Math.max(0,Math.min(1,o.progress))*clip.frames):Math.floor(Math.max(0,o.time||0)*clip.fps),position=clip.loop?tick%clip.frames:Math.min(clip.frames-1,tick);return timeline?r.states.findIndex(s=>s.state===String(timeline[position])):position;}
 function filesFor(r,frame){return [...new Set([...(r.hdKind==='female-equipment'?femaleRegistry:r.hdKind==='weapon'?weaponRegistry:r.hdKind==='outfit'?outfitRegistry:r.hdKind==='carry'?carryRegistry:r.hdKind==='outfit-carry'?combinedCarryRegistry:registry).requiredFiles(r,{frame}),...(r.headRecord?headRegistry.requiredFiles(r.headRecord):[]),...(r.gearOnlyRecord?originalHairGearRegistry.requiredFiles(r.gearOnlyRecord):[]),...(r.femaleNamedHairRecord?femaleNamedHairRegistry.requiredFiles(r.femaleNamedHairRecord):[])])];}
 async function prepare(player,o,clipFileLimit=0){await ready;const r=select(player,o);if(!r)return false;const frame=frameFor(r,o),sourceKey=r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}),key=sourceKey+':'+frame,files=filesFor(r,frame);let entry=cache.get(sourceKey);if(entry){cache.delete(sourceKey);cache.set(sourceKey,entry);}if(entry&&clipFileLimit)entry.imageLimit=Math.max(entry.imageLimit||64,clipFileLimit);if(entry?.frames.has(frame)||entry&&files.every(p=>entry.images.has(p)))return true;if(failures.has(key))return false;if(pending.has(key))return pending.get(key);
  const job=(async()=>{try{entry=entry||{images:new Map(),proofs:[],frames:new Map(),imageLimit:Math.max(64,clipFileLimit)};await Promise.all(files.map(async p=>{if(!entry.images.has(p))entry.images.set(p,await loadShared(p));}));
  if(r.femaleNamedHairRecord)femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,entry.images);
  if(r.headRecord||r.gearOnlyRecord){const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:r.direction,baseFrame:frame,baseImages:new Map([...entry.images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]])),headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:entry.images,replaceFace:false});if(!proof.compatible)throw Error('Head identity: '+proof.reason);entry.proofs[frame]=proof;}
  for(const p of files){const im=entry.images.get(p);entry.images.delete(p);entry.images.set(p,im);}while(entry.images.size>Math.max(entry.imageLimit||64,files.length))entry.images.delete(entry.images.keys().next().value);
  cache.set(sourceKey,entry);while(cache.size>4)cache.delete(cache.keys().next().value);onChange();return true;}catch(e){failures.set(key,e.message);error=e.message;onChange();return false;}finally{pending.delete(key);}})();pending.set(key,job);return job;
 }
 // Explicit preload for callers that advance simulation without the animation loop.
 async function prepareClip(player,o={}){await ready;const r=select(player,o);if(!r)return false;const count=r.hdKind==='weapon'?r.timeline.length:r.pack.directions[r.direction].clip.frames;const retainedFiles=new Set();for(let frame=0;frame<count;frame++)for(const file of filesFor(r,frameFor(r,{...o,progress:frame/count})))retainedFiles.add(file);for(let frame=0;frame<count;frame++)if(!await prepare(player,{...o,progress:frame/count},retainedFiles.size))return false;return true;}
 function composeFrame(r,frame,entry){
  const canvas=makeCanvas(r.hdKind==='weapon'?r.nativeCanvas[0]:r.pack.frame.width*r.pack.density,r.hdKind==='weapon'?r.nativeCanvas[1]:r.pack.frame.height*r.pack.density);const info=(r.femaleNamedHairRecord?{render:(cx,base,imgs,opts)=>base.hdKind==='outfit'?outfitRegistry.renderWithHead(cx,base,imgs,femaleNamedHairRegistry.compose(base,base.femaleNamedHairRecord,imgs),opts):femaleNamedHairRegistry.render(cx,base,base.femaleNamedHairRecord,imgs,opts)}:r.hdKind==='female-equipment'?femaleRegistry:r.hdKind==='weapon'?weaponRegistry:r.hdKind==='outfit'?outfitRegistry:r.hdKind==='carry'?carryRegistry:r.hdKind==='outfit-carry'?combinedCarryRegistry:registry).render(canvas.getContext('2d'),r,entry.images,{frame,appearance:r.colorAppearance,makeCanvas,hiddenSlots:r.headRecord||r.gearOnlyRecord?.hideHair?['hair']:[]});
  if(r.headRecord){const pixels=headRegistry.composeNative(r.headRecord,entry.images,{width:r.pack.frame.width,height:r.pack.frame.height,targetNeck:entry.proofs[frame].targetNeck,look:r.headLook,hairRamp:root.MareAppearance96?.hairs[r.colorAppearance.hairColor]?.ramp});for(const slot of ['hair','head']){const tile=makeCanvas(info.width,info.height),cx=tile.getContext('2d'),data=cx.createImageData(info.width,info.height);data.data.set(pixels[slot]);cx.putImageData(data,0,0);canvas.getContext('2d').drawImage(tile,0,0);}}
  if(r.gearOnlyRecord)originalHairGearRegistry.draw(canvas.getContext('2d'),r.gearOnlyRecord,entry.images,entry.proofs[frame]);
  const alpha=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height;for(let y=0;y<canvas.height&&top===canvas.height;y++)for(let x=0;x<canvas.width;x++)if(alpha[(y*canvas.width+x)*4+3]){top=y;break;}info.visualHeight=Math.max(0,info.pivot.y-top);return {canvas,info};
 }
 function sourceKeyFor(r,player){
  return JSON.stringify([r.id,r.hdKind,r.direction,r.hdKind==='weapon'?r.timeline:r.pack.directions[r.direction].clip,r.colorAppearance||player.appearance96||{}]);
 }
 // A committed bundle owns rendered frame surfaces, outside the opportunistic
 // preview cache. Share decoded sources across all poses of one preparation.
 async function prepareConfiguration(poses,{signal,resolve=({player,options})=>({player,options,source:select(player,options)})}={}){
  await ready;
  if(state!=='ready')throw Error(error||'Índices HD indisponíveis');
  const sources=new Map(),routes=new Map(),decoded=new Map(),coverage=[];
  const routeKey=o=>JSON.stringify([o.action,o.direction,!!o.weaponless]);
  const decode=path=>{
   if(!decoded.has(path))decoded.set(path,Promise.resolve().then(()=>loadShared(path)).catch(e=>{throw Error(path+': '+e.message);}));
   return decoded.get(path);
  };
  try{
   for(const pose of poses){
    signal?.throwIfAborted();
    const resolved=resolve(pose),{player,options,source:r}=resolved||{};
    if(!r)throw Error('Sem fonte visual: '+pose.options.action+' / '+pose.options.direction);
    const key=sourceKeyFor(r,player),slot=routeKey(pose.options);
    if(!sources.has(key)){
     const frameCount=r.hdKind==='weapon'?r.timeline.length:r.pack.directions[r.direction].clip.frames;
     if(!Number.isSafeInteger(frameCount)||frameCount<1)throw Error('Clipe inválido: '+r.id);
     const frames=new Map(),entry={images:new Map(),proofs:[]};
     sources.set(key,frames);
     for(let i=0;i<frameCount;i++){
      signal?.throwIfAborted();
      const frame=frameFor(r,{...options,progress:(i+.25)/frameCount});
      if(!Number.isSafeInteger(frame)||frame<0)throw Error('Quadro inválido: '+r.id+' / '+i);
      if(frames.has(frame))continue;
      await Promise.all(filesFor(r,frame).map(async path=>{entry.images.set(path,await decode(path));}));
      signal?.throwIfAborted();
      if(r.femaleNamedHairRecord)femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,entry.images);
      if(r.headRecord||r.gearOnlyRecord){
       const baseImages=new Map([...entry.images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]]));
       const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:r.direction,baseFrame:frame,baseImages,headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:entry.images,replaceFace:false});
       if(!proof.compatible)throw Error('Head identity: '+proof.reason);
       entry.proofs[frame]=proof;
      }
      try{frames.set(frame,composeFrame(r,frame,entry));}
      catch(e){throw Error(r.id+' / '+frame+': '+e.message);}
      if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
     }
    }
    routes.set(slot,{r,key,options});
    coverage.push({action:pose.options.action,direction:pose.options.direction,weaponless:!!pose.options.weaponless,source:r.id,frames:sources.get(key).size,omitted:resolved.omitted||[],unsupported:resolved.unsupported||[]});
   }
  }catch(e){for(const frames of sources.values())for(const {canvas} of frames.values()){canvas.width=0;canvas.height=0;}throw e;}
  return {coverage,
   draw(ctx,player,o){
    const route=routes.get(routeKey(o));if(!route)return false;
    const {r,key,options}=route,frame=frameFor(r,{...o,action:options.action}),result=sources.get(key)?.get(frame);
    if(!result)return false;
    paint(ctx,player,{...o,action:options.action},r,frame,result,false);
    this.visualHeight=result.info.visualHeight*WORLD_SCALE;
    return true;
   },
   release(){for(const frames of sources.values())for(const {canvas} of frames.values()){canvas.width=0;canvas.height=0;}sources.clear();routes.clear();}
  };
 }
 function draw(ctx,player,o={}){
  const r=select(player,o);if(!r){last={state:state==='ready'?'uncovered':'loading',action:o.action,direction:o.direction,reason:'No exact whole-source identity; existing renderer retained, not mixed with rework.'};return false;}
  const frame=frameFor(r,o),sourceKey=r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}),entry=cache.get(sourceKey);if(!entry||!entry.frames.has(frame)&&!filesFor(r,frame).every(p=>entry.images.has(p))){void prepare(player,o);last={state:failures.has(sourceKey+':'+frame)?'failed':'loading',source:r.id};return false;}
  cache.delete(sourceKey);cache.set(sourceKey,entry);
  let result=entry.frames.get(frame);if(!result){try{result=composeFrame(r,frame,entry);entry.frames.set(frame,result);while(entry.frames.size>3)entry.frames.delete(entry.frames.keys().next().value);}catch(e){failures.set(sourceKey+':'+frame,e.message);error=e.message;last={state:'failed',source:r.id,reason:e.message};onChange();return false;}}
  return paint(ctx,player,o,r,frame,result);
 }
 function paint(ctx,player,o,r,frame,result,hold=true){
  let x=o.x||0,y=o.y||0;
  if(o.preview){
   const w=Math.max(ctx.canvas.width,result.info.width),h=Math.max(ctx.canvas.height,result.info.height+48);
   if(ctx.canvas.width!==w)ctx.canvas.width=w;if(ctx.canvas.height!==h)ctx.canvas.height=h;
   if(ctx.canvas.style){ctx.canvas.style.width=w+'px';ctx.canvas.style.height=h+'px';ctx.canvas.style.maxWidth='none';}
   if(ctx.canvas.parentElement?.style)ctx.canvas.parentElement.style.overflow='auto';
   x=w/2;y=h-24;
  }
  const physicalScale=o.preview?1:WORLD_SCALE;
  if(o.consumer==='portrait')y=Math.max(y,result.info.visualHeight*physicalScale+3);
  ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(result.canvas,x-result.info.pivot.x*physicalScale,y-result.info.pivot.y*physicalScale,result.info.width*physicalScale,result.info.height*physicalScale);}finally{ctx.restore();}
  if(hold&&player&&typeof player==='object'){const key=identityKey(player)+'|'+(o.consumer||'world'),held={...result,key:identityKey(player),pose:{source:r.id,action:r.resolvedAction||r.action||o.action,direction:o.direction,consumer:o.consumer,frame}};lastRendered.set(key,held);lastRendered.set(key+'|'+o.direction,held);while(lastRendered.size>32)lastRendered.delete(lastRendered.keys().next().value);}
  last={state:'rendered',source:r.id,action:r.resolvedAction||r.action||o.action,direction:o.direction,consumer:o.consumer,frame,width:result.info.width,height:result.info.height,pivot:result.info.pivot,density:result.info.density,physicalScale,sourceScale:1,status:r.status,approval:r.approval,eyeStyle:r.eyeStyle||r.femaleNamedHairRecord?.eyeStyle,skinPalette:r.femaleNamedHairRecord?.skinColor,hairPalette:r.femaleNamedHairRecord?.hairColor,faceProtectedExact:!!r.femaleNamedHairRecord?.faceProtectedExact,faceProtectedExceptIris:!!r.femaleNamedHairRecord?.faceProtectedExceptIris,headSourceScale:r.femaleNamedHairRecord?.sourceScale,headStatus:r.femaleNamedHairRecord?'semantic-fringe-ownership-candidate':r.gearOnlyRecord?'gear-only-candidate-calibration':r.headRecord?.status,headIdentity:r.femaleNamedHairRecord?(r.femaleNamedHairRecord.eyeStyle?'original-face-with-eye-style':'original-face-protected-exact'):r.gearOnlyRecord?'exact-head-original-hair-preserved':r.headRecord?'exact-head-source-pixels':'authored-original',headOcclusion:r.femaleNamedHairRecord?.gearRecord?r.femaleNamedHairRecord.gearPolicy:r.gearOnlyRecord?.occlusion,headGearScale:r.gearOnlyRecord?.sourceScale,headGearSource:r.gearOnlyRecord?.gear.source||r.femaleNamedHairRecord?.gearRecord?.layers.find(l=>l.id===r.femaleNamedHairRecord.gearRecord.headgearPolicy?.gearId)?.source,headGearId:r.gearOnlyRecord?.id};return true;
 }
 const familyStates=new Map();
 async function prepareFamily(player){await ready;const raw=player.appearance96||{};if(!root.MareAppearance96&&[raw.skinColor,raw.skin,raw.hairColor].some(v=>v&&v!=='original'))return false;const key=identityKey(player);if(familyStates.has(key))return familyStates.get(key).promise;const record={state:'checking',reason:null};familyStates.set(key,record);while(familyStates.size>8)familyStates.delete(familyStates.keys().next().value);
  record.promise=(async()=>{try{const attack=['attack-unarmed','attack-firearm','attack-focus','attack-sword','attack-daggers','attack-tech'].find(action=>['south','north','east','west'].every(direction=>!!select(player,{action,direction})));if(!attack)throw Error('Incomplete native family: no compatible four-direction attack');for(const action of ['idle','walk',attack])for(const direction of ['south','north','east','west']){const r=select(player,{action,direction});if(!r)throw Error('Incomplete native family: '+action+'/'+direction);if(r.femaleNamedHairRecord){const images=new Map();await Promise.all(femaleNamedHairRegistry.requiredFiles(r.femaleNamedHairRecord).map(async p=>images.set(p,await loadShared(p))));femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,images);}if(r.headRecord||r.gearOnlyRecord){const images=new Map(),d=r.pack.directions[r.direction],refs=new Set(r.headRecord?headRegistry.requiredFiles(r.headRecord):originalHairGearRegistry.requiredFiles(r.gearOnlyRecord));for(const layer of d.layers.filter(l=>l.slot==='headBase'))for(const sha of layer.frames||[layer.source])refs.add((r.hdKind==='outfit'?'tools/rework-modular-outfits-hd/assets/':'tools/rework-base-hd/assets/')+sha+'.png');await Promise.all([...refs].map(async p=>images.set(p,await loadShared(p))));for(let frame=0;frame<d.clip.frames;frame++){const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:direction,baseFrame:frame,baseImages:new Map([...images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]])),headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:images,replaceFace:false});if(!proof.compatible)throw Error(action+'/'+direction+': '+proof.reason);}}}record.state='ready';onChange();return true;}catch(e){record.state='uncovered';record.reason=e.message;onChange();return false;}})();return record.promise;
 }
 const preparedDirections=new Map();
 async function prepareForPlayer(player,o={}){if(!o.consumer||o.consumer==='world'){const key=identityKey(player)+'|'+!!root.MareAppearance96+'|'+!!root.MareCharacterAppearance;if(!preparedDirections.has(key)){const task=(async()=>{for(const direction of ['south','east','west','north'])await prepareStablePose(player,{action:'idle',direction,consumer:'world'});})();preparedDirections.set(key,task);while(preparedDirections.size>8)preparedDirections.delete(preparedDirections.keys().next().value);}await preparedDirections.get(key);}return prepare(player,o);}
 // Prepare the exact directional rest pose without claiming it was drawn in the world.
 async function prepareStablePose(player,o={}){if(!await prepare(player,o))return false;const key=identityKey(player)+'|'+(o.consumer||'world'),previous=last,held=lastRendered.get(key);try{return draw(makeCanvas(1,1).getContext('2d'),player,{...o,x:0,y:0,preview:false});}finally{last=previous;if(held)lastRendered.set(key,held);else lastRendered.delete(key);}}
 function canDrawStable(player,o={}){if(!select(player,o)||failureFor(player,o))return false;const prepared=pose=>{const r=select(player,pose);if(!r||failureFor(player,pose))return false;const frame=frameFor(r,pose),entry=cache.get(r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}));return !!entry&&(entry.frames.has(frame)||filesFor(r,frame).every(p=>entry.images.has(p)));};return prepared(o)||lastRendered.has(identityKey(player)+'|'+(o.consumer||'world')+'|'+o.direction)||o.action!=='idle'&&prepared({...o,action:'idle',time:0,progress:0});}
 function drawStable(ctx,player,o={}){const key=identityKey(player);if(!select(player,o)){last={state:'uncovered',action:o.action,direction:o.direction,reason:'No compatible source for this pose'};return false;}if(draw(ctx,player,o))return true;if(failureFor(player,o))return false;const consumerKey=key+'|'+(o.consumer||'world'),held=lastRendered.get(consumerKey+'|'+o.direction);if(!held&&o.action!=='idle'){const loading=last;if(draw(ctx,player,{...o,action:'idle',time:0,progress:0})){last={...last,state:'holding-native-while-loading',requestedAction:o.action,requestedDirection:o.direction};return true;}last=loading;}if(held?.key===key){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(held.canvas,(o.x||0)-held.info.pivot.x*WORLD_SCALE,(o.y||0)-held.info.pivot.y*WORLD_SCALE,held.info.width*WORLD_SCALE,held.info.height*WORLD_SCALE);ctx.restore();last={...held.pose,state:'holding-native-while-loading',requestedAction:o.action,requestedDirection:o.direction,physicalScale:WORLD_SCALE,sourceScale:1};return true;}return false;}
 const height=player=>{const held=lastRendered.get(identityKey(player)+'|world');return held?.key===identityKey(player)?held.info.visualHeight*WORLD_SCALE:null;};
 function failureFor(player,o={}){const r=select(player,o);return r?failures.get(r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{})+':'+frameFor(r,o)):null;}
 return {ready,prepare:prepareForPlayer,prepareClip,prepareConfiguration,prepareStablePose,prepareFamily,draw,drawStable,canDrawStable,height,select,failureFor,snapshot:()=>({state,error,last,cachedSources:cache.size,families:[...familyStates.values()].map(({state,reason})=>({state,reason})),failures:[...failures]})};
}
const api={create};root.MareReworkNativeHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
