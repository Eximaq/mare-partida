/* Whole authored HD bases in the normal player path. Source pixels stay native; only the final world draw uses the approved monster-scale transform. */
(function(root){'use strict';
const identityKey=p=>JSON.stringify([p.appearance96||{},p.equipment||{},!!p.zoanTransformed,!!root.MareHeadgear?.hidden(p)]);
// Approved comparison: the 374px-tall rifle115 source draws at 105px, like the Marinheiro.
// A fixed factor across every pose prevents frame-to-frame breathing; assets and composition stay HD.
const WORLD_SCALE=105/374;
const canonical=b=>['female','feminino'].includes(b)?'female':'male';
// These equipped items have no body layer. They must not invalidate a
// compatible visual route, including an independently registered slot.
const nonVisualEquipment=new Set(['necklace','ring','belt','charm','cloak','akuma_no_mi']);
function create({baseURL=root.location?.href,onChange=()=>{},fetchJSON=async path=>{const r=await fetch(new URL(path,baseURL));if(!r.ok)throw Error('HD index HTTP '+r.status);return r.json();},loadImage=null,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 let daggerP22,daggerP22Store,swordCheckpoint,northRig,profileStore,profileRig,baseIndex,outfitIndex,outfitById,swordSouth,registry,femaleNamedHairRegistry,femaleRegistry,weaponRegistry,headRegistry,headCompat,originalHairGearRegistry,assetStore,outfitRegistry,outfitStore,carryRegistry,combinedCarryRegistry,weaponStore,state='loading',last=null,error=null;const cache=new Map(),pending=new Map(),failures=new Map(),lastRendered=new Map();
 const imageLoader=loadImage||(async path=>{if(path.startsWith('tools/rework-female-dagger-p22/assets/'))return daggerP22Store.load(path);if(path.startsWith('tools/rework-female-profile-rig/assets/'))return profileStore.load(path);if(path.startsWith('tools/rework-base-hd/assets/'))return assetStore.load(path);if(path.startsWith('tools/rework-modular-outfits-hd/assets/'))return outfitStore.load(path);if(path.startsWith('tools/rework-weapon-layers-hd/assets/'))return weaponStore.load(path);const im=new Image();im.src=new URL(path,baseURL);await im.decode();return im;});
 const imageRequests=new Map();
 function loadShared(path){
  if(!imageRequests.has(path))imageRequests.set(path,Promise.resolve().then(()=>imageLoader(path)).finally(()=>imageRequests.delete(path)));
  return imageRequests.get(path);
 }
 // Load the optional extension in parallel with the native indexes. A missing
 // or invalid archive must never block the older exact or modular routes.
 const swordCatalog=root.MareSword0Checkpoint
  ?Promise.resolve().then(()=>fetchJSON('tools/rework-sword0-checkpoint/sword-catalog.json')).catch(()=>null)
  :Promise.resolve(null);
 const indexesReady=Promise.all([fetchJSON('tools/rework-base-hd/index.json'),fetchJSON('tools/rework-weapon-layers-hd/index.json'),fetchJSON('tools/rework-accessories/head-layer-index.json'),fetchJSON('tools/rework-base-hd/archives/archive-index.json'),fetchJSON('tools/rework-modular-outfits-hd/index.json'),fetchJSON('tools/rework-modular-outfits-hd/archives/archive-index.json'),fetchJSON('tools/rework-weapon-layers-hd/carry-binding-plan.json'),fetchJSON('tools/rework-weapon-layers-hd/archives/archive-index.json'),fetchJSON('tools/rework-accessories/female-original-face-ownership.json'),fetchJSON('tools/rework-female-profile-rig/index.json').catch(e=>({loadError:e.message})),fetchJSON('tools/rework-female-north-rig/index.json').catch(e=>({loadError:e.message}))]).then(([index,weapons,heads,archives,outfits,outfitArchives,carry,weaponArchives,femaleOwnership,profile,north])=>{northRig=north;profileRig=profile;if(profile.archiveIndex)profileStore=root.MareReworkHDAssets?.create(profile.archiveIndex,{baseURL,prefix:'tools/rework-female-profile-rig/archives/'});baseIndex=index;outfitIndex=outfits;outfitById=new Map(outfits.records.map(r=>[r.id,r]));swordSouth=weapons.modularSwordSouth;registry=root.MareReworkBaseHD.create(index);femaleNamedHairRegistry=root.MareFemaleNamedHairHD?.create(heads,femaleOwnership,{baseRegistry:registry,makeCanvas});femaleRegistry=root.MareReworkFemaleEquipmentHD?.create({schema:'female-native-equipment-registration-v1',records:weapons.femaleRegistrations||[]},{outfits,appearanceRegistry:femaleNamedHairRegistry});assetStore=root.MareReworkHDAssets?.create(archives,{baseURL});weaponRegistry=root.MareReworkWeaponNativeHD?.create(weapons,{makeCanvas});headRegistry=root.MareReworkHead?.create(heads,{appearanceAPI:{recolor:(...a)=>root.MareAppearance96.recolor(...a),materialMask:(...a)=>root.MareAppearance96.materialMask(...a)},makeCanvas});headCompat=root.MareNativeHeadCompat?.create({makeCanvas});originalHairGearRegistry=root.MareOriginalHairHelmetsHD?.create(heads,{compat:headCompat,makeCanvas});outfitRegistry=root.MareReworkModularOutfitsHD?.create(outfits,{allowCandidates:true});carryRegistry=root.MareReworkWeaponCarryHD?.create(index,carry,{makeCanvas});combinedCarryRegistry=root.MareReworkOutfitCarryOverlayHD?.create(carryRegistry,outfits);weaponStore=root.MareReworkHDAssets?.create(weaponArchives,{baseURL,prefix:'tools/rework-weapon-layers-hd/archives/'});outfitStore=root.MareReworkHDAssets?.create(outfitArchives,{baseURL,prefix:'tools/rework-modular-outfits-hd/archives/'});});
 let swordRegistration;
 function warmSwordCheckpoint(){
  if(!registry||!root.MareSword0Checkpoint||!root.MareAppearance96||!root.MareCharacterAppearance)return Promise.resolve(false);
  if(!swordRegistration)swordRegistration=(async()=>{
   try{
    const catalog=await swordCatalog;
    if(!catalog)return false;
    const control={appearance96:catalog.appearance96,equipment:{weapon:{def:0},coat:{def:151}}};
    const controls=player=>Object.fromEntries(['north','south','east','west'].map(direction=>[direction,select(player,{action:'attack-sword',direction})]));
    const trusted=controls(control),standard=root.MareCharacterAppearance.normalize(control.appearance96);
    const saved=['porcelain','light','warm','olive','copper','brown','dark','ebony']
     .filter(skinColor=>root.MareCharacterAppearance.skins[skinColor]&&root.MareAppearance96.skins[skinColor])
     .map(skinColor=>controls({...control,appearance96:{...standard,skinColor}}));
    swordCheckpoint=await root.MareSword0Checkpoint.verify(catalog,trusted,{saved});
    return !!swordCheckpoint;
   }catch(_){return false;}
  })();
  return swordRegistration;
 }
 const daggerP22Ready=Promise.resolve().then(()=>fetchJSON('tools/rework-female-dagger-p22/index.json')).then(c=>{
  if(c?.schema!=='approved-female-dagger-p22-v1'||!c.frames||!c.targets||!c.geometry||!c.appearance||!root.MareReworkHDAssets)return;
  daggerP22Store=root.MareReworkHDAssets.create(c.archiveIndex,{baseURL,prefix:'tools/rework-female-dagger-p22/archives/'});
  daggerP22=c;
 }).catch(()=>{});
 const ready=Promise.all([indexesReady.then(warmSwordCheckpoint),daggerP22Ready]).then(()=>{state='ready';onChange();}).catch(e=>{state='failed';error=e.message;onChange();});
 function resolveProfileLayers(player,o,a,equipment){
  const s=profileRig,dir=o.direction;
  if(player.__reworkSubset||canonical(a.body)!=='female'||o.action!=='walk'||!['east','west'].includes(dir)||s?.schema!=='female-profile-separated-rig-candidate-v1')return null;
  if(Object.entries(equipment).some(([key,v])=>!['weapon','legs','pants'].includes(key)||v&&typeof v==='object'&&['variant','variantId','appearanceVariant'].some(k=>v[k]!=null&&v[k]!=='original'))||equipment.legs!=null&&equipment.pants!=null)return null;
  const wr=equipment.weapon?.def??equipment.weapon,item=wr==null?null:Number(wr),pr=equipment.legs??equipment.pants,pants=pr==null?null:Number(pr.def??pr);
  if(item!=null&&![0,5,17].includes(item)||pants!=null&&pants!==21)return null;
  const d=s.directions?.[dir],clock=[0,0,1,1,1,1,1,2,2,2,2,3,4,4,4,4,4,5,5,5,6,6,7,7,7,7,7,8,8,8,9,9,10,10,10,10,10,11,11,11];
  if(!d||d.poses.length!==12||JSON.stringify(d.clock)!==JSON.stringify(clock)||JSON.stringify(s.phaseMap)!=='[0,1,2,2,3,4,4,5,6,6,7,0]')return null;
  const native=femaleRegistry?.resolve({body:'female',action:'walk',direction:dir,item:item??0,equipment:{weapon:item??0},appearance:a});
  if(!native||native.sourceBaseId!==d.sourceId||native.states.length!==8||native.paddingPhysical!==(item===0||item==null?64:0))return null;
  if(native.states.some(st=>st.parts.length!==1||st.parts[0].depth!==(item===17?4.01:3.8099999999999996)))return null;
  const body=item==null?{...native,item:null,paddingPhysical:0,states:native.states.map(st=>({...st,parts:[]}))}:native;
  if(body.material)body.material={...body.material,id:body.material.id+':profile-neck-restore-bridge-v2',profileNeckRestore:true,profileNeckBridge:true};
  return {...body,id:'profile-separated-candidate:'+item+':'+pants+':'+body.id,hdKind:'profile-separated',profileLayers:{spec:s,body,pants},colorAppearance:a,pack:{...body.pack,directions:{[dir]:{...body.pack.directions[dir],clip:{frames:40,fps:40,loop:true}}}}};
 }
 function profileFiles(r,frame){
  const {spec:s,body,pants}=r.profileLayers,k=s.directions[r.direction].clock[frame],p=s.directions[r.direction].poses[k],phase=s.phaseMap[k];
  return [...new Set([...femaleRegistry.requiredFiles(body,{frame:phase}),...p.layers.map(l=>l.source),...(pants==null?[p.bareForeground]:[p.cloth,...p.owners,p.foreground]),...(body.item===17?[s.orb17.mask]:[])])];
 }
 function composeProfileLayers(r,frame,entry){
  const {spec:s,body,pants}=r.profileLayers,k=s.directions[r.direction].clock[frame],p=s.directions[r.direction].poses[k],phase=s.phaseMap[k],C=()=>makeCanvas(512,512),pixels=c=>c.getContext('2d').getImageData(0,0,512,512).data,images=new Map(entry.images),api=root.MareAppearance96,skin=root.MareNativeSkinHD,skinName=body.material?.skinColor;
  const source=f=>{let im=images.get(f);if(!im||im.width!==512||im.height!==512)throw Error('Missing profile source '+f);return im;};
  const tinted=f=>{const t=C(),ctx=t.getContext('2d');ctx.drawImage(source(f),0,0);if(skinName){let d=ctx.getImageData(0,0,512,512),tones=new Uint8Array(512*512);for(let n=0;n<tones.length;n++)if(d.data[n*4+3])tones[n]=skin.tone(...d.data.subarray(n*4,n*4+3));d.data.set(api.recolor(d.data,tones,api.skins[skinName].ramp));ctx.putImageData(d,0,0);}return t;};
  if(body.item===17&&skinName){const part=body.states[phase].parts[0];if(part.sha256!==s.orb17.sourceSHA256)throw Error('Profile orb source guard');const im=images.get(part.url),mask=images.get(s.orb17.mask);if(!im||!mask||im.width!==mask.width||im.height!==mask.height)throw Error('Missing profile orb material');const t=makeCanvas(im.width,im.height),ctx=t.getContext('2d'),m=makeCanvas(im.width,im.height);ctx.drawImage(im,0,0);m.getContext('2d').drawImage(mask,0,0);const d=ctx.getImageData(0,0,im.width,im.height),md=m.getContext('2d').getImageData(0,0,im.width,im.height).data,tones=new Uint8Array(md.length/4);for(let n=0;n<tones.length;n++)if(md[n*4]&&d.data[n*4+3])tones[n]=skin.tone(...d.data.subarray(n*4,n*4+3));d.data.set(api.recolor(d.data,tones,api.skins[skinName].ramp));ctx.putImageData(d,0,0);images.set(part.url,t);m.width=1;}
  const ops=[],native=C(),info=femaleRegistry.render(native.getContext('2d'),body,images,{frame:phase,makeCanvas,captureOps:o=>ops.push(o)}),canvas=C(),ctx=canvas.getContext('2d');
  for(const l of p.layers){if(l.skin){const t=tinted(l.source);ctx.drawImage(t,0,0);t.width=1;}else ctx.drawImage(source(l.source),0,0);}
  if(pants!=null){ctx.drawImage(source(p.cloth),0,0);for(const f of p.owners){const t=tinted(f);ctx.drawImage(t,0,0);t.width=1;}}
  const pad=body.paddingPhysical||0,W=512+pad*2,result=makeCanvas(W,W),rc=result.getContext('2d');rc.drawImage(canvas,pad,pad);const baseline=rc.getImageData(0,0,W,W).data.slice();for(const o of ops.filter(o=>o.op.part))rc.drawImage(o.canvas,0,0);
  if(body.item===0||body.item===5){const mc=C(),mx=mc.getContext('2d');mx.drawImage(source(pants==null?p.bareForeground:p.foreground),0,0);const mask=pixels(mc),d=rc.getImageData(0,0,W,W);for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(mask[(y*512+x)*4]){const n=((y+pad)*W+x+pad)*4;d.data.set(baseline.subarray(n,n+4),n);}rc.putImageData(d,0,0);mc.width=1;}
  for(const o of ops.filter(o=>o.op.layer&&['headBase','face','hair'].includes(o.op.layer.slot)))rc.drawImage(o.canvas,0,0);
  const rgba=rc.getImageData(0,0,W,W).data;let top=W;for(let y=0;y<W&&top===W;y++)for(let x=0;x<W;x++)if(rgba[(y*W+x)*4+3]){top=y;break;}
  for(const o of ops)o.canvas.width=1;native.width=1;canvas.width=1;return {canvas:result,info:{...info,source:r.id,frames:40,fps:40,visualHeight:Math.max(0,info.pivot.y-top)}};
 }

 // Authored passes verified at all twelve North contacts.
 const northWalkBootSources={
  8:'5c716dcd2e6b816af05a00dce4d7ccface43c7dd6cd3ad7c4d41d16a662f68b5',
  9:'35a1244a3a30540158e7279cc494c111a410011c6aa0b425e5886895472fb179',
  141:'beb5789022d012cf503306c1b90e38c33b270ce0f3cee7d9a1fc70ee4a2b5ed2',
  148:'b9ce19e553671187e2d46f5a1b00423af6640e0b51cb4f5bf615a00855f64a73',
  176:'36c8ab4a95ecdbe3b821dd345c494832c7084e0c73e24ab60b5a39749ad85c08',
  183:'f5a6dfecb3ed623d8356c9c40c6a593c4ff2f65323bcd59a5d05cb47ef1fe282'
 };
 function resolveNorthLayers(player,o,a,equipment){
  const s=northRig;
  if(player.__reworkSubset||canonical(a.body)!=='female'||o.action!=='walk'||o.direction!=='north'||s?.schema!=='female-north-author-layered-rig-v1')return null;
  if(Object.entries(equipment).some(([key,v])=>!['weapon','legs','pants','boots'].includes(key)||v&&typeof v==='object'&&['variant','variantId','appearanceVariant'].some(k=>v[k]!=null&&v[k]!=='original'))||equipment.legs!=null&&equipment.pants!=null)return null;
  const raw=equipment.weapon?.def??equipment.weapon,item=raw==null?null:Number(raw),trousers=equipment.legs??equipment.pants,pants=trousers==null?null:Number(trousers.def??trousers);
  const bootVal=equipment.boots,boot=bootVal==null?null:Number(bootVal.def??bootVal),
   ownPants=[168,182].includes(pants),lowerKit=ownPants||boot!=null;
  if(item!=null&&![0,5,17].includes(item)||pants!=null&&!ownPants&&pants!==21||
     lowerKit&&(item!=null||pants===21||boot!=null&&(!Object.hasOwn(northWalkBootSources,boot)||boot===148&&pants===182)||!root.MareCharacterAppearance?.skins?.[a.skin]))return null;
  const duration=[125,75,50,125,75,50,125,75,50,125,75,50],equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!equal(s.phaseMap,[0,1,1,2,3,3,4,5,5,6,7,7])||!equal(s.durationMs,duration)||!equal(s.frameToPhase,duration.flatMap((n,k)=>Array(n/25).fill(k)))||s.legs?.length!==12||s.armOcclusion?.length!==12||s.equipmentLayers?.[21]?.cloth?.length!==12||s.equipmentLayers?.[21]?.owner?.length!==12)return null;
  const native=femaleRegistry?.resolve({body:'female',action:'walk',direction:'north',item:item??0,equipment:{weapon:item??0},appearance:a});
  if(!native||native.sourceBaseId!==s.bodyRecord||native.states.length!==8)return null;
  // A weapon is an attachment consumer of this same authored rig, not an
  // alternate body/clothing image. Empty hands use the identical body source.
  const body=item==null?{...native,item:null,paddingPhysical:0,states:native.states.map(st=>({...st,parts:[]}))}:{...native};
  if(body.material)body.material={...body.material,id:body.material.id+':north-neck-contact-v1',northNeckContact:true};
  const d=body.pack.directions.north;
  let lower=null;
  if(lowerKit){
   const resource='tools/rework-modular-outfits-hd/assets/', donor=boot==null?null:outfitById.get(`frozen-v47-female-151-boot${boot}-north-walk`),
    bd=donor?.pack?.directions?.north, clock={frames:40,fps:40,loop:true},
    anchor=outfitById.get('frozen-v47-female-151-boot9-north-walk')?.pack?.directions?.north;
   const gear=bd?.layers.filter(l=>l.id.startsWith('boot'+boot+'-'))||[],
    core=d=>({...d,layers:d.layers.filter(l=>!/^boot[0-9]+-/.test(l.id))});
   const spans=l=>l.frames?.length===40&&s.frameToPhase.every((n,i)=>l.frames[i]===l.frames[s.frameToPhase.indexOf(n)])&&l.frames.every(h=>/^[a-f0-9]{64}$/.test(h));
   if(boot!=null&&(!donor?.frozenBootContract||donor.sourceAuthoritySHA256!==northWalkBootSources[boot]||!anchor||!equal(core(anchor),core(bd))||
      !['frame','pivot','density'].every(k=>equal(body.pack[k],donor.pack[k]))||!equal(bd.clip,clock)||gear.length!==4||
      !['left-rear','left-front','right-rear','right-front'].every(k=>gear.some(l=>l.id==='boot'+boot+'-'+k&&l.depth===(k.endsWith('-rear')?-1:45)&&l.binding?.kind==='fixed'&&spans(l)))))return null;
   let cloth=null,owner=null;
   if(ownPants){
    // Exact castanho source already covers this stand-alone selection. Do
    // not replace it or synthesize a boot composition without that identity.
    const opts={body:'female',direction:'north',action:'walk',equipment:trousers===equipment.legs?{legs:trousers}:{pants:trousers}};
    if(outfitRegistry?.resolveIndependentPants({...opts,appearance:a}))return null;
    const p=outfitRegistry?.resolveIndependentPants({...opts,appearance:{hair:'original',face:'original',hairColor:'brown',eyeColor:'brown',skin:'light'}}),
     pd=p?.pack?.directions?.north;
    if(!pd||p.equipment?.pants!==pants||!equal(p.authoredWalkTimeline?.frameToPhase,s.frameToPhase)||
       !['frame','pivot','density'].every(k=>equal(body.pack[k],p.pack[k]))||!equal(pd.clip,clock))return null;
    cloth=pd.layers.find(l=>l.slot==='pants');
    owner=pd.layers.find(l=>l.id===(pants===168?'approved-original-owner-RGBA':'f182-original-owners'));
    if(!cloth||!owner||![cloth,owner].every(l=>l.binding?.kind==='fixed'&&spans(l)))return null;
   }
   lower={gear,cloth,owner,prefix:resource};
  }
  return {...body,id:'authored-north-layered:'+String(item)+':'+String(pants)+':'+body.id+(boot==null?'':':boot'+boot),hdKind:'authored-north-layered',equipment:{...(item==null?{}:{weapon:item}),...(pants==null?{}:{legs:pants}),...(boot==null?{}:{boots:boot})},northLayers:{spec:s,body,pants:ownPants?null:pants,lower},...(lower?{slotRoutes:{...(ownPants?{[equipment.legs!=null?'legs':'pants']:{item:pants,quality:'hd',source:'independent-female-pants'+pants+'-north-walk'}}:{}),...(boot!=null?{boots:{item:boot,quality:'hd',source:`frozen-v47-female-151-boot${boot}-north-walk`}}:{})},omitted:[]}:{} ),colorAppearance:a,pack:{...body.pack,directions:{north:{...d,clip:{frames:40,fps:40,loop:true}}}}};
 }
 function northFiles(r,frame){
  const {spec:s,body,pants,lower}=r.northLayers,k=s.frameToPhase[frame],f=s.phaseMap[k];
  return [...new Set([...femaleRegistry.requiredFiles(body,{frame:f}),s.legs[k],s.armOcclusion[k],...(lower?[...lower.gear,lower.cloth,lower.owner].filter(Boolean).map(l=>lower.prefix+l.frames[frame]+'.png'):[]),...(pants==null?[]:[s.equipmentLayers[pants].cloth[k],s.equipmentLayers[pants].owner[k]]),...(body.item===17?[s.orb17Skin.mask]:[])])];
 }
 function composeNorthLayers(r,frame,entry){
  const {spec:s,body:rBody,pants}=r.northLayers,k=s.frameToPhase[frame],phase=s.phaseMap[k],pad=rBody.paddingPhysical||0,W=512+2*pad,C=(w=W)=>makeCanvas(w,w),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const images=new Map(entry.images),d=rBody.baseRecord.pack.directions.north,legs=d.layers.find(l=>l.id==='legs'),arms=d.layers.find(l=>l.id==='arms');
  if(!legs||!arms||legs.binding.kind!=='fixed'||arms.binding.kind!=='fixed')throw Error('Unsupported NORTH rig layers');
  const source=images.get(s.legs[k]),mask=images.get(s.armOcclusion[k]);
  if(!source||source.width!==512||source.height!==512||!mask||mask.width!==512||mask.height!==512)throw Error('Missing native NORTH contact sources');
  images.set('tools/rework-base-hd/assets/'+legs.frames[phase]+'.png',source);
  const originalArms=images.get('tools/rework-base-hd/assets/'+arms.frames[phase]+'.png'),arm=C(512),ac=arm.getContext('2d'),mc=C(512).getContext('2d');ac.drawImage(originalArms,0,0);mc.drawImage(mask,0,0);
  const ad=ac.getImageData(0,0,512,512),m=mc.getImageData(0,0,512,512).data;
  for(let n=0;n<m.length;n+=4)if(m[n]){if(m[n]!==255||ad.data[n+3]!==255)throw Error('NORTH rig occlusion ownership mismatch');ad.data.fill(0,n,n+4);}ac.putImageData(ad,0,0);images.set('tools/rework-base-hd/assets/'+arms.frames[phase]+'.png',arm);
  if(rBody.item===17&&rBody.material?.skinColor){
   const p=rBody.states[phase].parts[0];if(p.sha256!==s.orb17Skin.sourceSHA256)throw Error('NORTH orb material/source mismatch');
   const im=images.get(p.url),material=images.get(s.orb17Skin.mask);if(!im||!material||im.width!==material.width||im.height!==material.height)throw Error('Missing NORTH orb skin mask');
   const tile=C(im.width),tc=tile.getContext('2d'),mm=C(im.width).getContext('2d');tc.drawImage(im,0,0);mm.drawImage(material,0,0);const data=tc.getImageData(0,0,im.width,im.height),m=mm.getImageData(0,0,im.width,im.height).data,tones=new Uint8Array(m.length/4),skin=root.MareNativeSkinHD,api=root.MareAppearance96;
   for(let n=0;n<m.length;n+=4)if(m[n]&&data.data[n+3])tones[n/4]=skin.tone(...data.data.subarray(n,n+3));data.data.set(api.recolor(data.data,tones,api.skins[rBody.material.skinColor].ramp));tc.putImageData(data,0,0);images.set(p.url,tile);
  }
  const ops=[],native=C(),info=femaleRegistry.render(native.getContext('2d'),rBody,images,{frame:phase,makeCanvas,captureOps:x=>ops.push(x)}),anatomy=ops.filter(x=>x.op.layer),gear=ops.filter(x=>x.op.part);
  const naked=C();for(const op of anatomy)naked.getContext('2d').drawImage(op.canvas,0,0);
  if(r.northLayers.lower){
   const {gear,cloth,owner,prefix}=r.northLayers.lower,read=l=>{const im=images.get(prefix+l.frames[frame]+'.png');if(im?.width!==512||im.height!==512)throw Error('Missing North walk lower-kit raster');return im;},
    target=C(),tc=target.getContext('2d');
   for(const l of gear.filter(l=>l.depth===-1))tc.drawImage(read(l),0,0);
   tc.drawImage(native,0,0);
   if(cloth){
    const shape=C(),sc=shape.getContext('2d');sc.drawImage(read(owner),0,0);
    const mask=sc.getImageData(0,0,512,512).data;sc.clearRect(0,0,512,512);sc.drawImage(read(cloth),0,0);
    const data=sc.getImageData(0,0,512,512);
    for(let n=0;n<mask.length;n+=4)if(mask[n+3]){if(mask[n+3]!==255)throw Error('Nonbinary North walk pants owner');data.data.fill(0,n,n+4);}
    sc.putImageData(data,0,0);tc.drawImage(shape,0,0);shape.width=1;
   }
   for(const l of gear.filter(l=>l.depth===45))tc.drawImage(read(l),0,0);
   native.width=1;info.frames=40;info.fps=40;return northResult(target,info);
  }
  if(pants==null){info.frames=40;info.fps=40;return northResult(native,info);}
  const cloth=images.get(s.equipmentLayers[pants].cloth[k]),owner=images.get(s.equipmentLayers[pants].owner[k]);if(!cloth||cloth.width!==512||cloth.height!==512||!owner||owner.width!==512||owner.height!==512)throw Error('Missing NORTH garment layers');
  const oc=C(512).getContext('2d');oc.drawImage(owner,0,0);const ownership=oc.getImageData(0,0,512,512).data,baseline=C(),bc=baseline.getContext('2d');bc.drawImage(naked,0,0);bc.drawImage(cloth,pad,pad);const bp=bc.getImageData(0,0,W,W),np=pixels(naked);
  const clipped=C(),cc=clipped.getContext('2d');cc.drawImage(cloth,pad,pad);const cp=cc.getImageData(0,0,W,W);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(ownership[(y*512+x)*4]){const n=((y+pad)*W+x+pad)*4;bp.data.set(np.subarray(n,n+4),n);cp.data.fill(0,n,n+4);}bc.putImageData(bp,0,0);cc.putImageData(cp,0,0);
  if(gear.length){const visible=C(),vc=visible.getContext('2d');for(const g of gear)vc.drawImage(g.canvas,0,0);vc.globalCompositeOperation='destination-out';for(const b of anatomy)if(b.op.depth>gear[0].op.depth)vc.drawImage(b.canvas,0,0);const low=C(),lc=low.getContext('2d');for(const op of [...anatomy,...gear,{op:{depth:3.6},canvas:clipped}].sort((a,b)=>a.op.depth-b.op.depth))lc.drawImage(op.canvas,0,0);const v=pixels(visible),l=pixels(low);for(let n=0;n<v.length;n+=4)if(v[n+3])bp.data.set(l.subarray(n,n+4),n);bc.putImageData(bp,0,0);}
  info.frames=40;info.fps=40;return northResult(baseline,info);
  function northResult(canvas,info){const rgba=pixels(canvas);let top=W;for(let y=0;y<W&&top===W;y++)for(let x=0;x<W;x++)if(rgba[(y*W+x)*4+3]){top=y;break;}return {canvas,info:{...info,visualHeight:Math.max(0,info.pivot.y-top)}};}
 }
 function resolveSouthCarry(player,o,a,equipment){
  const item=Number(equipment.weapon?.def??equipment.weapon),pants=Number(equipment.legs?.def??equipment.legs??equipment.pants?.def??equipment.pants);
  // Deliberately narrow approval: these three weapons + pants21, no invented
  // combinations with gloves, boots, coats, helmets, another direction or attack.
  if(![0,5,17].includes(item)||pants!==21||Object.keys(equipment).some(k=>!['weapon','legs','pants'].includes(k))||equipment.legs!=null&&equipment.pants!=null)return null;
  if(Object.values(equipment).some(v=>v&&typeof v==='object'&&['variant','variantId','appearanceVariant'].some(k=>v[k]!=null&&v[k]!=='original')))return null;
  const without={...equipment};delete without.weapon;
  const pantsRecord=resolveSouthPants(player,o,a,without);
  const carry=femaleRegistry?.resolve({item,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:{weapon:item}});
  if(!pantsRecord||!carry||carry.sourceBaseId!=='v7-female-walk-drawn-all-south'||!carry.approvedSouthCarry||carry.states.length!==8||carry.paddingPhysical!==(item===0?64:0))return null;
  const expected={0:'823474b4f6a0782ef39eca0dc176630df7ab6886e7b1cb70f800c0baa04b51bd',5:'d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d',17:'ae249c8a9e349b827a6d91a5951c10ef63edf91be9649cd8c0b48645d194d65b'};
  if(carry.states.some(state=>state.parts.length!==1||expected[item]&&state.parts[0].sha256!==expected[item]||state.parts[0].depth!==(item===17?5.01:4.81)))return null;
  return {...pantsRecord,id:pantsRecord.id+':approved-carry:'+item,carrySouth:carry,equipment:{...pantsRecord.equipment,weapon:item}};
 }
 function southWalkBootLayers(spec,item){
  const approved=spec.layers.filter(l=>l.slot==='boots');
  if(item===155)return approved;
  if(![8,9,134,141,148,162,169,176,183].includes(item))return null;
  const entries=[155,item].map(id=>outfitById.get(`frozen-v47-female-151-boot${id}-south-walk`));
  const valid=(r,id)=>r?.frozenBootContract&&r.body==='female'&&r.direction==='south'&&r.action==='walk'&&r.equipment?.boots===id&&r.equipment?.torso===151&&
    r.productionEnabled!==false&&r.pack?.density===4&&r.pack.frame.width===128&&r.pack.frame.height===128&&r.pack.pivot.x===64&&r.pack.pivot.y===112&&
    r.pack.directions.south.clip.frames===40&&r.pack.directions.south.clip.fps===40&&r.pack.directions.south.clip.loop===true;
  if(!valid(entries[0],155)||!valid(entries[1],item)||approved.length!==4)return null;
  const [anchor,donor]=entries.map(r=>r.pack.directions.south);
  const layerKeys=['left-rear','left-front','right-rear','right-front'],ticks=spec.frameToPhase.map((v,i,a)=>i===0||v!==a[i-1]?i:-1).filter(i=>i>=0);
  if(JSON.stringify(ticks)!=='[0,5,10,15,18,20,25,30,35,38]')return null;
  const equals=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const core=(d,id)=>d.layers.filter(l=>!layerKeys.includes(l.id.slice(('boot'+id+'-').length))||!l.id.startsWith('boot'+id+'-'));
  if(!equals({...anchor,layers:undefined},{...donor,layers:undefined})||!equals(core(anchor,155),core(donor,item)))return null;
  const res=[];
  for(const key of layerKeys){
   const original=anchor.layers.find(l=>l.id==='boot155-'+key), target=donor.layers.find(l=>l.id==='boot'+item+'-'+key), example=approved.find(l=>l.id===original?.id);
   if(!original||!target||!example||target.frames?.length!==40||original.frames?.length!==40||!equals(original.binding,{kind:'fixed'})||!equals(target.binding,original.binding)||
      target.depth!==example.depth||original.depth!==example.depth||!equals(ticks.map(n=>original.frames[n]),example.frames))return null;
   const frames=ticks.map(n=>target.frames[n]);
   if(!frames.every(Boolean)||spec.frameToPhase.some((m,n)=>target.frames[n]!==frames[m]))return null;
   res.push({...example,id:target.id,frames});
  }
  return res;
 }
 function resolveSouthPants(player,o,a,equipment){
  const s=outfitIndex?.authoredPantsSouth;
  if(equipment.weapon!=null)return resolveSouthCarry(player,o,a,equipment);
  if(player.__southAnatomy||player.__reworkSubset||canonical(a.body)!=='female'||o.action!=='walk'||o.direction!=='south'||s?.schema!=='authored-female-south-pants-v1')return null;
  const values=Object.fromEntries(Object.entries(equipment).map(([slot,value])=>[slot,Number(value?.def??value)]));
  // Two visible aliases are ambiguous, even when their IDs happen to agree.
  if(values.legs!=null&&values.pants!=null)return null;
  const pants=values.legs??values.pants;
  if(pants!=null&&!Object.hasOwn(s.items,String(pants)))return null;
  if(pants==null&&!['coat','boots','gloves'].some(k=>values[k]!=null))return null;
  if(Object.entries(equipment).some(([slot,value])=>!['legs','pants','coat','boots','gloves','head'].includes(slot)||value&&typeof value==='object'&&['variant','variantId','appearanceVariant'].some(k=>value[k]!=null&&value[k]!=='original')))return null;
  const registeredCoat=values.coat==null||[6,7,130,137,144,151,158,165,172,179].includes(values.coat);
  // A registered upper layer preserves the same validated P168 cuff on the
  // 40-frame South rig. Other trouser/shaft pairs retain their prior routes.
  const certifiedHem=pants===168&&registeredCoat&&(values.boots===9||values.boots===176);
  if(!registeredCoat||values.boots!=null&&values.boots!==155&&values.coat!==151&&!certifiedHem||values.gloves!=null&&values.gloves!==152)return null;
  if(pants!=null&&values.boots!=null&&values.boots!==155&&!certifiedHem)return null;
  if(!s.controlsApproved&&(values.coat===151||values.boots!=null||values.gloves!=null))return null;
  const base=selectBase({...player,__southAnatomy:true,equipment:equipment.head!=null?{head:equipment.head}:{}},o,true);
  if(!base||base.sourceId!==s.bodyRecord||base.headRecord||base.gearOnlyRecord)return null;
  const durations=[125,125,125,75,50,125,125,125,75,50];
  if(JSON.stringify(s.durationMs)!==JSON.stringify(durations)||JSON.stringify(s.frameToPhase)!==JSON.stringify(durations.flatMap((ms,k)=>Array(ms/25).fill(k)))||JSON.stringify(s.phaseMap)!=='[0,1,2,3,3,4,5,6,7,7]')return null;
  let mappedCoat=null;
  if([6,7,137,144,158,165,172,179].includes(values.coat)){
   mappedCoat=selectBase({...player,__southAnatomy:true,equipment:{coat:equipment.coat}},o,true);
   const expected='female-torso'+values.coat+'-south-frozen-walk-native',raw=outfitIndex.records.find(x=>x.id===expected),bd=base.pack.directions.south,cd=raw?.pack?.directions?.south,eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
   if(!mappedCoat||mappedCoat.sourceId!==expected||!cd||cd.clip.frames!==40||cd.clip.fps!==40||cd.clip.loop!==true||bd.clip.frames!==8||bd.clip.fps!==8||bd.clip.loop!==true||!eq(cd.rest,bd.rest)||!eq(cd.poses,bd.poses.flatMap(p=>Array(5).fill(p)))||!eq(raw.pack.frame,base.pack.frame)||!eq(raw.pack.pivot,base.pack.pivot)||raw.pack.density!==base.pack.density)return null;
   if(cd.layers.filter(l=>!l.id.startsWith('base:')).some(l=>!['top','underArms'].includes(l.slot)||l.frames&&(l.frames.length!==40||l.frames.some(f=>!f))))return null;
   const anatomy=cd.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5),...(l.frames?{frames:l.frames.filter((_,i)=>i%5===0)}:{})}));
   if(!eq(anatomy,bd.layers)||cd.layers.filter(l=>l.id.startsWith('base:')&&l.frames).some(l=>l.frames.some((f,i)=>f!==l.frames[Math.floor(i/5)*5])))return null;
  }
  const boots=values.boots==null?[]:southWalkBootLayers(s,values.boots);
  if(!boots)return null;
  const layers=s.layers.flatMap(l=>l.slot==='boots'?(l===s.layers.find(x=>x.slot==='boots')?boots:[]):values[l.slot]!=null&&(l.slot!=='coat'||values.coat===(l.item??151))?[l]:[]),refs=[...new Set([...layers.flatMap(l=>l.frames),...(pants!=null?s.items[pants].flatMap(f=>[f.cloth,f.owner,f.ownerAlpha].filter(Boolean)):[]),...s.contacts.map(c=>c.mask)])];
  const d=base.pack.directions.south;
  return {id:'authored-female-south:'+JSON.stringify(values)+':'+base.id,body:'female',action:'walk',direction:'south',hdKind:'authored-pants',colorAppearance:base.colorAppearance,anatomyBase:base,equipment:values,sourceRefs:refs,authoredPantsLayer:{item:pants??null,spec:s,layers,mappedCoat},pack:{...base.pack,directions:{south:{...d,clip:{frames:40,fps:40,loop:true}}}}};
 }
 // The approved P168/P182 South walk phase zero uses exactly the authored idle base.
 // Compose only separately proven stationary coat sources, never the walk coat.
 function resolveSouthOwnedPantsIdle(player,o,a,equipment){
  const keys=Object.keys(equipment),value=equipment.legs??equipment.pants,def=Number(value?.def??value),
   bolt=equipment.boots,boot=bolt==null?null:Number(bolt?.def??bolt),
   c=equipment.coat,coat=c==null?null:Number(c?.def??c);
  if(player.__southAnatomy||player.__reworkSubset||o.weaponless||canonical(a.body)!=='female'||
     o.action!=='idle'||o.direction!=='south'||keys.some(k=>!['legs','pants','boots','coat'].includes(k))||
     (equipment.legs!=null&&equipment.pants!=null))return null;
  // The B176 and B183 seams are certified against the single P168 idle
  // geometry. P182 still cannot be worn with boots through this bridge.
  if(coat!=null&&(boot!=null||![7,137,144,158,165,179].includes(coat)||['variant','variantId','appearanceVariant'].some(k=>c?.[k]!=null&&c[k]!=='original')))return null;
  if(boot==null?(keys.length!==(coat==null?1:2)||![168,182].includes(def)):
    (![176,183].includes(boot)||value!=null&&def!==168))return null;
  const idle=selectBase({...player,equipment:{}},o,true);
  // B183 is a new position registration, not a new walking combination.
  const b183=boot===183;
  if(b183&&typeof bolt==='object'&&['variant','variantId','appearanceVariant'].some(k=>bolt[k]!=null&&bolt[k]!=='original'))return null;
  const anchorEquipment=coat!=null?{[keys.find(k=>k==='legs'||k==='pants')]:value}:{...(value!=null?equipment:{...equipment,legs:{def:168}}),...(b183?{boots:{def:176}}:{})};
  const walk=resolveSouthPants(player,{...o,action:'walk'},a,anchorEquipment);
  let target=walk?.authoredPantsLayer;
  if(b183&&target){
   const layers=southWalkBootLayers(target.spec,183),donor=outfitById.get('frozen-v47-female-151-boot183-south-idle');
   const d=donor?.pack?.directions?.south;
   if(!donor?.frozenBootContract||donor.productionEnabled===false||d?.clip.frames!==1||d.clip.loop!==false||
      !['frame','pivot','density'].every(k=>JSON.stringify(donor.pack[k])===JSON.stringify(idle?.pack[k]))||
      !layers||layers.some(l=>!d.layers.some(idleBoot=>idleBoot.id===l.id&&idleBoot.depth===l.depth&&
       idleBoot.binding?.kind==='fixed'&&idleBoot.frames?.length===1&&idleBoot.frames[0]===l.frames[0])))return null;
   target={...target,layers};
  }
  if(!target||idle?.sourceId!=='female-idle-original-south-from-walk0'||idle.headRecord||idle.gearOnlyRecord||
     target.item!==(value!=null?def:168)||target.layers.length!==(boot==null?0:4)||
     (boot!=null&&target.layers.some(l=>l.slot!=='boots'||!l.id.startsWith('boot'+boot+'-')||
       !/^[a-f0-9]{64}$/.test(l.frames?.[0])||l.depth!==(l.id.endsWith('-rear')?-1:45)))||
     target.spec.items[target.item]?.[0]?.ownerAlpha!==
      '434a293f43750f8d09085f4258a45f835fe2199c44cecc2ad727e365d2a3b7e6'||
     target.spec.phaseMap[0]!==0||target.spec.frameToPhase[0]!==0||target.spec.contacts.some(c=>c.targetAuthoredPhase===0))return null;
  const base=walk.anatomyBase, I=idle.pack.directions.south,W=base.pack.directions.south;
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(I.clip.frames!==1||I.clip.fps!==1||I.clip.loop!==false||!eq(idle.pack.frame,base.pack.frame)||
     !eq(idle.pack.pivot,base.pack.pivot)||idle.pack.density!==base.pack.density||!eq(I.rest,W.rest)||
     !eq(I.poses,W.poses.slice(0,1))||!eq(I.layers,W.layers.map(l=>l.frames?{...l,frames:l.frames.slice(0,1)}:l))||
     !eq(idle.colorAppearance,base.colorAppearance))return null;
  let mappedIdleCoat=null;
  if(coat!=null){
   const expected='female-torso'+coat+'-south-frozen-idle-native';
   const raw=outfitById.get(expected),cd=raw?.pack?.directions?.south;
   mappedIdleCoat=selectBase({...player,equipment:{coat:c}},o,true);
   if(!cd||mappedIdleCoat?.sourceId!==expected||mappedIdleCoat.hdKind!=='outfit'||
      !eq(raw.pack.frame,idle.pack.frame)||!eq(raw.pack.pivot,idle.pack.pivot)||raw.pack.density!==idle.pack.density||
      cd.clip.frames!==1||cd.clip.loop!==false||!eq(cd.rest,I.rest)||!eq(cd.poses,I.poses)||
      !eq(cd.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)})),I.layers)||
      cd.layers.filter(l=>!l.id.startsWith('base:')).some(l=>!['top','underArms'].includes(l.slot)||l.frames&&l.frames.length!==1))return null;
  }
  if(mappedIdleCoat){
   const {cloth,ownerAlpha}=target.spec.items[def][0];
   return {...mappedIdleCoat,id:mappedIdleCoat.id+':pants'+def+':idle-phase0',equipment:{torso:coat,pants:def},
    sourceRefs:[...new Set([...mappedIdleCoat.sourceRefs,cloth,ownerAlpha])],
    authoredIdleCoatPants:{cloth,ownerAlpha,record:mappedIdleCoat}};
  }
  const bridge=boot==null?walk:{
   ...walk,id:walk.id+(b183?':b183-source':'')+(value==null?':boots-only':''),equipment:value==null?{boots:boot}:{...walk.equipment,boots:boot},
   sourceRefs:[...target.layers.map(l=>l.frames[0]),...(value==null?[]:[target.spec.items[def][0].cloth,target.spec.items[def][0].ownerAlpha])],
   authoredPantsLayer:{...target,item:value==null?null:def}};
  return {...bridge,id:bridge.id+':idle-phase0',action:'idle',
   pack:{...idle.pack,directions:{south:I}}};
 }
 // Only the North phase-zero sources whose original body and ownership
 // survive the exact Idle/Walk comparison. Keep the normalized Idle body.
 function resolveNorthOwnedPantsIdle(player,o,a,equipment){
  const keys=Object.keys(equipment),v=equipment.legs??equipment.pants,def=Number(v?.def??v),c=equipment.coat,coat=c==null?null:Number(c?.def??c);
  if(player.__reworkSubset||player.__southAnatomy||o.weaponless||canonical(a.body)!=='female'||
     o.action!=='idle'||o.direction!=='north'||keys.length!==(coat==null?1:2)||keys.some(k=>!['legs','pants','coat'].includes(k))||
     (equipment.legs!=null&&equipment.pants!=null)||(coat!=null&&(![6,7,130,137,144,151,158,165,172,179].includes(coat)||
      ['variant','variantId','appearanceVariant'].some(k=>c?.[k]!=null&&c[k]!=='original')))||
     ![168,182].includes(def)||['variant','variantId','appearanceVariant'].some(k=>v?.[k]!=null&&v[k]!=='original'))return null;
  const base=selectBase({...player,equipment:{}},o,true),dir=base?.pack?.directions?.north;
  if(base?.sourceId!=='female-idle-original-north-from-walk0'||
     base.sourcePackSHA256!=='ade447b6abe83494aa78833f9ed051b36251c9fc5a97af9d3c38b99933091dbc'||
     base.headRecord||base.gearOnlyRecord||base.pack.density!==4||base.pack.frame.width!==128||base.pack.frame.height!==128||
     base.pack.pivot.x!==64||base.pack.pivot.y!==112||dir?.clip.frames!==1||dir.clip.fps!==1||dir.clip.loop!==false)return null;
  const expected=def===168?[
   ['approved-anatomy','1a5dafeea051e301db5418b3492764696f2558b825ac3ea62497cc4f7b402294'],
   ['approved-garment','ac2fc608abe6176eb8518d9bff5d185356e5802cfbb1599a3ae0e56e89e5bde4'],
   ['approved-original-owner-RGBA','69fafeff42bc5f41dc726642eaf567d54bca4ee7dbd354c515b85e2a68e134af']
  ]:[
   ['f182-anatomy-covered','e4c98f38f3ab89e0e760a8d88595f76dc8bc68796a9f378e4c364f70c1775cca'],
   ['f182-original-cloth','c878c762db9bf1dd444a9036afe449e5653850163e5c407db0ac7c04e0676b02'],
   ['f182-original-owners','69fafeff42bc5f41dc726642eaf567d54bca4ee7dbd354c515b85e2a68e134af'],
   ['f182-anatomy-uncovered','d0dc3fcfc095ea2a79c9f2c21c885dd44b57066b6df38ad4c4c8163bc2aaf025']
  ];
  const donor=outfitRegistry?.resolveIndependentPants?.({body:'female',direction:'north',action:'walk',equipment:{[equipment.legs!=null?'legs':'pants']:v},
   appearance:{hair:'original',hairColor:'brown',face:'original',eyeColor:'brown',skin:'light'}}),layers=donor?.pack?.directions?.north?.layers;
  if(!layers||layers.length!==expected.length||layers.some((l,i)=>l.id!==expected[i][0]||l.frames?.[0]!==expected[i][1]||
    l.depth!==i||l.binding?.kind!=='fixed'||l.slot!==(i===1?'pants':'body')))return null;
  if(coat!=null){
   const expectedCoat='female-torso'+coat+'-north-frozen-idle-native',
    raw=outfitById.get(expectedCoat),cd=raw?.pack?.directions?.north,
    host=selectBase({...player,equipment:{coat:c}},o,true),eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
   if(host?.sourceId!==expectedCoat||host.hdKind!=='outfit'||host.bodyOcclusion||host.sourceRasterPadding||
      host.headRecord||host.gearOnlyRecord||!eq(host.pack,raw.pack)||!cd||cd.clip.frames!==1||cd.clip.loop!==false||
      !['frame','pivot','density'].every(k=>eq(raw.pack[k],base.pack[k]))||!eq(cd.rest,dir.rest)||!eq(cd.poses,dir.poses)||
      !eq(cd.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)})),dir.layers)||
      cd.layers.filter(l=>!l.id.startsWith('base:')).some(l=>!['top','underArms'].includes(l.slot)||l.frames&&l.frames.length!==1))return null;
   return {...host,id:host.id+':pants'+def+':idle-north-frame0',equipment:{torso:coat,pants:def},
    authoredIdleCoatPants:{cloth:expected[1][1],ownerAlpha:expected[2][1],record:host},
    slotRoutes:{coat:{item:coat,quality:'hd',source:expectedCoat},[equipment.legs!=null?'legs':'pants']:{item:def,quality:'hd',source:donor.id}},omitted:[]};
  }
  return {...base,id:base.id+':pants'+def+':idle-north-frame0',equipment:{pants:def},
   authoredNorthIdlePants:{base,cloth:expected[1][1],ownerAlpha:expected[2][1]}};
 }
 // Same complete authored punch rig: replace the shorts slot only.
 function resolveFemaleOwnedPants(player,o,a,equipment){
  const keys=Object.keys(equipment),v=equipment.legs??equipment.pants,dir=o.direction,cv=equipment.coat,coat=cv==null?null:Number(cv.def??cv);
  const h=equipment.head,style=String(a.hair??'original').replace(/^hair-/,''),helmet=h!=null&&Number(h?.def??h)===157&&['north','south','east','west'].includes(dir)&&coat==null&&o.action==='attack-unarmed'&&['original','bob'].includes(style)&&
    [a.face,a.eyeStyle].every(v=>v==null||v==='original')&&
    ['variant','variantId','appearanceVariant'].every(k=>h?.[k]==null||h[k]==='original');
  const idle=o.action==='idle'&&['east','west'].includes(dir),count=idle?1:8;
  if(player.__reworkSubset||o.weaponless||canonical(a.body)!=='female'||o.action!=='attack-unarmed'&&!idle||
     !['north','south','east','west'].includes(dir)||keys.length!==((coat==null?1:2)+(helmet?1:0))||keys.some(k=>!['legs','pants','coat',...(helmet?['head']:[])].includes(k))||(equipment.legs!=null&&equipment.pants!=null)||
     (coat!=null&&(![6,7,130,137,144,151,158,165,172,179].includes(coat)||['variant','variantId','appearanceVariant'].some(k=>cv?.[k]!=null&&cv[k]!=='original')))||
     Number(v?.def??v)!==168||['variant','variantId','appearanceVariant'].some(k=>v?.[k]!=null&&v[k]!=='original'))return null;
  const base=selectBase({...player,equipment:helmet?{head:h}:{}},o,true),id=idle?`female-idle-original-${dir}-from-walk0`:`v7-female-punch-${dir}-ownership-candidate-${dir}`,donor=outfitById.get(`female-pants168-${o.action}-${dir}`);
  if(base?.sourceId!==id||base.hdKind||base.headRecord||base.gearOnlyRecord||
     donor?.adaptation?.targetBase!==id||donor.body!=='female'||donor.action!==o.action||
     donor.direction!==dir||donor.equipment?.pants!==168||Object.keys(donor.equipment).length!==1)return null;
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),p=base.pack,q=donor.pack,
   {layers,...aDir}=p.directions[dir],{layers:source,...bDir}=q.directions[dir],i=layers.findIndex(l=>l.id==='shorts'&&l.slot==='pants'),cloth=source[i];
  if(i<0||p.density!==4||aDir.clip.frames!==count||!['density','frame','pivot'].every(k=>same(p[k],q[k]))||
     !same(aDir,bDir)||layers.length!==source.length||!layers.every((l,j)=>i===j||same(l,source[j]))||
     cloth?.slot!=='pants'||cloth.id!=='pants168-independent'||cloth.depth!==layers[i].depth||cloth.binding?.kind!=='fixed'||
     cloth.frames?.length!==count||cloth.frames.some(h=>!donor.sourceRefs.includes(h)||base.sourceRefs.includes(h)))return null;
  let host=base,index=i;
  if(coat!=null){
   const expected=`female-torso${coat}-${dir}-frozen-${idle?'idle':'attack'}-native`;
   host=selectBase({...player,equipment:{coat:cv}},o,true);
   const hp=host?.pack,hd=hp?.directions?.[dir];
   if(host?.sourceId!==expected||host.hdKind!=='outfit'||host.equipment?.torso!==coat||host.headRecord||host.gearOnlyRecord||
      host.bodyOcclusion||cloth.frames.some(h=>host.sourceRasterPadding?.[h])||!['density','frame','pivot'].every(k=>same(p[k],hp[k]))||
      !(idle?hd.clip.frames===1&&hd.clip.fps===4&&hd.clip.loop===false:same(aDir.clip,hd.clip))||!Object.entries(aDir.rest).every(([k,v])=>same(v,hd.rest[k]))||
      hd.poses.length!==count||!aDir.poses.every((pose,n)=>Object.entries(pose).every(([k,v])=>same(v,hd.poses[n][k])))||
      !same(layers,hd.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)})))||
      hd.layers.filter(l=>!l.id.startsWith('base:')).some(l=>!['top','underArms'].includes(l.slot)))return null;
   index=hd.layers.findIndex(l=>l.id==='base:shorts');
  }
  if(helmet){
   const material=base.femaleNamedHairRecord,gear=material?.gearRecord;
   const authority={original:[dir==='east'?'12dc1769b67cd00f7caf8221ba90314d78bed6af0b79f1a449359f21d8f6fde1':dir==='west'?'77cd02514d3f8b48510ad4617ce73e0af31a28bae219a52fe02883fe7985fadc':dir==='south'?'8067e292e2d6a7fcce462400c14c5018a61e381165d1709ded241d43ad8e9be4':'f24f832fec352fe8f2b64f7fe54a543e22381c3146d27ba6297d41301cdfe9fe','source-alpha-only'],
    bob:['2cd7faae891aa44461660c400d5cda20124a5671c4e0937a2dd516bc6b812808','approved-same-hairstyle-policy']}[style];
   if(!material||material.fused||material.style!==style||material.gearPolicy!==authority[1]||
      gear?.item!==157||gear.snapshot!==authority[0]||gear.direction!==dir||
      !gear.layers.some(l=>l.id===gear.headgearPolicy?.gearId&&l.source===({north:'6f38ce6e1badcc2004674e699593d07205179c4b878a7fa793c498925d7e4b81',south:'9b932b8c53905d4c2f7534a44af5154253405e091ca79dd903491e8b4b72880c',east:'007d308d2a6eaa1c620642198471cee4695975efc1f356dd3573a516a5988255',west:'bdd9adacaae82d54e75e348f292bdc9d317d70dae33cb98dfb49e60f86b38692'})[dir]))return null;
  }
  const slot=equipment.legs!=null?'legs':'pants';
  return {...host,id:host.id+':own-pants168',equipment:{...(helmet?{head:157}:{}),...(coat==null?{}:{torso:coat}),pants:168},
   [idle?'authoredSideIdlePants':'authoredPunchPants']:{base:host,cloth,index},slotRoutes:{[slot]:{item:168,quality:'hd',source:donor.id},
    ...(coat==null?{}:{coat:{item:coat,quality:'hd',source:host.sourceId}}),...(helmet?{head:{item:157,quality:'hd',source:host.femaleNamedHairRecord.gearRecord.snapshot}}:{})},omitted:[]};
 }
 function southFiles(r,frame){
  const s=r.authoredPantsLayer.spec,k=s.frameToPhase[frame],contact=s.contacts.find(c=>c.targetAuthoredPhase===k),phases=[s.phaseMap[k],...(contact?[contact.incomingPhase]:[])];
  return [...new Set([...(r.carrySouth?femaleRegistry.requiredFiles(r.carrySouth):[]),...(r.carrySouth?.item===17?['tools/rework-weapon-layers-hd/assets/e4a2f3c434849aabc41cb6037bc16c54ef3130ff21838c355bde9356c6ad287f.png']:[]),...r.sourceRefs.map(h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png'),...phases.flatMap(p=>filesFor(r.anatomyBase,p)),...(r.authoredPantsLayer.mappedCoat?filesFor(r.authoredPantsLayer.mappedCoat,s.phaseMap[k]*5):[])])];
 }
 function composeSouthCarry(r,frame,entry){
  const bare=composeSouthPants({...r,carrySouth:null},frame,entry),carry=r.carrySouth,s=r.authoredPantsLayer.spec,k=s.frameToPhase[frame],phase=s.phaseMap[k],pad=carry.paddingPhysical||0,W=512+2*pad;
  const canvas=()=>makeCanvas(W,W),pixels=c=>c.getContext('2d').getImageData(0,0,W,W).data;
  const images=entry.images;
  const capture=p=>{const ops=[];femaleRegistry.render(canvas().getContext('2d'),carry,images,{frame:p,makeCanvas,captureOps:o=>ops.push(o)});return ops;};
  const ops=capture(phase),body=ops.filter(o=>o.op.layer),gear=ops.filter(o=>o.op.part),contact=s.contacts.find(c=>c.targetAuthoredPhase===k);
  if(contact){const donor=capture(contact.incomingPhase),mc=makeCanvas(512,512).getContext('2d');mc.drawImage(images.get('tools/rework-modular-outfits-hd/assets/'+contact.mask+'.png'),0,0);const mask=mc.getImageData(0,0,512,512).data;
   for(const b of body){const d=pixels(donor.find(o=>o.op.layer?.id===b.op.layer.id).canvas),ctx=b.canvas.getContext('2d'),data=ctx.getImageData(0,0,W,W);for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(mask[(y*512+x)*4]){const n=((y+pad)*W+x+pad)*4;data.data.set(d.subarray(n,n+4),n);}ctx.putImageData(data,0,0);}
  }
  const def=s.items[21][k],cloth=canvas(),cc=cloth.getContext('2d');cc.drawImage(images.get('tools/rework-modular-outfits-hd/assets/'+def.cloth+'.png'),pad,pad);
  if(def.owner||def.ownerAlpha){const mc=makeCanvas(512,512).getContext('2d');mc.drawImage(images.get('tools/rework-modular-outfits-hd/assets/'+(def.owner||def.ownerAlpha)+'.png'),0,0);const mask=mc.getImageData(0,0,512,512).data,d=cc.getImageData(0,0,W,W);for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(mask[(y*512+x)*4+(def.owner?0:3)]){const n=((y+pad)*W+x+pad)*4;d.data.fill(0,n,n+4);}cc.putImageData(d,0,0);}
  // Approved order is confined to the alpha contribution of the real weapon,
  // after occlusion by native foreground anatomy. No color-key subtraction.
  const visible=canvas(),vc=visible.getContext('2d');for(const g of gear)vc.drawImage(g.canvas,0,0);vc.globalCompositeOperation='destination-out';for(const b of body)if(b.op.depth>gear[0].op.depth)vc.drawImage(b.canvas,0,0);
  const lower=canvas(),lc=lower.getContext('2d');for(const o of [...body,...gear,{op:{depth:4.6},canvas:cloth}].sort((a,b)=>a.op.depth-b.op.depth))lc.drawImage(o.canvas,0,0);
  const result=canvas(),rc=result.getContext('2d');rc.drawImage(bare.canvas,pad,pad);const d=rc.getImageData(0,0,W,W),v=pixels(visible),l=pixels(lower);for(let n=0;n<v.length;n+=4)if(v[n+3])d.data.set(l.subarray(n,n+4),n);rc.putImageData(d,0,0);
  return {canvas:result,info:{...bare.info,width:W,height:W,pivot:{x:bare.info.pivot.x+pad,y:bare.info.pivot.y+pad}}};
 }
 function composeSouthPants(r,frame,entry){
  if(r.carrySouth)return composeSouthCarry(r,frame,entry);
  const s=r.authoredPantsLayer.spec,k=s.frameToPhase[frame],sourcePhase=s.phaseMap[k],base=r.anatomyBase,W=512,H=512;
  entry.southAnatomy ||=new Map();entry.southPixels ||=new Map();entry.southHeads ||=new Map();
  const anatomy=p=>{if(!entry.southAnatomy.has(p))entry.southAnatomy.set(p,composeFrame(base,p,entry));return entry.southAnatomy.get(p);};
  const image=h=>{const im=entry.images.get('tools/rework-modular-outfits-hd/assets/'+h+'.png');if(!im)throw Error('Missing authored SOUTH source '+h);return im;};
  const pixels=h=>{if(!entry.southPixels.has(h)){const c=makeCanvas(W,H);c.getContext('2d').drawImage(image(h),0,0);entry.southPixels.set(h,c.getContext('2d').getImageData(0,0,W,H).data);}return entry.southPixels.get(h);};
  const body=makeCanvas(W,H),bc=body.getContext('2d');bc.drawImage(anatomy(sourcePhase).canvas,0,0);const contact=s.contacts.find(c=>c.targetAuthoredPhase===k);
  if(contact){const data=bc.getImageData(0,0,W,H),donor=anatomy(contact.incomingPhase).canvas.getContext('2d').getImageData(0,0,W,H).data,mask=pixels(contact.mask);for(let p=0;p<W*H;p++)if(mask[p*4])data.data.set(donor.subarray(p*4,p*4+4),p*4);bc.putImageData(data,0,0);}
  const bodyPixels=bc.getImageData(0,0,W,H).data,canvas=makeCanvas(W,H),ctx=canvas.getContext('2d'),pants=r.authoredPantsLayer.item;
  const operations=[{depth:0,kind:'body'},...r.authoredPantsLayer.layers.map(l=>({...l,kind:l.id==='visible-original-hands'?'hands':'source',hash:l.frames[k]}))];
  const mappedCoat=r.authoredPantsLayer.mappedCoat;
  if(mappedCoat)for(const layer of mappedCoat.pack.directions.south.layers.filter(l=>!l.id.startsWith('base:')))operations.push({depth:layer.depth,kind:'mapped-coat',layer});
  if(pants!=null){operations.push({depth:46,kind:s.items[pants][k].ownerAlpha?'pants-owned':'source',hash:s.items[pants][k].cloth,ownerAlpha:s.items[pants][k].ownerAlpha});if(s.items[pants][k].owner)operations.push({depth:47,kind:'owner',hash:s.items[pants][k].owner});}
  for(const op of operations.sort((a,b)=>a.depth-b.depth)){
   if(op.kind==='body')ctx.drawImage(body,0,0);
   else if(op.kind==='owner'){const data=ctx.getImageData(0,0,W,H),mask=pixels(op.hash);for(let p=0;p<W*H;p++)if(mask[p*4])data.data.set(bodyPixels.subarray(p*4,p*4+4),p*4);ctx.putImageData(data,0,0);}
   else if(op.kind==='pants-owned'){
    // The authored opaque owner identifies anatomy, not light-colored pixels to paste.
    // Remove only that domain from this garment BEFORE blending, preserving boots/other layers below it.
    const tile=makeCanvas(W,H),tc=tile.getContext('2d');tc.drawImage(image(op.hash),0,0);const data=tc.getImageData(0,0,W,H),owner=pixels(op.ownerAlpha);
    for(let p=0;p<W*H;p++)if(owner[p*4+3]){if(owner[p*4+3]!==255)throw Error('Nonbinary authored pants owner');data.data.fill(0,p*4,p*4+4);}tc.putImageData(data,0,0);ctx.drawImage(tile,0,0);
   }
   else if(op.kind==='hands'){const tile=makeCanvas(W,H),tc=tile.getContext('2d'),data=tc.createImageData(W,H),mask=pixels(op.hash);for(let p=0;p<W*H;p++)if(mask[p*4+3])data.data.set(bodyPixels.subarray(p*4,p*4+4),p*4);tc.putImageData(data,0,0);ctx.drawImage(tile,0,0);}
   else if(op.kind==='mapped-coat'){const d=mappedCoat.pack.directions.south,q={...mappedCoat,pack:{...mappedCoat.pack,directions:{south:{...d,layers:[op.layer]}}}},tile=makeCanvas(W,H);outfitRegistry.render(tile.getContext('2d'),q,entry.images,{frame:sourcePhase*5,appearance:mappedCoat.colorAppearance,makeCanvas});ctx.drawImage(tile,0,0);}
   else ctx.drawImage(image(op.hash),0,0);
  }
  // The approved151 backing needs its proven semantic face restoration.
  // Mapped frozen coats retain their existing face/occlusion contract unchanged.
  if(r.equipment.coat===151&&base.femaleNamedHairRecord){
   if(!entry.southHeads.has(sourcePhase)){const d=base.pack.directions.south,q={...base,pack:{...base.pack,directions:{south:{...d,layers:d.layers.filter(l=>['headBase','face','hair'].includes(l.slot))}}}},c=makeCanvas(W,H);femaleNamedHairRegistry.render(c.getContext('2d'),q,base.femaleNamedHairRecord,entry.images,{frame:sourcePhase,appearance:base.colorAppearance,makeCanvas});entry.southHeads.set(sourcePhase,c.getContext('2d').getImageData(0,0,W,H).data);}
   const head=entry.southHeads.get(sourcePhase),own=base.femaleNamedHairRecord.ownership,rest=base.pack.directions.south.rest,dx=Math.round((rest.NECK.x-own.attackRest.NECK.x)*4),dy=Math.round((rest.NECK.y-own.attackRest.NECK.y)*4),data=ctx.getImageData(0,0,W,H);
   for(const[x0,y0,x1,y1]of own.protectedFaceBoxes)for(let y=y0+dy;y<=y1+dy;y++)for(let x=x0+dx;x<=x1+dx;x++){const p=(y*W+x)*4;if(head[p+3])data.data.set(bodyPixels.subarray(p,p+4),p);}ctx.putImageData(data,0,0);
  }
  const info={...anatomy(sourcePhase).info},rgba=ctx.getImageData(0,0,W,H).data;let top=H;for(let y=0;y<H&&top===H;y++)for(let x=0;x<W;x++)if(rgba[(y*W+x)*4+3]){top=y;break;}info.visualHeight=Math.max(0,info.pivot.y-top);return {canvas,info};
 }

 // This narrow registration decorates only source families verified both alone and
 // together. The Original profile remains on the established route byte-for-byte.
 function strictSouthRequested(a){
  if((a.gender??a.body)!=='masculino'&&(a.gender??a.body)!=='male')return false;
  const hair=a.hairStyle??a.hair,face=a.eyeStyle??a.face;
  const skin=a.skinColor??a.skin;
  return hair==='original'&&face==='original'&&!!root.MareAppearance96?.skins?.[skin]&&
   !!root.MareAppearance96?.hairs?.[a.hairColor]&&!!root.MareCharacterAppearance?.eyes?.[a.eyeColor];
 }
 function strictSouthOutfit(r,a,o){
  if(!r||r.hdKind!=='outfit'||r.direction!=='south'||!strictSouthRequested(a)||!['idle','walk','attack-unarmed','attack','skill'].includes(o.action)||
   r.headRecord||r.gearOnlyRecord||r.femaleNamedHairRecord)return r;
  const coat=r.equipment?.torso,pants=r.equipment?.pants;
  const scope=coat==null?[21,22,133].includes(pants):[6,7,130,137,144,158,165,172,179].includes(coat)&&(pants==null||pants===21);
  const action=r.action;
  if(!['idle','walk','attack-unarmed'].includes(action))return r;
  if(coat===151&&pants===133&&['idle','walk'].includes(action)){
   const boot=r.equipment.boots,suffix=boot===9?'-boots9-isolated-candidate-coat151-existing':
     boot===148?'-boots148-isolated-candidate-coat151-native':boot==null?'-coat151-native':null;
   if(suffix==null||Object.keys(r.equipment).length!==(boot==null?2:3))return r;
   const id=`male-pants133-${action}-south-isolated-r2`,auth=outfitById.get(id+suffix),core=outfitById.get(id);
   const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
   if((r.sourceId||r.id)!==id+suffix||!auth||!core?.paletteSourceMasks||
      !same(r.pack,auth.pack)||!same(r.paletteSourceMasks,core.paletteSourceMasks))return r;
   return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(r,{...a,skin:a.skinColor??a.skin,face:'original',hair:'original'})||r;
  }
  const prefix=coat==null?`male-pants${pants}-${action}-south${pants!==133?'':action==='attack-unarmed'?'-drawn8-candidate':'-isolated-r2'}`:
    `male-torso${coat}-south-frozen-${action==='attack-unarmed'?'attack':action}-native${action==='attack-unarmed'?'-candidate':''}`;
  const id=r.sourceId||r.id;
  if(id!==prefix&&!id?.startsWith(prefix+':'))return r;
  if(!scope||Object.keys(r.equipment).some(k=>!['torso','pants'].includes(k)))return r;
  if(coat==null&&[22,133].includes(pants)){
   // The two original trousers use the same authored skin/hair masks, not the
   // P21 body classifier. Never substitute one material authority for another.
   const p22=outfitById.get(`male-pants22-${action}-south`),p133=outfitById.get(`male-pants133-${action}-south${action==='attack-unarmed'?'-drawn8-candidate':'-isolated-r2'}`);
   if(!p22?.paletteSourceMasks||!p133?.paletteSourceMasks||!r.paletteSourceMasks||
      JSON.stringify(p22.paletteSourceMasks)!==JSON.stringify(p133.paletteSourceMasks)||
      JSON.stringify(r.paletteSourceMasks)!==JSON.stringify(p22.paletteSourceMasks))return r;
   const shape=(record,owned)=>{
    const d=record.pack?.directions?.south;
    if(!d||d.layers.filter(l=>owned.test(l.id)).length!==1)return null;
    return [record.pack.frame,record.pack.pivot,record.pack.density,{...d,layers:d.layers.filter(l=>!owned.test(l.id))}];
   };
   const base=shape(p22,/^pants22-/);
   if(!base||JSON.stringify(base)!==JSON.stringify(shape(p133,/^(?:pants133-|own133-)/))||
      JSON.stringify(base)!==JSON.stringify(shape(r,pants===22?/^pants22-/:/^(?:pants133-|own133-)/)))return r;
  }
  const skin=a.skinColor??a.skin,look={...a,skin,face:'original',hair:'original'};
  return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(r,look)||r;
 }

 // The archived named-female Sword 0 reference is Amber; the legacy
 // Blue alias renders visible brown. Use the separately authored iris for
 // these exact female sword bodies, before the independent slot selector.
 const swordBlueIris={"south":"f6be0704c6dd7e6347ccf48d60249904f77399801bcf2148701d695e6b342064","north":"ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","east":"3c8fcb083ab48610c42b34b6bdb0dcdc324331509b908c0dd7cbb724b5b37141","west":"5f757e230cf80547097912d391f7acb3f2ce3e98ece852f3f43969f657c1c963"};
 function preserveSwordBlueEyes(r,raw){
  const d=r?.direction,m=r?.material,c=r?.colorAppearance,sha=swordBlueIris[d];
  if(!sha||r.body!=='female'||r.hdKind!=='female-equipment'||r.action!=='attack-sword'||
     ![0,1,67,68,69,70].includes(r.item)||r.sourceBaseId!=='v7-female-sword-'+d+'-ownership-candidate-'+d||
     (r.outfitSourceId!=null&&r.outfitSourceId!=='female-torso151-'+d+'-frozen-attack-native')||
     raw.eyeColor!=='blue'||raw.gender!=='feminino'||raw.hairStyle!=='hair-cropped'||raw.eyeStyle!=='original'||
     !m||m.style!=='cropped'||m.eyeStyle!==null||m.eyeColor!==null||m.gearRecord||m.sourceScale!==1||m.fused!==false||
     c?.eyeColor!=='blue'||m.hairColor!==raw.hairColor||m.skinColor!==raw.skinColor||
     m?.ownership?.attackLayers?.filter(l=>l.id==='iris'&&l.slot==='face'&&l.source===sha).length!==1)return r;
  return {...r,id:r.id+':registered-blue-iris',
    material:{...m,eyeColor:'blue',registeredBlueIris:sha,faceProtectedExact:false,faceProtectedExceptIris:!m.skinColor,id:m.id+':registered-blue-iris'}};
 }

 function selectSavedRelic32Carry(player,o,a){
  const e=player?.equipment||{},w=e.weapon;
  if(!carryRegistry||player.zoanTransformed||player.__reworkSubset||e.head||e.visual_completo||
     (w?.def??w)!==32||o.consumer!=='world'||o.weaponless||!['idle','walk'].includes(o.action)||
     !['north','south','east','west'].includes(o.direction)||
     Object.entries(e).some(([k,v])=>k!=='weapon'&&!nonVisualEquipment.has(k)&&v!=null&&!['none','original'].includes(v))||
     ['variant','variantId','appearanceVariant'].some(k=>w?.[k]!=null&&w[k]!=='original')||
     a.version!==1||a.gender!=='masculino'||a.skinStyle!=='natural'||a.hair!=='original'||a.face!=='original'||
     !Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)||!Object.hasOwn(root.MareCharacterAppearance?.hairs||{},a.hairColor)||
     !Object.hasOwn(root.MareCharacterAppearance?.eyes||{},a.eyeColor)||
     !Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)||!Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin))return null;
  const carry=carryRegistry.resolve({item:32,pureRelic32Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:32}});
  if(!carry?.relic32SavedPalette)return null;
  return {...carry,hdKind:'carry',pack:carry.base.pack,body:carry.base.body};
 }
 function select(player,o){
  const raw=player?.appearance96||{},style=raw.eyeStyle??raw.face;
  const eyes=root.MareReworkEyeStylesHD;
  const color=raw.eyeColor,customColor=color&&!['original','blue'].includes(color);
  // A signed carry palette must precede generic male eye replacement.
  if(customColor){const own=selectSavedRelic32Carry(player,o,{...raw,body:raw.gender,hair:raw.hairStyle??raw.hair,face:style,skin:raw.skinColor??raw.skin});if(own)return own;}
  if(!eyes?.supports(style)&&!customColor)return preserveSwordBlueEyes(strictSouthOutfit(selectBase(player,o,true),raw,o),raw);
  if(style&&!['original','face-gentle'].includes(style)&&!eyes?.supports(style))return null;
  const isFemale=canonical(raw.gender??raw.body)==='female';
  if(isFemale)return selectBase(player,o,true);
  if(customColor&&!root.MareCharacterAppearance?.eyes[color])return null;
  if(!player.__reworkSubset&&['attack-daggers','attack-sword'].includes(o.action)){const ordered=selectBase(player,o,true,true);if(ordered?.approvedDagger13South||ordered?.orderedAttack&&ordered.strictSourceIdentity)return ordered;}
  if(!player.__reworkSubset&&['idle','attack','attack-unarmed','attack-focus'].includes(o.action)){const exact=selectBase(player,o,true,true);if(exact)return exact;}
  const original={...player,appearance96:{...raw,eyeStyle:'original',face:'original',eyeColor:'original'}};
  const record=selectBase(original,o);
  if(strictSouthRequested(raw)){const strict=strictSouthOutfit(record,raw,o);if(strict?.strictSouthAppearance)return strict;}
  if(!record)return null;
  const base=['carry','outfit-carry'].includes(record.hdKind)?record.base:
    record.hdKind==='weapon'&&record.sourceRasterPadding?{...record,pack:record.basePack.pack}:record;
  const supportsEyes=!record.hdKind||['carry','outfit-carry','weapon'].includes(record.hdKind)||record.hdKind==='outfit'&&record.baseMaterialSources;
  if(!supportsEyes||!base.pack||!eyes?.maleSource(base))return null;
  return {...record,id:record.id+':eyes:'+(style||'original')+':'+(color||'original'),eyeStyle:style,colorAppearance:{...record.colorAppearance,face:style,eyeColor:color}};
 }
 // Opt in only the saved female lateral walk look audited with both C6 and C7.
 // Their ungarmented basis is the same authored scene graph, not a flattened render.
 const verifiedCoat67SideBare=Object.create(null);
 const coat67SideNeck={
  east:{sha:'202352cb972f4fe437ca7fd43aa4d848b88a4fc98dcfc6393bb5fd0b4c1e16bd',bounds:'[246,166,271,169]'},
  west:{sha:'33cd3e581abb50daa48b73e462fb0e267d492b91eb061fafc075dad6a0a4421b',bounds:'[240,166,265,169]'}
 };
 function exactCoat67SideLook(player,o,a){
  return !player.__reworkSubset&&!player.zoanTransformed&&!player.equipment?.visual_completo&&player.equipment?.head==null&&o.action==='walk'&&Object.hasOwn(coat67SideNeck,o.direction)&&o.consumer==='world'&&!o.weaponless&&
     a.gender==='feminino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.face==='original'&&
     Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)&&Object.hasOwn(root.MareCharacterAppearance?.hairs||{},a.hairColor)&&
     Object.hasOwn(root.MareCharacterAppearance?.eyes||{},a.eyeColor)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin);
 }
 function restoreCoat67SideExactNeck(record,material,a){
  const dir=record.direction,auth=coat67SideNeck[dir],d=record.pack?.directions?.[dir],head=d?.layers.filter(l=>l.slot==='headBase');
  const blue=a.eyeColor==='blue',blueSource=blue?swordBlueIris[dir]:null;
  if(blue&&(!blueSource||material?.eyeStyle!==null||material?.eyeColor!==null||material.ownership?.attackLayers?.filter(l=>l.id==='iris'&&l.slot==='face'&&l.source===blueSource).length!==1))return null;
  if(!auth||!material||material.sourceScale!==1||!material.fused||material.ownership?.walkHead!==auth.sha||
     JSON.stringify(material.ownership.walkDifferenceBounds)!==auth.bounds||
     head?.length!==1||head[0].source!==auth.sha||head[0].frames||head[0].binding?.kind!=='rigid'||
     head[0].binding.a!=='NECK'||head[0].binding.b!=='NOSE'||material.style!=='original'||
     material.hairColor!==a.hairColor||material.eyeColor!==(blue?null:a.eyeColor)||material.skinColor!==a.skin||
     material.gearRecord||material.profileNeckBridge||material.profileNeckRestore)return null;
  if(blue)return {...material,eyeColor:'blue',registeredBlueIris:blueSource,faceProtectedExact:false,faceProtectedExceptIris:!material.skinColor,id:material.id+':registered-blue-iris:authored-'+dir+'-neck',profileNeckRestore:true};
  if(dir==='west')return {...material,id:material.id+':authored-west-neck',profileNeckRestore:true};
  return {...material,id:material.id+':authored-east-neck',profileNeckRestore:true};
 }
 function selectFemaleCoat67SideBare(player,o,a,equipment){
  if(!exactCoat67SideLook(player,o,a)||Object.keys(equipment).length)return null;
  const dir=o.direction;
  if(verifiedCoat67SideBare[dir]===undefined){
   verifiedCoat67SideBare[dir]=null;
   const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y), id='v7-female-walk-drawn-all-'+dir,
    [c6,c7]=[6,7].map(i=>outfitById.get('female-torso'+i+'-'+dir+'-frozen-walk-native')),
    base=baseIndex?.records.find(r=>r.id===id),d=r=>r?.pack?.directions?.[dir],
    sources=l=>l.frames||[l.source],core=r=>d(r).layers.filter(l=>l.id.startsWith('base:')),
    info=r=>[r.pack.frame,r.pack.pivot,r.pack.density],context=({layers,...rest})=>rest;
   if(!d(base)||!d(c6)||!d(c7)||!base.bodyClothingSeparated)return null;
   if(![c6,c7].every((r,i)=>r.body==='female'&&r.action==='walk'&&r.direction===dir&&r.baseRecord===id&&
        r.productionEnabled!==false&&same(r.equipment,{torso:i?7:6})&&same(info(r),info(base))&&
        !r.bodyOcclusion&&!r.mirrorX&&!r.mirrorLayerIDs&&!r.sourceRasterPadding)||
      !same(context(d(c6)),context(d(c7)))||!same(core(c6),core(c7)))return null;
   const x=d(c6),b=d(base),layers=core(c6),layerShape=({id:id,frames,...rest})=>rest;
   if(!same(x.clip,{frames:40,fps:40,loop:true})||!same(b.clip,{frames:8,fps:8,loop:true})||
      !same(x.rest,b.rest)||x.poses.length!==40||b.poses.length!==8||
      !same(layers.map(l=>l.id),['base:legs','base:torso','base:shorts','base:top','base:arms','base:head-rigid'])||
      b.layers.length!==layers.length||!layers.every((l,i)=>l.id==='base:'+b.layers[i].id&&
        same(layerShape(l),layerShape(b.layers[i]))&&sources(l).every(h=>c6.sourceRefs.includes(h)&&c7.sourceRefs.includes(h)&&base.sourceRefs.includes(h)))||
      !x.poses.every((p,f)=>{const j=(f/5)|0;return same(p,b.poses[j])&&layers.every((l,i)=>(l.frames?.[f]||l.source)===(b.layers[i].frames?.[j]||b.layers[i].source));}))return null;
   const material=outfitRegistry.bindAnatomy(c6,baseIndex),material7=outfitRegistry.bindAnatomy(c7,baseIndex);
   if(!material||!same(material,material7)||Object.keys(material).length!==24||Object.values(material).some(x=>x!=='anatomy'))return null;
   verifiedCoat67SideBare[dir]={id:'female-coat67-'+dir+'-own-bare-v1',body:'female',action:'walk',direction:dir,equipment:{},hdKind:'outfit',
    pack:{...c6.pack,directions:{[dir]:{...x,layers}}},sourceRefs:[...new Set(layers.flatMap(sources))],baseMaterialSources:material,
    slotRoutes:{},omitted:[]};
  }
  const basis=verifiedCoat67SideBare[dir];
  if(!basis)return null;
  const named=restoreCoat67SideExactNeck(basis,femaleNamedHairRegistry?.resolve(basis,{hair:a.hair,appearance:a}),a);
  if(!named)return null;
  return {...basis,id:named.id,sourceId:basis.id,femaleNamedHairRecord:named,colorAppearance:a};
 }

 function selectBase(player,o,allowApprovedAppearance=false,onlyApprovedAppearance=false){
  if(!registry||player?.zoanTransformed)return null;
  if(['combat-idle','guard','hurt','death'].includes(o.action))return select(player,{...o,action:'idle'});
  if(['attack','skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(o.action)){const candidates=o.weaponless||player.equipment?.weapon==null?['attack-unarmed']:['attack-unarmed','attack-firearm','attack-focus','attack-sword','attack-daggers','attack-tech'];for(const action of candidates){const r=onlyApprovedAppearance?selectBase(player,{...o,action},true,true):select(player,{...o,action});if(r)return {...r,resolvedAction:action};}return null;}
  const raw=player.appearance96||{};const a={...raw,body:raw.gender??raw.body,hair:raw.hairStyle??raw.hair,face:raw.eyeStyle??raw.face,skin:raw.skinColor??raw.skin};const equipment=Object.fromEntries(Object.entries(player.equipment||{}).filter(([slot])=>!nonVisualEquipment.has(slot)&&slot!=='visual_completo'));for(const [k,v]of Object.entries(equipment))if(v==null||['none','original'].includes(v))delete equipment[k];if(o.weaponless)delete equipment.weapon;if(root.MareHeadgear?.hidden(player))delete equipment.head;
  const north=resolveNorthLayers(player,o,a,equipment);if(north)return north;
  const ownBare=selectFemaleCoat67SideBare(player,o,a,equipment);if(ownBare)return ownBare;
  const profile=resolveProfileLayers(player,o,a,equipment);if(profile)return profile;
  const southPants=resolveSouthPants(player,o,a,equipment);if(southPants)return southPants;
  // Resolve optional independent slots before outfit candidates. Pass the original
  // visible equipment, not a subset that could silently swallow an unsupported slot.
  const independentEquipment=Object.fromEntries(Object.entries(player.equipment||{}).filter(([slot,v])=>slot!=='weapon'&&v!=null&&!['none','original'].includes(v)));
  const relic32=selectRelic32FocusSide(player,o,a,equipment);if(relic32)return relic32;
  const allowReviewedBareOrb=o.consumer==='world'&&!o.weaponless&&['variant','variantId','appearanceVariant'].every(k=>
   player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original');
  const independent=!player.__reworkSubset&&weaponRegistry?.resolveSeparable?.({item:o.weaponless?undefined:(player.equipment?.weapon?.def??player.equipment?.weapon),body:canonical(a.body),sourceBody:a.body,classId:player.classId,weaponVariant:player.equipment?.weapon?.variant??player.equipment?.weapon?.variantId??player.equipment?.weapon?.appearanceVariant,action:o.action,direction:o.direction,appearance:a,equipment:independentEquipment,
   allowOwnCyborgTechSides:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowOwnW114Sides:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowOwnStaff124North:allowReviewedBareOrb&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original')&&Object.keys(player.equipment||{}).length===1,
   allowOwnStaffFamilySouth:allowReviewedBareOrb&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original')&&Object.keys(player.equipment||{}).length===1,
   allowOwn128SideAttack:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowOwn128SouthTone:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,
   allowOwn121SouthTone:allowReviewedBareOrb&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original')&&Object.keys(player.equipment||{}).length===1,
   allowOwn121SideTone:allowReviewedBareOrb&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original')&&Object.keys(player.equipment||{}).length===1,
   allowOwn16SouthTone:allowReviewedBareOrb&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original')&&Object.keys(player.equipment||{}).length===1,
   allowOwn32SouthTone:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,
   allowOwn31SouthTone:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,
   allowOrb122BarePreview:allowReviewedBareOrb,allowOrb17BarePreview:allowReviewedBareOrb,
   allowGauntlet14South:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,
   allowOwnW114North:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowOwn110Attack:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowGauntletLightSouth:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,allowOwnW14Lateral:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,allowOwnDaggerSideTone:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,allowOwnW16SideTone:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1,allowOwnStaff123Lateral:allowReviewedBareOrb&&Object.keys(player.equipment||{}).length===1});
  if(independent)return {...independent,hdKind:'weapon'};
  const independentPants=!player.__reworkSubset&&outfitRegistry?.resolveIndependentPants?.({body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:player.equipment||{}});
  if(independentPants)return {...independentPants,hdKind:'outfit'};
  const approved=allowApprovedAppearance&&!player.__reworkSubset?outfitRegistry?.resolve({body:canonical(a.body),action:o.action,direction:o.direction,appearance:{...a,eyes:a.face},equipment,allowApprovedAppearance:true}):null;
  if(approved?.approvedAppearance)return {...approved,hdKind:'outfit'};
  if(onlyApprovedAppearance){
   const weapon=equipment.weapon?.def??equipment.weapon;
   const other=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='weapon'));
   const attack=weaponRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:other,allowExactComposite:!player.__reworkSubset});
   return attack?.approvedAppearance?{...attack,hdKind:'weapon'}:null;
  }
  const customFemaleFace=canonical(a.body)==='female'&&root.MareReworkEyeStylesHD?.supports(a.face);
  if(a.face&&!['original','face-gentle'].includes(a.face)&&!customFemaleFace||a.eyeColor&&!['original','blue'].includes(a.eyeColor)&&(canonical(a.body)!=='female'||!root.MareCharacterAppearance?.eyes[a.eyeColor]))return null;
  if(a.skin&&a.skin!=='original'&&!root.MareAppearance96?.skins[a.skin]||a.hairColor&&a.hairColor!=='original'&&!root.MareAppearance96?.hairs[a.hairColor])return null;
  const outfit=outfitRegistry?.resolve({body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment});if(outfit)return {...outfit,hdKind:'outfit'};
  // A separated original head can carry the existing named hair/helmet while
  // the exact outfit keeps its own layers, source archive and authored poses.
  // Do not infer a clean head from a baked clothed composite.
  const hasFemaleSkin=canonical(a.body)==='female'&&a.skin&&a.skin!=='original';
  if(canonical(a.body)==='female'&&(hasFemaleSkin||a.hairColor&&a.hairColor!=='original'||customFemaleFace||equipment.head!=null||a.hair&&a.hair!=='original'||a.eyeColor&&!['original','blue'].includes(a.eyeColor))){
   const clothes=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='head'));
   const originalOutfit=outfitRegistry?.resolve({body:'female',action:o.action,direction:o.direction,appearance:{...a,hair:'original',face:'original',eyeColor:'original',skin:'original',skinColor:'original',hairColor:'original'},equipment:clothes});
   const anatomy=hasFemaleSkin&&originalOutfit?outfitRegistry?.bindAnatomy(originalOutfit,baseIndex):null;
   const cosmeticOutfit=originalOutfit&&(!hasFemaleSkin||anatomy)?{...originalOutfit,baseMaterialSources:anatomy}:null;
   const named=cosmeticOutfit&&femaleNamedHairRegistry?.resolve(cosmeticOutfit,{hair:a.hair||'original',head:equipment.head?.def??equipment.head,appearance:a});
   if(named){
    const c=equipment.coat?.def??equipment.coat;
    const shared=[6,7].includes(c)&&Object.keys(equipment).length===1&&['variant','variantId','appearanceVariant'].every(k=>equipment.coat?.[k]==null||equipment.coat[k]==='original')&&originalOutfit.id==='female-torso'+c+'-'+o.direction+'-frozen-walk-native'&&exactCoat67SideLook(player,o,a)?
     selectFemaleCoat67SideBare({...player,equipment:{}},o,a,{}):null;
    const repaired=shared?restoreCoat67SideExactNeck(cosmeticOutfit,named,a)||named:named;
    return {...cosmeticOutfit,id:repaired.id,sourceId:originalOutfit.id,hdKind:'outfit',femaleNamedHairRecord:repaired,colorAppearance:a};
   }
  }
  // A saved palette can use a different head only if the outfit's source rig agrees.
  if(canonical(a.body)==='male'){
   const clothes=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='head'));
   const garment=outfitRegistry?.resolve({body:'male',action:o.action,direction:o.direction,appearance:{hair:'original'},equipment:clothes});
   if(garment?.pack.directions[garment.direction].layers.some(l=>l.slot==='headBase')){
    const hair=a.hair||'original',headItem=equipment.head?.def??equipment.head,headLook={...a,hair,head:headItem!=null?'head-'+headItem:'original'};
    const head=Number(headItem)===19?null:headRegistry?.resolve({body:'male',direction:o.direction,look:headLook});
    const gear=!head&&hair==='original'&&headItem!=null?originalHairGearRegistry?.resolve({body:'male',direction:o.direction,item:headItem,look:headLook}):null;
    const baseMaterialSources=outfitRegistry.bindAnatomy(garment,baseIndex);
    const palette=[a.skin,a.hairColor].some(v=>v&&v!=='original');
    const customHead=headItem!=null||hair!=='original';
    if((!palette||baseMaterialSources)&&(!customHead||head||gear))return {...garment,
     id:garment.id+':head:'+hair+':'+(headItem??'none')+(palette?':palette:'+a.skin+':'+a.hairColor:''),
     hdKind:'outfit',sourceId:garment.id,colorAppearance:a,baseMaterialSources,headRecord:head,gearOnlyRecord:gear,headLook};
   }
  }
  const weapon=equipment.weapon?.def??equipment.weapon;
  const other=Object.fromEntries(Object.entries(equipment).filter(([slot])=>slot!=='weapon').map(([slot,v])=>[slot,v?.def??v]));
  const nativeWeapon=weaponRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment:other,allowExactComposite:!player.__reworkSubset,
   allowOwnFirearmNaturalPalette:o.consumer==='world'&&!o.weaponless&&o.action==='attack-firearm'&&!player.__reworkSubset&&player.classId==='gunner'&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowKnownSideFirearmSkin:o.consumer==='world'&&!o.weaponless&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowKnownFirearmSavedSkin:o.consumer==='world'&&!o.weaponless&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowNorthSavedBlue:!player.__reworkSubset&&player.classId==='gunner'&&Object.keys(player.equipment||{}).length===1&&
    [null,undefined,'original'].includes(player.equipment?.weapon?.variant??player.equipment?.weapon?.variantId??player.equipment?.weapon?.appearanceVariant),
   allowCannon15SideAttack:!player.__reworkSubset&&player.classId==='cyborg'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowArm117SideAttack:!player.__reworkSubset&&player.classId==='cyborg'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOwnSouthDaggers:([71,72,73,74].includes(Number(weapon))||[12,13].includes(Number(weapon))&&a.skin!=='light')&&!player.__reworkSubset&&player.classId==='rogue'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowCyborgForearmSouthAttack:[118,120].includes(Number(weapon))&&!player.__reworkSubset&&player.classId==='cyborg'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowCompass16NorthAttack:Number(weapon)===16&&!player.__reworkSubset&&player.classId==='strategist'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowRelic31NorthAttack:Number(weapon)===31&&!player.__reworkSubset&&['healer','strategist'].includes(player.classId)&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowStaff121NorthAttack:Number(weapon)===121&&!player.__reworkSubset&&player.classId==='strategist'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original')&&
    ['variant','variantId','appearanceVariant'].every(k=>o[k]==null||o[k]==='original'),
   allowRelic32NorthAttack:Number(weapon)===32&&!player.__reworkSubset&&['healer','strategist'].includes(player.classId)&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOrb17NorthRestoredAttack:Number(weapon)===17&&!player.__reworkSubset&&player.classId==='strategist'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowGauntlet112NorthOwnAttack:Number(weapon)===112&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowW3NorthOwnAttack:Number(weapon)===3&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOwnGauntletsSide:[2,3].includes(Number(weapon))&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowW2NorthOwnAttack:Number(weapon)===2&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOwnOrb122South:Number(weapon)===122&&!player.__reworkSubset&&player.classId==='strategist'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOrb122NorthRestoredAttack:Number(weapon)===122&&!player.__reworkSubset&&player.classId==='strategist'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowGauntlet111NorthOwnAttack:Number(weapon)===111&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowGauntlet112SouthOwnAttack:Number(weapon)===112&&!player.__reworkSubset&&player.classId==='brawler'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowGauntlet14NorthOwnAttack:Number(weapon)===14&&!player.__reworkSubset&&player.classId==='cyborg'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOwnW70South:Number(weapon)===70&&!player.__reworkSubset&&player.classId==='sword'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowOwnRestoredRearSword:[67,70].includes(Number(weapon))&&!player.__reworkSubset&&player.classId==='sword'&&o.consumer==='world'&&!o.weaponless&&
    Object.keys(player.equipment||{}).length===1&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowNorthSwordAllSkin:o.consumer==='world'&&!o.weaponless&&['variant','variantId','appearanceVariant'].every(k=>player.equipment?.weapon?.[k]==null||player.equipment.weapon[k]==='original'),
   allowNorthSwordDefault:!player.__reworkSubset&&player.classId==='sword'&&Object.keys(player.equipment||{}).length===1&&
    [null,undefined,'original'].includes(player.equipment?.weapon?.variant??player.equipment?.weapon?.variantId??player.equipment?.weapon?.appearanceVariant)});
  if(nativeWeapon?.orb122SouthOwn)return {...nativeWeapon,hdKind:'weapon'};
  if(nativeWeapon?.exactComposite&&nativeWeapon.timeline?.length&&nativeWeapon.fps)return {...nativeWeapon,hdKind:'weapon'};
  const female=femaleRegistry?.resolve({item:weapon,body:canonical(a.body),action:o.action,direction:o.direction,appearance:a,equipment});if(female)return {...female,hdKind:'female-equipment'};
  const idlePants=(o.direction==='north'?resolveNorthOwnedPantsIdle:resolveSouthOwnedPantsIdle)(player,o,a,equipment);if(idlePants)return idlePants;
  const punchPants=resolveFemaleOwnedPants(player,o,a,equipment);if(punchPants)return punchPants;
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
  const w16=player.equipment?.weapon;
  if((w16?.def??w16)===16&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['north','south','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w16?.[k]==null||w16[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const pureCompass=carryRegistry?.resolve({item:16,pureCompass16Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:16}});
   if(pureCompass?.compass16SavedPalette)return withCarryHead(pureCompass,'carry');
  }
  const w119=equipment.weapon;
  if(weapon===119&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.direction==='south'&&['idle','walk'].includes(o.action)&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w119?.[k]==null||w119[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownMech=carryRegistry?.resolve({item:119,mechanical119SouthSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:119}});
   if(ownMech?.mechanical119SouthSavedPalette)return withCarryHead(ownMech,'carry');
  }
  const w128=equipment.weapon;
  if(weapon===128&&player.classId==='healer'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     ['north','south','east','west'].includes(o.direction)&&['walk','idle'].includes(o.action)&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w128?.[k]==null||w128[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&
     a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&a.skin===a.skinColor&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own128=carryRegistry?.resolve({item:128,approvedW128WalkSaved:o.action==='walk',approvedW128IdleSaved:o.action==='idle',body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:128}});
   if(own128?.baculo128WalkSavedPalette||own128?.baculo128IdleSavedPalette)return withCarryHead(own128,'carry');
  }
  const orb122=equipment.weapon;
  if(weapon===122&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     ['east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>orb122?.[k]==null||orb122[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)&&a.skin===a.skinColor){
   const ownOrb=carryRegistry?.resolve({item:122,pureOrb122SideSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:122}});
   if(ownOrb?.orb122SideSavedCarry)return withCarryHead(ownOrb,'carry');
  }
  if(weapon===122&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     ['north','south'].includes(o.direction)&&['idle','walk'].includes(o.action)&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>orb122?.[k]==null||orb122[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)&&a.skin===a.skinColor){
   const ownOrb=carryRegistry?.resolve({item:122,pureOrb122NorthSouthSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:122}});
   if(ownOrb?.orb122NorthSouthSavedCarry)return withCarryHead(ownOrb,'carry');
  }
  const w31=equipment.weapon;
  if(weapon===31&&['healer','strategist'].includes(player.classId)&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     ['north','south','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w31?.[k]==null||w31[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     (['light','ebony'].includes(a.skin)||player.classId==='healer'&&a.skin===a.skinColor&&
      Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))){
   const wholeRelic=carryRegistry?.resolve({item:31,pureRelic31Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:31}});
   if(wholeRelic?.relic31SavedCarry)return withCarryHead(wholeRelic,'carry');
  }
  const w117=player.equipment?.weapon;
  if((w117?.def??w117)===117&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['south','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w117?.[k]==null||w117[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own117=carryRegistry?.resolve({item:117,joinedArm117Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:117}});
   if(own117?.arm117SavedPalette)return withCarryHead(own117,'carry');
  }
  const w15=player.equipment?.weapon;
  if((w15?.def??w15)===15&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['north','south','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w15?.[k]==null||w15[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own15=carryRegistry?.resolve({item:15,joinedCannon15Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:15}});
   if(own15?.cannon15SavedPalette)return withCarryHead(own15,'carry');
  }
  const w118=player.equipment?.weapon;
  if((w118?.def??w118)===118&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='south'&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w118?.[k]==null||w118[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own118=carryRegistry?.resolve({item:118,joinedCannon118Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:118}});
   if(own118?.cannon118SouthSavedPalette)return withCarryHead(own118,'carry');
  }
  if((w118?.def??w118)===118&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w118?.[k]==null||w118[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own118=carryRegistry?.resolve({item:118,pureCannon118SideSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:118}});
   if(own118?.cannon118SideSavedPalette)return withCarryHead(own118,'carry');
  }
  const w111=player.equipment?.weapon;
  if((w111?.def??w111)===111&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['south','north'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w111?.[k]==null||w111[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own111=carryRegistry?.resolve({item:111,joinedGauntlet111Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:111}});
   if(own111?.gauntlet111SouthSavedPalette||own111?.gauntlet111NorthSavedPalette)return withCarryHead(own111,'carry');
  }
  const gauntlet23=player.equipment?.weapon, gauntlet23Id=gauntlet23?.def??gauntlet23;
  if(gauntlet23Id===3&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&(['east','west'].includes(o.direction)||gauntlet23Id===3&&o.direction==='north')&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>gauntlet23?.[k]==null||gauntlet23[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownGauntlet23=carryRegistry?.resolve({item:gauntlet23Id,previewGauntlet23Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:gauntlet23Id}});
   if(ownGauntlet23?.gauntlet23PreviewCarry)return withCarryHead(ownGauntlet23,'carry');
  }
  const gauntletPair=player.equipment?.weapon, gauntletPairId=gauntletPair?.def??gauntletPair;
  if([111,112].includes(gauntletPairId)&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>gauntletPair?.[k]==null||gauntletPair[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownPairSide=carryRegistry?.resolve({item:gauntletPairId,joinedGauntletPairSideSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:gauntletPairId}});
   if(ownPairSide?.gauntletPairSideSavedPalette)return withCarryHead(ownPairSide,'carry');
  }
  const own118=player.equipment?.weapon;
  if((own118?.def??own118)===118&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     ['walk','idle'].includes(o.action)&&o.direction==='north'&&o.consumer==='world'&&!o.weaponless&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>own118?.[k]==null||own118[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&
     a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&a.skin===a.skinColor&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const north118=carryRegistry?.resolve({item:118,approvedW118NorthWalkSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:118}});
   if(north118?.stockW118NorthWalkSavedPalette)return withCarryHead(north118,'carry');
  }
  const staff124Carry=player.equipment?.weapon,staff124Id=staff124Carry?.def??staff124Carry;
  if([124].includes(staff124Id)&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['east','west'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>staff124Carry?.[k]==null||staff124Carry[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:staff124Id,approvedStaff124Carry:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:staff124Id}});
   if(own?.verifiedStaff124Carry)return withCarryHead(own,'carry');
  }
  const staff125Carry=player.equipment?.weapon,staff125Id=staff125Carry?.def??staff125Carry;
  if([125].includes(staff125Id)&&player.classId==='healer'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['north','south','east','west'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>staff125Carry?.[k]==null||staff125Carry[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:staff125Id,candidateStaff125Carry:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:staff125Id}});
   if(own?.candidateStaff125Carry)return withCarryHead(own,'carry');
  }
  const healerCarry=player.equipment?.weapon,healerId=healerCarry?.def??healerCarry;
  if([126,127].includes(healerId)&&player.classId==='healer'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['north','south','east','west'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>healerCarry?.[k]==null||healerCarry[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:healerId,approvedHealerCarry:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:healerId}});
   if(own?.verifiedHealerCarry)return withCarryHead(own,'carry');
  }
  const staff123Carry=player.equipment?.weapon,staff123Id=staff123Carry?.def??staff123Carry;
  if([123].includes(staff123Id)&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['east','west','north','south'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>staff123Carry?.[k]==null||staff123Carry[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:staff123Id,approvedStaff123Carry:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:staff123Id}});
   if(own?.verifiedStaff123Carry)return withCarryHead(own,'carry');
  }
  const staff121Carry=player.equipment?.weapon,staff121Id=staff121Carry?.def??staff121Carry;
  if([121].includes(staff121Id)&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['east','west','north','south'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>staff121Carry?.[k]==null||staff121Carry[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:staff121Id,approvedStaff121Carry:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:staff121Id}});
   if(own?.verifiedStaff121Carry)return withCarryHead(own,'carry');
  }
  const cardinalStaff124=player.equipment?.weapon,cardinalStaff124Id=cardinalStaff124?.def??cardinalStaff124;
  if([124].includes(cardinalStaff124Id)&&player.classId==='strategist'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&['north','south'].includes(o.direction)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>cardinalStaff124?.[k]==null||cardinalStaff124[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairStyle==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeStyle==='original'&&a.eyeColor==='blue'&&
     a.skin===a.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own=carryRegistry?.resolve({item:cardinalStaff124Id,approvedStaff124Cardinal:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:cardinalStaff124Id}});
   if(own?.verifiedStaff124Cardinal)return withCarryHead(own,'carry');
  }
  const wFinalTechWalk=player.equipment?.weapon;
  if([117,119].includes(wFinalTechWalk?.def??wFinalTechWalk)&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&((wFinalTechWalk?.def??wFinalTechWalk)===117?o.direction==='north':['east','west'].includes(o.direction))&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wFinalTechWalk?.[k]==null||wFinalTechWalk[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownFinalTechWalk=carryRegistry?.resolve({item:wFinalTechWalk?.def??wFinalTechWalk,approvedFinalTechWalk:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:wFinalTechWalk?.def??wFinalTechWalk}});
   if(ownFinalTechWalk?.stockFinalTechWalkSavedPalette)return withCarryHead(ownFinalTechWalk,'carry');
  }
  const wTechWalk=player.equipment?.weapon;
  if([119,120].includes(wTechWalk?.def??wTechWalk)&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['walk','idle'].includes(o.action)&&(o.direction==='north'||(wTechWalk?.def??wTechWalk)===120&&['east','west'].includes(o.direction))&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wTechWalk?.[k]==null||wTechWalk[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownTechWalk=carryRegistry?.resolve({item:wTechWalk?.def??wTechWalk,approvedTechWalk:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:wTechWalk?.def??wTechWalk}});
   if(ownTechWalk?.stockTechWalkSavedPalette)return withCarryHead(ownTechWalk,'carry');
  }
  const w14=player.equipment?.weapon;
  if((w14?.def??w14)===14&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['north','south','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w14?.[k]==null||w14[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own14=carryRegistry?.resolve({item:14,joinedManopla14Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:14}});
   if(own14?.manopla14SavedPalette)return withCarryHead(own14,'carry');
  }
  const wSouthGauntlet=player.equipment?.weapon, southGauntletId=wSouthGauntlet?.def??wSouthGauntlet;
  if([2,110].includes(southGauntletId)&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['east','west'].includes(o.direction)&&['walk','idle'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wSouthGauntlet?.[k]==null||wSouthGauntlet[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownWalkingGauntlet=carryRegistry?.resolve({item:southGauntletId,approvedWalkingCuff:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:southGauntletId}});
   if(ownWalkingGauntlet?.stockWalkingCuffSavedPalette)return withCarryHead(ownWalkingGauntlet,'carry');
  }
  if(southGauntletId===110&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='north'&&['walk','idle'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wSouthGauntlet?.[k]==null||wSouthGauntlet[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownNorth110Walk=carryRegistry?.resolve({item:southGauntletId,approvedNorth110Walk:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:southGauntletId}});
   if(ownNorth110Walk?.stockNorth110WalkSavedPalette)return withCarryHead(ownNorth110Walk,'carry');
  }
  if([2,110].includes(southGauntletId)&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='south'&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wSouthGauntlet?.[k]==null||wSouthGauntlet[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownSouthGauntlet=carryRegistry?.resolve({item:southGauntletId,joinedGauntletSouthSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:southGauntletId}});
   if(ownSouthGauntlet?.gauntletsSouthSavedPalette)return withCarryHead(ownSouthGauntlet,'carry');
  }
  if(southGauntletId===2&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='north'&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>wSouthGauntlet?.[k]==null||wSouthGauntlet[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const ownNorthGauntlet=carryRegistry?.resolve({item:southGauntletId,joinedGauntlet2NorthSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:southGauntletId}});
   if(ownNorthGauntlet?.gauntlet2NorthSavedPalette)return withCarryHead(ownNorthGauntlet,'carry');
  }
  const w3=player.equipment?.weapon;
  if((w3?.def??w3)===3&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='south'&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w3?.[k]==null||w3[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own3=carryRegistry?.resolve({item:3,joinedLuvas3Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:3}});
   if(own3?.luvas3SavedPalette)return withCarryHead(own3,'carry');
  }
  const w112=player.equipment?.weapon;
  if((w112?.def??w112)===112&&player.classId==='brawler'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&['north','south'].includes(o.direction)&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w112?.[k]==null||w112[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own112=carryRegistry?.resolve({item:112,joinedRuptura112Saved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:112}});
   if(own112?.ruptura112SavedPalette||own112?.ruptura112NorthSavedPalette)return withCarryHead(own112,'carry');
  }
  const w120=player.equipment?.weapon;
  if((w120?.def??w120)===120&&player.classId==='cyborg'&&!player.__reworkSubset&&!player.equipment?.head&&!player.equipment?.cloak&&!player.equipment?.visual_completo&&
     o.consumer==='world'&&!o.weaponless&&o.direction==='south'&&['idle','walk'].includes(o.action)&&Object.keys(equipment).length===1&&
     ['variant','variantId','appearanceVariant'].every(k=>w120?.[k]==null||w120[k]==='original')&&
     a.version===1&&a.gender==='masculino'&&a.skinStyle==='natural'&&a.hair==='original'&&a.hairColor==='black'&&a.face==='original'&&a.eyeColor==='blue'&&
     Object.hasOwn(root.MareCharacterAppearance?.skins||{},a.skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)){
   const own120=carryRegistry?.resolve({item:120,joinedCyborgFringeSaved:true,body:'male',action:o.action,direction:o.direction,appearance:a,equipment:{weapon:120}});
   if(own120?.cyborgFringeSavedPalette)return withCarryHead(own120,'carry');
  }
  const ownRelic=selectSavedRelic32Carry(player,o,a);if(ownRelic)return ownRelic;
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
  const approvedSouthAction={0:'attack-sword',1:'attack-sword',5:'attack-firearm',67:'attack-sword',68:'attack-sword',69:'attack-sword',111:'attack-unarmed',119:'attack-unarmed'}[weapon];
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
 // A single source-registered partial-slot pilot. Never reinterpret a baked actor
 // as removable anatomy, opt in an unrelated source, or reset a saved cosmetic.
 function selectUnarmedSouthPilot(player,o={}){
  if(state!=='ready'||!player||player.__reworkSubset||player.zoanTransformed||player.classId!=='brawler'||o.direction!=='south'||!['attack-unarmed','attack','skill'].includes(o.action))return null;
  const a=player.appearance96||{},eq=player.equipment||{},present=v=>v!=null&&!['none','original'].includes(v),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  const vals=names=>names.map(k=>a[k]).filter(v=>v!=null),plain=names=>vals(names).every(v=>v==='original');
  const male=vals(['gender','body']);
  if(!male.length||male.some(v=>!['male','masculino'].includes(v))||!plain(['hair','hairStyle','eyeStyle','face'])||vals(['eyeColor']).some(v=>!['original','blue'].includes(v))||present(eq.weapon))return null;
  const skin=vals(['skinColor','skin']),hair=vals(['hairColor']);
  if(new Set(skin).size>1||skin.some(v=>v!=='original'&&!root.MareAppearance96?.skins[v])||hair.some(v=>v!=='original'&&!root.MareAppearance96?.hairs[v]))return null;
  const visible=Object.entries(eq).filter(([k,v])=>present(v)&&!nonVisualEquipment.has(k)&&!(k==='head'&&root.MareHeadgear?.hidden(player)));
  const legs=visible.filter(([k])=>k==='legs'||k==='pants'),coat=visible.find(([k])=>k==='coat'||k==='torso');
  const exactItem=(v,id)=>Number(v?.def??v)===id&&(typeof v!=='object'||['variant','variantId','appearanceVariant'].every(k=>v[k]==null||v[k]==='original'));
  // P133 and the separately pending C6 are the only mixed actual request proved.
  if(legs.length!==1||!exactItem(legs[0][1],133)||visible.length!==(coat?2:1)||coat&&!exactItem(coat[1],6))return null;
  const baseId='male-attack-unarmed-south-drawn8',p133Id='male-pants133-attack-unarmed-south-drawn8-candidate';
  const baseHash='ae9f25a9f6982fe6ee02c08f1c323c228955d97c176c28958aca639fa6af0964',pantsHash='8a93e44b2f1bc0abd95b342f31808776e5aa53db4c7d15a2c5975d8f2a20d0f5';
  const anatomy=select({...player,equipment:{}},{...o,action:'attack-unarmed'});
  const original=baseIndex?.records.find(r=>r.id===baseId),p133=outfitIndex?.records.find(r=>r.id===p133Id),d=original?.pack.directions.south,p=p133?.pack,layerSpec=p?.directions.south,c=p133?.overlayContract;
  if(!anatomy||anatomy.sourceId!==baseId||anatomy.hdKind||anatomy.mirrorX||anatomy.headRecord||anatomy.gearOnlyRecord||anatomy.femaleNamedHairRecord||
     !original?.bodyClothingSeparated||!original.headHairSeparated||original.sourcePackSHA256!==baseHash||!same(anatomy.pack,original.pack)||
     original.pack.density!==4||!same(original.pack.frame,{width:160,height:160})||!same(original.pack.pivot,{x:80,y:128})||
     !same(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||d.layers.length!==5||!same(d.layers.map(l=>l.slot),['body','pants','headBase','face','hair'])||
     !c||c.schema!=='native-equipment-overlay-v1'||c.baseRecordId!==baseId||c.baseSourcePackSHA256!==baseHash||c.item!==133||c.slot!=='pants'||c.direction!=='south'||c.action!=='attack-unarmed'||
     c.paddedSourceSHA256!==pantsHash||c.density!==4||c.depth!==2||!same(c.physicalTranslation,[64,64])||!same(c.bodyFrames,d.layers[0].frames)||!same(c.binding,{kind:'fixed'})||
     !same(p133.equipment,{pants:133})||p133.item!==133||p?.density!==4||!same(p.frame,original.pack.frame)||!same(p.pivot,original.pack.pivot)||
     !same(layerSpec?.rest,d.rest)||!same(layerSpec?.poses,d.poses)||!same(layerSpec?.clip,d.clip)||layerSpec.layers.length!==d.layers.length+1||
     !same(layerSpec.layers.slice(0,d.layers.length),d.layers))return null;
  const pants=layerSpec.layers[d.layers.length];
  if(pants.id!=='pants133-translated-candidate'||pants.source!==pantsHash||pants.slot!=='pants'||pants.depth!==2||pants.frames||!same(pants.binding,{kind:'fixed'}))return null;
  // Reuse the exact existing P133 record with the unchanged appearance. In
  // particular, 'blue' follows the existing native Original iris display; this
  // feature does not touch, correct or add any iris styling.
  const exact=select({...player,equipment:{[legs[0][0]]:legs[0][1]}},{...o,action:'attack-unarmed'});
  if(!exact||exact.hdKind!=='outfit'||(exact.sourceId||exact.id)!==p133Id||!same(exact.pack,p)||
     !same(exact.equipment,{pants:133})||exact.headRecord||exact.gearOnlyRecord||exact.femaleNamedHairRecord)return null;
  const omitted=coat?[coat[0]]:[],slotRoutes={[legs[0][0]]:{item:133,quality:'hd',source:p133Id},...(coat?{[coat[0]]:{item:6,quality:'missing'}}:{})};
  return {...exact,id:exact.id+':slot-pilot:'+legs[0][0]+(coat?':missing-'+coat[0]+'-6':''),
   layeredPilot:true,action:'attack-unarmed',resolvedAction:'attack-unarmed',slotRoutes,omitted};
 }
 // Source-specific registrations feed one slot-selection entry point. New
 // records cannot opt in by dimensions alone, or rewrite the actor's look.
 const slotOf=k=>({coat:'torso',legs:'pants'})[k]||k;
 const storedId=v=>v?.def??v;
 const slotEntry=v=>v!=null&&!['none','original'].includes(v);
 function registeredEquipment(player,o){
  const visible={};
  for(const [key,value] of Object.entries(player.equipment||{})){
   if(!slotEntry(value)||nonVisualEquipment.has(key)||key==='head'&&root.MareHeadgear?.hidden(player)||key==='weapon'&&o.weaponless)continue;
   const slot=slotOf(key),item=storedId(value);
   if(!['torso','pants','boots','gloves','head','weapon'].includes(slot)||Object.hasOwn(visible,slot)||!Number.isSafeInteger(item)||item<0||
      typeof value==='object'&&['variant','variantId','appearanceVariant'].some(k=>value[k]!=null&&value[k]!=='original'))return null;
   visible[slot]={key,value,item};
  }
  return visible;
 }
 const describeSlots=(source,visible,pending)=>{
  const slotRoutes={},omitted=[];
  for(const [slot,{key,item}] of Object.entries(visible)){
   if(pending.includes(slot)){slotRoutes[key]={item,quality:'missing'};omitted.push(key);}
   else slotRoutes[key]={item,quality:'hd',source:source.id};
  }
  return {...source,id:source.id+':slots:'+JSON.stringify(slotRoutes),slotRoutes,omitted,layeredSlots:true};
 };
 const maleGloves=(r,item,d)=>r.pack.directions[d].layers.filter(l=>l.id.startsWith('glove'+item+'-')||
  l.id==='equip-glove-'+item||l.id.startsWith('equip-glove-'+item+'-')||
  ['explicit-native-glove-west-mirror','registered-frozen-glove-native-attack'].includes(l.id)).map(l=>l.id);
 function selectRegisteredPantsBoot155(o,a,visible){
  const pants=visible.pants?.item,boot=visible.boots?.item,{direction:dir,action}=o;
  // These trouser hems retain the original B9 lateral seam in every pose.
  const side=['east','west'].includes(dir),sideBoot9=side&&boot===9&&[147,154,161,168,175,182].includes(pants),sideBoot148=side&&boot===148&&[154,161,168,175].includes(pants);
  const southWalk=dir==='south'&&action==='walk',idle=action==='idle',frames=idle?1:16;
  const layersByDirection={
   south:{'boot155-mouth-rear-0':-1,'boot155-mouth-rear-1':-1,'boot155-screen-0':99,'boot155-screen-1':99},
   north:{'boot155-rear-mouth-0':-1,'boot155-shell-0':99,'boot155-rear-mouth-1':-1,'boot155-shell-1':99}
  };
  if(side){
   layersByDirection.east={'equip-boot155-far':5,'equip-boot155-near':6};
   layersByDirection.west=layersByDirection.east;
  }
  const palette=Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original');
  const northPalette=dir==='north'&&[140,147,154,161,168,175,182].includes(pants)&&(boot===155||boot==null)&&
   ['original',undefined].includes(a.hair)&&['original',undefined].includes(a.face)&&
   ['original','blue',undefined].includes(a.eyeColor)&&
   (!a.skin||a.skin==='original'||Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))&&
   (!a.hairColor||a.hairColor==='original'||Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor));
  if(a.body!=='male'||!Object.hasOwn(layersByDirection,dir)||!['idle','walk'].includes(action)||
     palette&&(dir==='north'?!northPalette:side||!strictSouthRequested(a))||side&&boot!=null&&!sideBoot9&&!sideBoot148||
     ![140,147,154,161,168,175,182].includes(pants)||visible.torso?.item!==151||visible.gloves?.item!==152||
     boot!=null&&boot!==155&&!sideBoot9&&!sideBoot148||Object.keys(visible).length!==(boot==null?3:4))return null;
  // Remove only the authored boot passes from this exact trouser rig.
  // Each phase retains its previous fore/rear and near/far occlusion.
  const anchor=outfitById.get(`frozen-male-pants${pants}-${dir}-${action}-v47`),d=anchor?.pack?.directions?.[dir];
  const fixed={torso:151,pants,gloves:152},ids=Object.keys(layersByDirection[dir]);
  if(!anchor?.frozenPantsSource||anchor.productionEnabled===false||anchor.body!=='male'||anchor.direction!==dir||anchor.action!==action||
     d?.clip.frames!==frames||d.clip.fps!==frames||d.clip.loop!==!idle||
     d.layers.filter(l=>/^(equip-)?boot155-/.test(l.id)).length!==ids.length||
     ids.some(id=>{
      const l=d.layers.find(layer=>layer.id===id);
      return !l||l.depth!==layersByDirection[dir][id]||l.binding?.kind!=='fixed'||
       l.frames?.length!==frames||!Array.from(l.frames).every(Boolean);
     }))return null;
  if(palette&&northPalette){
   const reference=outfitById.get('frozen-male-pants133-north-'+action+'-v47'),r=reference?.pack?.directions?.north;
   const own=(layers,id)=>layers.filter(l=>l.id.startsWith('pants'+id+'-'));
   const [waist,left,right,...extra]=own(d.layers,pants);
   const waistband={140:'7e002d073f8a245d92db64a23e693fd4062cc4e3f41adf754461db1012816965',147:'1bec30db8a75d62b02fd23cafcd2bf18d65b0843feabf958dc2b4f6614a1397f',154:'494d067aa21390c06e8b21adb85c1dd6193e6ed4182daa7c607ed8aab632e9d4',161:'ee8d39b25777e6ab363af77e22dfc79845bd76a47fa2ca56a06091226ee4058c',175:'f221e170639c67ed747cd7f29ede5b2fc3744426a7091ebe00466f440ff323ae',168:'31c92ade5ec4d8fe849bb7e0cd862ed3c1e1ce48f184fb073d9a4303a811879b',182:'22e7502d3d0aa7ee38128f25d92563276649182a3f485da1eefb85d7ae374854'};
   const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   if(!r||extra.length||!waist||!left||!right||own(r.layers,133).length!==3||
      !same(d.layers.filter(l=>!own(d.layers,pants).includes(l)),r.layers.filter(l=>!own(r.layers,133).includes(l)))||
      ![waist,left,right].every(l=>l.slot==='pants'&&l.depth===50&&!l.depthTrack)||
      waist.id!=='pants'+pants+'-waist'||waist.source!==waistband[pants]||waist.frames||!anchor.sourceRefs.includes(waist.source)||
      !same(waist.binding,{kind:'bone',a:'NECK',b:'HIP'})||
      ![left,right].every((l,i)=>l.id==='pants'+pants+'-leg-'+(i?'right':'left')&&l.binding?.kind==='fixed'&&l.frames?.length===frames&&
       Array.from(l.frames).every(h=>/^[0-9a-f]{64}$/.test(h)&&anchor.sourceRefs.includes(h))))return null;
  }
  let registeredSideBoot;
  if(side){
   const source=outfitById.get(`frozen-male-pants133-${dir}-${action}-v47`),ref=source?.pack?.directions?.[dir];
   const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),timing=({layers,...rest})=>rest;
   const pantsOwner=(layers,id)=>layers.filter(l=>l.slot==='pants'&&l.id.startsWith('pants'+id+'-'));
   const verified=Object.fromEntries([
    [140,[]],[147,[]],[154,['independent-original-panel']],[161,['independent-original-panel']],
    [168,['original-panel-independent']],[175,['independent-original-panel']],[182,['independent-original-panel']]
   ]),own=pantsOwner(d.layers,pants),reference=ref&&pantsOwner(ref.layers,133);
   const expected=['visible-cloth-only',...verified[pants]].map(id=>'pants'+pants+'-'+id);
   if(!source?.frozenPantsSource||source.productionEnabled===false||!ref||
    Object.keys(source.equipment).length!==4||source.equipment.torso!==151||source.equipment.pants!==133||source.equipment.gloves!==152||source.equipment.boots!==155||
    !same(anchor.pack.frame,source.pack.frame)||!same(anchor.pack.pivot,source.pack.pivot)||anchor.pack.density!==source.pack.density||
    !same(timing(d),timing(ref))||!same(own.map(l=>l.id),expected)||
    !own.every((l,i)=>l.binding?.kind==='fixed'&&l.depth===(i?4.45:4.4)&&l.frames?.length===frames&&l.frames.every(h=>anchor.sourceRefs.includes(h)))||
    reference.length!==1||reference[0].id!=='pants133-visible-cloth-only'||
    !same(d.layers.filter(l=>!own.includes(l)),ref.layers.filter(l=>!reference.includes(l))))return null;
   if(sideBoot9||sideBoot148){
    const donor=outfitById.get(sideBoot148?`frozen-v47-male-151-boot148-${dir}-${action}`:`male-coat151-pants133-gloves152-boots9-walk-${dir}-source-v18${idle?'-idle-frame0':''}`),
      dd=donor?.pack?.directions?.[dir], owns=l=>l.id.startsWith('boot'+boot+'-'),
      order=Object.fromEntries(Object.entries({'near-front-pilot':6,'near-rear-pilot':4.3,'far-front-pilot':5,'far-rear-pilot':4.3,
       'far-navy-local-backing':sideBoot148?4.39:4.99,'near-navy-local-backing':sideBoot148?4.39:5.99}).map(([k,v])=>['boot'+boot+'-'+k,v])),
      boots=dd?.layers.filter(owns);
    if(!(sideBoot148?donor?.frozenBootContract:donor?.equipmentLayerGroups?.boots)||donor.productionEnabled===false||donor.body!==anchor.body||donor.direction!==dir||donor.action!==action||
     donor.equipment.torso!==151||donor.equipment.pants!==133||donor.equipment.gloves!==152||donor.equipment.boots!==boot||
     Object.keys(donor.equipment).length!==4||!same(donor.pack.frame,anchor.pack.frame)||!same(donor.pack.pivot,anchor.pack.pivot)||
     donor.pack.density!==anchor.pack.density||!same(timing(dd),timing(ref))||
     !same(dd.layers.filter(l=>!owns(l)),ref.layers.filter(l=>!ids.includes(l.id)))||
     !same(boots.map(l=>l.id),Object.keys(order))||
     boots.some(l=>l.depth!==order[l.id]||l.binding?.kind!=='fixed'||l.depthTrack||
      l.frames?.length!==frames||l.frames.some(h=>!donor.sourceRefs.includes(h))||
      d.layers.some(v=>!ids.includes(v.id)&&(v.depth===l.depth||v.depthTrack))))return null;
    const layers=[...d.layers.filter(l=>!ids.includes(l.id)),...boots];
    registeredSideBoot={record:{...anchor,id:anchor.id+':boot'+boot+':'+donor.id,equipment:{...fixed,boots:boot},
      pack:{...anchor.pack,directions:{[dir]:{...d,layers}}}},layers:boots.map(l=>l.id)};
   }
  }
  const equipment={...fixed,...(boot==null?{}:{boots:boot})};
  const composed=root.MareReworkModularOutfitsHD?.composeSlots({anchor,equipment,fixed,slots:{boots:{
   anchorLayers:ids,uncoveredBaseVerified:true,records:{155:{record:anchor,layers:ids},...(registeredSideBoot?{[boot]:registeredSideBoot}:{})}
  }}});
  if(!composed||composed.omitted.length)return null;
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  const record={...composed,slotRoutes,omitted:[],hdKind:'outfit',registeredPantsBoot155:true,...(southWalk?{southPantsBoot155:true}:{})};
  if(!palette)return record;
  // The P133 isolated rig provides masks for exactly these eight unchanged
  // upper-body sources. Bare feet use the identical per-frame lower layer
  // from that rig, with its mixed skin/cloth boundary rather than a full tint.
  const authority=outfitById.get(`male-pants133-${action}-${dir}-isolated-r2`),
   own=record.pack.directions[dir],src=authority?.pack?.directions?.[dir];
  const owned=['torso','headBase','armRight','armLeft','handRight','handLeft','hair',...(dir==='south'?['face']:[])],
   originals=src?.layers.filter(l=>owned.includes(l.id)),
   lower=own.layers.find(l=>l.id==='lower-redrawn'),
   same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),
   geometry=({layers,...rest})=>rest,
   masks=authority?.paletteSourceMasks,
   effectiveLower=l=>{
    if(!l||l.frames?.length!==frames||!Array.from(l.frames).every(Boolean))return l;
    // The renderer never consults a static fallback for a fully keyed track.
    const {source,...effective}=l;return effective;
   };
  if(!src||authority.palettePolicy!=='verified-original-anatomy-only'||!same(geometry(src),geometry(own))||
     !same(authority.pack.frame,record.pack.frame)||!same(authority.pack.pivot,record.pack.pivot)||authority.pack.density!==record.pack.density||
     originals?.length!==owned.length||!originals.every(l=>!!l.source&&!l.frames&&masks?.[l.source]?.skin&&
       (l.id!=='hair'||masks[l.source].hair)&&own.layers.filter(x=>same(x,l)).length===1)||
     !lower||!same(effectiveLower(lower),effectiveLower(src.layers.find(l=>l.id==='lower-redrawn')))||root.MareNativeSkinHD?.ownership([lower])!=='mixed'||
     lower.frames?.length!==frames||!Array.from(lower.frames).every(h=>/^[a-f0-9]{64}$/.test(h))||
     dir==='north'&&own.layers.some(l=>l.slot==='face'||l.slot==='iris'))return null;
  const anatomical=new Set([...originals.map(l=>l.source),...lower.frames]);
  if(own.layers.some(l=>l!==lower&&!owned.includes(l.id)&&[l.source,...(l.frames||[])].some(s=>anatomical.has(s))))return null;
  const paletteSourceMasks=Object.fromEntries(originals.map(l=>[l.source,masks[l.source]]));
  const paletteRefs=[...new Set(Object.values(paletteSourceMasks).flatMap(Object.values))];
  const baseMaterialSources=Object.fromEntries(lower.frames.map(h=>[h,'mixed']));
  const decorated={...record,paletteSourceMasks,paletteRefs,baseMaterialSources,palettePolicy:authority.palettePolicy};
  return dir==='south'?root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(decorated,a)||null:
   {...decorated,id:record.id+':verified-north',colorAppearance:a};
 }
// South idle only: other poses lack a single source-stable G152/boot revision.
// Deliberately no fallbacks: pants/no glove/no boot are not proven in all poses.
 function selectPantsGlovesOnApprovedKit(player,o,a,visible){
  const d=o.direction,action=o.action,p=visible.pants?.item,g=visible.gloves?.item;
  const pids=[133,140,147,154,161,168,175,182],gids=[25,26,131,138,145,152,159,166,173,180];
  if(a.body!=='male'||!(d==='south'&&action==='idle'||['north','east','west'].includes(d)&&['idle','walk'].includes(action))||
   Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original')||
   !pids.includes(p)||!gids.includes(g)||visible.torso?.item!==151||visible.boots?.item!==155||Object.keys(visible).length!==4)return null;
  const pantsRecord=i=>outfitById.get(`frozen-male-pants${i}-${d}-${action}-v47`);
  const gloveRecord=i=>outfitById.get(`frozen-male-glove${i}-${d}-${action}-native-layers`);
  const anchor=pantsRecord(133),pr=pantsRecord(p),gr=gloveRecord(g);
  if(!anchor?.frozenPantsSource||!pr?.frozenPantsSource||!gr?.frozenGloveLayers||
     [anchor,pr,gr].some(r=>r.productionEnabled===false)||pr.equipment?.pants!==p||gr.equipment?.gloves!==g)return null;
  const pants=(r,i)=>r.pack.directions[d].layers.filter(l=>l.id.startsWith('pants'+i+'-')).map(l=>l.id);
  const ap=pants(anchor,133),ag=maleGloves(anchor,152,d),equipment={torso:151,pants:p,gloves:g,boots:155};
  const slots={
   pants:{anchorLayers:ap,records:{[p]:{record:pr,layers:pants(pr,p),otherOwnedLayers:{gloves:ag}}}},
   gloves:{anchorLayers:ag,records:{[g]:{record:gr,layers:maleGloves(gr,g,d),otherOwnedLayers:{pants:pants(gr,133)}}}}
  };
  const composed=root.MareReworkModularOutfitsHD?.composeSlots({anchor,equipment,fixed:{torso:151,boots:155},slots});
  if(!composed||composed.omitted.length)return null;
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  return {...composed,slotRoutes,omitted:[],hdKind:'outfit'};
 }
 function northBootAppearance(record,a,authority,boot9,provedCoat=false){
  if(!(provedCoat||record.canonicalNorthBootGloves)||record.direction!=='north'||record.body!=='male'||
    !(provedCoat?[9,148,undefined]:[9,155,undefined]).includes(record.equipment.boots)||
    !['original','blue',undefined].includes(a.eyeColor)||a.hair&&a.hair!=='original'||a.face&&a.face!=='original'||
    !authority||authority.body!=='male'||authority.direction!=='north'||authority.action!==record.action||
    authority.equipment?.torso!==151||authority.equipment?.pants!==133||
    authority.palettePolicy!=='verified-original-anatomy-only')return null;
  const allowed=['torso','headBase','hair','armRight','handRight','armLeft','handLeft'];
  const expected=authority.pack.directions.north.layers.filter(l=>allowed.includes(l.id));
  const live=record.pack.directions.north.layers,match=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  const mask=authority.paletteSourceMasks;
  if(expected.length!==allowed.length||live.some(l=>l.slot==='face'||l.slot==='iris')||
     !expected.every(ref=>ref.source&&!ref.frames&&live.some(l=>match(ref,l)))||
     !expected.every(ref=>mask?.[ref.source]?.skin&&(ref.id!=='hair'||mask?.[ref.source]?.hair))||
     live.some(l=>!allowed.includes(l.id)&&(l.frames||[l.source]).some(p=>mask?.[p])))return null;
  const lower=live.find(l=>l.id==='lower-redrawn'), lowerProof=boot9?.pack?.directions?.north?.layers?.find(l=>l.id==='lower-redrawn');
  const skin=root.MareNativeSkinHD,frameCount=record.pack.directions.north.clip.frames;
  if(!lowerProof||!match(lower,lowerProof)||lower.frames?.length!==frameCount||
     !lower.frames.every(h=>/^[a-f0-9]{64}$/.test(h))||skin?.ownership([lower])!=='mixed')return null;
  const lowerRefs=new Set(lower.frames);
  if(live.some(l=>l!==lower&&(l.frames||[l.source]).some(s=>lowerRefs.has(s))))return null;
  const baseMaterialSources=Object.fromEntries([...lowerRefs].map(r=>[r,'mixed']));
  const paletteSourceMasks=Object.fromEntries(expected.map(ref=>[ref.source,mask[ref.source]]));
  const paletteRefs=[...new Set(Object.values(paletteSourceMasks).flatMap(Object.values))];
  return {...record,id:record.id+':verified-north-palette:'+String(a.skin||'original')+':'+String(a.hairColor||'original'),
   colorAppearance:{skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'},
   paletteSourceMasks,paletteRefs,baseMaterialSources,palettePolicy:authority.palettePolicy};
 }
 const sideIrisBackgroundSources={"east":["059e39e9d0afe083e0d5e5d13bb53c4e215c4bbc1cf51c47f79483c5a16d1fbb","c5aaf3118ec3994e6419eec4dc80039065f5a71ab2c03c69b4c278c2cf4c3e67","d12019f56acb507d1f0c6feafddc922e76f4c54c00d5940c53cf206d14e59717","209186fc75c199ab05becbf69f9325ddcd4c333e76b7415805e23e9f5dd3a80a","6e68a577c2911753df87e3dd0953a884591cb51814f23914fb8dd1fde15f5104","7fb5e27719d9085f44037e72c39aa969b983797bc8298ab74f130511727edcea","4082005fd8fd5d273bccd1c4cdc9c9b09a5342ee40a53a86ab6b3710709ed906","bb54209b4af7d3dc10ed72b29620c0bccf5cc8c21cd7ded01f995cc7e05c7a5d","874c9a6d866be38a6ffe5a99d9bf1f7efa240c0541b21a441267574fbcd35a33","4500dac6e379b601c705fb86a2ca7a40f59316ae4e089cac89732aab76960448","613410e17cb812a6d1ba0930ed147f41f398bec348466005a4121a693daff602","2e56f0f63202e69bd3f4f6cd211c353743ad89514cedd7eedc1c61fb4189036e","0baf1849845793a5b3453abd3b159143ba5856c06dc70bba84c4a4911a2a8eb7","1b6ac0665fcb243eb57ed2e83a2f5c6223944ef5cb5306ca2738e607ae5b61c6","1379fe7446c504468d9bbd99eafa182de3e4adfcc67290079e693e345a511ff5","d4fb8e936aa7c8e89615a1ee84a06556a219a00cda2a0acee0a7b4a0e0613317"],"west":["9608abd4bb112bd3ee465ffbf25704c72a7899eb7e1602c0b2a4833e402154b8","8a4731783274170e928a4f8341fa66213783bcc5584b50d81992ec082effa4eb","36b505e4a7d9dd85ee6aac4bafdb5242477606e25da3ffab5cd0a1967838b2c2","1c788a17ae1c047631f02abcfe10d5b1c80d27e0587577b38cd38ba34a458ff6","12919249fe8f74b97ae5fc78a04bd5f144cdabe2e058b36c1fb507154a901ae6","f88617cb9afadeba146f19967e50ac8bcb675efb71f3a16e914aaf79618f4ece","ed4ab5310f3b06c058df700fa12bcd37bd756dada8fa4e2ce8766a5d9f474f13","fd85cce21a2e4db36776f9df294f11754a9a89f6d25c3c84da4824cbbae996f9","6358b988e79037062a05f6c724e4aac4e5c1c745dd6a151fc42e3be69516d109","76a772795b6df640422d38ca993f587eb134e186a32f658564d3d91dbcc70076","877e992d6cea40c1e5a0469aa4143375b3bc3a8629bf1605a8a724b2f7a1ba49","0679e0fc64b54be30c04a497199951204e995bfde470ac936e9980588f78eb79","b55e358daee72183c8268ca8501cc2678853e603562fd3efdcba072dc9a20189","fdaf8c2c002be9904539519090d03eb29377ad19485d43d0787cdab4137c0c36","41efe43d7e0c2bb049db2fc6bb48666a1cd7df206c116caad4ca2defb5c7ab14","a3d574dd4c6e39b361d969404455ef99d64d9df0bd512b4797d2a38d419afaae"]};
 function selectBootsOnRegisteredWalk(player,o,a,visible){
  const palette=Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original');
  const sideColor=['east','west'].includes(o.direction)&&visible.boots?.item===155&&visible.gloves?.item===152&&
   a.skin==='original'&&['original',undefined].includes(a.hair)&&['original',undefined].includes(a.face)&&
   (a.hairColor==null||a.hairColor==='original'||Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor))&&
   (a.eyeColor==null||a.eyeColor==='original'||Object.hasOwn(root.MareCharacterAppearance?.eyes||{},a.eyeColor));
  if(palette&&!sideColor&&(o.direction!=='north'||![9,155,undefined].includes(visible.boots?.item)||
    !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||
    !['blue','original',undefined].includes(a.eyeColor)||
    a.skin&&a.skin!=='original'&&!root.MareAppearance96?.skins[a.skin]||
    a.hairColor&&a.hairColor!=='original'&&!root.MareAppearance96?.hairs[a.hairColor]))return null;
  const isSide=['east','west'].includes(o.direction),fixed={torso:151,pants:133,...(isSide?{}:{gloves:152})};
  if(a.body!=='male'||!['south','north','east','west'].includes(o.direction)||!['idle','walk'].includes(o.action)||
   Object.entries(fixed).some(([slot,id])=>visible[slot]?.item!==id)||Object.keys(visible).some(k=>!Object.hasOwn(fixed,k)&&k!=='boots'&&!(isSide&&k==='gloves')))return null;
  const dir=o.direction,action=o.action,side=['east','west'].includes(dir),anchorItem=side?155:9;
  const bootIds=[8,9,134,141,148,155,162,169,176,183];
  const byId=n=>outfitById.get(n);
  const portable=item=>`male-coat151-pants133-gloves152-boots${item}-walk-${dir}-source-v18${action==='idle'?'-idle-frame0':''}`;
  const owned=(r,item)=>r.pack.directions[dir].layers.filter(l=>l.id.startsWith((item===155?'equip-':'')+'boot'+item+'-')).map(l=>l.id);
  const anchor=byId(side?`frozen-male-pants133-${dir}-${action}-v47`:portable(9));
  if(!anchor||(side?!anchor.frozenPantsSource:!anchor.equipmentLayerGroups?.boots))return null;
  const records={};
  for(const item of bootIds){
   if(item===155&&!side){
    const donor=byId(`frozen-male-pants133-${dir}-${action}-v47`),base=anchor.pack.directions[dir],original=donor?.pack.directions[dir];
    if(!donor?.frozenPantsSource||donor.productionEnabled===false||!original)continue;
    const ids=dir==='north'?['boot155-rear-mouth-0','boot155-shell-0','boot155-rear-mouth-1','boot155-shell-1']:
     ['boot155-mouth-rear-0','boot155-mouth-rear-1','boot155-screen-0','boot155-screen-1'];
    // Frozen B155 retains a different static fallback on the lower layers.
    // The fallback never draws when all 1/16 frame sources are authored.
    // Reuse the clean B9 body only when the *effective* layer is identical.
    const effective=(layer,count)=>{
     if(layer?.frames?.length!==count||!Array.from(layer.frames).every(Boolean))return layer;
     const {source,...rendered}=layer;return rendered;
    };
    const layers=original.layers.map(l=>{
     if(!['lower-redrawn','pants133-leg-left','pants133-leg-right'].includes(l.id))return l;
     const clean=base.layers.find(b=>b.id===l.id);
     return JSON.stringify(effective(l,original.clip.frames))===JSON.stringify(effective(clean,base.clip.frames))?clean:l;
    });
    const record={...donor,pack:{...donor.pack,directions:{[dir]:{...original,layers}}}};
    records[item]={record,layers:ids};
    continue;
   }
   const r=item===anchorItem?anchor:item===9||item===148&&!side||item===134&&dir!=='south'?byId(portable(item)):
    byId(`frozen-v47-male-151-boot${item}-${dir}-${action}`);
   if(r&&(item===anchorItem||r.frozenBootContract||r.equipmentLayerGroups?.boots)&&r.productionEnabled!==false&&r.equipment.boots===item)records[item]={record:r,layers:owned(r,item)};
  }
  const slots={boots:{anchorLayers:owned(anchor,anchorItem),uncoveredBaseVerified:true,records}};
  if(side){
   const gloveRecords={},boot155=r=>r.pack.directions[dir].layers.filter(l=>l.id.startsWith('equip-boot155-')).map(l=>l.id);
   for(const candidate of Object.values(records))candidate.otherOwnedLayers={gloves:['equip-glove-152']};
   for(const item of [25,26,131,138,145,152,159,166,173,180]){
    const r=outfitById.get(`frozen-male-glove${item}-${dir}-${action}-native-layers`);
    if(r?.frozenGloveLayers&&r.productionEnabled!==false&&r.equipment?.gloves===item&&r.equipment?.boots===155)gloveRecords[item]={
     record:r,layers:maleGloves(r,item,dir),otherOwnedLayers:{boots:boot155(r)}
    };
   }
   slots.gloves={anchorLayers:['equip-glove-152'],uncoveredBaseVerified:true,records:gloveRecords};
  }
  const equipment=Object.fromEntries(Object.entries(visible).map(([k,v])=>[k,v.item]));
  const composed=root.MareReworkModularOutfitsHD?.composeSlots({anchor,equipment,fixed,slots});
  if(!composed||!side&&visible.boots?.item===155&&composed.omitted.includes('boots'))return null;
  let canonicalNorthBootGloves=false;
  if(dir==='north'){
   // B155's existing exact route already uses the latest selected G152.
   // Keep that same glove art when removing/swapping boots on this rig.
   const latest=byId(`frozen-male-glove152-north-${action}-native-layers`),
    previous=byId(`frozen-male-pants133-north-${action}-v47`),d=composed.pack.directions.north,
    ids=['glove152-north-left','glove152-north-right'];
   const selected=latest?.pack?.directions?.north;
   const shape=({source,...layer})=>layer;
   const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   const rig=({layers,...rest})=>rest;
   const gloves=selected?.layers.filter(l=>ids.includes(l.id));
   if(selected&&latest.frozenGloveLayers&&latest.productionEnabled!==false&&previous&&latest.sourceOutfitId===previous.id&&
      latest.body===anchor.body&&latest.action===action&&latest.direction===dir&&
      same(latest.equipment,previous.equipment)&&same(rig(selected),rig(d))&&
      same(latest.pack.frame,composed.pack.frame)&&same(latest.pack.pivot,composed.pack.pivot)&&latest.pack.density===composed.pack.density&&
      !latest.paletteSourceMasks&&!latest.sourceRasterPadding&&
      same(gloves?.map(l=>l.id),ids)&&gloves.every(g=>!!g.source&&!g.frames&&d.layers.some(l=>l.id===g.id&&same(shape(l),shape(g))))){
    const layers=d.layers.map(l=>gloves.find(g=>g.id===l.id)||l);
    composed.id+=`:gloves:${latest.id}`;
    composed.pack.directions.north={...d,layers};
    composed.sourceRefs=[...new Set(layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))];
    composed.slotRoutes.gloves={item:152,quality:'hd',source:latest.id};
    canonicalNorthBootGloves=true;
   }
  }
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  const record={...composed,slotRoutes,omitted:composed.omitted.map(k=>visible[k].key),hdKind:'outfit',canonicalNorthBootGloves};
  if(palette&&sideColor){
   const authority=byId(`male-pants133-${action}-${dir}-source-v18-candidate-coat151-native`);
   const live=record.pack.directions[dir],owned=authority?.pack?.directions?.[dir],same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
   const background=live.layers.find(l=>l.id==='clothed018-visible-background'),auth=owned?.layers.find(l=>l.id===background?.id);
   const known=sideIrisBackgroundSources[dir];
   if(!authority||authority.palettePolicy!=='verified-original-anatomy-only'||!auth||
    record.omitted.length||!same(background,auth)||background.binding?.kind!=='fixed'||
    background.frames?.length!==live.clip.frames||!background.frames.every(h=>known.includes(h)&&authority.paletteSourceMasks?.[h]?.hair)||
    live.layers.some(l=>l!==background&&(l.frames||[l.source]).some(h=>known.includes(h))))return null;
   const paletteSourceMasks=Object.fromEntries(background.frames.map(h=>[h,{hair:authority.paletteSourceMasks[h].hair}]));
   const paletteRefs=[...new Set(Object.values(paletteSourceMasks).map(s=>s.hair))];
   const colorAppearance={skin:'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'};
   return {...record,id:record.id+':side-original-skin:'+colorAppearance.hairColor+':'+colorAppearance.eyeColor,
    paletteSourceMasks,paletteRefs,palettePolicy:authority.palettePolicy,strictSideIris:{background:background.id},colorAppearance};
  }
  return palette?northBootAppearance(record,a,byId(`male-pants133-${action}-north-isolated-r2-coat151-native`),anchor):record;
 }
 function selectGlovesOnRegisteredKit(player,o,a,visible){
  const d=o.direction,action=['attack','skill'].includes(o.action)?'attack-unarmed':o.action;
  if(!['east','west','north','south'].includes(d)||!['idle','walk','attack-unarmed'].includes(action)||
     Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original'))return null;
  const female=a.body==='female',fixed={torso:151,pants:female?154:133,boots:155};
  if(Object.entries(fixed).some(([slot,id])=>visible[slot]?.item!==id)||
     Object.keys(visible).some(k=>!Object.hasOwn(fixed,k)&&k!=='gloves'))return null;
  const skip=item=>female&&(item===131&&d==='south'||item===180&&d!=='north');
  if(skip(visible.gloves?.item))return null;
  const records={},owned=(r,item)=>female?r.pack.directions[d].layers.filter(l=>
   l.id.startsWith('own-female'+item+'-')||l.id==='native-frozen-glove-attack'
  ).map(l=>l.id):maleGloves(r,item,d);
  for(const item of [25,26,131,138,145,152,159,166,173,180]){
   if(skip(item))continue;
   const id=`frozen-${a.body}-glove${item}-${d}-${action}-native-layers`,r=outfitById.get(id);
   if(r?.[female?'frozenFemaleGloveLayers':'frozenGloveLayers']&&r.productionEnabled!==false&&r.equipment?.gloves===item)records[item]={record:r,layers:owned(r,item)};
  }
  const a25=records[25];
  if(!a25?.layers.length)return null;
  const equipment=Object.fromEntries(Object.entries(visible).map(([k,v])=>[k,v.item]));
  const composed=root.MareReworkModularOutfitsHD?.composeSlots({anchor:a25.record,equipment,fixed,slots:{gloves:{
   anchorLayers:a25.layers,uncoveredBaseVerified:true,records
  }}});
  if(!composed)return null;
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  return {...composed,slotRoutes,omitted:composed.omitted.map(k=>visible[k].key),hdKind:'outfit',resolvedAction:action};
 }
 const femaleSideWalkGloveAuthority={
  east:'944955105f510cb49bdaa64bc8e7bf83dc56eb691dd32aade35dd85f288c1cf4',
  west:'2d1bccc8f07fde945577e1a9e92f0526ce84091e5d99629f7cc24c5dc08c31bf'
 };
 function selectFemaleApprovedGloveWalk(player,o,visible){
  const d=o.direction,g=visible.gloves?.item,pants=visible.pants?.item;
  if(o.action!=='walk'||!Object.hasOwn(femaleSideWalkGloveAuthority,d)||o.weaponless||
     visible.torso?.item!==151||![21,133,147,161,168,175,182].includes(pants)||![25,26,131,138,145,152,159,166,173].includes(g)||Object.keys(visible).length!==3||
     ![undefined,null,'natural'].includes(player.appearance96?.skinStyle))return null;
  // This is the approved Original walk as-is, not a fallback to another body.
  const equipment={...player.equipment};delete equipment[visible.gloves.key];
  const source=select({...player,equipment},o);
  const donor=outfitById.get(`frozen-female-glove${g}-${d}-walk-native-layers`);
  if(source?.id!==`approved-female151-v64-walk-${d}-pants${pants}`||source.hdKind!=='outfit'||
     source.slotComposition151!==true||source.sourceRevision!=='F151-v64-native-12'||
     !donor?.frozenFemaleGloveLayers||donor.sourceAuthoritySHA256!==femaleSideWalkGloveAuthority[d]||
     g===131&&donor.frozenGloveSourceRef!==(d==='east'?'ref-1029':'ref-1030')||
     donor.body!=='female'||donor.direction!==d||donor.action!=='walk'||donor.productionEnabled===false||
     donor.equipment?.torso!==151||donor.equipment.pants!==154||donor.equipment.boots!==155||donor.equipment.gloves!==g||
     source.mirrorX||source.mirrorLayerIDs||source.sourceRasterPadding||donor.mirrorX||donor.mirrorLayerIDs||donor.sourceRasterPadding)return null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const {layers:x,...pose}=source.pack.directions[d],{layers:y,...authority}=donor.pack.directions[d];
  if(pants===21){
   const cloth=x.find(l=>l.id==='approved-cloth'),owner=x.find(l=>l.id==='approved-derived');
   const [cloth0,ownerA,ownerB]=d==='east'?
    ['ea95e7f9b89de6ee3bb3b850b63d16027fbb260e3cd7fdeebb75471b0ad9d5b0','fdef1289b34199c5b0ca42331a8980c379ba7b4c6a76d9cee9ae624287b53738','f2427948ee6c76109eef61c791dec83d5ff931e2b184cdd5da72031a198b1073']:
    ['76b1fca16d919ba2eba440e43bea453427b5f609600b76be33c19968630423ad','f07b1b736eb4ee339f379474d5806f4c66e00624b24520869635aba730354486','2b625961b90d08b6003b2828a226a4cda9b979fddaec6010c53115a22be93105'];
   if(cloth?.binding?.kind!=='fixed'||cloth.slot!=='pants'||cloth.depth!==5||cloth.frames?.length!==40||
      cloth.frames[0]!==cloth0||owner?.binding?.kind!=='fixed'||owner.depth!==5.3||owner.frames?.length!==40||
      !owner.frames.every((h,i)=>h===(i>=7&&i<=10?ownerA:i===11?ownerB:
       '5eea5795b6444492f9a08963e15d30c444d9164c3d44e05da44133813b8d120f')&&source.sourceRefs.includes(h)))return null;
  }
  if(pants===133){
   const cloth=x.find(l=>l.id==='approved-cloth');
   const start=d==='east'?'1296f5081e8686c4d64933d7ef115ea00c6a0a2ac2730f91a8e23b6aead1f17d':
    'a7804b5790a1066c0e9597cda88c4cd53637f430f78f6cbe7e05b4b7f0bb9e9f';
   if(cloth?.slot!=='pants'||cloth.binding?.kind!=='fixed'||cloth.depth!==5||cloth.frames?.length!==40||
      cloth.frames[0]!==start||!cloth.frames.every(h=>source.sourceRefs.includes(h)))return null;
  }
  const upper=x.filter(l=>!l.id.startsWith('approved-'));
  const gloves=y.filter(l=>l.id.startsWith(`own-female${g}-`));
  const refs=[...new Set(gloves.flatMap(l=>l.frames||[]))];
  if(pose.clip.frames!==40||pose.clip.fps!==40||pose.clip.loop!==true||!same(pose,authority)||
     !['frame','pivot','density'].every(k=>same(source.pack[k],donor.pack[k]))||
     upper.length!==12||!same(upper,y.filter(l=>!l.id.startsWith('pants154-')&&!l.id.startsWith('boot155-')&&!gloves.includes(l)))||
     gloves.length!==2||!gloves.every((l,j)=>l.id===`own-female${g}-${j?'far':'near'}`&&l.depth===(j?9.5:29.5)&&
       l.slot==='foreground'&&l.binding?.kind==='fixed'&&l.frames?.length===40&&!l.depthTrack)||
     (g===131?(refs.length!==19||new Set(gloves[0].frames).size!==10||new Set(gloves[1].frames).size!==9):refs.length!==16)||
     !refs.every(h=>donor.sourceRefs.includes(h)&&!source.sourceRefs.includes(h)))return null;
  const pack={...source.pack,directions:{...source.pack.directions,[d]:{...pose,layers:[...x,...gloves]}}};
  const composed=describeSlots({...source,pack,equipment:{...source.equipment,gloves:g},
   sourceRefs:[...source.sourceRefs,...refs]},visible,[]);
  composed.slotRoutes[visible.gloves.key]={item:g,quality:'hd',source:donor.id};
  return composed;
 }
 function selectFemaleWalkSlots(player,o,visible){
  if(o.action!=='walk'||o.direction!=='south'||o.weaponless||!visible.boots||Object.keys(visible).some(slot=>!['boots','pants','weapon'].includes(slot)))return null;
  const pants=visible.pants?.item,weapon=visible.weapon?.item;
  if(![21,133,147,161,168,175,182].includes(pants)||weapon!=null&&(pants!==21||![0,5,17].includes(weapon)))return null;
  const source=select({...player,equipment:{...player.equipment,[visible.boots.key]:null}},o),clip=source?.pack?.directions?.south?.clip;
  if(source?.hdKind!=='authored-pants'||source.authoredPantsLayer?.item!==pants||source.body!=='female'||source.action!=='walk'||source.direction!=='south'||
     clip?.frames!==40||clip.fps!==40||clip.loop!==true||(weapon==null?!!source.carrySouth:source.carrySouth?.item!==weapon))return null;
  return describeSlots(source,visible,['boots']);
 }
 function selectCoatsOnRegisteredPants(player,o,a,visible){
  const dir=o.direction,action=['attack','skill'].includes(o.action)?'attack-unarmed':o.action,coat=visible.torso?.item,pants=visible.pants?.item,boot=visible.boots?.item;
  const ownSouth=dir==='south'&&[22,133].includes(pants)&&[6,7,130,137,144,158,165,172,179].includes(coat);
  const strict=dir==='south'&&(pants===21||ownSouth)&&[6,7,130,137,144,158,165,172,179].includes(coat)&&strictSouthRequested(a);
  if(a.body!=='male'||!['idle','walk','attack-unarmed'].includes(action)||!['north','south','east','west'].includes(dir)||
   !(action==='attack-unarmed'?[21,22,133]:[21,22]).includes(pants)||![6,7,130,137,144,158,165,172,179].includes(coat)||
   Object.keys(visible).some(k=>!['pants','torso','boots'].includes(k))||
   boot!=null&&(pants!==133||action!=='attack-unarmed'||!(boot===9||boot===148&&['north','south'].includes(dir)))||
   !strict&&Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original'))return null;
  const attack=action==='attack-unarmed';
  const coatRecord=outfitById.get(`male-torso${coat}-${dir}-frozen-${attack?'attack':action}-native${attack?'-candidate':''}`);
  const pantsRecord=outfitById.get(`male-pants${pants}-${action}-${dir}${pants===133?'-drawn8-candidate':''}`);
  if(!coatRecord||!pantsRecord||[coatRecord,pantsRecord].some(r=>r.productionEnabled===false||r.body!==a.body||r.action!==action||r.direction!==dir)||
   Object.keys(coatRecord.equipment).length!==1||coatRecord.equipment.torso!==coat||
   Object.keys(pantsRecord.equipment).length!==1||pantsRecord.equipment.pants!==pants||coatRecord.paletteSourceMasks!=null||coatRecord.palettePolicy!=null||pantsRecord.sourceRasterPadding!=null||
   [coatRecord,pantsRecord].some(r=>['approvedAppearance','colorAppearance','paletteSupportedMaterials','mirrorX','bodyOcclusion','isolatedPants21','baseMaterialSources','headRecord','headLook','gearOnlyRecord','femaleNamedHairRecord'].some(k=>r[k]!=null)))return null;
  const cd=coatRecord.pack.directions[dir],pd=pantsRecord.pack.directions[dir];
  const baseCoat=cd.layers.filter(l=>l.id.startsWith('base:')),extraCoat=cd.layers.filter(l=>!l.id.startsWith('base:'));
  const ownsPants=l=>new RegExp('^pants'+pants+'-').test(l.id);
  const basePants=pd.layers.filter(l=>!ownsPants(l)),extraPants=pd.layers.filter(ownsPants);
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  const anatomy=pose=>Object.fromEntries(Object.entries(pose).filter(([k])=>!k.startsWith('cloth:')));
  const timing=({layers,clip,poses,rest,...meta})=>({...meta,rest:attack?anatomy(rest):rest,poses:attack?poses.map(anatomy):poses,clip:clip.frames===1&&!clip.loop?{...clip,fps:1}:clip});
  const withCoatPrefix=l=>({...l,id:'base:'+l.id});
  if(!same(timing(cd),timing(pd))||!same(coatRecord.pack.frame,pantsRecord.pack.frame)||
   !same(coatRecord.pack.pivot,pantsRecord.pack.pivot)||coatRecord.pack.density!==pantsRecord.pack.density||
   !same((coatRecord.mirrorLayerIDs||[]).filter(id=>id.startsWith('base:')),(pantsRecord.mirrorLayerIDs||[]).map(id=>'base:'+id))||
   !same(baseCoat,basePants.map(withCoatPrefix))||
   !extraCoat.length||!extraPants.length||attack&&extraPants.some(l=>l.binding?.kind!=='fixed'||(l.frames||[l.source]).some(source=>coatRecord.sourceRasterPadding?.[source]))||
   attack&&basePants.some(l=>JSON.stringify(l.binding).includes('cloth:'))||extraCoat.some(x=>extraPants.some(y=>x.depth===y.depth||x.depthTrack||y.depthTrack)))return null;
  // The initial body and identified trouser layer retain their exact art and bindings.
  // Only validated partners on this pose acquire the approved coat layers.
  let bootLayers=[];
  if(boot!=null){
   const suffix=boot===148?'native':dir==='south'?'south-registered':'existing';
   const anchor=outfitById.get(pantsRecord.id+'-boots'+boot+'-isolated-candidate-coat151-'+suffix);
   const ad=anchor?.pack.directions[dir],boots=l=>l.id.startsWith('boot'+boot+'-'),coat151=l=>l.id.startsWith('coat151-');
   if(!anchor||anchor.productionEnabled===false||anchor.equipment?.boots!==boot||
    anchor.equipment.torso!==151||anchor.equipment.pants!==133||Object.keys(anchor.equipment).length!==3||
    !same(anchor.pack.frame,pantsRecord.pack.frame)||!same(anchor.pack.pivot,pantsRecord.pack.pivot)||
    anchor.pack.density!==pantsRecord.pack.density||!same(timing(ad),timing(pd))||
    !same(ad.layers.filter(l=>!boots(l)&&!coat151(l)),pd.layers)||
    ad.layers.filter(coat151).length!==1||anchor.mirrorLayerIDs||anchor.sourceRasterPadding)return null;
   bootLayers=ad.layers.filter(boots);
   if(!bootLayers.length||bootLayers.some(l=>l.binding?.kind!=='fixed'||l.depthTrack||
    l.frames&&l.frames.length!==ad.clip.frames||!(l.frames||[l.source]).every(h=>anchor.sourceRefs.includes(h))||
    (l.frames||[l.source]).some(h=>coatRecord.sourceRasterPadding?.[h])||
    [...cd.layers,...extraPants].some(other=>l.depth===other.depth||other.depthTrack)))return null;
  }
  const layers=[...cd.layers,...extraPants,...bootLayers];
  const sourceRefs=[...new Set(layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))];
  const record={...coatRecord,id:`layered-torso:${coatRecord.id}:${pantsRecord.id}`+(boot==null?'':':boot'+boot),
   equipment:{torso:coat,pants,...(boot==null?{}:{boots:boot})},sourceRefs,paletteSourceMasks:pantsRecord.paletteSourceMasks,palettePolicy:pantsRecord.palettePolicy,paletteRefs:pantsRecord.paletteRefs,
   pack:{...coatRecord.pack,directions:{[dir]:{...cd,layers}}}};
  const described=describeSlots({...record,hdKind:'outfit',resolvedAction:action},visible,[]);
  if(!strict)return described;
  if(ownSouth){
   // P22/P133 use their own authored maps. Do not apply the generic
   // P21 mixed material classifier or paint coat, trousers or boots.
   const sibling=outfitById.get(pants===22?`male-pants133-${action}-south${attack?'-drawn8-candidate':'-isolated-r2'}`:`male-pants22-${action}-south`);
   const own=sibling?.pack?.directions?.south;
   const mask=pantsRecord.paletteSourceMasks;
   const all=l=>l.frames||[l.source];
   const coreRefs=new Set(basePants.flatMap(all));
   if(!own||!mask||pantsRecord.palettePolicy!=='verified-original-anatomy-only'||
      sibling.palettePolicy!==pantsRecord.palettePolicy||!same(mask,sibling.paletteSourceMasks)||
      !same(pantsRecord.paletteRefs,sibling.paletteRefs)||!same(timing(pd),timing(own))||
      !same(basePants,own.layers.filter(l=>!(/^(?:pants22-|pants133-|own133-)/).test(l.id)))||
      Object.keys(mask).some(h=>!coreRefs.has(h))||[...extraCoat,...extraPants,...bootLayers].some(l=>all(l).some(h=>mask[h])))return null;
   return root.MareReworkModularOutfitsHD.withStrictSouthAppearance(described,a);
  }
  const materials=outfitRegistry.bindAnatomy(coatRecord,baseIndex);
  if(!materials)return null;
  return root.MareReworkModularOutfitsHD.withStrictSouthAppearance({...described,baseMaterialSources:materials},a);
 }
 function selectOrderedWeaponSlots(player,o,a,visible){
  const item=visible.weapon?.item,coat=visible.torso?.item,d=o.direction,original={hair:'original',face:'original',skin:'light',hairColor:'brown',eyeColor:'brown'};
  const classes={15:'cyborg',123:'strategist',124:'strategist',125:'healer',126:'healer',127:'healer'};
  const staff=item!==15,action=staff?'attack-focus':'attack-unarmed';
  if(!classes[item]||player.classId!==classes[item]||!['east','west'].includes(d)||!['attack','skill',action].includes(o.action)||
     Object.entries(original).some(([k,v])=>a[k]!==v)||o.weaponless||
     Object.keys(visible).some(k=>!['weapon','torso','pants','boots','gloves'].includes(k)))return null;
  const keepCoat=!staff&&[151,158,165,179].includes(coat),equipment=keepCoat?{coat:visible.torso.value}:{};
  if(!staff&&!keepCoat)return null;
  const source=weaponRegistry?.resolveSeparable({item,body:'male',sourceBody:'male',classId:player.classId,
   weaponVariant:'original',action,direction:d,appearance:original,equipment});
  const id=staff?`authored-ordered-${item}-${d}`:`separable-male-${d}-weapon15-coat${keepCoat?coat:'none'}`;
  if(source?.id!==id||!source.separableAttack||source.density!==4||source.fps!==12||source.states.length!==8||
     source.timeline.length!==(staff?8:20)||staff&&!source.orderedAttack)return null;
  const pending=Object.keys(visible).filter(k=>k!=='weapon'&&!(keepCoat&&k==='torso'));
  if(!pending.length)return null;
  return describeSlots({...source,hdKind:'weapon',action,resolvedAction:action},visible,pending);
 }
 function selectSouthTorsoOnPants133(o,a,visible){
  const d=o.direction,action=o.action,item=visible.torso?.item,boot=visible.boots?.item;
  const items=[6,7,130,137,144,158,165,172,179],strict=strictSouthRequested(a);
  if(a.body!=='male'||d!=='south'||!['idle','walk'].includes(action)||visible.pants?.item!==133||
    ![null,9,148].includes(boot??null)||Object.keys(visible).length!==(boot==null?2:3)||!items.includes(item)||
    !strict&&Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original'))return null;
  const id=`male-pants133-${action}-south-isolated-r2`,anchor=outfitById.get(id+({9:'-boots9-isolated-candidate-coat151-existing',148:'-boots148-isolated-candidate-coat151-native'}[boot]||'-coat151-native')),
    clean=outfitById.get(id),donor=outfitById.get(`male-torso${item}-south-frozen-${action}-native`);
  if([anchor,clean,donor].some(r=>!r||r.productionEnabled===false||r.body!==a.body||r.direction!==d||r.action!==action)||
    anchor.equipment?.torso!==151||anchor.equipment?.pants!==133||anchor.equipment?.boots!==boot||Object.keys(anchor.equipment).length!==(boot==null?2:3)||
    donor.equipment?.torso!==item||Object.keys(donor.equipment).length!==1||clean.equipment?.pants!==133||
    Object.keys(clean.equipment).length!==1||!donor.sourcePackSHA256)return null;
  const [dir,core,foreign]=[anchor,clean,donor].map(r=>r.pack.directions[d]),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),
    frame=(r)=>[r.pack.frame,r.pack.pivot,r.pack.density],
    owned=dir.layers.filter(l=>l.id.startsWith('coat151-')),
    base=dir.layers.filter(l=>!owned.includes(l)),clothing=foreign.layers.filter(l=>!l.id.startsWith('base:')),
    fromBody=foreign.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)}));
  // The source-owned collar, cuff and exposed-hand repair layers travel with their
  // original torso fitting. Keep the exact body, including pants pixels, unchanged.
  const extras={
   7:['sleeve-aperture-rear-RIGHT-sleeve','sleeve-aperture-rear-LEFT-sleeve'],
   137:['collar-depth-rear-neck','cuff-emergence-handRight-RIGHT-skin','cuff-emergence-handLeft-LEFT-skin'],
   144:['collar-depth-rear-neck','south-visible-original-hands-RIGHT-skin','south-visible-original-hands-LEFT-skin'],
   158:['rear-collar-collar'],165:['rear-collar-collar'],179:['rear-collar-collar'],
   172:['bilateral-collar-front-collar','left-front-cuff-rim-rim-left','right-front-cuff-rim-rim-right'],
  };
  const withoutBoots=base.filter(l=>boot==null||!l.id.startsWith('boot'+boot+'-'));
  if(boot!=null&&withoutBoots.length===base.length)return null;
  const clock=({layers,clip,...rest})=>({...rest,clip:action==='idle'&&clip.frames===1&&clip.loop===false?{frames:1,loop:false}:clip});
  if(!owned.length||!clothing.length||clothing.some(l=>!l.id.startsWith('coat'+item+'-')&&!extras[item]?.includes(l.id))||
    !same(frame(anchor),frame(donor))||!same(frame(anchor),frame(clean))||!same(withoutBoots,core.layers)||
    !same(clock(dir),clock(foreign))||!same(clock(dir),clock(core))||
    !same(withoutBoots.filter(l=>l.id!=='own133-isolated'),fromBody))return null;
  const fixed={pants:133,...(boot==null?{}:{boots:boot})},equipment={...fixed,torso:item},registered={...anchor,id:donor.id+':slot-on:'+anchor.id,equipment,
   pack:{...anchor.pack,directions:{[d]:{...dir,layers:[...base,...clothing]}}},
   paletteSourceMasks:{...anchor.paletteSourceMasks,...donor.paletteSourceMasks}};
  const composed=root.MareReworkModularOutfitsHD?.composeSlots({anchor,equipment,fixed,slots:{torso:{
    anchorLayers:owned.map(l=>l.id),records:{[item]:{record:registered,layers:clothing.map(l=>l.id)}}
   }}});
  if(!composed)return null;
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  const described={...composed,slotRoutes,omitted:[],hdKind:'outfit'};
  if(!strict)return described;
  if(!clean.paletteSourceMasks||!same(clean.paletteSourceMasks,anchor.paletteSourceMasks)||
     !same(Object.entries(clean.paletteSourceMasks).sort(),Object.entries(composed.paletteSourceMasks).sort()))return null;
  return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(described,a)||null;
 }
 // Exact North lower cloth ownership check: these coat passes never intersect
 // the 1,034–5,399 pixels where the two registered lower bodies differ.
 const north133CoatRegistration={"idle":{"pants":["053730953e48350059aa0c22f1f23e448838da8b20e32b4317613b2d64adbeb3"],"lower":["4c778f703da2c5b7cbf03c25969027c7daa4ec6527c52b1cd7adc4867a04f508"],"donors":{"6":"f6f5ca961e1ff6b316372f65a9c4b0c303789861528b79e156eabcb19b1610ed","7":"b42a54e476c269a3aded654eafdc19f36a8411dbe0d0e6da18edb4acde63a9df","130":"c5cb57830bacd189b4157595dad58b682f9a4b69d4830e17daace0c2fcd2fd80","137":"d90df4f478667c89095a0a4347bc90dae9a2e87848e4dfb543d2175a6108df3c","144":"d141872240ab905755de4afc05c196b432f2280dd76dae1337cf7d570199e169","158":"54f55026995fe5fd4a34fe15034bdcd51f40ec7a4f695bc981a8b4862b70af01","165":"97cd92550221f3ba4bf15e8d0e44e98b486a26372a1b28de16cc78d790e69d2e","172":"954303a8d311d73532a487c58386f8dc6e6923fb3dcc898193f6b7407e276d44","179":"e073365d82e2ba62147fcbbabc4dd7b145ebeec535d9e4f933fa5a024c9b7405"}},"walk":{"pants":["053730953e48350059aa0c22f1f23e448838da8b20e32b4317613b2d64adbeb3","35c97c82e3052a3d1c1a9669901f6200e1cb6e9bfe4cf6d8982dcb04cf1078ad","ba49c4b1bf3fa544a9d3d44d2f739e2171fcc7b75c6dda3092551d2aca0d8eb4","da7d5d903f068a1806ceeed3d23941030333d80aa7510f6f6c94538c7122d32e","41e98a86e0bddee8acccc56d72b2c233b6aeb8ffae4add96476124270d419cc7","8b9544b9b743027f8d39c0cc550285ba0aacabfdbc7ca3b1cb68cdb5dd44bbcb","cd82d4e71462f35c2d51d6dc0bab1687318458dba0c6ff1ef24c69c77533c199","32baa3b753179e6d71f7087ba00b226ba81fdfcde97f34386d68a142cd5410b9","7eaded8b71ba91fe0c5bd3b2d59e726fa947c4db38ed467128cc6de83fcf439b","7f08c3a1d1517df6ddacb6bfe357c3a804a192bbb90f174c677aa3725435e5a0","fd56f17bea728e7a8f4e069ef49fa8f32c143c24fb7a8236f5e79cac5caa5364","337690dd15d07fe2a6cf9bf360bb2391707b3f32048d4a46a91c55f67130ff3b","eeed1a84abcb5b4d49d748769c18b247b1c36c1cc614df973204ed042069ecee","fb0a4d801edef0d031b2514398da42fe380bc1400102e7b3cf5b0338494190b0","d444cfdd629d693e63095903ce702450e73ea87b147660ab8ecbde971a370019","0dda1b3ab48dd13d6fb05f75d04ede5b6857de04d3a80f2c5d505e1a07895baa"],"lower":["4c778f703da2c5b7cbf03c25969027c7daa4ec6527c52b1cd7adc4867a04f508","d9d9857f715f503361cc1f11e7f6b7721d1cc48759fb99e84a9467ea6f68a488","8022f32a86db1e76021f21ff4825ef7b81abce17c548860c178ae5eff70c979d","ce606ae7b08be263486cb869f389f6e3cdae4a6e5b97c9c982800b2d739cf831","32e637dcb0cdbfd7d5cdc8492d10b57928f49cfc8c5c849c12b4b21ce32e3cd7","1c2a8fd11848869996d76f4ba6c32f4b0909838816fdbc1dcb7363dc7dab2ac5","58023b831d6b1d2157be6b4ae3616d50ec1182f36eafa54f7aa38fa156058bb5","97a2a36fb032b87d2217a7b0fe9d52fd030b1d496a94c44856c929f3444ef295","bb94cc4f963c00e71ddc1a9d33940cb373f919d79bff1db75a3a7b9f30350664","61b8d1c969304fde769983b2602a08b3b44628426855a2e0abbee745e755599e","7d15bb25e681b6eb913d0d7b280f4c8c5aab93d1d69a0d0686346f136aa1547e","78def7a35d6d7e899cf42ac38f31f80cf27869be1938c06e5f63a773623836fe","5ecfb3f44da69c1089bbba6c5242f362041a09f663829232b766b466cdf10360","8f4f4368fa4313b3e5966ccccdded838695094f1ab67a9b0e5f3768f96b48aeb","372273a4e2842d36aa9a893ceb60248a43b7b2ca482bb624896992dbbc6dc932","51bfe05fec654b2a6764d661b9c1a81156717f24254613d35efdd898143a2ff4"],"donors":{"6":"f6f5ca961e1ff6b316372f65a9c4b0c303789861528b79e156eabcb19b1610ed","7":"b42a54e476c269a3aded654eafdc19f36a8411dbe0d0e6da18edb4acde63a9df","137":"d90df4f478667c89095a0a4347bc90dae9a2e87848e4dfb543d2175a6108df3c","144":"d141872240ab905755de4afc05c196b432f2280dd76dae1337cf7d570199e169"}}};
 // The two verified C144 passes own only cloth, lining and embroidery.
 const northCoatPalettePasses={"137":{"idle":{"coat137-collar-rear-neck":["a4f4f519ae743d914c8be385d40c6a08a3b216e1de5041fce631233d1b7f3d12"],"coat137-front-core":["c1c0de52917c74565ae950569b4715019c1f153ed744a1fd645f90348e973fe2"],"coat137-front-LEFT-upper":["4acda102aff44134a0cf6a92356bb0d07b12fb4c8c5f3d074c5a857869d21afb"],"coat137-front-RIGHT-upper":["c0dc0ad7d5f6af3000181f21ce53582426a4ead8ee2637abbcc30f446bdafdc5"],"coat137-front-LEFT-lower":["0a3b820f3639113e6ea013ba2ba836aea6f0517d759c81019b8fe303a4cd859d"],"coat137-front-RIGHT-lower":["bdcf1ee3d602785f85f7f86427b58eeedcd9562653ce0bcbf3e26a90e253ffd5"],"coat137-front-hem":["5f38bf1c53db19016ce0ba23d7518d2f71d426368749d20ed9c6dba358ed2e45"],"cuff-emergence-handRight-RIGHT-skin":["d383b7148a8226b5cd7706249db11e14b1932689c3c9a5bcafcf5f0c0ef78db9"],"cuff-emergence-handLeft-LEFT-skin":["58a31b7aeb417bfadd1362702e8c8814cbcd196da65cf9946a6ab3ca3ccaccf3"]},"walk":{"coat137-collar-rear-neck":["a4f4f519ae743d914c8be385d40c6a08a3b216e1de5041fce631233d1b7f3d12"],"coat137-front-core":["c1c0de52917c74565ae950569b4715019c1f153ed744a1fd645f90348e973fe2"],"coat137-front-LEFT-upper":["4acda102aff44134a0cf6a92356bb0d07b12fb4c8c5f3d074c5a857869d21afb","803960158b31c8f6199e5648e25e237eee617978ce75efd2e934bf7858158a02"],"coat137-front-RIGHT-upper":["c0dc0ad7d5f6af3000181f21ce53582426a4ead8ee2637abbcc30f446bdafdc5","c0bfdb3853e4a0de7e747f225e6b8f6d5ac93adadd4b9303ef430e44a73ad168"],"coat137-front-LEFT-lower":["0a3b820f3639113e6ea013ba2ba836aea6f0517d759c81019b8fe303a4cd859d","56934c67a4b6728b4601871d18b72a73b157fb4288bc3bb3fa21dc4d961564b8"],"coat137-front-RIGHT-lower":["bdcf1ee3d602785f85f7f86427b58eeedcd9562653ce0bcbf3e26a90e253ffd5","9b93001fd94afb1704f69b4ca29a51e77b91b95ef09d7759ff33fbdb84f054ef"],"coat137-front-hem":["5f38bf1c53db19016ce0ba23d7518d2f71d426368749d20ed9c6dba358ed2e45"],"cuff-emergence-handRight-RIGHT-skin":["d383b7148a8226b5cd7706249db11e14b1932689c3c9a5bcafcf5f0c0ef78db9"],"cuff-emergence-handLeft-LEFT-skin":["58a31b7aeb417bfadd1362702e8c8814cbcd196da65cf9946a6ab3ca3ccaccf3"]}},"144":{"idle":{"coat144-whole-core":["8dded90fa3aa52ba1459a58e18019695a8e67a451a68f9a7cfdc872df0010ac1"],"coat144-whole-hem":["6da15db7423418d43923bbdad8ec314c75d196c6dd785009f23b8d6d21050868"]},"walk":{"coat144-whole-core":["8dded90fa3aa52ba1459a58e18019695a8e67a451a68f9a7cfdc872df0010ac1"],"coat144-whole-hem":["6da15db7423418d43923bbdad8ec314c75d196c6dd785009f23b8d6d21050868"]}},"158":{"idle":{"coat158-whole-core":["f6df0bece8c9d8ff0262ba3d96ddaa82b2171cd92947492c9c4236ab3f733585"],"coat158-whole-LEFT-upper":["bc4ebeb0e1c6c0273687d583b1f6391329f48f36099dded6446a49866b5716d0"],"coat158-whole-RIGHT-upper":["d585043587bf8a0a7c296ab431bffd8cf7e3d4b7571ca748d37e83ac2230933a"],"coat158-whole-LEFT-lower":["33864cc93653f5ca3793507b47caea341ad61ba9f38f1e1a7fecb3e85f04628b"],"coat158-whole-RIGHT-lower":["41d1b80ff0c3c886670fb63d863c4d63fb4b2675e7feda9503a1942f10c4bfc6"],"coat158-whole-hem":["3e8178b7d719ff9890143d5b5e2135d67bfdad740b48404ecf777f0ca9c55964"],"original-neck-coverage-only-collar":["af82535d88ec424b7deb0aa33ac81d3d4c5772cd51af08ca3f270b4e53add48d"]}},"165":{"idle":{"coat165-whole-core":["626211d9538893deda225176c42d0f099afe6a6f6fd54dfb3b73e39b200f1759"],"coat165-whole-LEFT-upper":["8cf044b11cd9064f3ce7ba97121757f6c64b12f3335aa8f84a9abf9cbab84d44"],"coat165-whole-RIGHT-upper":["41151480d3aaec1f0c5a28fc51d8b879045c0068202c7cc72cba5b7fb0e999ff"],"coat165-whole-LEFT-lower":["62d62a431c71bd6606729afefb4602dc45cebfa4f076eb20951fdafd4755c07e"],"coat165-whole-RIGHT-lower":["6012aa45aa189c344b8049feaf1beab6e63428eba031c0d18714a82947e3523d"],"coat165-whole-hem":["b53c1658e66f8be28ce71a290e51546982846acd5d401b764429d1849a6a19d9"],"original-neck-coverage-only-collar":["ffd64549ff0f4c8b861d3ee01eb267b94b531f0f36bb31bbafa9ca0c2da47bc0"]}},"172":{"idle":{"coat-front-core":["0caf63879e688d36748f003827b4fe9fd1ccafb433efa746572a87170bc090a7"],"coat-front-LEFT-upper":["176ed16e16d1f1b105ef27c03e894120ff729648c80d1aa0ffc1a7cccada965c"],"coat-front-RIGHT-upper":["3cb2a2ee8fe86ac2a3aa1581f7d07167cd53557c5b392d459bc3177bfe22d43a"],"coat-front-LEFT-lower":["7a525db281321c3c34e15dfbb9889fc1d6028caf176f4387ef67313dfedcb36d"],"coat-front-RIGHT-lower":["c26cadddb94fdcfe4e5915da92e25a07ca138aadea606b4bf247a8b0a2470fd5"],"coat-front-hem":["50b9a215a01ab3b84721e55b1c900ec96b2badb0c0a44cba1c15e19b59a114d2"],"original-neck-coverage-only-collar":["99b77a847725d4f8be6af52080e4cd474a3209ce14fd8dd68412eaf869ba3aba"]}},"179":{"idle":{"coat179-whole-core":["31e450195a5c971fa57763d582dc978ebbf8f22e1f00701653a9919ac959ee73"],"coat179-whole-hem":["2f4df963eb83953d45e46225e2a06208af2a380d713171e35eab3ce67d3229ad"],"original-neck-coverage-only-collar":["aee4718073ed9f1a9fed89a7773c3de6ef295553f7416cef957213cc40829568"]}}};
 function selectNorthTorsoOnPants133(o,a,visible){
  const d='north',action=o.action,item=visible.torso?.item,boot=visible.boots?.item,contract=north133CoatRegistration[action];
  const palette=Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original');
  const known=(name,index)=>name==null||name==='original'||Object.hasOwn(index||{},name);
  if(palette&&(![6,7,137,144].includes(item)&&!(action==='idle'&&[158,165,172,179].includes(item))||!['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||
     !known(a.skin,root.MareAppearance96?.skins)||!known(a.hairColor,root.MareAppearance96?.hairs)||
     !known(a.eyeColor,root.MareCharacterAppearance?.eyes)))return null;
  if(a.body!=='male'||o.direction!==d||!contract?.donors[item]||visible.pants?.item!==133||
    ![null,9,148].includes(boot??null)||Object.keys(visible).length!==(boot==null?2:3))return null;
  const id=`male-pants133-${action}-north-isolated-r2`,anchor=outfitById.get(id+({9:'-boots9-isolated-candidate-coat151-existing',148:'-boots148-isolated-candidate-coat151-native'}[boot]||'-coat151-native')),
    clean=outfitById.get(id),donor=outfitById.get(`male-torso${item}-north-frozen-${action}-native`);
  if([anchor,clean,donor].some(r=>!r||r.productionEnabled===false||r.body!==a.body||r.direction!==d||r.action!==action)||
    anchor.equipment?.torso!==151||anchor.equipment?.pants!==133||anchor.equipment?.boots!==boot||Object.keys(anchor.equipment).length!==(boot==null?2:3)||
    donor.equipment?.torso!==item||Object.keys(donor.equipment).length!==1||clean.equipment?.pants!==133||
    Object.keys(clean.equipment).length!==1||donor.sourcePackSHA256!==contract.donors[item])return null;
  const [dir,core,foreign]=[anchor,clean,donor].map(r=>r.pack.directions[d]),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),
    frame=r=>[r.pack.frame,r.pack.pivot,r.pack.density],
    owned=dir.layers.filter(l=>l.id.startsWith('coat151-')),
    base=dir.layers.filter(l=>!owned.includes(l)),clothing=foreign.layers.filter(l=>!l.id.startsWith('base:')),
    fromBody=foreign.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)}));
  const extras={7:['sleeve-aperture-rear-LEFT-sleeve','sleeve-aperture-rear-RIGHT-sleeve'],
   137:['cuff-emergence-handRight-RIGHT-skin','cuff-emergence-handLeft-LEFT-skin'],
   172:['coat-front-core','coat-front-LEFT-upper','coat-front-RIGHT-upper','coat-front-LEFT-lower','coat-front-RIGHT-lower','coat-front-hem','original-neck-coverage-only-collar'],
   158:['original-neck-coverage-only-collar'],165:['original-neck-coverage-only-collar'],179:['original-neck-coverage-only-collar']};
  const withoutBoots=base.filter(l=>boot==null||!l.id.startsWith('boot'+boot+'-')),
    clock=({layers,clip,...rest})=>({...rest,clip:action==='idle'&&clip.frames===1&&clip.loop===false?{frames:1,loop:false}:clip}),
    ls=fromBody.find(l=>l.id==='lower-redrawn'),lt=withoutBoots.find(l=>l.id==='lower-redrawn'),
    sources=l=>l?.frames||[l?.source];
  if(!owned.length||!clothing.length||clothing.some(l=>!l.id.startsWith('coat'+item+'-')&&!extras[item]?.includes(l.id))||
    boot!=null&&withoutBoots.length===base.length||!same(frame(anchor),frame(donor))||!same(frame(anchor),frame(clean))||
    !same(withoutBoots,core.layers)||!same(clock(dir),clock(foreign))||!same(clock(dir),clock(core))||
    !same(sources(ls),contract.lower)||!same(sources(lt),contract.pants)||
    !same({...ls,frames:undefined,source:undefined},{...lt,frames:undefined,source:undefined})||
    !same(withoutBoots.filter(l=>!['own133-isolated','lower-redrawn'].includes(l.id)),fromBody.filter(l=>l.id!=='lower-redrawn')))return null;
  const fixed={pants:133,...(boot==null?{}:{boots:boot})},equipment={...fixed,torso:item},
    registered={...anchor,id:donor.id+':slot-on:'+anchor.id,equipment,
     pack:{...anchor.pack,directions:{[d]:{...dir,layers:[...base,...clothing]}}}};
  const source=root.MareReworkModularOutfitsHD?.composeSlots({anchor,equipment,fixed,slots:{torso:{
    anchorLayers:owned.map(l=>l.id),records:{[item]:{record:registered,layers:clothing.map(l=>l.id)}}
   }}});
  if(!source)return null;

  const clothAuthority=northCoatPalettePasses[item]?.[action];
  const cuffMaterials={};
  if(palette&&clothAuthority){
   if(clothing.length!==Object.keys(clothAuthority).length||
    clothing.some(l=>clothAuthority[l.id]?.[0]!==l.source||l.frames?.some(h=>!clothAuthority[l.id].includes(h))))return null;
   if(item===137){
    const cuffs=clothing.filter(l=>l.id.startsWith('cuff-emergence-'));
    if(cuffs.length!==2)return null;
    for(const l of cuffs){
     if(source.pack.directions[d].layers.filter(v=>(v.frames||[v.source]).includes(l.source)).length!==1)return null;
     cuffMaterials[l.source]='anatomy';
    }
   }
  }
  const slotRoutes=Object.fromEntries(Object.entries(source.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  const dressed={...source,slotRoutes,omitted:[],hdKind:'outfit'};
  if(!palette)return dressed;
  // Apply the shared authored anatomy masks; garment pixels stay unchanged.
  // Attach the exact North anatomy authority already used on P133/B9. The
  // actual North pack cannot show an iris; never drop the saved color.
  const boot9=outfitById.get(id+'-boots9-isolated-candidate');
  const colored=northBootAppearance(dressed,{...a,eyeColor:'original'},anchor,boot9,true);
  if(!colored)return null;
  return {...colored,...(item===137?{baseMaterialSources:{...colored.baseMaterialSources,...cuffMaterials}}:{}),
   colorAppearance:{...colored.colorAppearance,eyeColor:a.eyeColor||'original'}};
 }
 // Verified South original eye material, not a brightness or rectangle mask.
 const southPunchFace='6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a',southPunchSkin='47c4585f7c79fdf6d67207416b4a08c9b7322da3d9abc94cddf965bd6ed174a0';
 const southPunchIris=[[131503,1,2622720],[131504,1,3281934],[132143,1,2688000],[132144,1,3478797],[132783,2,4659469],[132784,2,5384221],[132787,1,2626832],[132788,2,4069391],[133423,2,5776662],[133424,3,6763814],[133425,1,2494731],[133427,2,5581601],[133428,2,5119762],[134063,1,3741197],[134064,3,6237727],[134065,3,6040607],[134066,3,6040350],[134067,3,7091238],[134068,2,4330503],[134703,2,4338220],[134704,1,3608841],[134705,2,5251606],[134706,2,5513750],[134707,2,5382163],[132172,1,3278592],[132812,2,5512978],[132813,1,2823182],[132816,2,4136211],[132817,1,3084811],[133452,2,5315855],[133453,2,5056026],[133455,1,3216911],[133456,3,5975328],[133457,2,4070417],[134092,2,4593162],[134093,3,6106657],[134094,2,5712155],[134095,3,6237470],[134096,3,6435105],[134097,1,3808017],[134732,1,2491648],[134733,2,4398355],[134734,2,4529426],[134735,2,4923669],[134736,1,3083011]];
 function southPunchImages(entry,color){
  const path=sha=>'tools/rework-modular-outfits-hd/assets/'+sha+'.png',face=entry.images.get(path(southPunchFace)),skin=entry.images.get(path(southPunchSkin));
  if(!root.MareCharacterAppearance?.eyes[color]||[face,skin].some(i=>!i||i.width!==640||i.height!==640))throw Error('Unverified South punch eye materials');
  const put=i=>{const c=makeCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(i,0,0);return {c,ctx,data:ctx.getImageData(0,0,640,640)};};
  const f=put(face),m=put(skin),tone=[];
  for(const [p,t,rgb] of southPunchIris){
   const k=p*4,v=f.data.data;
   if(v[k+3]!==255||((v[k]<<16)|(v[k+1]<<8)|v[k+2])!==rgb)throw Error('South punch eye does not match the source');
   tone.push([p,t]);m.data.data[k]=0;
  }
  f.data.data.set(root.MareCharacterAppearance.recolorEyes(f.data.data,tone,color));
  f.ctx.putImageData(f.data,0,0);m.ctx.putImageData(m.data,0,0);
  const images=new Map(entry.images);
  images.set(path(southPunchFace),f.c);images.set(path(southPunchSkin),m.c);
  return {images,tiles:[f.c,m.c]};
 }
 // Audited SOUTH authored glove material. Do not recolor the blue/white/leather or gold/red trim.
 const southAdditionalPunchGloveFrames={"131":["7d0f0174ee3aa28c8f2cf7c6500fb45d78b63d82e1c5c8a4df73f8cc429433fb","f7c33418f1404ed0d1f31ad450fef932d72e4b345edb440c578e30e77719f4c8","1317f135ab18678f98d881e0f7bd888ac31e79cfd63fc09154d4742a90cdcaea","4cf4bb0fdfdd9ce3fdbcea9806389c35b0ea1e2ac7ef8d67022621ed688eefbd","3cb846bc2e114c45dd009205b6840be6ef1e299d54a8910e485f9c6158886aff","db61eec868b7259dba50959917ba77ea9d505bea5e07836f9cedcea5f2554c64","b187f48276a496112cdb43eadcee974bcb40f86ceeea3fba2d0080bc9f917b12","3569a0e851533ef8f3dfab6f9194e1fd2338389c14a5df11596941694c36bce6"],"138":["83816f0e989e2117be8cb6a302060418d3724cdd35df72bdfa69aa38f7820294","48da00fae11b9d6acdde27887e30d29ba56514e9e23fe6fc7831260ac7b3d354","ff7f2f51f2d97a6cc9b7e37a3af63aacc961a307475deb6a99a3712176b1534e","967f505c975d0d3c9537c3095463d44727209a390abaed493334fbaef99e0b81","4303556c3f4182983140f4ba24187baf290d850f3b7a0c1414111ee2542c8a27","ccde17cf5d9d24db6e2efa3361783872f31a4b593beeee8d9c52fb86f0ce019a","7f4574160b5cf19aabcd445dd2f72aa80a2cc2098b4894bc6df6fc529565566d","0ab1c9f4416998c497bd192d285bee2b5a04788691d5c9bc002fdb2296cccef0"],"145":["8f69979711c1718d7b1c149d25a83acf682e26636cd5afddd26d28f8858446c7","a065f2d8c8a1c804c870e2a2554a2f59cf015df66e103f1d13e60bfd0daa996f","e65cac2dc0127968756f8dec161a5698d165bef0b902173bb43b00f3dd556ee0","bd37610ca4c3d1a01d9905d70401053974abcfedea14ca605083a033d1bee9ca","275eea8e08a65fb9eae6871426878783e1ac5b4765175b63591672fb074f0ba1","c6a0c821567d57cebd0333a2098325dac2cca6a2ad6f24f22f6184552b93f8c8","511922dc7e23a53e0515f77a6fadf49fb68a74d9002000a21ffb47706e6a5a21","2eafe427c5a1109cf0a962d68bc4a79b3617519e9610b32559dcd3d365a559eb"],"152":["c837eb5dd34f3e0e46055755758a0fa914094b7455016d7bcc8991b0de016d5d","3feb10eb6f15477546493ef80292f850d3bf556cf6bb6833dea1c87c87f9c519","d7b1ac207a88c76b21d0c6d2bf674466ed954fb52aa0abead9feef65cc545665","b402c61f00406c5befc9584e1a946160edd9459b2bac57bc304d4803235363a3","b6fba75761f8c3e1cfa845976f832fa64ea11314f2e80ad01cb122607a55fe82","a55c17dd310b34673daf7f6c43f3cb8aae59e8676b49d5bc11474778bbe7483b","18b38b5915de063e7ec6d28c7e5e7aa171b7baebbbd4fb34590ff094c3d7b872","8a4261f11d01a17f9ff2523733dbbddbc78fa4bbf78919e7248cd2f90fd88e71"],"166":["2a7f67e768df8270bbaf83600f1cde213693fe1c60e63b1c5de2f26b50e7df4c","4657cdfd9eaf470edae7503ce334f3ed1059111c112c79ab0316e78e63d3d41d","f2987b29cd4f764dbc79b74f3f935e4bf8bdcf7a935417ddabe60bf3e8de7e0f","57ee71d2abb93ec0a6e1a22feb7a56c155caba2d8e4a2f022a69e977f7236f0d","418633ea380bcc0d37718c5484c734be4c7077806cb3b58c2dff32c3d8cf7346","36cfdd9e01a194d578a0cd4ca279f8c7ff811aea547faefa92bb6cd93de1a5a0","d8234e2e33084aa91a9b716202164a02ee0c3ad5116e59420e806ff9796e3c4d","3153f5fe8cc0eac157c550b7dc24c8108f486b4196b1f8db0de2f39442b549cb"],"173":["78d929005f70a0ad0b27d805e5427f791302c5b112b7fb616bdcf19b8446c1f8","62ca78814e4acaee6dd1e63828179bdc4fce168f5cb8eb531f473b8e1ecab3cb","6fe6482e4eb0d044879bacf9957696dc7d3784957e64e59058074aad0b4fedba","2bacaf791a8d8cf8a38cae4d602414af38238e5ed8e0305482251c1a6380b134","15c9b4092b5e2699f81eecf72173f023e2070f1040e544bbb5fdc48889b5cc29","fe17894f98ad9401f634368067561bd0351e2881ecadec1fff0b6b424c3b5bcd","364aa2f40ee8df0486614aee264b9842774f70c30364e9bc639cb905788144ea","5cb707fcb50a5e162102e3b062f91e16bb3ffe88cbf015728dbabbf1d18d7c82"],"180":["695435bd39027fe90223dd20489b049cc1236901aecfed311a0a656f567dc318","653ba3902f86b09935c2555acfd3bf8256427865e9d228c7b529ce1f48533d68","23d11ac2d70a1a5e53025191c2a139ce91f46ca1d6064ceb078ac6be3adc9152","1d9d3d746c4ac00acfa98d3edd3083d1d78d0da082648815fbce8727694e2f24","c5c633e74eaca479bb3fc0892a646b76e3e5aed80e9ed31015380eb3c5068122","f5a6f207fc8d04e384c31b49563fa149d4a33ec022a5e647f9cd1811e337d05c","d73ccaf00957e8035ca18972b262500a8a312ffcf8155ea598416beeeec40d9f","8b5973770275aa2ba159c3df4fe187ceeb2efe694e2d041f28285b26d2b1c92e"]};
 function selectStaticMalePunchSlots(player,o,a,visible){
  const d=o.direction,g=visible.gloves?.item,b=visible.boots?.item;
  const palette=Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original');
  const colors=palette&&(d==='north'&&[26,131,138,145,152,159,166,173,180].includes(g)||d==='south'&&([26,159].includes(g)||Object.hasOwn(southAdditionalPunchGloveFrames,g))&&Object.hasOwn(root.MareCharacterAppearance?.eyes||{},a.eyeColor))&&['original',undefined].includes(a.hair)&&
   ['original',undefined].includes(a.face)&&(d==='south'||['blue','original',undefined].includes(a.eyeColor))&&
   (!a.skin||a.skin==='original'||root.MareAppearance96?.skins[a.skin])&&(!a.hairColor||a.hairColor==='original'||root.MareAppearance96?.hairs[a.hairColor]);
  if(a.body!=='male'||!['north','south','east','west'].includes(d)||!['attack','attack-unarmed'].includes(o.action)||
     visible.torso?.item!==151||visible.pants?.item!==133||Object.keys(visible).length!==4||
     ![25,26,131,138,145,159,166,173,180,...(colors?[152]:[])].includes(g)||![8,134,141,148,162,169,176,183,...(colors?[155]:[])].includes(b)||palette&&!colors)return null;
  // Use the already selected visual authority for each slot: cannot promote a
  // hidden candidate or silently replace the G152 source of another exact kit.
  const options={...o,action:'attack-unarmed'};
  const as=(key,def)=>({...player,...(colors?{appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'}}:{}),equipment:{...player.equipment,[key]:{def}}});
  const upper=select(as(visible.boots.key,155),options),lower=b===155?outfitById.get(`frozen-male-pants133-${d}-attack-native-registration`):select(as(visible.gloves.key,152),options);
  const upperId=`frozen-male-glove${g}-${d}-attack-unarmed-native-layers`,lowerId=b===155?`frozen-male-pants133-${d}-attack-native-registration`:`frozen-male-boots${b}-${d}-attack-native-registration`;
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),raster=r=>[r.pack.frame,r.pack.pivot,r.pack.density],
   dir=(r)=>r?.pack?.directions?.[d],clock=({layers,...rest})=>rest;
  if(upper?.id!==upperId||lower?.id!==lowerId||!upper.frozenGloveLayers||!(b===155?lower.frozenPantsAttack:lower.frozenMaleBootAttack)||
     [upper,lower].some(r=>r.productionEnabled===false||r.hdKind&&r.hdKind!=='outfit'||r.body!=='male'||r.direction!==d||r.action!==options.action||
       r.approvedAppearance||r.colorAppearance||r.paletteSourceMasks||r.paletteRefs||r.mirrorX||r.mirrorLayerIDs||r.sourceRasterPadding||
       r.baseMaterialSources||r.headRecord||r.gearOnlyRecord||r.femaleNamedHairRecord||r.bodyOcclusion)||
     upper.sourceUpperRecord!==lower.sourceUpperRecord||!same(raster(upper),raster(lower))||!same(clock(dir(upper)),clock(dir(lower)))||
     upper.pack.frame.width!==160||upper.pack.frame.height!==160||upper.pack.density!==4||
     dir(upper).clip.frames!==8||dir(upper).clip.loop!==false||
     upper.equipment.gloves!==g||upper.equipment.boots!==155||lower.equipment.gloves!==152||lower.equipment.boots!==b||
     ![upper,lower].every(r=>same(r.registration?.lowerSourceCrop,[0,336,512,176])&&same(r.registration?.destination,[64,400])&&r.registration?.scale===1&&
        r.equipment.torso===151&&r.equipment.pants===133&&Object.keys(r.equipment).length===4)||
     !same(dir(upper).layers.map(l=>l.id),['same-native-outfit-with-original-uncovered-hands','registered-frozen-glove-native-attack'])||
     !same(dir(lower).layers.map(l=>l.id),['native-derived-exact-outfit'])||
     [upper,lower].some(r=>dir(r).layers.some(l=>l.binding?.kind!=='fixed'||l.frames?.length!==8||l.frames.some(x=>!/^[a-f0-9]{64}$/.test(x)))))return null;
  const equipment={torso:151,pants:133,gloves:g,boots:b};
  const slotRoutes=Object.fromEntries(Object.entries(visible).map(([slot,v])=>[v.key,{item:v.item,quality:'hd',source:slot==='boots'?lower.id:upper.id}]));
  let paletteParts,colorAppearance;
  if(colors){
   const provenGloveFrames=d==='south'?{...southAdditionalPunchGloveFrames,"26":["a95a40e3b6e7bdb90afd04b3aaf9ca41cc1e559bf7b80d40675c0ec25feaafc4","37aebe66202d0489ae65636dbf9978dd3d7c72ee89daa48f252c9431fa39f075","243f51c19eebf97323cb9e50c4cf031547d730655c82d8a3ac14b37127c50f32","b1338159f928a85252bc9ea44947aef587b4b016d2f9e8e382871eaf99b2a797","538d1349f90d7ec3a24fb26dbe3a76a068fd44e2e97c10dd0fcffa5100f2fc6e","8f08aef4503ea00f313359d8bc1cd7282ef47d1835de0f44d09c0b8f2e263cb8","d8032aef488ed60380fd9d75742798f8667eff59efb30a06503c29e0e9371f7f","991482dceb4eead38e18cf483ebc177289d0280f72a379ae347eac65bb9bfe13"],"159":["c32c5b11185ca4bf155538fea1e8b9fd56528fed9f567fb3ec279f72b9a7e338","9da135afa902befe83983d737e91319c830201254e8ea0c8b87dbce840a6a211","a05686ccb6bc117060c1474aa510f63a22ddd419c16416ef01dc0a1755ee5504","92d942b9cfefd1986cdb79ca0338696d1759c919db5a275876f8a45bcf6df6de","6d52dc7f30a9e13fbf5fed88e8d904c111f7164cb8a3e97a743ab98239aef6a8","584448ef68c66897253420d89b11f496fd5e27f8a995173cce2e6d260812d465","4b6fc512364864f617a8d9ad2a60546dc7cc8e081896cdb883e77a51221c13ea","4c5abe9709dca6fa5e73dd851b842d5cb9f5c46edec5892a6af8f5c1176751c4"]}:{
     "26": [
       "60966818a123a979695c5465f1bb9b307e2836a099b52be1c23ec1df02826973",
       "6b742afe6ae8cd905e19dedd222e0cc6db205fa14b91b3ae0ac3b4a54d28a1f6",
       "86682b4ff4e453495af7f5796ef72fc1765ddc86eb289c21f46f5aa14a8a2b5d",
       "b969076da7b278f35f4b3ba27a6fdbcb69350cf35d25a72980ca46d0e7264a99",
       "878c7fd33ffa44ef749e51422204213ff4bf1c449828fdb66ba0095dc292fc85",
       "a3f6ffcf8b71efcda24e5a1eaae418aacfe93df7287b01a3296d7d4a4c6e1501",
       "1bd502b1869120cbf0a69e8cfa90efd4068ef4288ac256837d9838d16080da8a",
       "2267aa9833a82b4aaeaea7e68af87f816a37ebfca425aa771072c5869a7740d5"
     ],
     "131": [
       "d3d21dae7052351d00da9d9a745af1ee157b427de11d22ea13b241cbd589f468",
       "c1e3434b1755a88b64808a9fb1c0a3400c8fec1da015ad51233174bcea47ff90",
       "023428f626b7e528c744cee425f65a4d5b2f316adebfcad779bf372f2d9720c8",
       "797c9a88647bedbcb315c427914a6f031c345b531fc3b812eefacb79aaad4a29",
       "89a49ac33689f8f07a72df4d20260a57148ef0a1b52905e21747097ebcc94336",
       "baa20b2583fdf770cfb2e08c89b1dc62790d028f01dd94b227b6961b6d0ca911",
       "99586cd2523beda81d285ba69a3e27974140f4f4af7304cb2d229936db988e95",
       "dd573a11cfd3dff8b1b62aabb39d827a6ad58ec796a0ad72de45cec1bbc57905"
     ],
     "138": [
       "e5d967a0b222f4e2b46442be7a0565c6b9975d639fcf9be7320f04f3069a9dc7",
       "12d8a2f4247b63264fd01db12f1416651ea1dac6ffcc23a8b14bc70520a9c94e",
       "71a490152d5aff972e580271511b16e3dbd89f4eda0c35a912c12b23beaff20e",
       "7bec68f7588a0106b742736afef64b2c2579338771b60608a940bf0dd81f84fc",
       "c00ac3290a33e5dbe8f3587ab86d839caf0f6dedbcaa2ed41b5f8a575a4b96c0",
       "5b5200e94c21e064051e1a9b6539fda4d5aa8b268021ea39c77eff8e840a6771",
       "729547e40db9440ba069958af40c16e00caeff3fb96f6ecb358b629f711b91da",
       "5881270019b8730ff7743d5b25a30766f02c75471dbd597a1f5479de07df88fb"
     ],
     "145": [
       "ad0374056de79c1392308633a068bcb5b7407bbec5400db1f93992403ae5639e",
       "9046e1f582f842954a354aa1110022a46b43eb48efc8eda1b77a5b1d0e1c6824",
       "69a7d354ec08ebd1761a36499975a1e74a9edab8c5e862c84269227bcbc8c8ff",
       "dd2371204d7fcd7a53e78835c5df1d75ffaba5798c7d854765a10f28e4a0ad99",
       "754d20c84b5d67faf166cf0decb1d7c2bccb9191445a89be19971eafdc510069",
       "360e9577fa9d5e4b54438f4c0818dfa9670ec2f2f7f2c636178ab6fa81a09e27",
       "0f4eb959f5be0b6b33387d183d400947dceeffe288f13590cf8779b736c4e8ea",
       "d1a17dcf136897a7be996359fc255ecf63bc8c57afeac26e18933aa5e40ce28e"
     ],
     "152": [
       "cd80fb1986827cdef48a65f6f6c96778148a9bc7307cb3a1a7a5d21ed12efbe1",
       "75c8aa95064cd91a4a720019d9e06c492e32ecd96ebc90a995c45c8320b49804",
       "20ed9a42791abad233651174dc64bece5b4aa6710b36d1c945a5e07f3d2aeee0",
       "d67518e92212b9733eac0ec0d9f93a10fa8a0570dad4d5d0b8b691a1be9b68b3",
       "d30b4abb9392f30180b680bbd0fb12002718bb742cea935ba0381f7f44229793",
       "ee31b389be7632f444e50d0c92d5361c2c356083074d38511f88168c92d61228",
       "ef8cfe129ce2e7fbfb9d26612d9de32ba34bca9101f8c916797a8ffba2b43c4f",
       "39f41c380371c93ccb10e784cd384ea4d637491c832551a0e8f498dee16314a2"
     ],
     "159": [
       "568c7bee4719a7ecc08f3108338bbb1b1b22b59bc4d400b8ae39df186d23e589",
       "71744f3753ea6b55fc0a389048773eb7a568766a207afd7636997482ccbf3749",
       "5b0a7c26d3ec0601ac94f5a7e065e533f5be55c45fea0aa3d161c59bef591d40",
       "cc112d4ec87d1fdf3685f9ba007a110010ecad12d215e70e7dd05f9b6b9e2d94",
       "886045e6c49c0380e1de96ce37d68abef72aae11c25982d02141909dfb14de85",
       "f2ff4a8e15b455ed4ff2c429ff4e9c8b369b77ce6bd598d3ebd02c601a6bf7a4",
       "b09f64a16d9b5916fcc2402f8610e93f072a8fc790c856c1c8bf9d146b5556fa",
       "4621e98da09174104d8e6d68c0562130fde192c376fc597abcf4f43a28e10323"
     ],
     "166": [
       "c6cdd4fc2e287454bc66376b42054e1a433716de09ba56ce70c6c890f361d143",
       "7b4492b7e6906ecae0cb1f58c49b69d63aeccc8088a430b38288409cd976d591",
       "8edd9c26a10fafb5742ef589e9f0206f6d659202e6d8624729b15565c8df2939",
       "540fab706fd1e01d269648d505701beccf02d0d99664b4c3bef99f412a65f8ab",
       "54f50736185b3315ba14ebd01d98b8ee7d01b31ecfee705485915a9d7fc5d9d5",
       "e9685ced7510083cc7797df35849bac566855365b097a9916c1b3901c3980d41",
       "02c7190e8729870666b311abfdd24d977de21edaf0128ed86fa0e2e771ecb71a",
       "4106907247cc51738e23005a8e7bd4bba51e18854693ba337a46c616be44169b"
     ],
     "173": [
       "2a499da6c540f02949ef9466533022ba71900967cada30f5d083060516497af4",
       "c6ebfa670185a65eec6d910ee3264b24d89d41c9c59221589801795fc0d80781",
       "5578ea92c9550c450a3a3ef46873dc437274ec0293b3f2b66979b6b6dd4aff15",
       "d02f894b15ab69de8f6d7f44c1495ae9566e81e4e993018d2bd86b3aa92c8c8f",
       "f1659724590567cee6856b9f9603085444a88d5651bed4345a370ce23b024ec3",
       "454623107a1d21325c4c9f4e9ef04c3f9023ba4aeff5612166b264ff6cdf8759",
       "e12f1c0502852ebc092489621b74a138dd65d94574a4797b2a83ec340cccaa37",
       "e6d7ccc4d3475a94c5934be1c47aa2319278321cae9a4442730b0abc7740c9d7"
     ],
     "180": [
       "4b8f2e2d8c1a8e8573d738b5dee50252f387efffa5e99f474fd644eb35916cb7",
       "82fb23ec13976fa3408dc4c0ab2a1c38ff2d5d437f33cda717fc3936bf6bd407",
       "631f6e910e47d5f7cb8575967f84af68bb70093c037bb1a574a799d018433dff",
       "420dbaa50cef8c16c3ae8c5faf43ef12ee86b6844ba14ec84d003263a3c308ca",
       "e3d1a17ef05f4aa92b648f242df63a6f1d197f9cbe79ae0d58e5663298dfa38b",
       "aaec55d5371fa7225fc2f8c8e2116f25428a1d5ec158a14767300ef0e919afa0",
       "33f8dbfc1ed575d55227740fbf5458422a7a278f06d445d61eb05c4374432a42",
       "c06f1210ce94e2057614deeaafb6b4d79f3bab94da429d4147f723ce22a950b3"
     ]
   };
   if(!same(dir(upper).layers[1].frames,provenGloveFrames[g]))return null;
   const source=outfitById.get(upper.sourceUpperRecord),rest=outfitById.get(lower.sourceLowerRecord),sd=dir(source),rd=dir(rest);
   const layers=sd?.layers?.filter(l=>l.id!=='gloves152-visible-native-overlay'),lowerOwner=rd?.layers.find(l=>l.id==='lower-redrawn');
   const lowerHash=lowerOwner?.frames?.[0];
   const face=sd?.layers.filter(l=>l.slot==='face'||l.slot==='iris');
   const verifiedSouth=d==='south'&&face?.length===1&&face[0].slot==='face'&&face[0].source===southPunchFace&&
     (!face[0].frames||face[0].frames.every(s=>s===southPunchFace))&&source.paletteSourceMasks?.[southPunchFace]?.skin===southPunchSkin;
   const pins=['skin-arms-phase','headBase','hair'];
   if(!sd||!rd||source.productionEnabled===false||rest.productionEnabled===false||source.body!=='male'||rest.body!=='male'||
     source.action!=='attack-unarmed'||rest.action!=='idle'||source.direction!==d||rest.direction!==d||
     !same(raster(source),raster(upper))||!same(clock(sd),clock(dir(upper)))||
     source.palettePolicy!=='verified-original-anatomy-only'||
     (d==='north'?face.length!==0:!verifiedSouth)||layers.length!==sd.layers.length-1||
     !pins.every(id=>{const l=layers.find(x=>x.id===id);return l&&(l.frames||[l.source]).every(h=>source.paletteSourceMasks?.[h]?.skin||(id==='hair'&&source.paletteSourceMasks?.[h]?.hair));})||
     rest.pack.density!==4||rest.pack.frame.width!==128||rest.pack.frame.height!==128||rd.clip.frames!==1||
     !lowerHash||lowerHash!==(d==='south'?'e6824bfdd43d71b8690f90b0dc7cc19caf6d38591b8c4611cc172ede83ec97b9':'053730953e48350059aa0c22f1f23e448838da8b20e32b4317613b2d64adbeb3')||
     root.MareNativeSkinHD?.ownership([lowerOwner])!=='mixed'||
     rd.layers.some(l=>l!==lowerOwner&&(l.frames||[l.source]).includes(lowerHash))||
     rest.equipment.boots!==b||rest.equipment.torso!==151||rest.equipment.pants!==133||
     rest.mirrorX||rest.mirrorLayerIDs||rest.sourceRasterPadding||rest.baseMaterialSources||rest.bodyOcclusion)return null;
   const pack=(r,...ls)=>({...r,pack:{...r.pack,directions:{[d]:{...dir(r),layers:ls}}}});
   colorAppearance={skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'};
   paletteParts={...(verifiedSouth?{strictSouthEyes:true}:{}),coloredUpper:pack(source,...layers),gloveOnly:{...pack(upper,dir(upper).layers[1]),paletteRefs:undefined},staticLower:{...rest,baseMaterialSources:{[lowerHash]:'mixed'}}};
  }
  return {...upper,colorAppearance,id:`partitioned-male-punch:${upper.id}:${lower.id}`,equipment,slotRoutes,omitted:[],layeredSlots:true,
   resolvedAction:options.action,partitionedMalePunch:{upper,lower,splitY:400,paletteParts}};
 }
 // The open B169 has a palette-sensitive gap at the authored pants hem.
 const standaloneFemaleNorthBoots=[8,9,134,141,148,155,162,176,183];
 function selectFemaleNorthBootsOnly(player,o,visible){
  const boot=visible.boots?.item;
  if(o.action!=='idle'||o.direction!=='north'||Object.keys(visible).length!==1||!standaloneFemaleNorthBoots.includes(boot)||
     boot!==9&&!root.MareCharacterAppearance?.skins?.[player.appearance96?.skinColor])return null;
  const body={...player,equipment:{...player.equipment,[visible.boots.key]:null}},
   base=select(body,o),coated=selectFemaleIdleBoots({...body,equipment:{coat:{def:151},boots:visible.boots.value}},o,
     {torso:{item:151,key:'coat'},boots:{...visible.boots,key:'boots'}});
  if(base?.sourceId!=='female-idle-original-north-from-walk0'||base.hdKind||base.body!=='female'||base.headRecord||base.gearOnlyRecord||
     !coated)return null;
  const reference=outfitById.get('female-torso151-north-frozen-idle-native'),
   d=base.pack.directions.north,r=reference?.pack.directions.north,
   eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!r||!['frame','pivot','density'].every(k=>eq(base.pack[k],reference.pack[k]))||
     [d.clip,r.clip].some(c=>c.frames!==1||c.loop!==false)||!eq(d.rest,r.rest)||!eq(d.poses,r.poses)||
     !eq(d.layers,r.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)}))))return null;
  const layers=coated.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+boot+'-')),
   fixedIdleBoots={base,layers};
  return describeSlots({...base,id:base.id+':bare-north-boot'+boot,equipment:{boots:boot},fixedIdleBoots},visible,[]);
 }
 function selectFemaleNorthBootOnPants(player,o,visible){
  if(o.action!=='idle'||o.direction!=='north'||Object.keys(visible).length!==2||
     !standaloneFemaleNorthBoots.includes(visible.boots?.item)||![168,182].includes(visible.pants?.item))return null;
  const boots=selectFemaleNorthBootsOnly({...player,equipment:{[visible.boots.key]:visible.boots.value}},o,{boots:visible.boots}),
   base=select({...player,equipment:{[visible.pants.key]:visible.pants.value}},o),d=base?.pack?.directions?.north;
  if(!boots?.fixedIdleBoots||!base?.authoredNorthIdlePants||base.equipment?.pants!==visible.pants.item||
     JSON.stringify(boots.pack)!==JSON.stringify(base.pack)||d?.clip.frames!==1||d.clip.loop!==false)return null;
  const {authoredNorthIdlePants,...look}=base,layers=boots.fixedIdleBoots.layers,boot=visible.boots.item;
  return describeSlots({...look,id:base.id+':fixed-north-idle-b'+boot,equipment:{pants:visible.pants.item,boots:boot},
    fixedIdleBoots:{base,layers}},visible,[]);
 }
 function selectFemaleIdleBoots(player,o,visible){
  const boots=visible.boots?.item,dir=o.direction;
  if(o.action!=='idle'||!['north','south'].includes(dir)||visible.torso?.item!==151||
     Object.keys(visible).length!==2||![8,9,134,141,148,155,162,169,176,183].includes(boots))return null;
  const base=select({...player,equipment:{...player.equipment,[visible.boots.key]:null}},o),
   ref=outfitById.get(`female-torso151-${dir}-frozen-idle-native`),
   anchor=outfitById.get(`frozen-v47-female-151-boot9-${dir}-idle`),
   donor=outfitById.get(`frozen-v47-female-151-boot${boots}-${dir}-idle`);
  if(base?.hdKind!=='outfit'||base.body!=='female'||base.equipment?.torso!==151||base.headRecord||base.gearOnlyRecord||
     !ref||!base.id.startsWith(ref.id)||!anchor?.frozenBootContract||!donor?.frozenBootContract||[anchor,donor].some(r=>r.productionEnabled===false))return null;
  // The authored Original South kit has a different upper occlusion. Keep
  // that registration intact; only compose against the exact saved-look base.
  if(dir==='south'){
   if(![176,183].includes(boots))return null;
   const raw=player.appearance96,c=base.colorAppearance;
   if(!c||c.hairStyle!=='original'||c.eyeStyle!=='original'||c.skinColor==='original'||
      c.skinColor!==(raw.skinColor??raw.skin)||!root.MareAppearance96?.skins?.[c.skinColor]||
      c.hairColor!==raw.hairColor||c.eyeColor!==raw.eyeColor)return null;
  }
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),d=base.pack.directions[dir],aa=anchor.pack.directions[dir],dd=donor.pack.directions[dir];
  const owns=(i,l)=>l.id.startsWith('boot'+i+'-');
  const core=(d,i)=>({...d,layers:d.layers.filter(l=>!owns(i,l))});
  const geometry=({frame,pivot,density})=>({frame,pivot,density});
  const layers=dd.layers.filter(l=>owns(boots,l)),expected=['left-front','left-rear','right-front','right-rear'];
  if(!eq(base.pack,ref.pack)||!eq(geometry(base.pack),geometry(donor.pack))||!eq(geometry(anchor.pack),geometry(donor.pack))||
     !eq(core(aa,9),core(dd,boots))||d.clip.frames!==1||d.clip.loop!==false||
     layers.length!==4||!expected.every(k=>layers.some(l=>l.id==='boot'+boots+'-'+k&&l.binding?.kind==='fixed'&&
       l.depth===(k.endsWith('rear')?-1:45)&&l.frames?.length===1&&l.frames.every(h=>/^[a-f0-9]{64}$/.test(h)))))return null;
  if(layers.some(l=>base.paletteSourceMasks?.[l.frames[0]]||base.baseMaterialSources?.[l.frames[0]]))return null;
  return describeSlots({...base,id:base.id+':fixed-'+dir+'-idle-b'+boots,equipment:{...base.equipment,boots},
   sourceRefs:[...new Set([...base.sourceRefs,...layers.flatMap(l=>l.frames)])],
   pack:{...base.pack,directions:{[dir]:{...d,layers:[...d.layers,...layers]}}}},visible,[]);
 }
 // Reuse the verified Original glove rigs. A differing static fallback never draws
 // when a proven lower-body frame exists at every tick of the active clip.
 const northGlovePaletteSources={
  26:['f985f4335bf337d0cbb0bf06a6d0ee13452ccd6402850e3608adb09166b18f0a','db7de3e5bdd7e6f89da3c203bf82c7fc540c97030ed66ad56748b856ff342840'],
  159:['17bf738b2cad863b0d0c69adfea222fc315a30b7eeac59d9f12f6facd4032dfd','bda8ee9688510e1485b4d0e102ebf8bff5f427845914ad1e27e29e5226ddce34'],
  166:['883f6a953d5c53264a18a2e1c643f67d6a4767cc281f3b8d546e15cc9a31d45c','7beed3eb98555b3f04866ceb4cce5d68adaf8aa381b78e1ecdb60add41acd416'],
  25:['fd1de38775295e8b487868365e8fbae337c29235c94a7f65aaf18a8f0478d39a', 'da332118e27be7d6c0d5d77f2307170df54a235e2de0fd20648861238219a216'],
  131:['b25687aaf3091f6d6181426492b3afd17250109857a9049b96ae90c953d21444', '99d92b2ded043aabba04f7058502840c5d92aee26263f286230942cae02edf67'],
  138:['d5359abf78c50a1c042fdae5fedc4fdf9d22453621663188c7d41bd736e6e47b', '5ea55c61f1906ae3eb063036afd90bceb61e305872982780385233a908e4c2c3'],
  145:['0a416a7ea2224d4e78d794ad169dd211d6639a28663a8fa2cc1fa188c2910e5d', 'd4245b2cc5856a634f59d8ef6ddbb36c3fb099156d9e0e26327df8398244358f'],
  173:['11d9aa7827f07f72e96c9c8859bdbab8ac0464600ef2d48566dac969e519510b', '1e08bd74d76e772034cc72464d7bf71754d4469e9e74d9be21a5006411d63a4d'],
  180:['bf312d58679b26e95562da837eb628c53191e47a59c80ccd2427b75be0f4fefc', 'f912b0cca5407653a7709721530a81ee7ff36d79d41ff0b343578492706c2397']
 };
 function selectNorthGlovePalette(o,a,visible){
  const action=o.action,item=visible.gloves?.item,idle=action==='idle',refs=northGlovePaletteSources[item],bare=visible.boots==null;
  if(!refs||a.body!=='male'||o.direction!=='north'||!['idle','walk'].includes(action)||
     Object.keys(visible).length!==(bare?3:4)||visible.torso?.item!==151||visible.pants?.item!==133||
     (bare?![25,26,131,138,145,159,166,173,180].includes(item):visible.boots.item!==155)||!Object.entries(a).some(([k,v])=>k!=='body'&&v!=null&&v!=='original')||
     a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)||
     a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor))return null;
  const get=id=>outfitById.get(id),r=get('frozen-male-glove'+item+'-north-'+action+'-native-layers'),
   frozen=get('frozen-male-pants133-north-'+action+'-v47'),
   boot9=get('male-coat151-pants133-gloves152-boots9-walk-north-source-v18'+(idle?'-idle-frame0':'')),
   authority=get('male-pants133-'+action+'-north-isolated-r2-coat151-native');
  const dir=x=>x?.pack?.directions?.north,d=dir(r),f=dir(frozen),b=dir(boot9),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  const gloves=[
   {id:'glove'+item+'-north-left',slot:'top',source:refs[0],depth:99.5,binding:{kind:'bone',a:'LEFT ELBOW',b:'LEFT ARM'}},
   {id:'glove'+item+'-north-right',slot:'top',source:refs[1],depth:99.5,binding:{kind:'bone',a:'RIGHT ELBOW',b:'RIGHT ARM'}}
  ];
  if(!r?.frozenGloveLayers||r.productionEnabled===false||r.sourceOutfitId!==frozen?.id||!frozen?.frozenPantsSource||
     r.body!=='male'||r.direction!=='north'||r.action!==action||!b||!d||!f||
     !same(r.equipment,{...frozen.equipment,gloves:item})||
     !['frame','pivot','density'].every(k=>same(r.pack[k],frozen.pack[k])&&same(r.pack[k],boot9.pack[k]))||
     !['rest','poses'].every(k=>same(d[k],f[k])&&same(d[k],b[k]))||
     !same(d.clip,idle?{frames:1,fps:1,loop:false}:{frames:16,fps:16,loop:true})||
     !same(d.layers.filter(l=>!l.id.startsWith('glove')),f.layers.filter(l=>!l.id.startsWith('glove')))||
     !same(d.layers.filter(l=>l.id.startsWith('glove')),gloves))return null;
  const lower=d.layers.find(l=>l.id==='lower-redrawn'),proof=b.layers.find(l=>l.id==='lower-redrawn'),effective=({source,...rest})=>rest;
  if(!lower||!proof||!same(d.clip,f.clip)||!same(d.clip,b.clip)||
     ![lower,proof].every(l=>l.frames?.length===d.clip.frames&&Array.from(l.frames).every(x=>/^[0-9a-f]{64}$/.test(x)))||
     !same(effective(lower),effective(proof)))return null;
  const pack={...r.pack,directions:{north:{...d,layers:d.layers.map(l=>l===lower?proof:l)}}};
  const record=northBootAppearance({...r,pack,canonicalNorthBootGloves:true},a,authority,boot9);
  if(!record)return null;
  const {canonicalNorthBootGloves,...verified}=record;
  const slots=Object.fromEntries(Object.values(visible).map(v=>[v.key,{item:v.item,quality:'hd',source:r.id}]));
  if(!bare)return {...verified,pack:r.pack,hdKind:'outfit',omitted:[],slotRoutes:slots};
  const own={'boot155-rear-mouth-0':-1,'boot155-shell-0':99,'boot155-rear-mouth-1':-1,'boot155-shell-1':99};
  const eligible=d.layers.filter(l=>l.id.startsWith('boot155-'));
  if(!same(eligible.map(l=>l.id),Object.keys(own))||eligible.some(l=>l.depth!==own[l.id]||
      l.binding?.kind!=='fixed'||l.depthTrack||l.atlas||l.alternates||l.frames?.length!==d.clip.frames||
      l.frames.some(h=>!r.sourceRefs.includes(h))||
      l.frames.some(h=>d.layers.some(v=>!eligible.includes(v)&&(v.frames||[v.source]).includes(h)))))return null;
  const {boots,...equipment}=r.equipment;
  const unbooted={...r.pack,directions:{...r.pack.directions,north:{...d,layers:d.layers.filter(l=>!eligible.includes(l))}}};
  return {...verified,id:verified.id+':unbooted',pack:unbooted,equipment,hdKind:'outfit',omitted:[],slotRoutes:slots};
 }
 // Use only pairs verified on their receiving trousers, never import P133 clothing.
 const northPantsVerifiedGloves={154:[25,26,131,138,145,159,166,173,180],161:[25,26,131,138,145,159,166,173,180],140:[25,26,131,138,145,159,166,173,180],147:[25,26,131,138,145,159,166,173,180],168:[25,26,131,138,145,159,166,173,180],175:[25,26,131,138,145,159,166,173,180],182:[25,26,131,138,145,159,166,173,180]};
 function selectNorthRegisteredPantsGlove(o,a,visible){
  const pants=visible.pants?.item,item=visible.gloves?.item;
  if(o.direction!=='north'||!['idle','walk'].includes(o.action)||!northPantsVerifiedGloves[pants]?.includes(item))return null;
  const base=selectRegisteredPantsBoot155(o,a,{...visible,gloves:{...visible.gloves,item:152}}),
        donor=selectNorthGlovePalette(o,a,{...visible,pants:{...visible.pants,item:133}});
  if(!base?.colorAppearance||!donor?.colorAppearance)return null;
  const b=base.pack.directions.north,g=donor.pack.directions.north,same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),
   geometry=({layers,...rest})=>rest,isG=l=>l.id.startsWith('glove'),isP=l=>l.id.startsWith('pants133-')||l.id.startsWith('pants'+pants+'-'),
   effective=l=>{if(!Array.isArray(l.frames)||l.frames.length!==b.clip.frames||!Array.from(l.frames).every(Boolean))return l;
     const {source,...rest}=l;return rest;},
   core=layers=>layers.filter(l=>!isG(l)&&!isP(l)).map(effective);
  const target=b.layers.filter(isG),pair=g.layers.filter(isG);
  if(target.length!==2||pair.length!==2||!['frame','pivot','density'].every(k=>same(base.pack[k],donor.pack[k]))||
     !same(geometry(b),geometry(g))||!same(core(b.layers),core(g.layers))||
     !['paletteSourceMasks','baseMaterialSources'].every(k=>same(base[k],donor[k]))||
     pair.some(l=>!donor.sourceRefs.includes(l.source)||base.sourceRefs.includes(l.source)||base.paletteSourceMasks[l.source]||base.baseMaterialSources[l.source]))return null;
  const layers=b.layers.map(l=>target.includes(l)?pair[target.indexOf(l)]:l);
  return {...base,id:base.id+':p'+pants+'-g'+item+'-owned:'+donor.id,equipment:{...base.equipment,gloves:item},
   pack:{...base.pack,directions:{...base.pack.directions,north:{...b,layers}}},
   sourceRefs:[...base.sourceRefs,...pair.map(l=>l.source)],
   slotRoutes:{...base.slotRoutes,[visible.gloves.key]:donor.slotRoutes[visible.gloves.key]}};
 }
 const northPunchGloveAuthority={
  25:["ea58c7d3d806651ac0419800fc80874fed2adca35fa31677bb3b0608dcbb1e40","487b549010a5b4ac30fe6cf6028d3ab08dc31cae0f748cda1cfc3a7d0e19702e","2f7a6533b1ab232e0161e53ccb22bcd5b7be791294971c60945744d613cc2334","123afde6e8e34768cb9e9569e7babc993d08a63da7819cfddb838db49f2f6e5e","d6a749560f9bd50e1c5f36d650a9c6ef6df897f2a6075bf4930525c00d1597a9","bd3c8fa936b3b67d39ceff859b2f3c81cb56cb0ed412b5009a67f50563006693","f136ddd5020896db93f242f7d9d14ce0e7fccc5cc7aafe8c032c99280f24450c","ac6ee7bb928e6409d02296832fcd051d0cbe69217be2bffc7540ccef7fa652aa"],
  152:["cd80fb1986827cdef48a65f6f6c96778148a9bc7307cb3a1a7a5d21ed12efbe1","75c8aa95064cd91a4a720019d9e06c492e32ecd96ebc90a995c45c8320b49804","20ed9a42791abad233651174dc64bece5b4aa6710b36d1c945a5e07f3d2aeee0","d67518e92212b9733eac0ec0d9f93a10fa8a0570dad4d5d0b8b691a1be9b68b3","d30b4abb9392f30180b680bbd0fb12002718bb742cea935ba0381f7f44229793","ee31b389be7632f444e50d0c92d5361c2c356083074d38511f88168c92d61228","ef8cfe129ce2e7fbfb9d26612d9de32ba34bca9101f8c916797a8ffba2b43c4f","39f41c380371c93ccb10e784cd384ea4d637491c832551a0e8f498dee16314a2"],
  26:["60966818a123a979695c5465f1bb9b307e2836a099b52be1c23ec1df02826973","6b742afe6ae8cd905e19dedd222e0cc6db205fa14b91b3ae0ac3b4a54d28a1f6","86682b4ff4e453495af7f5796ef72fc1765ddc86eb289c21f46f5aa14a8a2b5d","b969076da7b278f35f4b3ba27a6fdbcb69350cf35d25a72980ca46d0e7264a99","878c7fd33ffa44ef749e51422204213ff4bf1c449828fdb66ba0095dc292fc85","a3f6ffcf8b71efcda24e5a1eaae418aacfe93df7287b01a3296d7d4a4c6e1501","1bd502b1869120cbf0a69e8cfa90efd4068ef4288ac256837d9838d16080da8a","2267aa9833a82b4aaeaea7e68af87f816a37ebfca425aa771072c5869a7740d5"],
  131:["d3d21dae7052351d00da9d9a745af1ee157b427de11d22ea13b241cbd589f468","c1e3434b1755a88b64808a9fb1c0a3400c8fec1da015ad51233174bcea47ff90","023428f626b7e528c744cee425f65a4d5b2f316adebfcad779bf372f2d9720c8","797c9a88647bedbcb315c427914a6f031c345b531fc3b812eefacb79aaad4a29","89a49ac33689f8f07a72df4d20260a57148ef0a1b52905e21747097ebcc94336","baa20b2583fdf770cfb2e08c89b1dc62790d028f01dd94b227b6961b6d0ca911","99586cd2523beda81d285ba69a3e27974140f4f4af7304cb2d229936db988e95","dd573a11cfd3dff8b1b62aabb39d827a6ad58ec796a0ad72de45cec1bbc57905"],
  138:["e5d967a0b222f4e2b46442be7a0565c6b9975d639fcf9be7320f04f3069a9dc7","12d8a2f4247b63264fd01db12f1416651ea1dac6ffcc23a8b14bc70520a9c94e","71a490152d5aff972e580271511b16e3dbd89f4eda0c35a912c12b23beaff20e","7bec68f7588a0106b742736afef64b2c2579338771b60608a940bf0dd81f84fc","c00ac3290a33e5dbe8f3587ab86d839caf0f6dedbcaa2ed41b5f8a575a4b96c0","5b5200e94c21e064051e1a9b6539fda4d5aa8b268021ea39c77eff8e840a6771","729547e40db9440ba069958af40c16e00caeff3fb96f6ecb358b629f711b91da","5881270019b8730ff7743d5b25a30766f02c75471dbd597a1f5479de07df88fb"],
  145:["ad0374056de79c1392308633a068bcb5b7407bbec5400db1f93992403ae5639e","9046e1f582f842954a354aa1110022a46b43eb48efc8eda1b77a5b1d0e1c6824","69a7d354ec08ebd1761a36499975a1e74a9edab8c5e862c84269227bcbc8c8ff","dd2371204d7fcd7a53e78835c5df1d75ffaba5798c7d854765a10f28e4a0ad99","754d20c84b5d67faf166cf0decb1d7c2bccb9191445a89be19971eafdc510069","360e9577fa9d5e4b54438f4c0818dfa9670ec2f2f7f2c636178ab6fa81a09e27","0f4eb959f5be0b6b33387d183d400947dceeffe288f13590cf8779b736c4e8ea","d1a17dcf136897a7be996359fc255ecf63bc8c57afeac26e18933aa5e40ce28e"],
  159:["568c7bee4719a7ecc08f3108338bbb1b1b22b59bc4d400b8ae39df186d23e589","71744f3753ea6b55fc0a389048773eb7a568766a207afd7636997482ccbf3749","5b0a7c26d3ec0601ac94f5a7e065e533f5be55c45fea0aa3d161c59bef591d40","cc112d4ec87d1fdf3685f9ba007a110010ecad12d215e70e7dd05f9b6b9e2d94","886045e6c49c0380e1de96ce37d68abef72aae11c25982d02141909dfb14de85","f2ff4a8e15b455ed4ff2c429ff4e9c8b369b77ce6bd598d3ebd02c601a6bf7a4","b09f64a16d9b5916fcc2402f8610e93f072a8fc790c856c1c8bf9d146b5556fa","4621e98da09174104d8e6d68c0562130fde192c376fc597abcf4f43a28e10323"],
  166:["c6cdd4fc2e287454bc66376b42054e1a433716de09ba56ce70c6c890f361d143","7b4492b7e6906ecae0cb1f58c49b69d63aeccc8088a430b38288409cd976d591","8edd9c26a10fafb5742ef589e9f0206f6d659202e6d8624729b15565c8df2939","540fab706fd1e01d269648d505701beccf02d0d99664b4c3bef99f412a65f8ab","54f50736185b3315ba14ebd01d98b8ee7d01b31ecfee705485915a9d7fc5d9d5","e9685ced7510083cc7797df35849bac566855365b097a9916c1b3901c3980d41","02c7190e8729870666b311abfdd24d977de21edaf0128ed86fa0e2e771ecb71a","4106907247cc51738e23005a8e7bd4bba51e18854693ba337a46c616be44169b"],
  173:["2a499da6c540f02949ef9466533022ba71900967cada30f5d083060516497af4","c6ebfa670185a65eec6d910ee3264b24d89d41c9c59221589801795fc0d80781","5578ea92c9550c450a3a3ef46873dc437274ec0293b3f2b66979b6b6dd4aff15","d02f894b15ab69de8f6d7f44c1495ae9566e81e4e993018d2bd86b3aa92c8c8f","f1659724590567cee6856b9f9603085444a88d5651bed4345a370ce23b024ec3","454623107a1d21325c4c9f4e9ef04c3f9023ba4aeff5612166b264ff6cdf8759","e12f1c0502852ebc092489621b74a138dd65d94574a4797b2a83ec340cccaa37","e6d7ccc4d3475a94c5934be1c47aa2319278321cae9a4442730b0abc7740c9d7"],
  180:["4b8f2e2d8c1a8e8573d738b5dee50252f387efffa5e99f474fd644eb35916cb7","82fb23ec13976fa3408dc4c0ab2a1c38ff2d5d437f33cda717fc3936bf6bd407","631f6e910e47d5f7cb8575967f84af68bb70093c037bb1a574a799d018433dff","420dbaa50cef8c16c3ae8c5faf43ef12ee86b6844ba14ec84d003263a3c308ca","e3d1a17ef05f4aa92b648f242df63a6f1d197f9cbe79ae0d58e5663298dfa38b","aaec55d5371fa7225fc2f8c8e2116f25428a1d5ec158a14767300ef0e919afa0","33f8dbfc1ed575d55227740fbf5458422a7a278f06d445d61eb05c4374432a42","c06f1210ce94e2057614deeaafb6b4d79f3bab94da429d4147f723ce22a950b3"],
 };
 function selectNorthPunchB9(player,o,a,visible){
  const item=visible.gloves?.item;
  if(a.body!=='male'||o.direction!=='north'||!['attack','attack-unarmed'].includes(o.action)||
     Object.keys(visible).length!==4||visible.torso?.item!==151||visible.pants?.item!==133||
     visible.boots?.item!==9||![25,26,131,138,145,159,166,173,180].includes(item)||!['original',undefined].includes(a.hair)||
     !['original',undefined].includes(a.face)||!['original','blue',undefined].includes(a.eyeColor)||
     (a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))||
     (a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)))return null;
  const id='male-pants133-attack-unarmed-north-drawn8-candidate-boots9-isolated-candidate-coat151-existing-gloves152-visible-native-candidate';
  const donor=outfitById.get(`frozen-male-glove${item}-north-attack-unarmed-native-layers`),base=outfitById.get(id);
  const key=visible.gloves.key,opts={...o,action:'attack-unarmed'},
   proven=select({...player,equipment:{...player.equipment,[key]:{def:152}}},opts);
  const dir=r=>r?.pack?.directions?.north,d=dir(proven),ref=dir(base),g=dir(donor),
   same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),clock=({layers,...rest})=>rest;
  if(!base?.registeredMale151Gloves152||!donor?.frozenGloveLayers||donor.productionEnabled===false||donor.sourceUpperRecord!==id||
      !proven||proven.hdKind!=='outfit'||(proven.sourceId??proven.id)!==id||!d||!ref||!g||
      !same(proven.equipment,base.equipment)||!same(d,ref)||
      !same([proven.pack.frame,proven.pack.pivot,proven.pack.density],[donor.pack.frame,donor.pack.pivot,donor.pack.density])||
      !same(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||!same(clock(d),clock(g))||
      !same(proven.bootsOverlay,base.bootsOverlay)||!same(proven.bodyOcclusion,base.bodyOcclusion)||
      !same(proven.paletteSourceMasks,base.paletteSourceMasks)||proven.palettePolicy!=='verified-original-anatomy-only')return null;
  const old=d.layers.filter(l=>l.id==='gloves152-visible-native-overlay'),src=g.layers[1];
  const sh=northPunchGloveAuthority[item];
  if(old.length!==1||g.layers.length!==2||src?.id!=='registered-frozen-glove-native-attack'||!same(src.frames,sh)||
     item===25&&donor.frozenGloveSourceRef!=='ref-0605'||
     ![old[0],src].every(l=>l.slot==='foreground'&&l.depth===100&&!l.depthTrack&&same(l.binding,{kind:'fixed'})&&l.frames?.length===8)||
     sh.some(h=>!donor.sourceRefs.includes(h)||proven.sourceRefs.includes(h)||proven.paletteSourceMasks?.[h]))return null;
  const rearNames=['boot9-left-rear','boot9-right-rear'],rearHashes=['61af01b1dd542dc5ad05172d6d398d7cbfbc1a0ac73b2e2b5c22d69e37913304','3a427f965f64b3a3b256df5f78d42463ea6f6ed64eae343af5f186716f010eb5'];
  const rear=d.layers.filter(l=>rearNames.includes(l.id)),pants=d.layers.find(l=>l.id==='pants133-translated-candidate');
  if(!same(rear.map(l=>l.id),rearNames)||!same(rear.map(l=>l.source),rearHashes)||!rear.every(l=>l.slot==='body'&&l.depth===2.5&&!l.frames&&same(l.binding,{kind:'fixed'}))||
    pants?.depth!==2||d.layers.some(l=>l!==pants&&l.depth>1&&l.depth<2.5)||!same(proven.bodyOcclusion,{layerId:'skin-arms-phase',belowPhysicalY:400,reason:'Clothed lower legs replace naked calves; upper body and all source PNG bytes retained'}))return null;
  // Behind the trousers only for these proved glove routes; the front and sole are untouched.
  const layers=d.layers.map(l=>l===old[0]?src:rear.includes(l)?{...l,depth:1.5}:l),{registeredMale151Gloves152,gloveRegistration,sourceGloveOutfitId,...record}=proven;
  return {...record,id:record.id+':own-north-punch-g'+item+'-b9',equipment:{...record.equipment,gloves:item},
   pack:{...record.pack,directions:{...record.pack.directions,north:{...d,layers}}},
   sourceRefs:[...new Set(layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))],
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='gloves'?donor.id:base.id}])),
   omitted:[],resolvedAction:opts.action};
 }
 function selectSouthPunchBare(o,a,visible){
  const item=visible.gloves?.item,noCoat=visible.torso==null;
  if(a.body!=='male'||o.direction!=='south'||!['attack','attack-unarmed'].includes(o.action)||
     Object.keys(visible).length!==(noCoat?2:3)||(noCoat?![26,131,138,145,152,159,166,173,180].includes(item):visible.torso.item!==151)||visible.pants?.item!==133||![26,131,138,145,152,159,166,173,180].includes(item)||
     !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||!strictSouthRequested(a))return null;
  const id='male-pants133-attack-unarmed-south-drawn8-candidate',bare=outfitById.get(id),base=outfitById.get(id+'-coat151-native'),
   donor=outfitById.get(`frozen-male-glove${item}-south-attack-unarmed-native-layers`),src=outfitById.get(id+'-boots9-isolated-candidate-coat151-south-registered-gloves152-visible-native-candidate');
  if(![bare,base,donor,src].every(r=>r&&r.productionEnabled!==false&&r.body==='male'&&r.direction==='south'&&r.action==='attack-unarmed')||
     !donor.frozenGloveLayers||donor.sourceUpperRecord!==src.id||base.bodyOcclusion||bare.bodyOcclusion||
     ![bare,base,src].every(r=>r.palettePolicy==='verified-original-anatomy-only'))return null;
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=x=>x.pack.directions.south,
   geom=({layers,...rest})=>rest,d=dir(base),parts=dir(donor).layers,l=parts[1],raster=r=>[r.pack.frame,r.pack.density,r.pack.pivot];
  if(![bare,donor,src].every(r=>eq(raster(r),raster(base))&&eq(geom(dir(r)),geom(d)))||
     !eq(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||
     !eq(base.equipment,{pants:133,torso:151})||!eq(donor.equipment,{torso:151,pants:133,gloves:item,boots:155})||
     !eq(d.layers,dir(src).layers.filter(l=>!l.id.startsWith('boot9-')&&l.id!=='gloves152-visible-native-overlay'))||
     !eq(dir(bare).layers,d.layers.filter(l=>l.id!=='coat151-registered-south'))||
     ![bare,src].every(r=>eq(base.paletteSourceMasks,r.paletteSourceMasks))||parts.length!==2||
     l?.id!=='registered-frozen-glove-native-attack'||l.slot!=='foreground'||l.depth!==100||l.depthTrack||!eq(l.binding,{kind:'fixed'}))return null;
  const authority=item===159?["c32c5b11185ca4bf155538fea1e8b9fd56528fed9f567fb3ec279f72b9a7e338","9da135afa902befe83983d737e91319c830201254e8ea0c8b87dbce840a6a211","a05686ccb6bc117060c1474aa510f63a22ddd419c16416ef01dc0a1755ee5504","92d942b9cfefd1986cdb79ca0338696d1759c919db5a275876f8a45bcf6df6de","6d52dc7f30a9e13fbf5fed88e8d904c111f7164cb8a3e97a743ab98239aef6a8","584448ef68c66897253420d89b11f496fd5e27f8a995173cce2e6d260812d465","4b6fc512364864f617a8d9ad2a60546dc7cc8e081896cdb883e77a51221c13ea","4c5abe9709dca6fa5e73dd851b842d5cb9f5c46edec5892a6af8f5c1176751c4"]:item!==26?southAdditionalPunchGloveFrames[item]:['a95a40e3b6e7bdb90afd04b3aaf9ca41cc1e559bf7b80d40675c0ec25feaafc4','37aebe66202d0489ae65636dbf9978dd3d7c72ee89daa48f252c9431fa39f075','243f51c19eebf97323cb9e50c4cf031547d730655c82d8a3ac14b37127c50f32','b1338159f928a85252bc9ea44947aef587b4b016d2f9e8e382871eaf99b2a797','538d1349f90d7ec3a24fb26dbe3a76a068fd44e2e97c10dd0fcffa5100f2fc6e','8f08aef4503ea00f313359d8bc1cd7282ef47d1835de0f44d09c0b8f2e263cb8','d8032aef488ed60380fd9d75742798f8667eff59efb30a06503c29e0e9371f7f','991482dceb4eead38e18cf483ebc177289d0280f72a379ae347eac65bb9bfe13'];
  if(!eq(l.frames,authority)||authority.some(h=>!donor.sourceRefs.includes(h)||base.sourceRefs.includes(h)||base.paletteSourceMasks?.[h]))return null;
  const target=noCoat?bare:base,dirTarget=dir(target);
  const pack={...target.pack,directions:{...target.pack.directions,south:{...dirTarget,layers:[...dirTarget.layers,l]}}};
  const next={...target,id:target.id+(noCoat?':own-p133-g'+item+'-south-no-coat':':own-south-punch-g'+item+'-bare'),hdKind:'outfit',equipment:{...target.equipment,gloves:item},pack,sourceRefs:[...target.sourceRefs,...authority],
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='gloves'?donor.id:target.id}])),omitted:[],resolvedAction:'attack-unarmed'};
  return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(next,{...a,hair:'original',face:'original'})||null;
 }
 function selectNorthPunchBare(o,a,visible){
  const item=visible.gloves?.item,noCoat=visible.torso==null;
  if(a.body!=='male'||o.direction!=='north'||!['attack','attack-unarmed'].includes(o.action)||
     Object.keys(visible).length!==(noCoat?2:3)||(noCoat?![25,26,131,138,145,152,159,166,173,180].includes(item):visible.torso.item!==151)||visible.pants?.item!==133||![25, 26, 131, 138, 145, 152, 159, 166, 173, 180].includes(item)||
     !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||!['original','blue',undefined].includes(a.eyeColor)||
     (a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))||
     (a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)))return null;
  const id='male-pants133-attack-unarmed-north-drawn8-candidate',bare=outfitById.get(id),base=outfitById.get(id+'-coat151-native'),
   donor=outfitById.get(`frozen-male-glove${item}-north-attack-unarmed-native-layers`),src=outfitById.get(id+'-boots9-isolated-candidate-coat151-existing-gloves152-visible-native-candidate');
  if(![bare,base,donor,src].every(r=>r&&r.productionEnabled!==false&&r.body==='male'&&r.direction==='north'&&r.action==='attack-unarmed')||
     !donor.frozenGloveLayers||donor.sourceUpperRecord!==src.id||item===25&&donor.frozenGloveSourceRef!=='ref-0605'||base.bodyOcclusion||bare.bodyOcclusion||
     ![bare,base,src].every(r=>r.palettePolicy==='verified-original-anatomy-only'))return null;
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=x=>x.pack.directions.north,
   geom=({layers,...rest})=>rest,d=dir(base),parts=dir(donor).layers,l=parts[1],raster=r=>[r.pack.frame,r.pack.density,r.pack.pivot];
  if(![bare,donor,src].every(r=>eq(raster(r),raster(base))&&eq(geom(dir(r)),geom(d)))||
     !eq(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||
     !eq(base.equipment,{pants:133,torso:151})||!eq(donor.equipment,{torso:151,pants:133,gloves:item,boots:155})||
     !eq(d.layers,dir(src).layers.filter(l=>!l.id.startsWith('boot9-')&&l.id!=='gloves152-visible-native-overlay'))||
     !eq(dir(bare).layers,d.layers.filter(l=>l.id!=='coat151-authored-attack'))||
     ![bare,src].every(r=>eq(base.paletteSourceMasks,r.paletteSourceMasks))||parts.length!==2||
     l?.id!=='registered-frozen-glove-native-attack'||l.slot!=='foreground'||l.depth!==100||l.depthTrack||!eq(l.binding,{kind:'fixed'}))return null;
  const authority=northPunchGloveAuthority[item];
  if(!eq(l.frames,authority)||authority.some(h=>!donor.sourceRefs.includes(h)||base.sourceRefs.includes(h)||base.paletteSourceMasks?.[h]))return null;
  const target=noCoat?bare:base,dirTarget=dir(target);
  const pack={...target.pack,directions:{...target.pack.directions,north:{...dirTarget,layers:[...dirTarget.layers,l]}}};
  const next={...target,id:target.id+(noCoat?':own-p133-g'+item+'-north-no-coat':':own-north-punch-g'+item+'-bare'),hdKind:'outfit',equipment:{...target.equipment,gloves:item},pack,sourceRefs:[...target.sourceRefs,...authority],
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='gloves'?donor.id:target.id}])),omitted:[],resolvedAction:'attack-unarmed'};
  return {...next,id:next.id+':palette:'+String(a.skin||'original')+':'+String(a.hairColor||'original'),
   colorAppearance:{skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'}};
 }
 function selectSouthPunchP22Coat(o,a,visible){
  const g=visible.gloves?.item,noCoat=visible.torso==null;
  if(a.body!=='male'||o.direction!=='south'||!['attack','attack-unarmed'].includes(o.action)||
     (noCoat?![26,131,138,145,152,159,166,173,180].includes(g):visible.torso.item!==151)||visible.pants?.item!==22||Object.keys(visible).length!==(noCoat?2:g!=null?3:2)||
     (g!=null&&![26,131,138,145,152,159,166,173,180].includes(g))||!strictSouthRequested(a))return null;
  const id='male-pants133-attack-unarmed-south-drawn8-candidate',reference=outfitById.get(id),coat=outfitById.get(id+'-coat151-native'),
    pants=outfitById.get('male-pants22-attack-unarmed-south');
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=x=>x.pack?.directions?.south,
    context=({layers,...rest})=>rest,frame=x=>[x.pack.frame,x.pack.pivot,x.pack.density];
  if(![pants,reference,coat].every(x=>x&&x.productionEnabled!==false&&x.body==='male'&&x.direction==='south'&&x.action==='attack-unarmed'&&
        x.palettePolicy==='verified-original-anatomy-only'&&!x.bodyOcclusion&&!x.sourceRasterPadding&&eq(x.paletteSourceMasks,reference.paletteSourceMasks)&&
        eq(frame(x),frame(reference))&&eq(context(dir(x)),context(dir(reference))))||
     !eq(dir(pants).clip,{frames:8,fps:12,loop:false,contactFrame:4})||
     !eq(pants.equipment,{pants:22})||!eq(reference.equipment,{pants:133})||!eq(coat.equipment,{pants:133,torso:151})||
     pants.adaptation?.targetGeometry!==id)return null;
  const originals=dir(pants).layers,current=dir(reference).layers,donor=dir(coat).layers,
   own=originals.filter(l=>l.id==='pants22-independent-candidate'),clothe=donor.filter(l=>l.id==='coat151-registered-south');
  if(own.length!==1||clothe.length!==1||!eq(originals.filter(l=>l!==own[0]),current.filter(l=>l.id!=='pants133-translated-candidate'))||
     !eq(donor.filter(l=>l!==clothe[0]),current)||own[0].depth!==2||own[0].frames?.length!==8||new Set(own[0].frames).size!==8||
     clothe[0].depth!==100||clothe[0].frames?.length!==8||clothe[0].frames.some(h=>!coat.sourceRefs.includes(h)||pants.paletteSourceMasks[h])||
     ![own[0],clothe[0]].every(l=>eq(l.binding,{kind:'fixed'})&&!l.depthTrack)||
     own[0].frames.some(h=>!pants.sourceRefs.includes(h)||pants.paletteSourceMasks[h])||pants.paletteSourceMasks[clothe[0].source])return null;
  const gloveRecord=g!=null?selectSouthPunchBare(o,a,{...visible,pants:{...visible.pants,item:133},...(noCoat?{torso:{item:151,key:'torso'}}:{})}):null;
  if(g!=null&&!gloveRecord)return null;
  const extra=gloveRecord?dir(gloveRecord).layers.filter(l=>l.id==='registered-frozen-glove-native-attack'):[];
  if(gloveRecord&&(extra.length!==1||!eq(dir(gloveRecord).layers.filter(l=>l!==extra[0]),donor)))return null;
  const coats=noCoat?[]:clothe, layers=[...originals,...coats,...extra], pack={...pants.pack,directions:{...pants.pack.directions,south:{...dir(pants),layers}}};
  const record={...pants,id:pants.id+(noCoat?':own-p22-g'+g+'-south-no-coat':':own-south-punch-p22-c151'+(gloveRecord?'-g'+g:'')),hdKind:'outfit',pack,equipment:{pants:22,...(noCoat?{}:{torso:151}),...(gloveRecord?{gloves:g}:{})},
   sourceRefs:[...pants.sourceRefs,...coats.flatMap(l=>l.frames),...extra.flatMap(l=>l.frames)],resolvedAction:'attack-unarmed',omitted:[],
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='gloves'?gloveRecord.slotRoutes[v.key].source:k==='torso'?coat.id:pants.id}]))};
  return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(record,{...a,hair:'original',face:'original'})||null;
 }
 function selectNorthPunchP22Coat(o,a,visible){
  const g=visible.gloves?.item,noCoat=visible.torso==null,d=o.direction,action=['attack','attack-unarmed'].includes(o.action)?'attack-unarmed':o.action;
  if(a.body!=='male'||d!=='north'||action!=='attack-unarmed'||visible.pants?.item!==22||(noCoat?![25,26,131,138,145,152,159,166,173,180].includes(g):visible.torso.item!==151)||Object.keys(visible).length!==(noCoat?2:g!=null?3:2)||(g!=null&&![25,26,131,138,145,152,159,166,173,180].includes(g))||
     !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||
     !['original','blue',undefined].includes(a.eyeColor)||
     (a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))||
     (a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)))return null;
  const id=`male-pants133-attack-unarmed-north-drawn8-candidate`,
   base=outfitById.get(`male-pants22-${action}-${d}`),ref=outfitById.get(id),coat=outfitById.get(id+'-coat151-native');
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=r=>r.pack?.directions?.[d],
   context=({layers,...rest})=>rest,frame=r=>[r.pack.frame,r.pack.pivot,r.pack.density];
  if(![base,ref,coat].every(r=>r&&r.productionEnabled!==false&&r.body==='male'&&r.direction===d&&r.action===action&&
        r.palettePolicy==='verified-original-anatomy-only'&&r.paletteSourceMasks&&!r.bodyOcclusion&&!r.sourceRasterPadding&&
        eq(r.paletteSourceMasks,base.paletteSourceMasks)&&dir(r)&&eq(frame(r),frame(base))&&eq(context(dir(r)),context(dir(base))))||
     !eq(base.equipment,{pants:22})||!eq(ref.equipment,{pants:133})||!eq(coat.equipment,{pants:133,torso:151})||
     base.adaptation?.sourceManifest!=='87d85db3bb42067425f9ff6f93faf7a2ea95e57b2352697a5af6513cbc32f205')return null;
  const clip={frames:8,fps:12,loop:false,contactFrame:4};
  const b=dir(base),q=dir(ref),c=dir(coat),owned=b.layers.filter(l=>l.id==='pants22-independent-candidate'),garment=c.layers.filter(l=>l.id.startsWith('coat151-'));
  if(!eq(b.clip,clip)||owned.length!==1||owned[0].frames?.length!==clip.frames||new Set(owned[0].frames).size!==clip.frames||
     owned[0].binding?.kind!=='fixed'||owned[0].depth!==2||base.adaptation.targetGeometry!==id||
     !eq(b.layers.filter(l=>l!==owned[0]),q.layers.filter(l=>!l.id.startsWith('pants133-')&&!l.id.startsWith('own133-')))||
     !eq(c.layers.filter(l=>!garment.includes(l)),q.layers)||
     garment.length!==1||
     [...owned[0].frames,...garment.flatMap(l=>l.frames||[l.source])].some(h=>base.paletteSourceMasks[h])||
     owned[0].frames.some(h=>!base.sourceRefs.includes(h))||garment.some(l=>!(l.frames||[l.source]).every(h=>coat.sourceRefs.includes(h))))return null;
  const glove=g!=null?selectNorthPunchBare(o,a,{...visible,pants:{...visible.pants,item:133},...(noCoat?{torso:{item:151,key:'torso'}}:{})}):null;
  if(g!=null&&!glove)return null;
  const extra=glove?dir(glove).layers.filter(l=>l.id==='registered-frozen-glove-native-attack'):[];
  if(glove&&(extra.length!==1||!eq(dir(glove).layers.filter(l=>l!==extra[0]),c.layers)))return null;
  const coatLayers=noCoat?[]:garment;
  const out={...base,id:base.id+(noCoat?':own-p22-g'+g+'-north-no-coat':':own-p22-c151:'+d+':'+action+(glove?'-g'+g:'')),hdKind:'outfit',
   equipment:{pants:22,...(noCoat?{}:{torso:151}),...(glove?{gloves:g}:{})},resolvedAction:action,
   sourceRefs:[...new Set([...base.sourceRefs,...coatLayers.flatMap(l=>l.frames||[l.source]),...extra.flatMap(l=>l.frames)])],
   pack:{...base.pack,directions:{...base.pack.directions,[d]:{...b,layers:[...b.layers,...coatLayers,...extra]}}},
   omitted:[],slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='torso'?coat.id:k==='gloves'?glove.slotRoutes[v.key].source:base.id}]))};
  return {...out,id:out.id+':palette:'+String(a.skin||'original')+':'+String(a.hairColor||'original'),
   colorAppearance:{skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'}};
 }
 function selectNorthPunchP22OwnCoats(player,o,a,visible){
  const item=visible.torso?.item,g=visible.gloves?.item;
  if(a.body!=='male'||o.direction!=='north'||!['attack','attack-unarmed'].includes(o.action)||
     visible.pants?.item!==22||![6,7].includes(item)||(g!=null&&g!==26)||Object.keys(visible).length!==(g===26?3:2)||
     !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||
     !['original','blue',undefined].includes(a.eyeColor)||
     (!g&&Object.entries(a).every(([k,v])=>k==='body'||v==null||v==='original'))||
     (a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))||
     (a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)))return null;
  const {gloves,...unguarded}=visible,origin=selectCoatsOnRegisteredPants(player,o,{body:'male'},unguarded);
  const base=outfitById.get('male-pants22-attack-unarmed-north'),auth=outfitById.get(`male-torso${item}-north-frozen-attack-native-candidate`);
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=r=>r?.pack?.directions?.north,good=r=>r&&r.body==='male'&&r.action==='attack-unarmed'&&r.direction==='north'&&r.productionEnabled!==false;
  if(![base,auth,origin].every(good)||!eq(origin.equipment,{torso:item,pants:22})||base.bodyOcclusion||
    base.palettePolicy!=='verified-original-anatomy-only'||!eq(origin.paletteSourceMasks,base.paletteSourceMasks)||
    !eq(origin.sourceRasterPadding,auth.sourceRasterPadding)||!auth.sourceRasterPadding||
    !eq(dir(base).clip,{frames:8,fps:12,loop:false,contactFrame:4})||!eq(dir(origin).clip,dir(base).clip))return null;
  const b=dir(base),p=dir(origin),s=dir(auth),extra=s.layers.filter(l=>!l.id.startsWith('base:'));
  const anatomy=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!k.startsWith('cloth:')));
  if(!eq(p.rest,s.rest)||!eq(p.poses,s.poses)||!eq(anatomy(p.rest),b.rest)||!eq(p.poses.map(anatomy),b.poses)||
     extra.length!==(item===6?4:6)||extra.some(l=>l.depth>100||l.depthTrack||l.frames||l.binding?.kind!=='rigid'||!l.binding.a.startsWith('cloth:')||!l.binding.b.startsWith('cloth:')||
      !auth.sourceRefs.includes(l.source)||base.paletteSourceMasks[l.source]||!eq(auth.sourceRasterPadding[l.source],{sourceSize:512,offset:64})))return null;
  const preserved=p.layers.filter(l=>!extra.includes(l)).map(l=>({...l,id:l.id.replace(/^base:/,'')}));
  if(!eq(preserved,b.layers)||!eq(p.layers.filter(l=>extra.includes(l)),extra))return null;
  const anchor=g===26?selectNorthPunchP22Coat(o,a,{pants:visible.pants,gloves:visible.gloves}):null;
  const glove=anchor?dir(anchor).layers.filter(l=>l.id==='registered-frozen-glove-native-attack'):[];
  if(g===26&&(!anchor?.id.includes(':own-p22-g26-north-no-coat:')||glove.length!==1||!eq(dir(anchor).layers.filter(l=>l!==glove[0]),b.layers)||
      glove[0].depth!==100||glove[0].frames?.length!==8||glove[0].frames.some(h=>auth.sourceRasterPadding[h]||base.paletteSourceMasks[h])))return null;
  const layers=[...b.layers,...extra,...glove],equipment={pants:22,torso:item,...(g===26?{gloves:26}:{})},pack={...base.pack,directions:{north:{...b,rest:p.rest,poses:p.poses,layers}}};
  return {...base,id:base.id+':own-p22-c'+item+(g===26?'-g26':'')+'-north-punch:palette:'+String(a.skin||'original')+':'+String(a.hairColor||'original'),hdKind:'outfit',
   pack,equipment,sourceRasterPadding:auth.sourceRasterPadding,
   sourceRefs:[...new Set([...base.sourceRefs,...extra.map(l=>l.source),...glove.flatMap(l=>l.frames)])],
   colorAppearance:{skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'},omitted:[],resolvedAction:'attack-unarmed',
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='torso'?auth.id:k==='gloves'?anchor.slotRoutes[v.key].source:base.id}]))};
 }
 function selectSouthPunchP22OwnCoatsG26(player,o,a,visible){
  const item=visible.torso?.item,g=visible.gloves?.item;
  if(a.body!=='male'||o.direction!=='south'||!['attack','attack-unarmed'].includes(o.action)||
     visible.pants?.item!==22||![6,7].includes(item)||g!==26||Object.keys(visible).length!==3||
     !['original',undefined].includes(a.hair)||!['original',undefined].includes(a.face)||
     !strictSouthRequested(a)||
     (a.skin&&a.skin!=='original'&&!Object.hasOwn(root.MareAppearance96?.skins||{},a.skin))||
     (a.hairColor&&a.hairColor!=='original'&&!Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)))return null;
  const {gloves,...unguarded}=visible,origin=selectCoatsOnRegisteredPants(player,o,{body:'male'},unguarded);
  const base=outfitById.get('male-pants22-attack-unarmed-south'),auth=outfitById.get(`male-torso${item}-south-frozen-attack-native-candidate`);
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),dir=r=>r?.pack?.directions?.south,good=r=>r&&r.body==='male'&&r.action==='attack-unarmed'&&r.direction==='south'&&r.productionEnabled!==false;
  if(![base,auth,origin].every(good)||!eq(origin.equipment,{torso:item,pants:22})||base.bodyOcclusion||
    base.palettePolicy!=='verified-original-anatomy-only'||!eq(origin.paletteSourceMasks,base.paletteSourceMasks)||
    !eq(origin.sourceRasterPadding,auth.sourceRasterPadding)||!auth.sourceRasterPadding||
    !eq(dir(base).clip,{frames:8,fps:12,loop:false,contactFrame:4})||!eq(dir(origin).clip,dir(base).clip))return null;
  const b=dir(base),p=dir(origin),s=dir(auth),extra=s.layers.filter(l=>!l.id.startsWith('base:'));
  const anatomy=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!k.startsWith('cloth:')));
  if(!eq(p.rest,s.rest)||!eq(p.poses,s.poses)||!eq(anatomy(p.rest),b.rest)||!eq(p.poses.map(anatomy),b.poses)||
     extra.length!==(item===6?8:7)||extra.some(l=>l.depth>100||l.depthTrack||l.frames||l.binding?.kind!=='rigid'||!l.binding.a.startsWith('cloth:')||!l.binding.b.startsWith('cloth:')||
      !auth.sourceRefs.includes(l.source)||base.paletteSourceMasks[l.source]||!eq(auth.sourceRasterPadding[l.source],{sourceSize:512,offset:64})))return null;
  const preserved=p.layers.filter(l=>!extra.includes(l)).map(l=>({...l,id:l.id.replace(/^base:/,'')}));
  if(!eq(preserved,b.layers)||!eq(p.layers.filter(l=>extra.includes(l)),extra))return null;
  const anchor=selectSouthPunchP22Coat(o,a,{...visible,torso:{...visible.torso,item:151}});
  const glove=anchor?dir(anchor).layers.filter(l=>l.id==='registered-frozen-glove-native-attack'):[];
  if(g===26&&(!anchor?.id.includes(':own-south-punch-p22-c151-g26:')||glove.length!==1||!eq(dir(anchor).layers.filter(l=>l!==glove[0]&&l.id!=='coat151-registered-south'),b.layers)||
      glove[0].depth!==100||glove[0].frames?.length!==8||glove[0].frames.some(h=>auth.sourceRasterPadding[h]||base.paletteSourceMasks[h])))return null;
  const layers=[...b.layers,...extra,...glove],equipment={pants:22,torso:item,...(g===26?{gloves:26}:{})},pack={...base.pack,directions:{south:{...b,rest:p.rest,poses:p.poses,layers}}};
  const record={...base,id:base.id+':own-p22-c'+item+'-g26-south-punch',hdKind:'outfit',
   pack,equipment,sourceRasterPadding:auth.sourceRasterPadding,
   sourceRefs:[...new Set([...base.sourceRefs,...extra.map(l=>l.source),...glove.flatMap(l=>l.frames)])],
   colorAppearance:{skin:a.skin||'original',hairColor:a.hairColor||'original',eyeColor:a.eyeColor||'original'},omitted:[],resolvedAction:'attack-unarmed',
   slotRoutes:Object.fromEntries(Object.entries(visible).map(([k,v])=>[v.key,{item:v.item,quality:'hd',source:k==='torso'?auth.id:k==='gloves'?anchor.slotRoutes[v.key].source:base.id}]))};
  return root.MareReworkModularOutfitsHD?.withStrictSouthAppearance(record,{...a,hair:'original',face:'original'})||null;
 }
 function selectLayered(player,o={}){
  if(state!=='ready'||!player||player.__reworkSubset||player.zoanTransformed||slotEntry(player.equipment?.visual_completo))return null;
  const raw=player.appearance96||{},body={masculino:'male',feminino:'female',male:'male',female:'female'}[raw.gender??raw.body];
  if(!body)return null;
  for(const [x,y]of [['gender','body'],['hairStyle','hair'],['eyeStyle','face'],['skinColor','skin']]){
   if(raw[x]!=null&&raw[y]!=null&&(x==='gender'?canonical(raw[x])!==canonical(raw[y]):raw[x]!==raw[y]))return null;
  }
  const visible=registeredEquipment(player,o);
  if(!visible)return null;
  const look={body,hair:raw.hairStyle??raw.hair,face:raw.eyeStyle??raw.face,skin:raw.skinColor??raw.skin,
   hairColor:raw.hairColor,eyeColor:raw.eyeColor};
  if(body==='female')return selectFemaleNorthBootOnPants(player,o,visible)||selectFemaleNorthBootsOnly(player,o,visible)||selectFemaleIdleBoots(player,o,visible)||selectFemaleApprovedGloveWalk(player,o,visible)||selectGlovesOnRegisteredKit(player,o,look,visible)||selectFemaleWalkSlots(player,o,visible);
  return selectSouthPunchP22OwnCoatsG26(player,o,look,visible)||selectNorthPunchP22OwnCoats(player,o,look,visible)||selectNorthPunchP22Coat(o,look,visible)||selectSouthPunchP22Coat(o,look,visible)||selectSouthPunchBare(o,look,visible)||selectNorthPunchBare(o,look,visible)||selectNorthPunchB9(player,o,look,visible)||selectNorthRegisteredPantsGlove(o,look,visible)||selectNorthGlovePalette(o,look,visible)||selectStaticMalePunchSlots(player,o,look,visible)||selectSouthTorsoOnPants133(o,look,visible)||selectNorthTorsoOnPants133(o,look,visible)||selectBootsOnRegisteredWalk(player,o,look,visible)||selectRegisteredPantsBoot155(o,look,visible)||selectPantsGlovesOnApprovedKit(player,o,look,visible)||selectGlovesOnRegisteredKit(player,o,look,visible)||selectCoatsOnRegisteredPants(player,o,look,visible)||selectOrderedWeaponSlots(player,o,look,visible)||selectUnarmedSouthPilot(player,o);
 }
 // Exact, own lateral Focus body and eight separate Relic32 phases. Skin stays the authored Light.
 const relic32FocusSideSources={"east":["122dbaea5701916017e4dbeb23ce136567ad2d3629bea058629dae204f317b8a","9add51bf7602618f2e937cf31d851346a02afc248da8490ae5ea7ea322fabde2","45de7576039c538aee29ff5a5d0def51143e8cbf90a33cdead504d88fd2ea713",["a8302704750a3814209d97264562f620e1a024cde4ca0e1d5516949d8857dd78","4687bc10bb763fc59dbaa8163070de61e4d9b6e0c3afdd52f95f19a8b50b2fea","fb00113270ec6410ff0cbc5be92697a4ca147356524b414e472f6ad53b0c4888","2840fa65e15e017833715fb979df9baf7ce06b60832a73adc0cf8382def8e6c6","0f22fef7774401ff83d70c65a7d8b8f0b2927bd5fe4bb672e0c630382b388af1","93b92c3d7c00f605d14dce668a3b915de7938948c62b72345fec8d1446a98d6f","affe0bf396b58d25641a96f510aab19fb30abded06bacd155463b56792d7fc26","dadd479f2c28a6a0cbe18e7ce59d736bab0fc9fff116413eea9d110d596345d8"]],"west":["98da585b5061c22cc4c17f5d10b67ab3416321628e79e60c29f3ae8fce81fb72","0dc6cfcac5a2cf85ea30b0d88bdfd08e3fb7574110b115fb230ff8adce03b464","a1359e16013832c487942d028404f7a5c59f4afd4a7e96eb480aa1a1d34db07e",["63581e58c702d175faa51ae27669eee8a99a5d43cdb55612274de201c1f86b2d","d7ab94fa87a7359fe0dcd20b257b172ae07248d98280edf46c46619431054c11","27d21115d990fcb889a5d11525f618cd2498cb1c547a14d5ae82a9307ab435e2","3c73045fd578990a9ed8a8c7ee0db64b638a97d16725a76a22830587beb3d017","179837f7ad574be32a0f2af9d406b28ec66181359a9d6d5c082502db9261e9de","ead3c68ec8d199c9d50e120db18dbaf2478a4fb05d23bad12e912cf499017b39","ef70507bfcdb9615dbb8e6c428fbb4f105b996ee58b2dc6d532ff940feeb4d3d","ab754ea54ab15a81183a1c732db033503000c346a0e403be1ef42e1d88361ab2"]]};
 const relic32FocusCoats={"east":{"151":["a753b4acfe3e8e3b12d6172a8b559d029af313dc3add3e4e2201037a456f5177","c58f5cd6eeeddfadc025df57052e54fd7dee7c859327726f3de0a2be5d8f7757","458b3e065c9f19631b56f7daf85cf31c161b187374db328aaa1278679adfca07","c9bb7460725ae1424d875252ee48a3324ecf910f947d8ad39eda07d0aabb004a","b27b458a9c9843b42859f4e4bbea74cfd4792cebe5517f29ec32c6ae21f9f3a9","383e8cb10b162b7d614f91a98af40c019bbe43d70238bf98f1e02fc60d1acbe8","a76567f04a92bba4c263da6759b3aa75fa293d139cb55c43070c522a4733edc0","1737ccf4297428db88e5b6a45531a589adb6fb89768cdecf3e674b1912c9cd22"],"158":["f54d59ee426e6bdb4f265c7227fddd30d50e52323ce581e31895883bb0c77e29","4921a8088f06959038a48f1a39868609c659c8fcb72d57d14c52ad02fbc273da","6d4e980d3556e7141d1ac5ecac17403a3008ceec01ec10872f1921ddd69df358","0c28180bc24c6392c45c2d1467cc088f5b9fd2693795d0babb27d051387c4307","0aff8bbc586750f4a6c3062921a11d178dc38b91567ebc1b42fca21a13dd7f97","bdec7da8c5ba60270faad054cd317e1f2b71ac14c3b61ec4331be13a8f7915e2","a7c85d738594cb63f0b35ae9222ad1718071255cfaf15f0cbdff2dddd0f17845","5a258975670363222e64bef2b0a0c3e09167568130357797a2cf57a51214cdc8"],"165":["55e15f11cd2c5a7e6102a887d1141c7cc0ec692de7f636351d1403deea6b0205","ddf4a44c9eb5855aaad24bc87c5cc87c36c9d63b375ffd579c8fb9555d20835c","647c46e652ce234280598eaec7ebe8ff9670ae2c63da52490980f4097982bdf5","92944bca41e32af255a433ce7621b7154f25ce05dad218e607f9fcb0282f2cb6","8b49a51917fd99f57c72914d9db6773eba3f52192ed285f553813b2feadee704","e7d7ed5774484e85ba3625b5315d61551a148ecb0c8e13dc21e5e596e9a023c4","d4af45f2eebb33de71390b66603505c81549a08c765b318e8dbdbdfb319b8155","82571ee0e8e389b2ff18f3789433b7773ffd52cf8a810338e5b3e88271dfb17a"],"179":["19286a60b329d5a46af15de9b3c1625224bf0c9d468b81e0c18b85ab1aa53ea0","9ee86d7e91b99dc36f453b5352ec73ebf2df6af7722dd52317732a85586d6ddd","d7b30c0ffaff5a7248c90bba04969e6c5cc0e0cbf66d2ba20f153f7c522141b7","4874c10c2ce505e52b065f11c6b28ee010e6293f26d48ccaa004fdfec44a9625","00c45cffbc9cd967baa237de4265427fd869168a836daf17c196f23482425e5f","a605078a1d529ac3267a77290dd3bce46d87e150db21c938a9c554c7376c19be","e3923b0ab65ccd18f1a539a8b515c3bb84d632632e5b33a86579e2f57f586363","575907a5912e33ffd5f5bbd72f804035b6a16206239096661d0379ea375abb60"]},"west":{"151":["7d9133533d1771bc74247c7193f992ae8325be711a88d0c4ffab1f8ffcfb3856","3a3b9dd49fdd26814cb568699e944d56cc5188df27879798a4041bd565609436","c4e290d865690b8dcc76a9468e87783e227a270ed92d437757c9473a3d70ed39","23a2d6fc1598b4468aa54c69a58ea73325ae37dabb04330122ea6c98ace4949e","aa53893229957b7b9d01dfce46d3a301127deb8db4fda39dbffce55232ebdaee","78f89a2fa3849109bbae1626487eb1ff2960f54b85eb46ee9381cc62065dbb8f","a1b600983f578c1f0afc1a57fa2cc8df4aa9775781d2d5d3f0c10343c8e41a81","8396bbd0152121313d54180e234a03d0e41eb27e6007eee2d770b0da43427923"],"158":["a0b6c6b381f5e495d3cd6e2f97327765aa5c453cf9a01d4bf096376c45cdc5d5","92b50b70f4a38a8650f50af397d515ac9fae24629b33ed8356659cec8ad1c887","97a471b034af93ee091907b8edc86c9018c5285555f951e0345700c6f1d2be52","1ddb8e74b2b3bb2566f786b1d839438f88c8b5952503cb23f95395ac3a79d1a9","5abb49204b28d914ce0e0f8155d0af73a936ea06d77bacf382f9c537fc131bd4","3d8e9e45f2f0b95b040edfc70e573f062895549137bb7a3460c681358d3512c4","8cafda519193da1ba0f0f87fca9c23afa15ee3f2f6f64b2f9a5cc3baab451ed7","c45c1240f29e54f3305e5198b977fb3d67489a17f6ef31ebd467fb7a365a9f39"],"165":["dad9b165ec4b16ae32ed061bad561f1b10d95d211d04b9d322197494a051632a","9824a8ddf12ea94666ea2bf88d7fdf67857c11c93feec5d4c981abf155766ed7","bae0ddf308007a76fd1fe4c02bfe5abe7501ddce6792cbe2346a576e4b074fe2","ebea912e57376d5d9ff054ef2ec40fbf8c552ca78454c5a5d13d2cf3d85f35d7","5f9939f817a1ccf8e43de52e1b46c94393ed4d6e3e8d44214facc81db53b1238","bd4e027979ed58eb3c9a90d985e2502b0c9bb783ae240e7b4b8db21b748d1003","e8a119b21e2cff36bd4cb052b8d6cd2111d07eeaa266174d67da73521e6b7710","96c5b4ed2ceef5d84810a178d9102b856e34d73816f55a1c1854cae356d6c7cd"],"179":["d4ab9c99dd76c9e639d0f222662300ae87e57d32efc0979086d2b56cce1286d3","8cf68c0a3948421be0a19a0722390fb10aa71543fcb5a26495c790924009ae1f","5893df35549a00a13d71e6b86f78a24f80ec324bbd4b55e55065fbf1704a0d37","6de36acd44aaaec39518ba3e89893d8889bfe5515f98a3cd8f49d9bf35529757","bac15dedb28018494f03611cb34208dcacf9f4ec6c60ccf6469ce796fbdd15bd","fc3c132ad87952f585ad7261bd61db4bced7d4e1538c7e969c0ab208ef62ffc0","e29b1c6f5620878c07c9b7fea9fc6025ae1136f55c5fdeb112a9016cda3100ab","ddc38686c654a0abff3ff7ff008d4a26a4a2fd4ada185faba9530f7d9656d8c6"]}};
 function selectRelic32FocusSide(player,o,a,kits){
  const d=o.direction,own=Object.hasOwn(relic32FocusSideSources,d)&&relic32FocusSideSources[d],w=kits.weapon,c=kits.coat,coat=(c?.def??c);
  const w32Tone=a.skin!=='light'&&a.skin===a.skinColor&&
   Object.hasOwn(root.MareAppearance96?.skins||{},a.skin)&&o.consumer==='world'&&
   c==null&&Object.keys(player.equipment||{}).length===1&&a.hairStyle==='original'&&a.eyeStyle==='original';
  if(!own||o.action!=='attack-focus'||o.weaponless||player.__reworkSubset||player.classId!=='healer'||!root.MareAppearance96?.hairs?.black||
     (w?.def??w)!==32||Object.keys(kits).length!==(c!=null?2:1)||c!=null&&(!Number.isInteger(coat)||!Object.hasOwn(relic32FocusCoats[d],coat)||o.consumer!=='world'||
     (player.equipment?.head!=null&&!['none','original'].includes(player.equipment.head))||
     [c?.variant,c?.variantId,c?.appearanceVariant].some(v=>v!=null&&v!=='original'))||['visual_completo','cloak'].some(k=>player.equipment?.[k]!=null&&!['none','original'].includes(player.equipment[k]))||
     [w?.variant,w?.variantId,w?.appearanceVariant].some(v=>v!=null&&v!=='original')||
     a.version!==1||a.gender!=='masculino'||a.skinStyle!=='natural'||(a.skin!=='light'&&!w32Tone)||a.hair!=='original'||
     a.face!=='original'||a.hairColor!=='black'||a.eyeColor!=='blue')return null;
  const source=weaponRegistry?.resolveSeparable({item:32,body:'male',action:o.action,direction:d,equipment:coat?{coat}:{},
    appearance:{hair:'original',face:'original',skin:'light',hairColor:'brown',eyeColor:'brown'}});
  const body=baseIndex?.records.find(r=>r.id===`v7-focus-${d}-modular8-${d}`),p=body?.pack,dir=p?.directions?.[d],
    same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!source?.separableAttack||source.id!==`separable-male-focus-east-modular8-male-${d}-weapon32-coat${coat??'none'}`||
     source.density!==4||source.fps!==12||!same(source.timeline,['0','1','2','3','4','5','6','7'])||
     !same(source.nativeCanvas,[640,640])||!same(source.pivot,[80,128])||source.states.length!==8||
     body?.sourcePackSHA256!==own[0]||body.body!=='male'||body.action!==o.action||body.direction!==d||
     !body.headHairSeparated||!body.bodyClothingSeparated||p.density!==4||!same(p.frame,{width:160,height:160})||
     !same(p.pivot,{x:80,y:128})||!same(dir?.clip,{frames:8,fps:12,loop:false,contactFrame:4})||
     dir.renderMirrorFrom||!same(dir.layers.map(l=>l.id),['underbody','torso','legs','upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near','shorts','headBase','face','hair'])||
     dir.layers[9].source!==own[1]||dir.layers[10].source!==own[2]||
     !source.states.every((s,f)=>{const [,clothing,gear]=s.layers,g=coat?gear:clothing,c=coat?clothing:null;return s.state===String(f)&&s.layers.length===(coat?3:2)&&g?.sha256===own[3][f]&&
       g.url==='assets/'+g.sha256+'.png'&&g.operation==='source-over'&&g.depth===(coat?2:1)&&!g.offset&&!g.mirrorX&&!g.paletteMask&&(!coat||
       c?.sha256===relic32FocusCoats[d][coat][f]&&c.url==='assets/'+c.sha256+'.png'&&c.operation==='source-over'&&c.depth===1&&
       !c.offset&&!c.mirrorX&&!c.paletteMask&&!c.occludedBy);}))return null;
  const refs=[...new Set(dir.layers.flatMap(l=>l.frames||[l.source]))];
  if(!refs.every(h=>body.sourceRefs.includes(h)))return null;
  return {...source,id:source.id+':saved-own-side',hdKind:'weapon',hairSeparated:true,relic32SideBlue:true,contactTick:4,
    colorAppearance:{hairColor:'black',...(w32Tone?{focusSkin:a.skin}:{})},...(w32Tone?{w32SideSavedPalette:true,id:source.id+':saved-own-side:'+a.skin}:{}),basePack:{pack:p,images:Object.fromEntries(refs.map(h=>[h,'/tools/rework-base-hd/assets/'+h+'.png']))},
    states:source.states.map(s=>({...s,layers:s.layers.slice(1)}))};
 }
 // User-approved visual over the exact authored Original dagger rig.
 // Normalized/personalized appearances are NOT an alias for this Original render.
 function selectApprovedFemaleDaggerP22(player,o){
  if(!daggerP22||!player||o.consumer!=='world'||o.action!=='attack-daggers'||player.zoanTransformed||player.__reworkSubset||o.weaponless)return null;
  const v=registeredEquipment(player,o),look=player.appearance96||{},original=daggerP22.appearance;
  if(!v||Object.keys(v).length!==2||v.pants?.item!==22||![12,13,71,72,73,74].includes(v.weapon?.item)||
    Object.keys(look).length!==Object.keys(original).length||!Object.keys(original).every(k=>look[k]===original[k]))return null;
  const direction=o.direction,r=select({...player,equipment:{...player.equipment,[v.pants.key]:null}},o);
  const p=r?.baseRecord?.pack,d=p?.directions?.[direction],frames=daggerP22.frames[direction];
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!r||r.body!=='female'||r.hdKind!=='female-equipment'||r.material||r.colorAppearance||!d||
    !equal(daggerP22.targets[v.weapon.item+'/'+direction],[r.id,r.action,r.direction,r.body,r.item,r.states])||
    !equal(daggerP22.geometry[direction],[d,p.density,p.frame,p.pivot])||d.clip.frames!==8||
    frames?.length!==8||frames.some(h=>!/^[a-f0-9]{64}$/.test(h)||!daggerP22.archiveIndex.sources[h]||r.baseRecord.sourceRefs.includes(h))||
    d.layers.some(l=>l.id==='adaga-overlap:pants:22'))return null;
  const cloth={id:'adaga-overlap:pants:22',slot:'foreground',depth:.9,source:frames[0],frames,binding:{kind:'fixed'}};
  const pack={...p,directions:{...p.directions,[direction]:{...d,layers:[...d.layers,cloth]}}};
  return describeSlots({...r,id:r.id+':approved-dagger-p22',pack,
   baseRecord:{...r.baseRecord,pack,sourceRefs:[...r.baseRecord.sourceRefs,...new Set(frames)]},
   daggerP22Sources:frames},v,[]);
 }
 function selectVisual(player,o={}){
  const exact=select(player,o)||selectApprovedFemaleDaggerP22(player,o);
  if(!exact){
   const layered=selectLayered(player,o);if(layered)return layered;
   if(!swordCheckpoint||!player||player.zoanTransformed||player.__reworkSubset||o.weaponless||
      !['attack-sword','attack','skill'].includes(o.action))return null;
   const visible=registeredEquipment(player,o);
   if(o.direction==='north'&&o.action==='attack-sword'&&[0,1,67,68,69,70].includes(visible?.weapon?.item)&&[26,145,159,166,173].includes(visible.gloves?.item)&&
      visible.pants?.item===182&&Object.keys(visible).length===3){
    const bare={...player,equipment:{weapon:visible.weapon.value}};
    const reference=visible.weapon.item===0?bare:{...player,equipment:{weapon:{def:0}}};
    const coated={...reference,equipment:{...reference.equipment,coat:{def:151}}};
    const panted={...bare,equipment:{...bare.equipment,[visible.pants.key]:visible.pants.value}};
    const gloved=swordCheckpoint.resolveNorthGloveOnly(select(coated,o),select(bare,o),o.direction,{weapon:visible.weapon,gloves:visible.gloves},
     visible.weapon.item===0?undefined:select(reference,o));
    const resolved=swordCheckpoint.resolveNorthGlovePants182(gloved,select(panted,o),o.direction,visible);
    if(resolved)return resolved;
   }
   if(o.direction==='north'&&o.action==='attack-sword'&&[0,1,67,68,69,70].includes(visible?.weapon?.item)&&visible.gloves&&Object.keys(visible).length===2){
    const bare={...player,equipment:{weapon:visible.weapon.value}};
    const reference=visible.weapon.item===0?bare:{...player,equipment:{weapon:{def:0}}};
    const coated={...reference,equipment:{...reference.equipment,coat:{def:151}}};
    const resolved=swordCheckpoint.resolveNorthGloveOnly(select(coated,o),select(bare,o),o.direction,visible,
     visible.weapon.item===0?undefined:select(reference,o));
    if(resolved)return resolved;
   }
   if((visible?.boots?.item===9&&(['north','south'].includes(o.direction)&&[0,1,67,68,70].includes(visible.weapon?.item)||
       ['east','west'].includes(o.direction)&&visible.weapon?.item===0)||visible?.boots?.item===148&&(o.direction==='north'&&[0,1,67,68,69,70].includes(visible.weapon?.item)||
       o.direction==='south'&&[0,1,67,68,70].includes(visible.weapon?.item)||
       ['east','west'].includes(o.direction)&&visible.weapon?.item===0)||
       visible?.boots?.item===134&&o.direction==='south'&&[0,1,67,68,70].includes(visible.weapon?.item)||visible?.boots?.item===8&&o.direction==='south'&&[0,1,67,68,70].includes(visible.weapon?.item)||visible?.boots?.item===155&&o.direction==='south'&&[0,1,67,68,70].includes(visible.weapon?.item)||visible?.boots?.item===162&&o.direction==='south'&&[0,1,67,68,70].includes(visible.weapon?.item)||visible?.boots?.item===176&&o.direction==='south'&&[0,67,70].includes(visible.weapon?.item)||visible?.boots?.item===183&&(o.direction==='north'&&[0,1,67,68,69,70].includes(visible.weapon?.item)||o.direction==='south'&&[0,1,67,70].includes(visible.weapon?.item)))&&Object.keys(visible).length===2&&o.action==='attack-sword'){
    const bare={...player,equipment:{weapon:visible.weapon.value}};
    const reference=visible.weapon.item===0?bare:{...bare,equipment:{weapon:{def:0}}};
    const coated={...reference,equipment:{...reference.equipment,coat:{def:151}}};
    const resolved=swordCheckpoint.resolveBootOnly(select(coated,o),select(bare,o),o.direction,visible,
     visible.weapon.item===0?undefined:select(reference,o));
    if(resolved)return resolved;
   }
   if(![0,1,67,68,69,70].includes(visible?.weapon?.item)||visible.torso?.item!==151||Object.keys(visible).some(k=>!['weapon','torso','pants','boots','gloves'].includes(k)))return null;
   const item=visible.weapon.item,options={...o,action:'attack-sword'};
   const anchor={...player,equipment:{weapon:item===0?visible.weapon.value:{def:0},coat:visible.torso.value}};
   const bare={...player,equipment:{weapon:visible.weapon.value}};
   if(o.action!=='attack-sword'&&select(item===0?anchor:bare,o)?.resolvedAction!=='attack-sword')return null;
   const base=select(anchor,options);
   const authority=item===0?undefined:{reference:select({...player,equipment:{weapon:{def:0}}},options),donor:select(bare,options)};
   const registered=swordCheckpoint.resolve(base,o.direction,visible,authority);
   return registered&&o.action!=='attack-sword'?{...registered,resolvedAction:'attack-sword'}:registered;
  }
  if(exact.frozenPantsSource&&exact.body==='male'&&['north','south'].includes(o.direction)&&['idle','walk'].includes(o.action)&&exact.equipment?.boots===155){
   const layered=selectLayered(player,o);
   if(layered?.registeredPantsBoot155&&layered.sourceId===exact.id)return layered;
  }
  if(exact.hdKind==='outfit'&&exact.body==='male'&&['north','east','west'].includes(o.direction)&&['idle','walk'].includes(o.action)&&
     exact.equipment?.torso===151&&exact.equipment?.pants===133&&exact.equipment?.gloves===152){
   const layered=selectLayered(player,o);
   const registeredSideBoot=layered?.layeredSlots&&['east','west'].includes(o.direction)&&
    layered.slotRoutes.boots?.quality==='hd'&&layered.slotRoutes.boots.item===exact.equipment.boots&&layered.slotRoutes.gloves?.item===152;
   if((layered?.canonicalNorthBootGloves||registeredSideBoot)&&!layered.omitted.length)return layered;
  }
  return exact;
 }
 function frameFor(r,o){
  const timeline=r.hdKind==='weapon'?r.timeline:null,clip=timeline?{frames:timeline.length,fps:r.fps,loop:false}:r.pack.directions[r.direction].clip;
  let progress=o.progress;
  // Opt-in art-only mapping. Gameplay owns progress/hit/duration; never retime its clock.
  const mapping=r.orderedAttack&&r.visualSampling,t=o.timing;
  if(mapping?.schema==='authored-contact-progress-v1'&&Number.isFinite(progress)&&progress>=0&&progress<=1&&t?.locked===true&&Number.isFinite(t.hitFrameRatio)&&t.hitFrameRatio>0&&t.hitFrameRatio<1&&Number.isFinite(t.duration)&&t.duration>0){
   const contact=mapping.contactTick/clip.frames,hit=t.hitFrameRatio;
   if(contact>0&&contact<1)progress=progress<=hit?progress*contact/hit:contact+(progress-hit)*(1-contact)/(1-hit);
  }
  const tick=Number.isFinite(progress)?Math.floor(Math.max(0,Math.min(1,progress))*clip.frames+(r.orderedAttack?1e-9:0)):Math.floor(Math.max(0,o.time||0)*clip.fps),position=clip.loop?tick%clip.frames:Math.min(clip.frames-1,tick);
  return timeline?r.states.findIndex(s=>s.state===String(timeline[position])):position;
 }
 function filesFor(r,frame){if(r.authoredPunchPants||r.authoredSideIdlePants){const q=r.authoredPunchPants||r.authoredSideIdlePants;return [...filesFor(q.base,frame),'tools/rework-modular-outfits-hd/assets/'+q.cloth.frames[frame]+'.png'];}if(r.authoredNorthIdlePants){const q=r.authoredNorthIdlePants,p='tools/rework-modular-outfits-hd/assets/';return [...new Set([...filesFor(q.base,frame),p+q.cloth+'.png',p+q.ownerAlpha+'.png'])];}if(r.authoredIdleCoatPants){const q=r.authoredIdleCoatPants;return [...new Set([...filesFor(q.record,frame),...['cloth','ownerAlpha'].map(k=>'tools/rework-modular-outfits-hd/assets/'+q[k]+'.png')])];}if(r.fixedIdleBoots)return [...filesFor(r.fixedIdleBoots.base,frame),...r.fixedIdleBoots.layers.map(l=>'tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png')];if(r.partitionedMalePunch)return filesForPartitionedMalePunch(r,frame);if(r.northLayers)return northFiles(r,frame);if(r.profileLayers)return profileFiles(r,frame);if(r.authoredPantsLayer)return southFiles(r,frame);return [...new Set([...(r.hdKind==='female-equipment'?femaleRegistry:r.hdKind==='weapon'?weaponRegistry:r.hdKind==='outfit'?outfitRegistry:r.hdKind==='carry'?carryRegistry:r.hdKind==='outfit-carry'?combinedCarryRegistry:registry).requiredFiles(r,{frame}),...(r.headRecord?headRegistry.requiredFiles(r.headRecord):[]),...(r.gearOnlyRecord?originalHairGearRegistry.requiredFiles(r.gearOnlyRecord):[]),...(r.femaleNamedHairRecord?femaleNamedHairRegistry.requiredFiles(r.femaleNamedHairRecord):[])])];}
 async function prepare(player,o,clipFileLimit=0){await ready;const r=selectVisual(player,o);if(!r)return false;const frame=frameFor(r,o),sourceKey=r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}),key=sourceKey+':'+frame,files=filesFor(r,frame);let entry=cache.get(sourceKey);if(entry){cache.delete(sourceKey);cache.set(sourceKey,entry);}if(entry&&clipFileLimit)entry.imageLimit=Math.max(entry.imageLimit||64,clipFileLimit);if(entry?.frames.has(frame)||entry&&files.every(p=>entry.images.has(p)))return true;if(failures.has(key))return false;if(pending.has(key))return pending.get(key);
  const job=(async()=>{try{entry=entry||{images:new Map(),proofs:[],frames:new Map(),imageLimit:Math.max(64,clipFileLimit)};await Promise.all(files.map(async p=>{if(!entry.images.has(p))entry.images.set(p,await loadShared(p));}));
  if(r.femaleNamedHairRecord)femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,entry.images);
  if(r.headRecord||r.gearOnlyRecord){const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:r.direction,baseFrame:frame,baseImages:new Map([...entry.images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]])),headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:entry.images,replaceFace:false});if(!proof.compatible)throw Error('Head identity: '+proof.reason);entry.proofs[frame]=proof;}
  for(const p of files){const im=entry.images.get(p);entry.images.delete(p);entry.images.set(p,im);}while(entry.images.size>Math.max(entry.imageLimit||64,files.length))entry.images.delete(entry.images.keys().next().value);
  cache.set(sourceKey,entry);while(cache.size>4)cache.delete(cache.keys().next().value);onChange();return true;}catch(e){failures.set(key,e.message);error=e.message;onChange();return false;}finally{pending.delete(key);}})();pending.set(key,job);return job;
 }
 // Explicit preload for callers that advance simulation without the animation loop.
 async function prepareClip(player,o={}){await ready;const r=selectVisual(player,o);if(!r)return false;const count=r.hdKind==='weapon'?r.timeline.length:r.pack.directions[r.direction].clip.frames;const retainedFiles=new Set();for(let frame=0;frame<count;frame++)for(const file of filesFor(r,frameFor(r,{...o,progress:frame/count})))retainedFiles.add(file);for(let frame=0;frame<count;frame++)if(!await prepare(player,{...o,progress:frame/count},retainedFiles.size))return false;return true;}
 function filesForPartitionedMalePunch(r,frame){
  const {upper,lower,paletteParts:p}=r.partitionedMalePunch;
  return [...new Set((p?[[p.coloredUpper,frame],[p.gloveOnly,frame],[p.staticLower,0]]:[[upper,frame],[lower,frame]])
   .flatMap(([x,frame])=>outfitRegistry.requiredFiles(x,{frame})))];
 }
 function composePartitionedMalePunch(record,frame,entry){
  const {upper,lower,splitY,paletteParts:p}=record.partitionedMalePunch,opts={frame,makeCanvas};
  const canvas=makeCanvas(640,640),ctx=canvas.getContext('2d'),bottom=makeCanvas(640,640),b=bottom.getContext('2d');
  const eyeOverride=p?.strictSouthEyes?southPunchImages(entry,record.colorAppearance.eyeColor):null;
  const info=outfitRegistry.render(ctx,p?.coloredUpper||upper,eyeOverride?.images||entry.images,{...opts,appearance:record.colorAppearance});
  for(const tile of eyeOverride?.tiles||[])tile.width=tile.height=0;
  if(p){
   const glove=makeCanvas(640,640),idle=makeCanvas(512,512);
   outfitRegistry.render(glove.getContext('2d'),p.gloveOnly,entry.images,opts);
   ctx.drawImage(glove,0,0);
   outfitRegistry.render(idle.getContext('2d'),p.staticLower,entry.images,{...opts,frame:0,appearance:record.colorAppearance});
   ctx.clearRect(0,splitY,640,640-splitY);
   ctx.putImageData(idle.getContext('2d').getImageData(0,336,512,176),64,splitY);
   glove.width=glove.height=idle.width=idle.height=0;
  }else{
   outfitRegistry.render(b,lower,entry.images,opts);
   ctx.putImageData(b.getImageData(0,splitY,640,640-splitY),0,splitY);
  }
  bottom.width=bottom.height=0;
  let top=640;
  const alpha=ctx.getImageData(0,0,640,splitY).data;
  for(let i=3;i<alpha.length;i+=4)if(alpha[i]){top=Math.floor(i/(640*4));break;}
  info.visualHeight=Math.max(0,info.pivot.y-top);
  return {canvas,info};
 }
 function composeFrame(r,frame,entry){
  if(r.authoredPunchPants||r.authoredSideIdlePants){
   const {base,cloth,index}=r.authoredPunchPants||r.authoredSideIdlePants,d=base.pack.directions[base.direction],
    sha=cloth.frames[frame],image=entry.images.get('tools/rework-modular-outfits-hd/assets/'+sha+'.png');
   if(image?.width!==base.pack.frame.width*4||image.height!==base.pack.frame.height*4)throw Error('Invalid punch pants raster');
   const images=new Map(entry.images);
   if(base.hdKind!=='outfit')images.set('tools/rework-base-hd/assets/'+sha+'.png',image);
   const adapted={...base,pack:{...base.pack,directions:{[base.direction]:{...d,layers:d.layers.map((l,i)=>i===index?cloth:l)}}}};
   return composeFrame(adapted,frame,{...entry,images});
  }
  if(r.authoredNorthIdlePants){
   const q=r.authoredNorthIdlePants,p='tools/rework-modular-outfits-hd/assets/',body=composeFrame(q.base,frame,entry),
    canvas=makeCanvas(512,512),ctx=canvas.getContext('2d'),tile=makeCanvas(512,512),tc=tile.getContext('2d'),
    owner=entry.images.get(p+q.ownerAlpha+'.png'),cloth=entry.images.get(p+q.cloth+'.png');
   if([owner,cloth].some(i=>i?.width!==512||i.height!==512))throw Error('Invalid North idle pants raster');
   tc.drawImage(owner,0,0);const mask=tc.getImageData(0,0,512,512).data;
   tc.clearRect(0,0,512,512);tc.drawImage(cloth,0,0);const data=tc.getImageData(0,0,512,512);
   for(let i=0;i<mask.length;i+=4)if(mask[i+3]){if(mask[i+3]!==255)throw Error('Nonbinary North idle pants owner');data.data.fill(0,i,i+4);}
   tc.putImageData(data,0,0);ctx.drawImage(body.canvas,0,0);ctx.drawImage(tile,0,0);tile.width=1;body.canvas.width=1;
   return {...body,canvas};
  }
  if(r.authoredIdleCoatPants){
   const {cloth,ownerAlpha,record}=r.authoredIdleCoatPants,prefix='tools/rework-modular-outfits-hd/assets/',
     tile=makeCanvas(512,512),tc=tile.getContext('2d'),domain=makeCanvas(512,512),dc=domain.getContext('2d');
   const garment=entry.images.get(prefix+cloth+'.png'),owner=entry.images.get(prefix+ownerAlpha+'.png');
   if([garment,owner].some(i=>i?.width!==512||i.height!==512))throw Error('Invalid South idle garment raster');
   tc.drawImage(garment,0,0);dc.drawImage(owner,0,0);
   const data=tc.getImageData(0,0,512,512),mask=dc.getImageData(0,0,512,512).data;
   for(let i=0;i<mask.length;i+=4)if(mask[i+3]){if(mask[i+3]!==255)throw Error('Nonbinary authored pants owner');data.data.fill(0,i,i+4);}
   tc.putImageData(data,0,0);domain.width=1;
   const source=record.direction+'-idle-owned-pants',d=record.pack.directions[record.direction];
   const pack={...record.pack,directions:{[record.direction]:{...d,layers:[...d.layers,{id:source,slot:'pants',source,binding:{kind:'fixed'},depth:46}]}}};
   const images=new Map(entry.images);images.set(prefix+source+'.png',tile);
   const adapted={...record,pack,sourceRefs:[...record.sourceRefs,source]};
   const painted=composeFrame(adapted,frame,{...entry,images});tile.width=1;
   return painted;
  }
  if(r.fixedIdleBoots){
   const {base,layers}=r.fixedIdleBoots,body=composeFrame(base,frame,entry),
    canvas=makeCanvas(body.canvas.width,body.canvas.height),ctx=canvas.getContext('2d');
   for(const l of layers.filter(l=>l.depth===-1))ctx.drawImage(entry.images.get('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png'),0,0);
   ctx.drawImage(body.canvas,0,0);
   for(const l of layers.filter(l=>l.depth===45))ctx.drawImage(entry.images.get('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png'),0,0);
   return {...body,canvas};
  }
  if(r.partitionedMalePunch)return composePartitionedMalePunch(r,frame,entry);
  if(r.northLayers)return composeNorthLayers(r,frame,entry);
  if(r.profileLayers)return composeProfileLayers(r,frame,entry);
  if(r.authoredPantsLayer)return composeSouthPants(r,frame,entry);
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
  const clearSources=()=>{const canvases=new Set();for(const frames of sources.values())for(const {canvas} of frames.values())canvases.add(canvas);for(const canvas of canvases){canvas.width=0;canvas.height=0;}sources.clear();};
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
     // The authored directional walk holds repeat the same composition. Retain one
     // canvas per pose, while keeping every tick addressable at the original clock.
     const holds=r.northLayers?.spec.frameToPhase??r.profileLayers?.spec.directions[r.direction].clock;
     const compositions=new Map();
     sources.set(key,frames);
     for(let i=0;i<frameCount;i++){
      signal?.throwIfAborted();
      const frame=frameFor(r,{...options,progress:(i+.25)/frameCount});
      if(!Number.isSafeInteger(frame)||frame<0)throw Error('Quadro inválido: '+r.id+' / '+i);
      if(frames.has(frame))continue;
      const phase=holds?.[frame];
      if(holds&&!Number.isSafeInteger(phase))throw Error('Fase autoral inválida: '+r.id+' / '+frame);
      if(holds&&compositions.has(phase)){frames.set(frame,compositions.get(phase));continue;}
      await Promise.all(filesFor(r,frame).map(async path=>{entry.images.set(path,await decode(path));}));
      signal?.throwIfAborted();
      if(r.femaleNamedHairRecord)femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,entry.images);
      if(r.headRecord||r.gearOnlyRecord){
       const baseImages=new Map([...entry.images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]]));
       const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:r.direction,baseFrame:frame,baseImages,headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:entry.images,replaceFace:false});
       if(!proof.compatible)throw Error('Head identity: '+proof.reason);
       entry.proofs[frame]=proof;
      }
      try{const rendered=composeFrame(r,frame,entry);frames.set(frame,rendered);if(holds)compositions.set(phase,rendered);}
      catch(e){throw Error(r.id+' / '+frame+': '+e.message);}
      if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
     }
    }
    routes.set(slot,{r,key,options});
    coverage.push({action:pose.options.action,direction:pose.options.direction,weaponless:!!pose.options.weaponless,source:r.id,frames:sources.get(key).size,omitted:resolved.omitted||r.omitted||[],unsupported:resolved.unsupported||[],...(r.slotRoutes?{slotRoutes:r.slotRoutes}:{})});
   }
  }catch(e){clearSources();throw e;}
  return {coverage,
   draw(ctx,player,o){
    const route=routes.get(routeKey(o));if(!route)return false;
    const {r,key,options}=route,frame=frameFor(r,{...o,action:options.action}),result=sources.get(key)?.get(frame);
    if(!result)return false;
    paint(ctx,player,{...o,action:options.action},r,frame,result,false);
    this.visualHeight=result.info.visualHeight*WORLD_SCALE;
    return true;
   },
   release(){clearSources();routes.clear();}
  };
 }
 function draw(ctx,player,o={}){
  const r=selectVisual(player,o);if(!r){last={state:state==='ready'?'uncovered':'loading',action:o.action,direction:o.direction,reason:'No compatible exact or registered layered source for this pose.'};return false;}
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
  // The authored North/profile rigs render the same verified head material
  // through the female equipment compositor, rather than the base outfit path.
  const renderedHead=r.femaleNamedHairRecord||(r.body==='female'&&
   ['female-equipment','authored-north-layered','profile-separated'].includes(r.hdKind)?r.material:null);
  last={state:'rendered',source:r.id,action:r.resolvedAction||r.action||o.action,direction:o.direction,consumer:o.consumer,frame,width:result.info.width,height:result.info.height,pivot:result.info.pivot,density:result.info.density,physicalScale,sourceScale:1,status:r.status,approval:r.approval,eyeStyle:r.eyeStyle||renderedHead?.eyeStyle,skinPalette:renderedHead?.skinColor,hairPalette:renderedHead?.hairColor,faceProtectedExact:!!renderedHead?.faceProtectedExact,faceProtectedExceptIris:!!renderedHead?.faceProtectedExceptIris,headSourceScale:renderedHead?.sourceScale,headStatus:renderedHead?'semantic-fringe-ownership-candidate':r.gearOnlyRecord?'gear-only-candidate-calibration':r.headRecord?.status,headIdentity:renderedHead?(renderedHead.eyeStyle?'original-face-with-eye-style':'original-face-protected-exact'):r.gearOnlyRecord?'exact-head-original-hair-preserved':r.headRecord?'exact-head-source-pixels':'authored-original',headOcclusion:renderedHead?.gearRecord?renderedHead.gearPolicy:r.gearOnlyRecord?.occlusion,headGearScale:r.gearOnlyRecord?.sourceScale,headGearSource:r.gearOnlyRecord?.gear.source||renderedHead?.gearRecord?.layers.find(l=>l.id===renderedHead.gearRecord.headgearPolicy?.gearId)?.source,headGearId:r.gearOnlyRecord?.id,...(r.slotRoutes?{omitted:r.omitted,slotRoutes:r.slotRoutes}:{})};return true;
 }
 const familyStates=new Map();
 async function prepareFamily(player){await ready;const raw=player.appearance96||{};if(!root.MareAppearance96&&[raw.skinColor,raw.skin,raw.hairColor].some(v=>v&&v!=='original'))return false;const key=identityKey(player);if(familyStates.has(key))return familyStates.get(key).promise;const record={state:'checking',reason:null};familyStates.set(key,record);while(familyStates.size>8)familyStates.delete(familyStates.keys().next().value);
  record.promise=(async()=>{try{const attack=['attack-unarmed','attack-firearm','attack-focus','attack-sword','attack-daggers','attack-tech'].find(action=>['south','north','east','west'].every(direction=>!!select(player,{action,direction})));if(!attack)throw Error('Incomplete native family: no compatible four-direction attack');for(const action of ['idle','walk',attack])for(const direction of ['south','north','east','west']){const r=select(player,{action,direction});if(!r)throw Error('Incomplete native family: '+action+'/'+direction);if(r.femaleNamedHairRecord){const images=new Map();await Promise.all(femaleNamedHairRegistry.requiredFiles(r.femaleNamedHairRecord).map(async p=>images.set(p,await loadShared(p))));femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,images);}if(r.headRecord||r.gearOnlyRecord){const images=new Map(),d=r.pack.directions[r.direction],refs=new Set(r.headRecord?headRegistry.requiredFiles(r.headRecord):originalHairGearRegistry.requiredFiles(r.gearOnlyRecord));for(const layer of d.layers.filter(l=>l.slot==='headBase'))for(const sha of layer.frames||[layer.source])refs.add((r.hdKind==='outfit'?'tools/rework-modular-outfits-hd/assets/':'tools/rework-base-hd/assets/')+sha+'.png');await Promise.all([...refs].map(async p=>images.set(p,await loadShared(p))));for(let frame=0;frame<d.clip.frames;frame++){const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:direction,baseFrame:frame,baseImages:new Map([...images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]])),headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:images,replaceFace:false});if(!proof.compatible)throw Error(action+'/'+direction+': '+proof.reason);}}}record.state='ready';onChange();return true;}catch(e){record.state='uncovered';record.reason=e.message;onChange();return false;}})();return record.promise;
 }
 const preparedDirections=new Map();
 async function prepareForPlayer(player,o={}){if(!o.consumer||o.consumer==='world'){const key=identityKey(player)+'|'+!!root.MareAppearance96+'|'+!!root.MareCharacterAppearance;if(!preparedDirections.has(key)){const task=(async()=>{for(const direction of ['south','east','west','north'])await prepareStablePose(player,{action:'idle',direction,consumer:'world'});})();preparedDirections.set(key,task);while(preparedDirections.size>8)preparedDirections.delete(preparedDirections.keys().next().value);}await preparedDirections.get(key);}return prepare(player,o);}
 // Prepare the exact directional rest pose without claiming it was drawn in the world.
 async function prepareStablePose(player,o={}){if(!await prepare(player,o))return false;const key=identityKey(player)+'|'+(o.consumer||'world'),previous=last,held=lastRendered.get(key);try{return draw(makeCanvas(1,1).getContext('2d'),player,{...o,x:0,y:0,preview:false});}finally{last=previous;if(held)lastRendered.set(key,held);else lastRendered.delete(key);}}
 function canDrawStable(player,o={}){if(!selectVisual(player,o)||failureFor(player,o))return false;const prepared=pose=>{const r=selectVisual(player,pose);if(!r||failureFor(player,pose))return false;const frame=frameFor(r,pose),entry=cache.get(r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}));return !!entry&&(entry.frames.has(frame)||filesFor(r,frame).every(p=>entry.images.has(p)));};return prepared(o)||lastRendered.has(identityKey(player)+'|'+(o.consumer||'world')+'|'+o.direction)||o.action!=='idle'&&prepared({...o,action:'idle',time:0,progress:0});}
 function drawStable(ctx,player,o={}){const key=identityKey(player);if(!selectVisual(player,o)){last={state:'uncovered',action:o.action,direction:o.direction,reason:'No compatible source for this pose'};return false;}if(draw(ctx,player,o))return true;if(failureFor(player,o))return false;const consumerKey=key+'|'+(o.consumer||'world'),held=lastRendered.get(consumerKey+'|'+o.direction);if(!held&&o.action!=='idle'){const loading=last;if(draw(ctx,player,{...o,action:'idle',time:0,progress:0})){last={...last,state:'holding-native-while-loading',requestedAction:o.action,requestedDirection:o.direction};return true;}last=loading;}if(held?.key===key){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(held.canvas,(o.x||0)-held.info.pivot.x*WORLD_SCALE,(o.y||0)-held.info.pivot.y*WORLD_SCALE,held.info.width*WORLD_SCALE,held.info.height*WORLD_SCALE);ctx.restore();last={...held.pose,state:'holding-native-while-loading',requestedAction:o.action,requestedDirection:o.direction,physicalScale:WORLD_SCALE,sourceScale:1};return true;}return false;}
 const height=player=>{const held=lastRendered.get(identityKey(player)+'|world');return held?.key===identityKey(player)?held.info.visualHeight*WORLD_SCALE:null;};
 function failureFor(player,o={}){const r=selectVisual(player,o);return r?failures.get(r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{})+':'+frameFor(r,o)):null;}
 return {ready,warmSwordCheckpoint,prepare:prepareForPlayer,prepareClip,prepareConfiguration,prepareStablePose,prepareFamily,draw,drawStable,canDrawStable,height,select,selectLayered,selectVisual,failureFor,snapshot:()=>({state,error,last,northRigStatus:northRig?.loadError?{state:'unavailable',error:northRig.loadError}:{state:northRig?.schema==='female-north-author-layered-rig-v1'?'ready':'unavailable'},cachedSources:cache.size,families:[...familyStates.values()].map(({state,reason})=>({state,reason})),failures:[...failures]})};
}
const api={create};root.MareReworkNativeHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
