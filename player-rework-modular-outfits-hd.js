/* Original body layers + genuinely isolated authored equipment, at native density. */
(function(root){'use strict';
const canonical=b=>({masculino:'male',feminino:'female'})[b]||b;
const id=x=>x?.def??x;
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceOf=layers=>layers.flatMap(l=>l.frames||[l.source]).filter(Boolean);
const slotNames=new Set(['torso','pants','boots','gloves','head','weapon']);
const renderFields=['approvedAppearance','colorAppearance','palettePolicy','paletteSupportedMaterials','mirrorX','mirrorLayerIDs','sourceRasterPadding','bodyOcclusion','isolatedPants21','baseMaterialSources','headRecord','headLook','gearOnlyRecord','femaleNamedHairRecord'];
// An explicit registration is a proof that these layer IDs belong to the slot.
// Verify remaining rasters, pose clock, pivot and depth/order before selecting
// an attachment. A matching size alone cannot identify a body or a fitting.
function composeSlots({anchor,equipment,fixed,slots}){
 const d=anchor?.pack?.directions?.[anchor.direction];
 if(!d?.layers?.length||!equipment||!fixed||!slots||
    !Object.entries(fixed).every(([k,item])=>equipment[k]===item&&anchor.equipment?.[k]===item)||
    Object.keys(equipment).some(k=>!Object.hasOwn(fixed,k)&&!Object.hasOwn(slots,k))||
    Object.keys(anchor.equipment).some(k=>!Object.hasOwn(fixed,k)&&!Object.hasOwn(slots,k)))return null;
 const owners=new Map();
 for(const [slot,rule] of Object.entries(slots)){
  if(!slotNames.has(slot)||Object.hasOwn(fixed,slot)||!rule.anchorLayers?.length||anchor.equipment[slot]==null)return null;
  for(const id of rule.anchorLayers){
   if(owners.has(id)||d.layers.filter(l=>l.id===id).length!==1)return null;
   owners.set(id,slot);
  }
 }
 const stable=d.layers.filter(l=>!owners.has(l.id)),slotRoutes={},omitted=[],sources=[];
 const clock=({layers,...rest})=>rest;
 const masks=(record,layers)=>Object.fromEntries([...new Set(sourceOf(layers))].sort().filter(x=>record.paletteSourceMasks?.[x]).map(x=>[x,record.paletteSourceMasks[x]]));
 for(const [slot,item] of Object.entries(fixed))slotRoutes[slot]={item,quality:'hd',source:anchor.id};
 for(const [slot,rule] of Object.entries(slots)){
  const item=equipment[slot];
  if(item==null){if(!rule.uncoveredBaseVerified)return null;continue;}
  const candidate=rule.records[item],r=candidate?.record,c=r?.pack?.directions?.[r.direction],ids=new Set(candidate?.layers||[]);
  const ignore=new Set(),shared=new Set();
  for(const [name,list] of Object.entries(candidate?.otherOwnedLayers||{})){
   if(!Object.hasOwn(slots,name)||name===slot||!Array.isArray(list)||!list.length)return null;
   shared.add(name);
   for(const id of list){if(ignore.has(id)||ids.has(id)||c?.layers?.filter(l=>l.id===id).length!==1)return null;ignore.add(id);}
  }
  const others=d.layers.filter(l=>owners.get(l.id)!==slot&&!shared.has(owners.get(l.id)));
  const donorLayers=c?.layers?.filter(l=>ids.has(l.id))||[];
  const core=c?.layers?.filter(l=>!ids.has(l.id)&&!ignore.has(l.id))||[];
  // A donor may have been captured with a different sibling item. Only
  // ignore that item when its complete layer ownership was registered above;
  // the full remaining body, timeline, palette and pivot still must match.
  const foreign=r?.equipment||{};
  const otherSlotsMatch=Object.keys(foreign).length===Object.keys(anchor.equipment).length&&
   Object.entries(anchor.equipment).every(([k,v])=>k===slot||foreign[k]===v||
    (shared.has(k)&&Number.isSafeInteger(foreign[k])&&foreign[k]>=0));
  const compatible=otherSlotsMatch&&r.equipment[slot]===item&&ids.size&&ids.size===donorLayers.length&&
   r.body===anchor.body&&r.action===anchor.action&&r.direction===anchor.direction&&
   same(c&&clock(c),clock(d))&&same(r.pack.frame,anchor.pack.frame)&&same(r.pack.pivot,anchor.pack.pivot)&&r.pack.density===anchor.pack.density&&
   renderFields.every(k=>same(r[k],anchor[k]))&&same(core,others)&&same(masks(r,core),masks(anchor,others))&&
   donorLayers.every(l=>Number.isFinite(l.depth)&&sourceOf([l]).length&&(!l.frames||l.frames.length===d.clip.frames));
  if(!compatible){
   if(!rule.uncoveredBaseVerified)return null;
   omitted.push(slot);slotRoutes[slot]={item,quality:'missing'};
  }else{
   sources.push([r,donorLayers]);slotRoutes[slot]={item,quality:'hd',source:r.id};
  }
 }
 // Preserve authored tie order against the common base. A pass may
 // occur on either side of existing layers, even within a single slot.
 const order=new Map(stable.map((l,i)=>[l.id,i])),buckets=Array.from({length:stable.length+1},()=>[]);
 const interacting=(x,y)=>{
  for(let frame=0;frame<d.clip.frames;frame++)if((x.depthTrack?.[frame]??x.depth)===(y.depthTrack?.[frame]??y.depth))return true;
  return false;
 };
 for(let i=0;i<sources.length;i++){
  const [r,group]=sources[i],set=new Set(group.map(l=>l.id));
  if(sources.some(([,other],j)=>j<i&&other.some(x=>group.some(y=>interacting(x,y)))))return null;
  let next=0;
  for(const l of r.pack.directions[anchor.direction].layers){
   if(set.has(l.id))buckets[next].push(l);
   else if(order.has(l.id))next=order.get(l.id)+1;
  }
 }
 const layers=stable.flatMap((l,i)=>[...buckets[i],l]).concat(buckets[stable.length]);
 if(new Set(layers.map(l=>l.id)).size!==layers.length)return null;
 const paletteSourceMasks={...masks(anchor,stable)};
 for(const [r,group]of sources)for(const [src,mask]of Object.entries(masks(r,group))){
  if(paletteSourceMasks[src]&&!same(paletteSourceMasks[src],mask))return null;
  paletteSourceMasks[src]=mask;
 }
 const paletteRefs=[...new Set(Object.values(paletteSourceMasks).flatMap(Object.values))];
 const pack={...anchor.pack,directions:{[anchor.direction]:{...d,layers}}};
 const key=Object.entries(equipment).sort(([a],[b])=>a.localeCompare(b));
 return {...anchor,id:anchor.id+':slots:'+JSON.stringify([key,slotRoutes]),sourceId:anchor.id,pack,
  equipment:Object.fromEntries(key.filter(([slot])=>!omitted.includes(slot))),sourceRefs:[...new Set(sourceOf(layers))],
  paletteSourceMasks,paletteRefs,slotRoutes,omitted,layeredSlots:true};
}
// Exact versioned male Original South eye/hand sources; conservative opt-in only.
const strictSouthFaces={"81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449":{"w":512,"skin":"0661c468d18e245b3400f8cc212926aa7c5cc916b722b1dd35334abd939ed096"},"6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a":{"w":640,"skin":"47c4585f7c79fdf6d67207416b4a08c9b7322da3d9abc94cddf965bd6ed174a0"}};
const strictSouthIris=[[303,205,40,5,0,255,1],[304,205,50,20,14,255,1],[303,206,41,4,0,255,1],[304,206,53,21,13,255,1],[303,207,71,25,13,255,2],[304,207,82,40,29,255,2],[307,207,40,21,16,255,1],[308,207,62,24,15,255,2],[303,208,88,37,22,255,2],[304,208,103,53,38,255,3],[305,208,38,17,11,255,1],[307,208,85,43,33,255,2],[308,208,78,31,18,255,2],[303,209,57,22,13,255,1],[304,209,95,46,31,255,3],[305,209,92,44,31,255,3],[306,209,92,43,30,255,3],[307,209,108,52,38,255,3],[308,209,66,20,7,255,2],[303,210,66,50,44,255,2],[304,210,55,17,9,255,1],[305,210,80,34,22,255,2],[306,210,84,34,22,255,2],[307,210,82,32,19,255,2],[332,206,50,7,0,255,1],[332,207,84,31,18,255,2],[333,207,43,20,14,255,1],[336,207,63,29,19,255,2],[337,207,47,18,11,255,1],[332,208,81,29,15,255,2],[333,208,77,38,26,255,2],[335,208,49,22,15,255,1],[336,208,91,45,32,255,3],[337,208,62,28,17,255,2],[332,209,70,22,10,255,2],[333,209,93,46,33,255,3],[334,209,87,41,27,255,2],[335,209,95,45,30,255,3],[336,209,98,49,33,255,3],[337,209,58,27,17,255,1],[332,210,38,5,0,255,1],[333,210,67,29,19,255,2],[334,210,69,29,18,255,2],[335,210,75,33,21,255,2],[336,210,47,11,3,255,1]];
const knownRepairHands={"5ac179932f16e9e0884f57463303f7f40fa77b95d1f57a5f0e74b84f05389f40":[137,"south","cuff-emergence-handRight-RIGHT-skin",512,512],"55ac07f9dc92cc9130ab27a55cb48c7c6ff547d448f66c713085502fc0be5e67":[137,"south","cuff-emergence-handLeft-LEFT-skin",512,512],"d383b7148a8226b5cd7706249db11e14b1932689c3c9a5bcafcf5f0c0ef78db9":[137,"north","cuff-emergence-handRight-RIGHT-skin",512,512],"58a31b7aeb417bfadd1362702e8c8814cbcd196da65cf9946a6ab3ca3ccaccf3":[137,"north","cuff-emergence-handLeft-LEFT-skin",512,512],"64f3dce9f28769a460346360ade91e072e39618741b89aaff092971bdbc23d0e":[144,"south","south-visible-original-hands-RIGHT-skin",512,512],"9281f2be9b2d3d735c1e48c690bd57a152bbd2283115df453f7af05440076284":[144,"south","south-visible-original-hands-LEFT-skin",512,512]};

const strictSideIrisPoints={"east":[[279,130,81,50,37,255,2],[279,131,70,34,23,255,2],[280,131,54,27,21,255,1],[279,132,69,31,21,255,2],[280,132,66,34,23,255,2],[281,132,43,27,21,255,1],[279,133,70,31,21,255,2],[280,133,70,34,23,255,2],[281,133,51,31,24,255,1],[279,134,81,42,29,255,2],[280,134,83,39,24,255,2],[281,134,73,42,29,255,2],[279,135,77,29,17,255,2],[280,135,90,37,19,255,3],[281,135,95,50,37,255,3],[282,135,49,30,27,255,1],[280,136,105,49,31,255,3],[281,136,75,39,30,255,2]],"west":[[232,130,81,50,37,255,2],[232,131,70,34,23,255,2],[231,131,54,27,21,255,1],[232,132,69,31,21,255,2],[231,132,66,34,23,255,2],[230,132,43,27,21,255,1],[232,133,70,31,21,255,2],[231,133,70,34,23,255,2],[230,133,51,31,24,255,1],[232,134,81,42,29,255,2],[231,134,83,39,24,255,2],[230,134,73,42,29,255,2],[232,135,77,29,17,255,2],[231,135,90,37,19,255,3],[230,135,95,50,37,255,3],[229,135,49,30,27,255,1],[231,136,105,49,31,255,3],[230,136,75,39,30,255,2]]};
function applyStrictSideIris(record,d,frame,a,images,map,prefix,makeCanvas){
 const layer=d.layers.find(l=>l.id===record.strictSideIris.background),key=layer?.frames?.[frame],
  points=strictSideIrisPoints[record.direction];
 const original=images.get(prefix+key+'.png')||images.get(key),colored=map.get(key);
 if(!points||!makeCanvas||original?.width!==512||original.height!==512||!colored||colored.width!==512||colored.height!==512)throw Error('Invalid authored lateral iris source');
 const source=makeCanvas(512,512),sc=source.getContext('2d');sc.drawImage(original,0,0);
 const raw=sc.getImageData(0,0,512,512).data;
 const out=makeCanvas(512,512),oc=out.getContext('2d');oc.drawImage(colored,0,0);
 const data=oc.getImageData(0,0,512,512),eye=a.eyeColor||'original',ramp=root.MareCharacterAppearance?.eyes?.[eye]?.ramp;
 if(eye!=='original'&&!ramp)throw Error('Unverified saved lateral iris palette');
 for(const [x,y,R,G,B,A,tone] of points){
  const i=(y*512+x)*4;
  if(raw[i]!==R||raw[i+1]!==G||raw[i+2]!==B||raw[i+3]!==A||data.data[i+3]!==A)throw Error('Unregistered lateral iris pixel');
  const v=ramp?parseInt(ramp[tone-1].slice(1),16):(R<<16)|(G<<8)|B;
  data.data[i]=v>>>16;data.data[i+1]=(v>>>8)&255;data.data[i+2]=v&255;
 }
 oc.putImageData(data,0,0);map.set(key,out);
 source.width=source.height=1;
}

function applyStrictSouthLayers(r,appearance,images,map,prefix,makeCanvas,appearanceAPI){
 const {face,repairs}=r.strictSouthAppearance;
 const known=strictSouthFaces[face];
 if(!known||!appearanceAPI||!makeCanvas)throw Error('Missing exact South appearance authority');
 const im=map.get(face),maskImage=images.get(prefix+known.skin+'.png')||images.get(known.skin);
 if(!im||!maskImage||im.width!==known.w||im.height!==known.w||maskImage.width!==known.w||maskImage.height!==known.w)throw Error('Mismatched verified South face');
 const copy=image=>{
  const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');
  tc.drawImage(image,0,0);
  return [tile,tc,tc.getImageData(0,0,tile.width,tile.height)];
 };
 const [tile,tc,data]=copy(im);
 const off=(640-known.w)/2;
 const indices=strictSouthIris.map(([x,y,R,G,B,A,rank])=>{
  const k=(y-off)*known.w+(x-off),q=k*4;
  if(data.data[q]!==R||data.data[q+1]!==G||data.data[q+2]!==B||data.data[q+3]!==A)throw Error('Unverified original South iris pixels');
  return [k,rank];
 });
 const skin=appearance.skin||appearance.skinColor,skinRamp=appearanceAPI.skins[skin]?.ramp;
 if(skin&&skin!=='original'){
  if(!skinRamp)throw Error('Unsupported saved skin');
  const md=copy(maskImage)[2].data,mask=new Uint8Array(known.w*known.w);
  for(let i=0;i<mask.length;i++)mask[i]=md[i*4];
  for(const [k] of indices)mask[k]=0;
  data.data.set(appearanceAPI.recolor(data.data,mask,skinRamp));
 }
 if(appearance.eyeColor&&appearance.eyeColor!=='original'){
  const ramp=root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp;
  if(!ramp)throw Error('Unsupported saved eye color');
  for(const [k,rank] of indices){
   const q=k*4,n=parseInt(ramp[rank-1].slice(1),16);
   data.data[q]=n>>>16;data.data[q+1]=(n>>>8)&255;data.data[q+2]=n&255;
  }
 }
 tc.putImageData(data,0,0);
 map.set(face,tile);
 if(!skinRamp)return;
 for(const source of repairs){
  const dimensions=knownRepairHands[source],image=map.get(source);
  if(!image||!dimensions)throw Error('Missing exact repair-hand pixels');
  const padding=r.sourceRasterPadding?.[source]?.offset||0;
  if(image.width!==dimensions[3]+2*padding||image.height!==dimensions[4]+2*padding)throw Error('Unverified repair-hand dimensions');
  const [rt,rc,rd]=copy(image);
  const mask=skinMaterials.mask(rd.data,image.width,'anatomy');
  rd.data.set(appearanceAPI.recolor(rd.data,mask,skinRamp));
  rc.putImageData(rd,0,0);
  map.set(source,rt);
 }
}
function withStrictSouthAppearance(record,appearance){
 if(record.body!=='male'||record.direction!=='south'||
   (appearance.hair??appearance.hairStyle??'original')!=='original'||
   (appearance.face??appearance.eyeStyle??'original')!=='original')return null;
 const d=record.pack?.directions?.south;
 if(!d)return null;
 const faceLayers=d.layers.filter(l=>l.slot==='face');
 if(faceLayers.length!==1)return null;
 const face=faceLayers[0].source,known=strictSouthFaces[face];
 if(!known||faceLayers[0].frames?.some(s=>s!==face)||record.sourceRasterPadding?.[face])return null;
 const repairLayers=d.layers.filter(l=>l.id.endsWith('-skin'));
 const expected=Object.entries(knownRepairHands).filter(([,defs])=>defs[0]===record.equipment?.torso&&defs[1]===record.direction);
 if(repairLayers.length!==expected.length||!expected.every(([src,def])=>repairLayers.some(l=>l.source===src&&l.id===def[2])))return null;
 const repairs=[];
 for(const l of repairLayers){
  const b=knownRepairHands[l.source];
  if(!b||b[0]!==record.equipment?.torso||b[1]!==record.direction||b[2]!==l.id||l.frames?.some(s=>s!==l.source))return null;
  repairs.push(l.source);
 }
 const protectedSources=new Set([face,...repairs]);
 if(d.layers.some(l=>l!==faceLayers[0]&&!repairLayers.includes(l)&&[l.source,...(l.frames||[])].some(s=>protectedSources.has(s))))return null;
 const own=r=>r?Object.fromEntries(Object.entries(r).filter(([s])=>s!==face&&!repairs.includes(s))):undefined;
 const paletteRefs=[...new Set([...(record.paletteRefs||[]),known.skin])];
 return {...record,id:record.id+':strict-south-material-v1',paletteSourceMasks:own(record.paletteSourceMasks),
         baseMaterialSources:own(record.baseMaterialSources),paletteRefs,strictSouthAppearance:{face,repairs},colorAppearance:appearance};
}

function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-modular-outfits-hd/assets/',allowCandidates=false,appearanceAPI=root.MareAppearance96}={}){
 if(index?.schema!=='rework-modular-outfits-hd-v1'||!vendor?.compositor)throw Error('Missing modular outfit dependencies');
 function resolveIndependentPants({body,direction,action,equipment={},appearance={}}={}){
  const source=index.independentPants;
  if(source?.schema!=='independent-female-pants-v1'||canonical(body)!=='female'||action!=='walk')return null;
  const visible=Object.entries(equipment).filter(([,v])=>v!=null&&!['none','original'].includes(v));
  if(visible.length!==1||!['pants','legs'].includes(visible[0][0]))return null;
  const selected=Number(id(visible[0][1]));
  const record=source.records.find(r=>r.body==='female'&&r.action===action&&r.direction===direction&&r.equipment?.pants===selected&&Object.keys(r.equipment).length===1&&r.approvedAppearance&&Object.entries(r.approvedAppearance).every(([k,v])=>appearance[k]===v));
  if(!record)return null;
  if(!['east','west'].includes(direction)){
   const selectedValue=visible[0][1];
   if(selectedValue&&typeof selectedValue==='object'&&['variant','variantId','appearanceVariant'].some(k=>selectedValue[k]!=null&&selectedValue[k]!=='original'))return null;
   // Only separately approved original SN147/168/182 sources use these native holds.
   if(selected===182&&record.sourceRevision!=='EW38_SN3')return null;
   const expected=direction==='south'?[125,125,125,75,50,125,125,125,75,50]:direction==='north'?[125,75,50,125,75,50,125,75,50,125,75,50]:null,t=record.authoredWalkTimeline;
   if(![147,168,182].includes(selected)||!expected||t?.schema!=='approved-female-sn-ms-v1'||t.cycleMs!==1000||t.phaseCount!==expected.length||JSON.stringify(t.durationMs)!==JSON.stringify(expected)||JSON.stringify(t.frameToPhase)!==JSON.stringify(expected.flatMap((ms,i)=>Array(ms/25).fill(i))))return null;
  }
  const p=record.pack,d=p?.directions?.[direction];
  if(p.density!==4||p.frame.width!==128||p.frame.height!==128||p.pivot.x!==64||p.pivot.y!==112||d?.clip.frames!==40||d.clip.fps!==40||d.clip.loop!==true)return null;
  return {...record,independentPants:true,colorAppearance:{}};
 }
 function resolve({body,direction,action,equipment={},appearance={},allowApprovedAppearance=false}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  if(!['walk','idle','attack-unarmed','attack-focus'].includes(action))return null;
  const canonicalEquipment={};for(const [key,value]of Object.entries(equipment)){const slot=({legs:'pants',coat:'torso'})[key]||key,selected=id(value);if(selected!=null&&!['none','original'].includes(selected))canonicalEquipment[slot]=Number(selected);}
  const exact=index.records.find(r=>r.approvedAppearance&&allowApprovedAppearance&&(!r.slotComposition151||Object.values(equipment).every(v=>!v||typeof v!=='object'||['variant','variantId','appearanceVariant'].every(k=>v[k]==null||v[k]==='original')))&&r.body===canonical(body)&&r.action===action&&r.direction===direction&&Object.keys(canonicalEquipment).length===Object.keys(r.equipment).length&&Object.entries(r.equipment).every(([slot,item])=>canonicalEquipment[slot]===item)&&Object.entries(r.approvedAppearance).every(([name,expected])=>appearance[name]===expected));
  if(exact)return exact;
  if(appearance.hair&&!['original'].includes(appearance.hair)||appearance.face&&!['original','face-gentle'].includes(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))return null;
  const matches=r=>!r.approvedAppearance&&r.body===canonical(body)&&r.direction===direction&&r.action===action&&(!r.candidate||allowCandidates)&&Object.keys(canonicalEquipment).length===Object.keys(r.equipment).length&&Object.entries(r.equipment).every(([slot,item])=>canonicalEquipment[slot]===item);
  let r=index.records.find(matches)||null;
  // A declared derived revision may supersede its exact parent, never another outfit.
  const visited=new Set();while(r&&!visited.has(r.id)){visited.add(r.id);const parent=r,d=parent.pack.directions[direction];const child=index.records.find(c=>c.sourceOutfitId===parent.id&&matches(c)&&JSON.stringify(c.pack.frame)===JSON.stringify(parent.pack.frame)&&JSON.stringify(c.pack.pivot)===JSON.stringify(parent.pack.pivot)&&c.pack.density===parent.pack.density&&JSON.stringify({...c.pack.directions[direction],layers:undefined})===JSON.stringify({...d,layers:undefined}));if(!child)break;r=child;}
  if(!r)return null;const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if(r.paletteSupportedMaterials&&(skin&&skin!=='original'&&!r.paletteSupportedMaterials.includes('skin')||hair&&hair!=='original'&&!r.paletteSupportedMaterials.includes('hair')))return null;
  if(skin&&skin!=='original'||hair&&hair!=='original'){const isolatedPants21=r.item===21&&r.body==='male'&&r.id.startsWith('male-pants21-');if(!r.paletteSourceMasks&&!isolatedPants21||skin&&skin!=='original'&&!appearanceAPI?.skins[skin]||hair&&hair!=='original'&&!appearanceAPI?.hairs[hair])return null;return {...r,isolatedPants21,id:r.id+':palette:'+String(skin||'original')+':'+String(hair||'original'),sourceId:r.id,colorAppearance:{skin:skin||'original',hairColor:hair||'original'}};}return r;
 }
 const sources=(r,frame)=>frame===undefined?r.sourceRefs:[...new Set(r.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean))];
 const requiredFiles=(r,{frame}={})=>r?[...new Set([...sources(r,frame),...(r.paletteRefs||[])])].map(s=>prefix+s+'.png'):[];
 function bindAnatomy(r,baseIndex){
  const d=r?.pack.directions[r.direction];
  if(!d||Object.keys(r.equipment||{}).length!==1||r.equipment.torso==null)return null;
  const original=baseIndex.records.find(b=>b.body===r.body&&b.direction===r.direction&&b.action===r.action&&b.hairStyle==='original');
  if(!original)return null;
  const authors=original.pack.directions[r.direction].layers;
  const ownership=new Map();
  for(const layer of d.layers.filter(l=>l.id.startsWith('base:'))){
   const author=authors.find(a=>a.id===layer.id.slice(5)&&a.slot===layer.slot&&
      (layer.frames||[layer.source]).every(source=>(a.frames||[a.source]).includes(source)));
   if(!author)return null;
   const kind=author.slot==='hair'?'hair':skinMaterials.ownership([author]);
   if(!kind||r.body==='female'&&!['body','foreground'].includes(author.slot))continue;
   ownership.set(layer,kind);
  }
  const sources=new Map();
  for(const [layer,kind] of ownership)for(const source of layer.frames||[layer.source]){
   if(sources.has(source)&&sources.get(source)!==kind)return null;
   sources.set(source,kind);
  }
  // Never apply a body's palette to a raster reused by clothing.
  if(d.layers.some(l=>!ownership.has(l)&&(l.frames||[l.source]).some(s=>sources.has(s))))return null;
  return sources.size?Object.fromEntries(sources):null;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r.colorAppearance||{},makeCanvas}={}){
  appearanceAPI=appearanceAPI||root.MareAppearance96;
  const p=r?.pack,d=p?.directions?.[r.direction];if(!d||!Number.isInteger(frame)||frame<0||frame>=d.clip.frames)throw Error('Invalid modular authored frame');
  if(p.density!==4||ctx.canvas.width!==p.frame.width*4||ctx.canvas.height!==p.frame.height*4)throw Error('Native canvas dimensions required');
  const map=new Map();for(const s of sources(r,frame)){const image=images.get(prefix+s+'.png')||images.get(s);if(!image)throw Error('Missing original outfit asset '+s);map.set(s,image);}
  if(r.sourceRasterPadding){
   for(const [source,padding]of Object.entries(r.sourceRasterPadding)){
    const image=map.get(source);if(!image)continue;
    if(padding.sourceSize!==512||padding.offset!==64||image.width!==512||image.height!==512||ctx.canvas.width!==640||ctx.canvas.height!==640)throw Error('Invalid native source padding');
    const surface=makeCanvas?makeCanvas(640,640):ctx.canvas.ownerDocument?Object.assign(ctx.canvas.ownerDocument.createElement('canvas'),{width:640,height:640}):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(640,640):require('@napi-rs/canvas').createCanvas(640,640);
    surface.getContext('2d').drawImage(image,64,64);map.set(source,surface);
   }
  }
  if(r.strictSouthAppearance)applyStrictSouthLayers(r,appearance,images,map,prefix,makeCanvas,appearanceAPI);
  if(r.baseMaterialSources){
   const eyes=root.MareReworkEyeStylesHD;
   const expression=r.body==='male'&&(eyes?.supports(appearance.face)||
    appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes?.maleSource(r);
   for(const [source,kind] of Object.entries(r.baseMaterialSources)){
    const image=map.get(source),palette=kind==='hair'?appearanceAPI?.hairs[appearance.hairColor]:appearanceAPI?.skins[appearance.skin||appearance.skinColor];
    if(!image||!palette&&expression?.source!==source)continue;
    const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');
    tc.drawImage(image,0,0);
    if(expression?.source===source){
     eyes.reshape(tc,appearance.face,expression.direction,expression.boxes);
     eyes.recolorIris(tc,expression,appearance.eyeColor);
    }
    if(palette){
     const data=tc.getImageData(0,0,tile.width,tile.height);
     const mask=kind==='hair'?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,tile.width,kind);
     data.data.set(appearanceAPI.recolor(data.data,mask,palette.ramp));
     tc.putImageData(data,0,0);
    }
    map.set(source,tile);
   }
  }
  if(r.isolatedPants21){
   for(const [source,image] of map){
    if(r.strictSouthAppearance?.face===source)continue;
    const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source);
    const hair=uses.every(l=>l.slot==='hair'),kind=skinMaterials.ownership(uses);
    const ramp=hair?appearanceAPI.hairs[appearance.hairColor]?.ramp:kind?appearanceAPI.skins[appearance.skin]?.ramp:null;
    if(!ramp)continue;
    const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');
    tc.drawImage(image,0,0);
    const data=tc.getImageData(0,0,tile.width,tile.height);
    const mask=hair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,tile.width,kind);
    data.data.set(appearanceAPI.recolor(data.data,mask,ramp));
    tc.putImageData(data,0,0);
    map.set(source,tile);
   }
  }
  if(r.paletteSourceMasks&&appearanceAPI){
   for(const [source,materials]of Object.entries(r.paletteSourceMasks)){
    const im=map.get(source);if(!im)continue;let tile=null,data=null;
    for(const [material,maskSource]of Object.entries(materials)){
     const color=material==='skin'?(appearance.skin||appearance.skinColor):appearance.hairColor;if(!color||color==='original')continue;
     const ramp=(material==='skin'?appearanceAPI.skins:appearanceAPI.hairs)[color]?.ramp;if(!ramp)throw Error('Unsupported outfit palette');
     const maskImage=images.get(prefix+maskSource+'.png')||images.get(maskSource);if(!maskImage)throw Error('Missing verified outfit palette mask');
     const surface=(w,h)=>makeCanvas?makeCanvas(w,h):ctx.canvas.ownerDocument?Object.assign(ctx.canvas.ownerDocument.createElement('canvas'),{width:w,height:h}):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):require('@napi-rs/canvas').createCanvas(w,h);
     if(!tile){tile=surface(im.width,im.height);tile.getContext('2d').drawImage(im,0,0);data=tile.getContext('2d').getImageData(0,0,im.width,im.height);}
     const mc=surface(im.width,im.height);mc.getContext('2d').drawImage(maskImage,0,0);const md=mc.getContext('2d').getImageData(0,0,im.width,im.height).data,mask=new Uint8Array(im.width*im.height);for(let i=0;i<mask.length;i++)mask[i]=md[i*4];
     data.data.set(appearanceAPI.recolor(data.data,mask,ramp));
    }
    if(tile){tile.getContext('2d').putImageData(data,0,0);map.set(source,tile);}
   }
  }
  if(r.strictSideIris)applyStrictSideIris(r,d,frame,appearance,images,map,prefix,makeCanvas);
  // Garment silhouettes can be narrower than the naked calves in drawn attacks.
  // Occlude only that body layer at native resolution, never resize or rewrite assets.
  if(r.bodyOcclusion){
   const o=r.bodyOcclusion,l=d.layers.find(l=>l.id===o.layerId),key=l?.frames?.[frame]||l?.source;
   if(!key||l.binding.kind!=='fixed'||!Number.isInteger(o.belowPhysicalY)||o.belowPhysicalY<0||o.belowPhysicalY>ctx.canvas.height)throw Error('Invalid native body occlusion');
   const im=map.get(key);let surface;
   if(ctx.canvas.ownerDocument){surface=ctx.canvas.ownerDocument.createElement('canvas');surface.width=im.width;surface.height=im.height;}
   else if(typeof OffscreenCanvas!=='undefined')surface=new OffscreenCanvas(im.width,im.height);
   else if(typeof require==='function')surface=require('@napi-rs/canvas').createCanvas(im.width,im.height);
   else throw Error('Native body occlusion surface unavailable');
   const sc=surface.getContext('2d');sc.imageSmoothingEnabled=false;sc.drawImage(im,0,0);sc.clearRect(0,o.belowPhysicalY,surface.width,surface.height-o.belowPhysicalY);map.set(key,surface);
  }
  const pack=hiddenSlots.length?{...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}}:p;
  if(r.mirrorLayerIDs?.length){
   // WEST base rasters remain EAST originals; only these identified base layers
   // are mirrored. Authored WEST garment frames are already facing WEST.
   const ids=new Set(r.mirrorLayerIDs),layers=pack.directions[r.direction].layers;
   if(r.direction!=='west'||[...ids].some(id=>!d.layers.some(l=>l.id===id)))throw Error('Invalid per-layer source mirror');
   ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
   for(const planned of vendor.compositor.plan(pack,r.direction,frame)){
    const l=layers.find(l=>l.id===planned.id);
    ctx.save();
    if(ids.has(l.id)){ctx.translate(p.pivot.x*8,0);ctx.scale(-1,1);}
    vendor.compositor.render(ctx,{...pack,directions:{[r.direction]:{...pack.directions[r.direction],layers:[l]}}},map,{direction:r.direction,frame,density:4,clear:false});
    ctx.restore();
   }
  }else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame,density:4});return {width:ctx.canvas.width,height:ctx.canvas.height,density:4,pivot:{x:p.pivot.x*4,y:p.pivot.y*4},logicalFrame:p.frame,source:r.id,frames:d.clip.frames,rest:d.rest,pose:d.poses[frame],status:r.status};
 }
 function renderWithHead(ctx,r,images,headTile,options={}){
  const d=r.pack.directions[r.direction],anchor=d.layers.find(l=>l.slot==='headBase');
  if(!anchor||headTile.width!==ctx.canvas.width||headTile.height!==ctx.canvas.height)throw Error('Separated native outfit head required');
  const source='native-outfit-head:'+r.id,layers=d.layers.filter(l=>!['headBase','face','hair'].includes(l.slot)).concat({...anchor,source,frames:undefined});
  const pack={...r.pack,directions:{[r.direction]:{...d,layers}}},adapted={...r,pack,sourceRefs:[...new Set(layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))]},map=new Map(images);
  map.set(prefix+source+'.png',headTile);
  return render(ctx,adapted,map,options);
 }
 return {resolve,resolveIndependentPants,bindAnatomy,requiredFiles,render,renderWithHead};
}
const api={create,composeSlots,withStrictSouthAppearance};root.MareReworkModularOutfitsHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
