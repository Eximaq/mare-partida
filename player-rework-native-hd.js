/* Whole authored HD bases in the normal player path. Source pixels stay native; only the final world draw uses the approved monster-scale transform. */
(function(root){'use strict';
const identityKey=p=>JSON.stringify([p.appearance96||{},p.equipment||{},!!p.zoanTransformed,!!root.MareHeadgear?.hidden(p)]);
// Approved comparison: the 374px-tall rifle115 source draws at 105px, like the Marinheiro.
// A fixed factor across every pose prevents frame-to-frame breathing; assets and composition stay HD.
const WORLD_SCALE=105/374;
const canonical=b=>['female','feminino'].includes(b)?'female':'male';
function create({baseURL=root.location?.href,onChange=()=>{},fetchJSON=async path=>{const r=await fetch(new URL(path,baseURL));if(!r.ok)throw Error('HD index HTTP '+r.status);return r.json();},loadImage=null,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 let northRig,profileStore,profileRig,baseIndex,outfitIndex,outfitById,swordSouth,registry,femaleNamedHairRegistry,femaleRegistry,weaponRegistry,headRegistry,headCompat,originalHairGearRegistry,assetStore,outfitRegistry,outfitStore,carryRegistry,combinedCarryRegistry,weaponStore,state='loading',last=null,error=null;const cache=new Map(),pending=new Map(),failures=new Map(),lastRendered=new Map();
 const imageLoader=loadImage||(async path=>{if(path.startsWith('tools/rework-female-profile-rig/assets/'))return profileStore.load(path);if(path.startsWith('tools/rework-base-hd/assets/'))return assetStore.load(path);if(path.startsWith('tools/rework-modular-outfits-hd/assets/'))return outfitStore.load(path);if(path.startsWith('tools/rework-weapon-layers-hd/assets/'))return weaponStore.load(path);const im=new Image();im.src=new URL(path,baseURL);await im.decode();return im;});
 const imageRequests=new Map();
 function loadShared(path){
  if(!imageRequests.has(path))imageRequests.set(path,Promise.resolve().then(()=>imageLoader(path)).finally(()=>imageRequests.delete(path)));
  return imageRequests.get(path);
 }
 const ready=Promise.all([fetchJSON('tools/rework-base-hd/index.json'),fetchJSON('tools/rework-weapon-layers-hd/index.json'),fetchJSON('tools/rework-accessories/head-layer-index.json'),fetchJSON('tools/rework-base-hd/archives/archive-index.json'),fetchJSON('tools/rework-modular-outfits-hd/index.json'),fetchJSON('tools/rework-modular-outfits-hd/archives/archive-index.json'),fetchJSON('tools/rework-weapon-layers-hd/carry-binding-plan.json'),fetchJSON('tools/rework-weapon-layers-hd/archives/archive-index.json'),fetchJSON('tools/rework-accessories/female-original-face-ownership.json'),fetchJSON('tools/rework-female-profile-rig/index.json').catch(e=>({loadError:e.message})),fetchJSON('tools/rework-female-north-rig/index.json').catch(e=>({loadError:e.message}))]).then(([index,weapons,heads,archives,outfits,outfitArchives,carry,weaponArchives,femaleOwnership,profile,north])=>{northRig=north;profileRig=profile;if(profile.archiveIndex)profileStore=root.MareReworkHDAssets?.create(profile.archiveIndex,{baseURL,prefix:'tools/rework-female-profile-rig/archives/'});baseIndex=index;outfitIndex=outfits;outfitById=new Map(outfits.records.map(r=>[r.id,r]));swordSouth=weapons.modularSwordSouth;registry=root.MareReworkBaseHD.create(index);femaleNamedHairRegistry=root.MareFemaleNamedHairHD?.create(heads,femaleOwnership,{baseRegistry:registry,makeCanvas});femaleRegistry=root.MareReworkFemaleEquipmentHD?.create({schema:'female-native-equipment-registration-v1',records:weapons.femaleRegistrations||[]},{outfits,appearanceRegistry:femaleNamedHairRegistry});assetStore=root.MareReworkHDAssets?.create(archives,{baseURL});weaponRegistry=root.MareReworkWeaponNativeHD?.create(weapons,{makeCanvas});headRegistry=root.MareReworkHead?.create(heads,{appearanceAPI:{recolor:(...a)=>root.MareAppearance96.recolor(...a),materialMask:(...a)=>root.MareAppearance96.materialMask(...a)},makeCanvas});headCompat=root.MareNativeHeadCompat?.create({makeCanvas});originalHairGearRegistry=root.MareOriginalHairHelmetsHD?.create(heads,{compat:headCompat,makeCanvas});outfitRegistry=root.MareReworkModularOutfitsHD?.create(outfits,{allowCandidates:true});carryRegistry=root.MareReworkWeaponCarryHD?.create(index,carry,{makeCanvas});combinedCarryRegistry=root.MareReworkOutfitCarryOverlayHD?.create(carryRegistry,outfits);weaponStore=root.MareReworkHDAssets?.create(weaponArchives,{baseURL,prefix:'tools/rework-weapon-layers-hd/archives/'});outfitStore=root.MareReworkHDAssets?.create(outfitArchives,{baseURL,prefix:'tools/rework-modular-outfits-hd/archives/'});state='ready';onChange();}).catch(e=>{state='failed';error=e.message;onChange();});
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

 function resolveNorthLayers(player,o,a,equipment){
  const s=northRig;
  if(player.__reworkSubset||canonical(a.body)!=='female'||o.action!=='walk'||o.direction!=='north'||s?.schema!=='female-north-author-layered-rig-v1')return null;
  if(Object.entries(equipment).some(([key,v])=>!['weapon','legs','pants'].includes(key)||v&&typeof v==='object'&&['variant','variantId','appearanceVariant'].some(k=>v[k]!=null&&v[k]!=='original'))||equipment.legs!=null&&equipment.pants!=null)return null;
  const raw=equipment.weapon?.def??equipment.weapon,item=raw==null?null:Number(raw),trousers=equipment.legs??equipment.pants,pants=trousers==null?null:Number(trousers.def??trousers);
  if(item!=null&&![0,5,17].includes(item)||pants!=null&&pants!==21)return null;
  const duration=[125,75,50,125,75,50,125,75,50,125,75,50],equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!equal(s.phaseMap,[0,1,1,2,3,3,4,5,5,6,7,7])||!equal(s.durationMs,duration)||!equal(s.frameToPhase,duration.flatMap((n,k)=>Array(n/25).fill(k)))||s.legs?.length!==12||s.armOcclusion?.length!==12||s.equipmentLayers?.[21]?.cloth?.length!==12||s.equipmentLayers?.[21]?.owner?.length!==12)return null;
  const native=femaleRegistry?.resolve({body:'female',action:'walk',direction:'north',item:item??0,equipment:{weapon:item??0},appearance:a});
  if(!native||native.sourceBaseId!==s.bodyRecord||native.states.length!==8)return null;
  // A weapon is an attachment consumer of this same authored rig, not an
  // alternate body/clothing image. Empty hands use the identical body source.
  const body=item==null?{...native,item:null,paddingPhysical:0,states:native.states.map(st=>({...st,parts:[]}))}:{...native};
  if(body.material)body.material={...body.material,id:body.material.id+':north-neck-contact-v1',northNeckContact:true};
  const d=body.pack.directions.north;
  return {...body,id:'authored-north-layered:'+String(item)+':'+String(pants)+':'+body.id,hdKind:'authored-north-layered',equipment:{...(item==null?{}:{weapon:item}),...(pants==null?{}:{legs:pants})},northLayers:{spec:s,body,pants},colorAppearance:a,pack:{...body.pack,directions:{north:{...d,clip:{frames:40,fps:40,loop:true}}}}};
 }
 function northFiles(r,frame){
  const {spec:s,body,pants}=r.northLayers,k=s.frameToPhase[frame],f=s.phaseMap[k];
  return [...new Set([...femaleRegistry.requiredFiles(body,{frame:f}),s.legs[k],s.armOcclusion[k],...(pants==null?[]:[s.equipmentLayers[pants].cloth[k],s.equipmentLayers[pants].owner[k]]),...(body.item===17?[s.orb17Skin.mask]:[])])];
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
  if(values.coat!=null&&![6,7,130,137,144,151,158,165,172,179].includes(values.coat)||values.boots!=null&&values.boots!==155||values.gloves!=null&&values.gloves!==152)return null;
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
  const layers=s.layers.filter(l=>values[l.slot]!=null&&(l.slot!=='coat'||values.coat===(l.item??151))),refs=[...new Set([...layers.flatMap(l=>l.frames),...(pants!=null?s.items[pants].flatMap(f=>[f.cloth,f.owner,f.ownerAlpha].filter(Boolean)):[]),...s.contacts.map(c=>c.mask)])];
  const d=base.pack.directions.south;
  return {id:'authored-female-south:'+JSON.stringify(values)+':'+base.id,body:'female',action:'walk',direction:'south',hdKind:'authored-pants',colorAppearance:base.colorAppearance,anatomyBase:base,equipment:values,sourceRefs:refs,authoredPantsLayer:{item:pants??null,spec:s,layers,mappedCoat},pack:{...base.pack,directions:{south:{...d,clip:{frames:40,fps:40,loop:true}}}}};
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

 function select(player,o){
  const raw=player?.appearance96||{},style=raw.eyeStyle??raw.face;
  const eyes=root.MareReworkEyeStylesHD;
  const color=raw.eyeColor,customColor=color&&!['original','blue'].includes(color);
  if(!eyes?.supports(style)&&!customColor)return selectBase(player,o,true);
  if(style&&!['original','face-gentle'].includes(style)&&!eyes?.supports(style))return null;
  const isFemale=canonical(raw.gender??raw.body)==='female';
  if(isFemale)return selectBase(player,o,true);
  if(customColor&&!root.MareCharacterAppearance?.eyes[color])return null;
  if(!player.__reworkSubset&&['attack-daggers','attack-sword'].includes(o.action)){const ordered=selectBase(player,o,true,true);if(ordered?.orderedAttack&&ordered.strictSourceIdentity)return ordered;}
  if(!player.__reworkSubset&&['idle','attack','attack-unarmed','attack-focus'].includes(o.action)){const exact=selectBase(player,o,true,true);if(exact)return exact;}
  const original={...player,appearance96:{...raw,eyeStyle:'original',face:'original',eyeColor:'original'}};
  const record=selectBase(original,o);
  if(!record)return null;
  const base=['carry','outfit-carry'].includes(record.hdKind)?record.base:
    record.hdKind==='weapon'&&record.sourceRasterPadding?{...record,pack:record.basePack.pack}:record;
  const supportsEyes=!record.hdKind||['carry','outfit-carry','weapon'].includes(record.hdKind)||record.hdKind==='outfit'&&record.baseMaterialSources;
  if(!supportsEyes||!base.pack||!eyes?.maleSource(base))return null;
  return {...record,id:record.id+':eyes:'+(style||'original')+':'+(color||'original'),eyeStyle:style,colorAppearance:{...record.colorAppearance,face:style,eyeColor:color}};
 }
 function selectBase(player,o,allowApprovedAppearance=false,onlyApprovedAppearance=false){
  if(!registry||player?.zoanTransformed)return null;
  if(['combat-idle','guard','hurt','death'].includes(o.action))return select(player,{...o,action:'idle'});
  if(['attack','skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(o.action)){const candidates=o.weaponless||player.equipment?.weapon==null?['attack-unarmed']:['attack-unarmed','attack-firearm','attack-focus','attack-sword','attack-daggers','attack-tech'];for(const action of candidates){const r=onlyApprovedAppearance?selectBase(player,{...o,action},true,true):select(player,{...o,action});if(r)return {...r,resolvedAction:action};}return null;}
  const raw=player.appearance96||{};const a={...raw,body:raw.gender??raw.body,hair:raw.hairStyle??raw.hair,face:raw.eyeStyle??raw.face,skin:raw.skinColor??raw.skin};const equipment=Object.fromEntries(Object.entries(player.equipment||{}).filter(([slot])=>!['necklace','ring','belt','charm','cloak','akuma_no_mi','visual_completo'].includes(slot)));for(const [k,v]of Object.entries(equipment))if(v==null||['none','original'].includes(v))delete equipment[k];if(o.weaponless)delete equipment.weapon;if(root.MareHeadgear?.hidden(player))delete equipment.head;
  const north=resolveNorthLayers(player,o,a,equipment);if(north)return north;
  const profile=resolveProfileLayers(player,o,a,equipment);if(profile)return profile;
  const southPants=resolveSouthPants(player,o,a,equipment);if(southPants)return southPants;
  // Resolve optional independent slots before outfit candidates. Pass the original
  // visible equipment, not a subset that could silently swallow an unsupported slot.
  const independentEquipment=Object.fromEntries(Object.entries(player.equipment||{}).filter(([slot,v])=>slot!=='weapon'&&v!=null&&!['none','original'].includes(v)));
  const independent=!player.__reworkSubset&&weaponRegistry?.resolveSeparable?.({item:o.weaponless?undefined:(player.equipment?.weapon?.def??player.equipment?.weapon),body:canonical(a.body),sourceBody:a.body,classId:player.classId,weaponVariant:player.equipment?.weapon?.variant??player.equipment?.weapon?.variantId??player.equipment?.weapon?.appearanceVariant,action:o.action,direction:o.direction,appearance:a,equipment:independentEquipment});
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
   if(named)return {...cosmeticOutfit,id:named.id,sourceId:originalOutfit.id,hdKind:'outfit',femaleNamedHairRecord:named,colorAppearance:a};
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
  const visible=Object.entries(eq).filter(([k,v])=>present(v)&&!['ring','necklace','belt','charm','akuma_no_mi'].includes(k)&&!(k==='head'&&root.MareHeadgear?.hidden(player)));
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
   if(!slotEntry(value)||['ring','necklace','belt','charm','akuma_no_mi'].includes(key)||key==='head'&&root.MareHeadgear?.hidden(player)||key==='weapon'&&o.weaponless)continue;
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
 function selectBootsOnRegisteredWalk(player,o,a,visible){
  const isSide=['east','west'].includes(o.direction),fixed={torso:151,pants:133,...(isSide?{}:{gloves:152})};
  if(a.body!=='male'||!['south','north','east','west'].includes(o.direction)||!['idle','walk'].includes(o.action)||
   Object.entries(fixed).some(([slot,id])=>visible[slot]?.item!==id)||Object.keys(visible).some(k=>!Object.hasOwn(fixed,k)&&k!=='boots'&&!(isSide&&k==='gloves'))||
   Object.entries({...a,body:'male'}).some(([k,v])=>k!=='body'&&v!=null&&v!=='original'))return null;
  const dir=o.direction,action=o.action,side=['east','west'].includes(dir),anchorItem=side?155:9;
  // S/N B155 has a different lower-body source. It is not a donor and its
  // existing exact route is untouched; never hide B155 on an incompatible rig.
  if(!side&&visible.boots?.item===155)return null;
  const bootIds=[8,9,134,141,148,162,169,176,183,...(side?[155]:[])];
  const byId=n=>outfitById.get(n);
  const portable=item=>`male-coat151-pants133-gloves152-boots${item}-walk-${dir}-source-v18${action==='idle'?'-idle-frame0':''}`;
  const owned=(r,item)=>r.pack.directions[dir].layers.filter(l=>l.id.startsWith((item===155?'equip-':'')+'boot'+item+'-')).map(l=>l.id);
  const anchor=byId(side?`frozen-male-pants133-${dir}-${action}-v47`:portable(9));
  if(!anchor||(side?!anchor.frozenPantsSource:!anchor.equipmentLayerGroups?.boots))return null;
  const records={};
  for(const item of bootIds){
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
  if(!composed)return null;
  const slotRoutes=Object.fromEntries(Object.entries(composed.slotRoutes).map(([k,v])=>[visible[k].key,v]));
  return {...composed,slotRoutes,omitted:composed.omitted.map(k=>visible[k].key),hdKind:'outfit'};
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
 function selectFemaleWalkSlots(player,o,visible){
  if(o.action!=='walk'||o.direction!=='south'||o.weaponless||!visible.boots||Object.keys(visible).some(slot=>!['boots','pants','weapon'].includes(slot)))return null;
  const pants=visible.pants?.item,weapon=visible.weapon?.item;
  if(![21,133,147,161,168,175,182].includes(pants)||weapon!=null&&(pants!==21||![0,5,17].includes(weapon)))return null;
  const source=select({...player,equipment:{...player.equipment,[visible.boots.key]:null}},o),clip=source?.pack?.directions?.south?.clip;
  if(source?.hdKind!=='authored-pants'||source.authoredPantsLayer?.item!==pants||source.body!=='female'||source.action!=='walk'||source.direction!=='south'||
     clip?.frames!==40||clip.fps!==40||clip.loop!==true||(weapon==null?!!source.carrySouth:source.carrySouth?.item!==weapon))return null;
  return describeSlots(source,visible,['boots']);
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
  if(body==='female')return selectGlovesOnRegisteredKit(player,o,look,visible)||selectFemaleWalkSlots(player,o,visible);
  return selectBootsOnRegisteredWalk(player,o,look,visible)||selectGlovesOnRegisteredKit(player,o,look,visible)||selectOrderedWeaponSlots(player,o,look,visible)||selectUnarmedSouthPilot(player,o);
 }
 function selectVisual(player,o){return select(player,o)||selectLayered(player,o);}
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
 function filesFor(r,frame){if(r.northLayers)return northFiles(r,frame);if(r.profileLayers)return profileFiles(r,frame);if(r.authoredPantsLayer)return southFiles(r,frame);return [...new Set([...(r.hdKind==='female-equipment'?femaleRegistry:r.hdKind==='weapon'?weaponRegistry:r.hdKind==='outfit'?outfitRegistry:r.hdKind==='carry'?carryRegistry:r.hdKind==='outfit-carry'?combinedCarryRegistry:registry).requiredFiles(r,{frame}),...(r.headRecord?headRegistry.requiredFiles(r.headRecord):[]),...(r.gearOnlyRecord?originalHairGearRegistry.requiredFiles(r.gearOnlyRecord):[]),...(r.femaleNamedHairRecord?femaleNamedHairRegistry.requiredFiles(r.femaleNamedHairRecord):[])])];}
 async function prepare(player,o,clipFileLimit=0){await ready;const r=selectVisual(player,o);if(!r)return false;const frame=frameFor(r,o),sourceKey=r.id+'|'+JSON.stringify(r.colorAppearance||player.appearance96||{}),key=sourceKey+':'+frame,files=filesFor(r,frame);let entry=cache.get(sourceKey);if(entry){cache.delete(sourceKey);cache.set(sourceKey,entry);}if(entry&&clipFileLimit)entry.imageLimit=Math.max(entry.imageLimit||64,clipFileLimit);if(entry?.frames.has(frame)||entry&&files.every(p=>entry.images.has(p)))return true;if(failures.has(key))return false;if(pending.has(key))return pending.get(key);
  const job=(async()=>{try{entry=entry||{images:new Map(),proofs:[],frames:new Map(),imageLimit:Math.max(64,clipFileLimit)};await Promise.all(files.map(async p=>{if(!entry.images.has(p))entry.images.set(p,await loadShared(p));}));
  if(r.femaleNamedHairRecord)femaleNamedHairRegistry.compose(r,r.femaleNamedHairRecord,entry.images);
  if(r.headRecord||r.gearOnlyRecord){const proof=headCompat.validate({basePack:r.pack,baseMirrorX:!!r.mirrorX||!!r.mirrorLayerIDs?.includes(r.pack.directions[r.direction].layers.find(l=>l.slot==='headBase')?.id),baseBody:r.body,baseDirection:r.direction,baseFrame:frame,baseImages:new Map([...entry.images].flatMap(([path,image])=>[[path,image],[path.split('/').pop().replace('.png',''),image]])),headRecord:r.headRecord||r.gearOnlyRecord.sourceRecord,headImages:entry.images,replaceFace:false});if(!proof.compatible)throw Error('Head identity: '+proof.reason);entry.proofs[frame]=proof;}
  for(const p of files){const im=entry.images.get(p);entry.images.delete(p);entry.images.set(p,im);}while(entry.images.size>Math.max(entry.imageLimit||64,files.length))entry.images.delete(entry.images.keys().next().value);
  cache.set(sourceKey,entry);while(cache.size>4)cache.delete(cache.keys().next().value);onChange();return true;}catch(e){failures.set(key,e.message);error=e.message;onChange();return false;}finally{pending.delete(key);}})();pending.set(key,job);return job;
 }
 // Explicit preload for callers that advance simulation without the animation loop.
 async function prepareClip(player,o={}){await ready;const r=selectVisual(player,o);if(!r)return false;const count=r.hdKind==='weapon'?r.timeline.length:r.pack.directions[r.direction].clip.frames;const retainedFiles=new Set();for(let frame=0;frame<count;frame++)for(const file of filesFor(r,frameFor(r,{...o,progress:frame/count})))retainedFiles.add(file);for(let frame=0;frame<count;frame++)if(!await prepare(player,{...o,progress:frame/count},retainedFiles.size))return false;return true;}
 function composeFrame(r,frame,entry){
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
  last={state:'rendered',source:r.id,action:r.resolvedAction||r.action||o.action,direction:o.direction,consumer:o.consumer,frame,width:result.info.width,height:result.info.height,pivot:result.info.pivot,density:result.info.density,physicalScale,sourceScale:1,status:r.status,approval:r.approval,eyeStyle:r.eyeStyle||r.femaleNamedHairRecord?.eyeStyle,skinPalette:r.femaleNamedHairRecord?.skinColor,hairPalette:r.femaleNamedHairRecord?.hairColor,faceProtectedExact:!!r.femaleNamedHairRecord?.faceProtectedExact,faceProtectedExceptIris:!!r.femaleNamedHairRecord?.faceProtectedExceptIris,headSourceScale:r.femaleNamedHairRecord?.sourceScale,headStatus:r.femaleNamedHairRecord?'semantic-fringe-ownership-candidate':r.gearOnlyRecord?'gear-only-candidate-calibration':r.headRecord?.status,headIdentity:r.femaleNamedHairRecord?(r.femaleNamedHairRecord.eyeStyle?'original-face-with-eye-style':'original-face-protected-exact'):r.gearOnlyRecord?'exact-head-original-hair-preserved':r.headRecord?'exact-head-source-pixels':'authored-original',headOcclusion:r.femaleNamedHairRecord?.gearRecord?r.femaleNamedHairRecord.gearPolicy:r.gearOnlyRecord?.occlusion,headGearScale:r.gearOnlyRecord?.sourceScale,headGearSource:r.gearOnlyRecord?.gear.source||r.femaleNamedHairRecord?.gearRecord?.layers.find(l=>l.id===r.femaleNamedHairRecord.gearRecord.headgearPolicy?.gearId)?.source,headGearId:r.gearOnlyRecord?.id,...(r.slotRoutes?{omitted:r.omitted,slotRoutes:r.slotRoutes}:{})};return true;
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
 return {ready,prepare:prepareForPlayer,prepareClip,prepareConfiguration,prepareStablePose,prepareFamily,draw,drawStable,canDrawStable,height,select,selectLayered,selectVisual,failureFor,snapshot:()=>({state,error,last,northRigStatus:northRig?.loadError?{state:'unavailable',error:northRig.loadError}:{state:northRig?.schema==='female-north-author-layered-rig-v1'?'ready':'unavailable'},cachedSources:cache.size,families:[...familyStates.values()].map(({state,reason})=>({state,reason})),failures:[...failures]})};
}
const api={create};root.MareReworkNativeHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
