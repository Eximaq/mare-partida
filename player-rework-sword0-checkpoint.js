(function(root){'use strict';
// Use archive-bound layer sources only after existing SelectVisual routes
// have reported no match. Source verification happens once at provider startup.
const claims={
 pants:new Set(['shorts']),
 boots:new Set(),
 gloves:new Set(['left-hand','right-hand','left-hand-foreground','right-hand-foreground'])
};
// The warmed points are gold/copper/red glove trim, not the original bare hand.
// Use this limited material exemption only for the exact four-direction source rows.
const extraGloveFingerprints={"145":"de6be91100239389ce4b517e72d187243b0f749741167e284e8fe054e89069aa","166":"30c5dee6760ccb8a3ab6dbae45c2e361e0f8d667f26573d4e5442e4c2f2c804e","173":"09e4059dbf57a69bda4a4aacb94e73277eddaf3f1e597c29c9c10b1df3c5ff95"};
const alphaGlovePoseProof={"north":{"archive":"98ac4306ef7c943533c62d8f87cac832347ab418e37d6fd32f8744a26170867c","geometry":"3c61d60fc2af4d716fe1245e84fba5e8a20bc6245dc82c3939093cf186a19409","items":[25,131,138,152,180]},"south":{"archive":"c158c6f8b1ea64f35e8422b97ab28627ce9d30c7be5faf053d93696fee26952e","geometry":"1677b44126922ea62f914b848fd0c7b20ef8b9af6ea0d93ad2856ade2415e36d","items":[131,180]},"east":{"archive":"14ff1e6eeb7998347aeaa7241f8def84b65fc86211192cd2886a1c3c34b37305","geometry":"cab0c49e97383daab64a24b090396710dee1f1f41d5204f7f03f6fbe14f6b64f","items":[131,180]},"west":{"archive":"c73c2981670b77c8f35bb6db5cb1915deefe6977d5d2e6c03fe16fe40a70be08","geometry":"226b3d9185807893c42ab805ef18dad22d2176529fd6c4d7200b50fb01f13bca","items":[131,180]}};
// These pinholes are enclosed in the exact body-only authored P22 proof.
 // Keep only the original opaque native shorts samples with the signed pose.
const sideP22Pinholes={east:[[],[[290,392]],[[291,392]],[[292,392]],[],[],[],[]],
 west:[[],[[349,392]],[[348,392]],[[347,392]],[],[],[],[]]};
const sideP22Authority={east:'c6e40e645e2652402cf5be24003358ce9f111b68df70356e1654d08af6dfb2ca',
 west:'7fd64e829e288b01c329fb5db15c022cc39c9a5b5ca2a338b1666056eae04afd'};
const northGloveOnlyIds=[26,145,159,166,173];
const northGloveOnlyAuthority="32fc92593d9ee231e034c851160d07b2936e8e8995b400b229579dd928abf3eb";
// Signed rear/front boot passes on the eight-phase native lower-body pose.
// Weapon art is handled by its own unchanged renderer depth, not a slot key.
const northIsolatedBootIds=[8,134,141,155];
const northBootAuthority='d0a1c4f3fa59390df8e0f35933bc3e25cdd382919b843ba6e6631c45e5ec1e6b';
const northBootGeometry='3c61d60fc2af4d716fe1245e84fba5e8a20bc6245dc82c3939093cf186a19409';
// Southern B176/B183 were replayed against the exact signed pose with
// two independently authored blade tracks and an existing independent glove.
const extraBootAuthority={"north":{"items":[148],"geometry":"3c61d60fc2af4d716fe1245e84fba5e8a20bc6245dc82c3939093cf186a19409","passes":"596682662d93210b3afe4d46d634300567e6cffa9d87901cdf511907ad661f53"},"south":{"items":[8,9,134,148,162,176,183],"geometry":"1677b44126922ea62f914b848fd0c7b20ef8b9af6ea0d93ad2856ade2415e36d","passes":"5abc8fde7026469eee6b6dd1a78f7e2fc696a780d91831a27ea2e88fdb4c2ac1"}};
const family=new Set([1,67,68,69,70]);
function ownWeaponStates(origin,direction,item,{reference,donor}={}){
 if(!family.has(item)||!reference||!donor||reference.item!==0||donor.item!==item||
    [reference,donor].some((r,i)=>r.body!=='female'||r.hdKind!=='female-equipment'||r.direction!==direction||r.action!=='attack-sword'||
      !r.id.startsWith('female'+(i?item:0)+'-attack-sword-'+direction+'-candidate')||
      r.checkpointSources||r.outfitSources||!Number.isSafeInteger(r.paddingPhysical)||r.paddingPhysical<0||r.paddingPhysical>64||r.sourceRasterPadding!==undefined))return null;
 const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
 const material=({id,...rest})=>rest;
 const {states:source,baseRecord:sourceBase,material:sourceMaterial}=reference;
 const {states,baseRecord,material:targetMaterial}=donor;
 if(!eq(baseRecord,sourceBase)||!eq(donor.pack,reference.pack)||reference.sourceBaseId!==origin.sourceBaseId||donor.sourceBaseId!==reference.sourceBaseId||
    !eq(donor.colorAppearance,reference.colorAppearance)||!eq(reference.colorAppearance,origin.colorAppearance)||
    !!sourceMaterial!==!!targetMaterial||sourceMaterial&&!eq(material(sourceMaterial),material(targetMaterial))||
    !Array.isArray(states)||states.length!==8||source?.length!==8||!eq(source,origin.states))return null;
 const state=({parts,...rest})=>rest;
 const part=({matrix,sha256,url,sourceNativeSize,...rest})=>rest;
 if(!states.every((s,i)=>s.parts?.length===1&&source[i].parts?.length===1&&eq(state(s),state(source[i]))&&
    eq(part(s.parts[0]),part(source[i].parts[0]))&&
    s.parts[0].url==='tools/rework-weapon-layers-hd/assets/'+s.parts[0].sha256+'.png'&&/^[a-f0-9]{64}$/.test(s.parts[0].sha256)&&
    s.parts[0].matrix?.length===6&&s.parts[0].matrix.every(Number.isFinite)))return null;
 return states;
}
const geometry=({id,material,colorAppearance,...source})=>JSON.stringify(source);
const materialIdentity=({id,skinColor,hairColor,eyeColor,registeredBlueIris,...source})=>JSON.stringify(source);
const supportedEyePalettes=new Set(['blue','brown','green','gray','amber','violet']);
function matchesSavedColors(origin,proof){
 const m=origin?.material,c=origin?.colorAppearance;
 if(!proof||!m||!c||m.sourceScale!==1||m.style!=='cropped'||m.eyeStyle!==null||m.gearRecord||
    c.gender!=='feminino'||c.hairStyle!=='hair-cropped'||c.eyeStyle!=='original'||c.skinStyle!=='natural'||
    c.skinColor!==m.skinColor||c.hairColor!==m.hairColor||c.eyeColor!==m.eyeColor||
    !Object.hasOwn(root.MareAppearance96?.skins||{},m.skinColor)||!Object.hasOwn(root.MareAppearance96?.hairs||{},m.hairColor)||
    (m.eyeColor==='blue')!==!!m.registeredBlueIris||!supportedEyePalettes.has(m.eyeColor)||!Object.hasOwn(root.MareCharacterAppearance?.eyes||{},m.eyeColor))return false;
 return geometry(origin)===proof.geometry&&materialIdentity(m)===proof.material;
}
function create(catalog,accepted,normalizedGloves,colors,gloveOnlyVerified,northIsolatedPack,certifiedGlovePoses,extraBootPacks,pants22Packs){
 const allowed=new Set(catalog.assetHashes);
 // Preserve the signed pose identifier for the mounting certificate and
 // diagnostics. It is not used to choose the art on the shared World path.
 const poseKey=direction=>Object.hasOwn(catalog.guards,direction)?
  ['female','attack-sword',direction,catalog.guards[direction]].join('/'):null;
 const pieces=new Map(),sourceRows=[];
 for(const row of catalog.records){
  const pose=poseKey(row.direction);
  if(!pose||!Object.hasOwn(claims,row.slot)||!Number.isSafeInteger(row.item)||row.item<0||
     !Array.isArray(row.layers)||!row.layers.length)return null;
  const key=[pose,row.slot,row.item].join('/');
  if(pieces.has(key)||row.layers.length!==new Set(row.layers.map(l=>l.id)).size)return null;
  const refs=[...new Set(row.layers.flatMap(l=>l.frames||[l.source]))];
  if(refs.some(h=>!allowed.has(h)))return null;
  const source={...row,pose,refs};
  pieces.set(key,source);
  sourceRows.push({slot:row.slot,item:row.item,body:'female',action:'attack-sword',direction:row.direction,source});
 }
 const ownLayers=root.MareReworkModularOutfitsHD?.createOwnLayerIndex(sourceRows);
 const registered=(direction,slot,item)=>{
  // Standalone signed archive verifier can run without the World module.
  if(!ownLayers)return pieces.get([poseKey(direction),slot,item].join('/'));
  const layer=ownLayers.resolve({slot,item,body:'female',action:'attack-sword',direction});
  return layer.state==='available'&&!layer.mirrorX?layer.source:null;
 };
 // Call only once the receiving pack and own weapon have passed native pose guards.
 const composePoseSlots=(receiver,direction,requests)=>{
  const stable=receiver.pack.directions[direction];
  if(!stable||stable.clip.frames!==8)return null;
  const selected=requests.map(([slot,v])=>registered(direction,slot,v.item));
  if(selected.some(x=>!x))return null;
  const replaced=new Set(selected.flatMap(x=>[...claims[x.slot]]));
  const layers=stable.layers.filter(l=>!replaced.has(l.id)).concat(selected.flatMap(x=>x.layers));
  if(layers.length!==new Set(layers.map(l=>l.id)).size)return null;
  const refs=[...new Set(selected.flatMap(x=>x.refs))];
  const pack={...receiver.pack,directions:{...receiver.pack.directions,[direction]:{...stable,layers}}};
  return {pack,refs,baseRecord:{...receiver.baseRecord,pack,
   sourceRefs:[...new Set([...receiver.baseRecord.sourceRefs,...refs])]}};
 };
 const applies=(origin,direction)=>accepted[direction]?.includes(JSON.stringify(origin))||matchesSavedColors(origin,colors[direction]);
 function resolve(origin,direction,visible,authority){
  const item=visible.weapon?.item;
  if(!origin||!applies(origin,direction)||item!==catalog.weapon&&!family.has(item)||visible.torso?.item!==catalog.coat)return null;
  const requested=Object.entries(visible).filter(([slot])=>Object.hasOwn(claims,slot));
  if(!requested.length&&item===catalog.weapon||Object.keys(visible).some(s=>!(Object.hasOwn(claims,s)||s==='weapon'||s==='torso')))return null;
  // Individually sourced hems/cuffs do not prove contact between both slots.
  // Independent shaft/sole pairs are gated by the tested seam. P21 has
  // an uncovered gap; B148/B162/B169/B183 are known only on the North P22 rig.
  const checkedHem=visible.pants?.item===22&&(visible.boots?.item===9||
    direction==='north'&&[148,162,169,183].includes(visible.boots?.item));
  if(visible.pants&&visible.boots&&!checkedHem)return null;
  if(origin.material?.skinColor&&visible.gloves&&
     (!normalizedGloves.has(visible.gloves.item)||
      [...claims.gloves].some(id=>origin.skinRepairLayers?.includes(id))))return null;
  const states=item===catalog.weapon?origin.states:ownWeaponStates(origin,direction,item,authority),checked=catalog.states[direction];
  // Archive rotation trials are not the signed authority for any of these slots.
  const contact=rows=>rows.map(({parts,...state})=>({...state,parts:parts.map(({matrix,...part})=>part)}));
  if(states?.length!==8||checked?.length!==8||JSON.stringify(contact(origin.states))!==JSON.stringify(contact(checked)))return null;
  const owned=composePoseSlots(origin,direction,requested);
  if(!owned)return null;
  const {pack,refs,baseRecord}=owned;
  const source=origin.id,slotRoutes=Object.fromEntries(Object.entries(visible).map(([slot,v])=>[v.key,{item:v.item,quality:'hd',source:slot==='weapon'&&item!==catalog.weapon?authority.donor.id:source}]));
  return {...origin,item,...(item===catalog.weapon?{}:{paddingPhysical:authority.donor.paddingPhysical}),pack,states,id:source+':portable-sword'+item+':'+JSON.stringify(slotRoutes),slotRoutes,layeredSlots:true,omitted:[],
   baseRecord,
   checkpointSources:refs};
 }
 function canUseNorthIsolatedBoot(direction,visible){
  return direction==='north'&&!!northIsolatedPack&&!!visible?.weapon&&northIsolatedBootIds.includes(visible.boots?.item);
 }
 // Attach the registered boot to the certified body pose, not to a list
 // of swords. Keep every weapon part in its own approved depth order.
 // Antialias on the blade may blend the new background; no garment is
 // allowed to obscure a blade rendered above the two signed boot planes.
 function northBootFitsReceiver(bare,item){
  if(!northIsolatedPack||JSON.stringify(bare?.pack)!==northIsolatedPack||
     JSON.stringify(bare.baseRecord?.pack)!==northIsolatedPack)return false;
  const row=registered('north','boots',item);
  if(!row||row.layers.length!==4||row.layers.some(l=>l.binding?.kind!=='fixed'||l.depthTrack||
     l.depth!==(l.id.endsWith('-front')?4.1:-1)))return false;
  const ids=new Set(row.layers.map(l=>l.id)),front=Math.max(...row.layers.map(l=>l.depth));
  return bare.states?.length===8&&bare.states.every(st=>st?.parts?.length&&
   st.parts.every(part=>Number.isFinite(part.depth)&&part.depth>front)&&
   [...(st.hideBaseLayers||[]),...Object.keys(st.baseMasks||{})].every(id=>!ids.has(id)));
 }
 function resolveNorthIsolatedBoot(bare,direction,visible){
  if(!canUseNorthIsolatedBoot(direction,visible)||Object.keys(visible).length!==2||
    !bare||bare.item!==visible.weapon.item||bare.body!=='female'||bare.hdKind!=='female-equipment'||
    bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources||
    !bare.material?.skinColor||bare.material.gearRecord||bare.material.sourceScale!==1||
    !northBootFitsReceiver(bare,visible.boots.item))return null;
  const result=composePoseSlots(bare,direction,[['boots',visible.boots]]);
  if(!result)return null;
  const {pack,refs,baseRecord}=result, boot=visible.boots.item;
  return {...bare,id:bare.id+':checkpoint-b'+boot+'-north-no-coat',pack,baseRecord,
   checkpointSources:refs,slotRoutes:{[visible.weapon.key]:{item:bare.item,quality:'hd',source:bare.id},
   [visible.boots.key]:{item:boot,quality:'hd',source:poseKey(direction)+'/boots/'+boot}},layeredSlots:true,omitted:[]};
 }
 function resolveAdditionalIsolatedBoot(bare,direction,visible){
  const item=visible?.boots?.item, weapon=visible?.weapon, side=extraBootPacks[direction];
  if(!side||!extraBootAuthority[direction]?.items.includes(item)||!weapon||Object.keys(visible).length!==2||
     !bare||bare.item!==weapon.item||bare.body!=='female'||bare.hdKind!=='female-equipment'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources||
     !bare.material?.skinColor||bare.material.gearRecord||bare.material.sourceScale!==1||
     JSON.stringify(bare.pack)!==side||JSON.stringify(bare.baseRecord?.pack)!==side)return null;
  const row=registered(direction,'boots',item);
  const isSouth=direction==='south',frontDepth=isSouth?4.01:4.1;
  if(!row||row.layers.length!==4||row.layers.some(l=>l.binding?.kind!=='fixed'||l.depthTrack||
     l.depth!==(l.id.endsWith('-front')?(isSouth?45:frontDepth):-1)||l.frames?.length!==8))return null;
  const ids=new Set(row.layers.map(l=>l.id)),front=frontDepth;
  if(bare.states?.length!==8||bare.states.some(s=>!s?.parts?.length||
     s.parts.some(part=>!Number.isFinite(part.depth)||part.depth<=front)||
     [...(s.hideBaseLayers||[]),...Object.keys(s.baseMasks||{})].some(id=>ids.has(id))))return null;
  const result=composePoseSlots(bare,direction,[['boots',visible.boots]]);
  if(!result)return null;
  let {pack,refs,baseRecord}=result;
  // In South these shafts touch only the native legs/shorts. Their rendered
  // contribution on all eight bare phases is identical at 45 and 4.01.
  // Put the front pass just above shorts, not over a sword at depth 7.81.
  if(isSouth){
   const r=pack.directions[direction];
   pack={...pack,directions:{...pack.directions,[direction]:{...r,layers:r.layers.map(l=>ids.has(l.id)&&l.depth===45?{...l,depth:frontDepth}:l)}}};
   baseRecord={...baseRecord,pack};
  }
  return {...bare,id:bare.id+':own-boot:'+item,pack,baseRecord,checkpointSources:refs,
   slotRoutes:{[weapon.key]:{item:bare.item,quality:'hd',source:bare.id},
    [visible.boots.key]:{item,quality:'hd',source:row.pose+'/boots/'+item}},layeredSlots:true,omitted:[]};
 }
 // Verified sword poses may omit the coat without substituting the lower pose.
 function resolveBareLower(origin,bare,direction,visible,reference,slot){
  const item=visible.weapon?.item,boot=visible.boots?.item,isPants=slot==='pants';
  const north=direction==='north',side=['east','west'].includes(direction);
  if(!(isPants?visible.pants?.item===22&&[0,...family].includes(item)&&(north||side||direction==='south'):boot===9&&(side?item===0:['north','south'].includes(direction)&&[0,1,67,68,70].includes(item))||boot===148&&(north&&[0,1,67,68,69,70].includes(item)||direction==='south'&&[0,1,67,68,70].includes(item)||side&&item===0)||boot===134&&direction==='south'&&[0,1,67,68,70].includes(item)||boot===8&&direction==='south'&&[0,1,67,68,70].includes(item)||boot===155&&direction==='south'&&[0,1,67,68,70].includes(item)||boot===162&&direction==='south'&&[0,1,67,68,70].includes(item)||boot===176&&direction==='south'&&[0,67,70].includes(item)||boot===183&&(north&&[0,1,67,68,69,70].includes(item)||direction==='south'&&[0,1,67,70].includes(item)))||
     Object.keys(visible).length!==2||!origin||!bare||bare.item!==item||bare.body!=='female'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources)return null;
  const expected=item===0?bare:reference;
  if(!expected||expected.item!==0)return null;
  const authority=item===0?undefined:{reference:expected,donor:bare};
  const checked=resolve(origin,direction,{...visible,torso:{item:151,key:'coat'}},authority);
  if(!checked)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),x=bare.pack.directions[direction],y=origin.pack.directions[direction];
  const shared=({id,item,states,sourcePixelPolicy,paddingPhysical,...r})=>r;
  if(item!==0&&(!eq(checked.states,bare.states)||!eq(shared(bare),shared(expected))||
     checked.paddingPhysical!==bare.paddingPhysical))return null;
  const joints=(a,b)=>Object.entries(a).every(([k,v])=>eq(v,b[k]))&&Object.keys(b).every(k=>Object.hasOwn(a,k)||(side?/^cloth1[AB]$/:north?/^cloth[23][AB]$/:/^cloth[36][AB]$/).test(k));
  const expectedSide={
   'coat151-far-derived-sleeve':10,'coat151-near-derived-sleeve':30,'coat151-native-fabric-side-lining':20,
   'coat151-upper-core':20,'coat151-lower-core':20,'coat151-lower-hem':20,'coat151-rear-openings-lower':-1,
   'original-neck-coverage-only-core':20,'original-neck-coverage-only-upper':31
  };
  const coats=y.layers.filter(l=>side?Object.hasOwn(expectedSide,l.id):l.id.startsWith(north?'coat151-whole-':'coat151-'));
  const owned=[...new Set(coats.flatMap(l=>l.frames||[l.source]))];
  if(!eq(owned,origin.outfitSources)||!eq(owned,Object.keys(origin.sourceRasterPadding||{})))return null;
  const nonCoat=y.layers.filter(l=>!coats.includes(l));
  const pieces=checked.pack.directions[direction].layers.filter(l=>!y.layers.includes(l));
  const shape=({id,baseRecord,pack,outfitSourceId,outfitSources,sourceRasterPadding,...r})=>r;
  if(!eq(shape(expected),shape(origin))||!['frame','pivot','density'].every(k=>eq(bare.pack[k],origin.pack[k]))||
     !eq(x.clip,y.clip)||!joints(x.rest,y.rest)||x.poses.length!==y.poses.length||
     x.poses.some((pose,i)=>!joints(pose,y.poses[i]))||!eq(x.layers,nonCoat)||coats.length!==(side?9:north?4:7)||
     coats.some(l=>side?l.depth!==expectedSide[l.id]:l.depth!==100&&(north||l.depth!==-1))||
     !(isPants?x.layers.filter(l=>claims.pants.has(l.id)).length===1&&pieces.length===1&&
       pieces[0].id===(side?'pants22':north?'pants22-independent':'pants22-independent-sword')&&pieces[0].slot==='pants'&&
       pieces[0].depth===(side?3:4)&&pieces[0].binding?.kind==='fixed'&&pieces[0].frames?.length===8&&
       !pieces[0].depthTrack&&pieces[0].frames.every(h=>allowed.has(h)&&!bare.baseRecord.sourceRefs.includes(h)):
       pieces.length===(side?2:4)&&
       (side?['rear','front']:['left-rear','left-front','right-rear','right-front']).every(id=>pieces.some(l=>l.id==='boot'+boot+'-'+id&&
        l.depth===(id.endsWith('rear')?-1:side?3.01:north?4.1:45)&&l.binding?.kind==='fixed'&&l.frames?.length===8)))||
     !eq(bare.baseRecord.pack,bare.pack))return null;
  const slotRecord=registered(direction,slot,visible[slot].item);
  if(!slotRecord||!eq(pieces,slotRecord.layers))return null;
  const result=composePoseSlots(bare,direction,[[slot,visible[slot]]]);
  if(!result||!eq(result.refs,checked.checkpointSources))return null;
  const {pack,refs,baseRecord}=result;
  return {...bare,id:bare.id+':checkpoint-'+(isPants?'p22':'b'+boot)+'-'+direction+'-no-coat',pack,
   baseRecord,
   checkpointSources:refs,slotRoutes:{[visible.weapon.key]:{item,quality:'hd',source:bare.id},
    [visible[slot].key]:{item:visible[slot].item,quality:'hd',source:checked.id}},layeredSlots:true,omitted:[]};
 }
 function resolveBootOnly(origin,bare,direction,visible,reference){return resolveBareLower(origin,bare,direction,visible,reference,'boots');}
 function resolvePantsOnly(origin,bare,direction,visible,reference){return resolveBareLower(origin,bare,direction,visible,reference,'pants');}
 function resolveNorthGloveOnly(origin,bare,direction,visible,reference){
  const item=visible.weapon?.item,g=visible.gloves?.item;
  if(!gloveOnlyVerified||direction!=='north'||![0,1,67,68,69,70].includes(item)||!northGloveOnlyIds.includes(g)||
     Object.keys(visible).length!==2||!origin||!bare||bare.item!==item||bare.body!=='female'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources)return null;
  const expected=item===0?bare:reference;
  if(!expected||expected.item!==0)return null;
  const checked=resolve(origin,direction,{...visible,torso:{item:151,key:'coat'}},
   item===0?undefined:{reference:expected,donor:bare});
  if(!checked||item!==0&&checked.paddingPhysical!==bare.paddingPhysical)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),x=bare.pack.directions.north,y=origin.pack.directions.north;
  const nonCoat=y.layers.filter(l=>!l.id.startsWith('coat151-whole-')),coats=y.layers.filter(l=>!nonCoat.includes(l));
  const owned=[...new Set(coats.flatMap(l=>l.frames||[l.source]))];
  const shape=({id,baseRecord,pack,outfitSourceId,outfitSources,sourceRasterPadding,...r})=>r;
  const joints=(a,b)=>Object.entries(a).every(([k,v])=>eq(v,b[k]))&&Object.keys(b).every(k=>Object.hasOwn(a,k)||/^cloth[23][AB]$/.test(k));
  if(coats.length!==4||coats.some(l=>l.depth!==100)||!eq(owned,origin.outfitSources)||
     !eq(owned,Object.keys(origin.sourceRasterPadding||{}))||!eq(shape(expected),shape(origin))||
     !['frame','pivot','density'].every(k=>eq(bare.pack[k],origin.pack[k]))||!eq(x.clip,y.clip)||!joints(x.rest,y.rest)||
     !eq(x.layers,nonCoat)||x.poses.length!==8||x.poses.some((pose,i)=>!joints(pose,y.poses[i]))||
     !eq(bare.baseRecord.pack,bare.pack)||!eq(checked.states,bare.states))return null;
  const layers=registered('north','gloves',g)?.layers;
  if(layers?.length!==2||!['left-hand','right-hand'].every((id,i)=>{
   const l=layers[i],b=x.layers.find(q=>q.id===id);
   return l.id===id&&b?.binding?.kind==='fixed'&&l.binding?.kind==='fixed'&&l.depth===b.depth&&l.frames.length===8;
  }))return null;
  const refs=[...new Set(layers.flatMap(l=>l.frames))];
  if(!eq(refs,checked.checkpointSources))return null;
  const pack={...bare.pack,directions:{...bare.pack.directions,north:{...x,layers:x.layers.map(l=>layers.find(q=>q.id===l.id)||l)}}};
  return {...bare,id:bare.id+':checkpoint-g'+g+'-north-no-coat',pack,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...refs])]},
   checkpointSources:refs,slotRoutes:{[visible.weapon.key]:{item,quality:'hd',source:bare.id},
    [visible.gloves.key]:{item:g,quality:'hd',source:checked.id}},layeredSlots:true,omitted:[]};
 }
 // The sealed archive's Cropped appearance certifies the hands, not the
 // receiving head. Copy only the exact glove-owned passes after verifying
 // the saved Original head's bare renderer uses identical limb/weapon phases.
 function northGloveWitnessLook(skinColor){
  if(!gloveOnlyVerified||!Object.hasOwn(root.MareCharacterAppearance?.skins||{},skinColor))return null;
  return root.MareCharacterAppearance.normalize({...catalog.appearance96,skinColor});
 }
 function resolveNorthGloveOnOriginal(bare,witnessBare,witnessWithGlove,visible){
  const direction='north',weapon=visible.weapon,glove=visible.gloves,material=bare?.material,saved=bare?.colorAppearance;
  if(!gloveOnlyVerified||!bare||!witnessBare||!witnessWithGlove||!glove||!weapon||Object.keys(visible).length!==2||
     bare.body!=='female'||bare.action!=='attack-sword'||bare.direction!==direction||bare.hdKind!=='female-equipment'||
     bare.item!==weapon.item||witnessBare.item!==weapon.item||witnessWithGlove.item!==weapon.item||
     bare.outfitSources||bare.checkpointSources||bare.sourceRasterPadding||bare.skinRepairLayers?.length||
     saved?.gender!=='feminino'||saved.hairStyle!=='original'||saved.hairColor!=='black'||saved.eyeStyle!=='original'||saved.eyeColor!=='blue'||
     saved.skinStyle!=='natural'||material?.style!=='original'||material.sourceScale!==1||material.gearRecord||
     material.skinColor!==saved.skinColor||material.hairColor!==saved.hairColor||material.eyeColor!=null&&material.eyeColor!==saved.eyeColor||
     witnessBare?.material?.skinColor!==material.skinColor||
     bare.sourceBaseId!==witnessBare.sourceBaseId||bare.paddingPhysical!==witnessBare.paddingPhysical||
     witnessWithGlove.paddingPhysical!==bare.paddingPhysical)return null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),signed=registered(direction,'gloves',glove.item),
   original=bare.pack.directions[direction],certified=witnessWithGlove.pack.directions[direction],hands=new Set(['left-hand','right-hand']);
  const sameSiblings=l=>l.filter(q=>!hands.has(q.id));
  if(!signed||signed.layers?.length!==2||!same(signed.refs,witnessWithGlove.checkpointSources)||
     !same(bare.states,witnessBare.states)||!same(bare.states,witnessWithGlove.states)||
     !same(bare.pack,witnessBare.pack)||!same(bare.baseRecord.pack,bare.pack)||
     !same(sameSiblings(certified.layers),sameSiblings(original.layers))||
     !same(signed.layers,certified.layers.filter(l=>hands.has(l.id)))||
     bare.states.length!==8||bare.states.some(s=>[...(s.hideBaseLayers||[]),...Object.keys(s.baseMasks||{})].some(x=>hands.has(x)))||
     !['left-hand','right-hand'].every((id,i)=>{
      const l=signed.layers[i],base=original.layers.find(x=>x.id===id);
      return l.id===id&&l.binding?.kind==='fixed'&&base?.binding?.kind==='fixed'&&l.depth===base.depth&&l.frames?.length===8;
     }))return null;
  const layers=original.layers.map(l=>signed.layers.find(q=>q.id===l.id)||l),
   pack={...bare.pack,directions:{...bare.pack.directions,north:{...original,layers}}};
  return {...bare,id:bare.id+':own-registered-north-glove:'+glove.item,pack,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...signed.refs])]},
   checkpointSources:signed.refs,slotRoutes:{[weapon.key]:{item:weapon.item,quality:'hd',source:bare.id},
    [glove.key]:{item:glove.item,quality:'hd',source:signed.pose+'/gloves/'+glove.item}},layeredSlots:true,omitted:[]};
 }
 // Cropped is a witness only. Preserve the Original receiver and transplant
 // the existing North P22 pass after matching complete pre-garment geometry.
 function resolveNorthPantsOnOriginal(bare,witness,worn,visible){
  const direction='north',p=visible?.pants,w=visible?.weapon,m=bare?.material,c=bare?.colorAppearance;
  if(!bare||!witness||!worn||!p||p.item!==22||!w||Object.keys(visible).length!==2||
     !certifiedGlovePoses.north||bare.body!=='female'||bare.action!=='attack-sword'||bare.direction!==direction||
     bare.hdKind!=='female-equipment'||bare.item!==w.item||m?.style!=='original'||m.sourceScale!==1||
     m.gearRecord||c?.gender!=='feminino'||c.skinStyle!=='natural'||c.hairStyle!=='original'||
     c.hairColor!=='black'||c.eyeStyle!=='original'||c.eyeColor!=='blue'||m.skinColor!==c.skinColor||
     witness.material?.skinColor!==m.skinColor||bare.outfitSources||bare.checkpointSources||bare.sourceRasterPadding||
     bare.skinRepairLayers?.length||worn.omitted?.length||worn.slotRoutes?.[p.key]?.item!==22||
     worn.slotRoutes?.[p.key]?.quality!=='hd')return null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const view=({id,material,colorAppearance,...x})=>x;
  if(!same(view(bare),view(witness))||!same(bare.pack,bare.baseRecord.pack))return null;
  const plan=composePoseSlots(bare,direction,[['pants',p]]);
  if(!plan||!same(plan.pack,worn.pack)||!same(plan.refs,worn.checkpointSources))return null;
  return {...bare,id:bare.id+':own-p22-north',pack:plan.pack,baseRecord:plan.baseRecord,checkpointSources:plan.refs,
   slotRoutes:{[w.key]:{item:w.item,quality:'hd',source:bare.id},[p.key]:worn.slotRoutes[p.key]},layeredSlots:true,omitted:[]};
 }
 function resolvePants22ByExactPose(bare,direction,visible){
  const p=visible?.pants,w=visible?.weapon,signature=pants22Packs[direction],m=bare?.material,c=bare?.colorAppearance;
  if(!signature||p?.item!==22||!w||Object.keys(visible).length!==2||
     !bare||bare.item!==w.item||bare.body!=='female'||bare.hdKind!=='female-equipment'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSources||bare.checkpointSources||
     bare.sourceRasterPadding||bare.skinRepairLayers?.length||m?.style!=='original'||m.sourceScale!==1||m.gearRecord||
     c?.gender!=='feminino'||c.skinStyle!=='natural'||c.hairStyle!=='original'||c.hairColor!=='black'||
     c.eyeStyle!=='original'||c.eyeColor!=='blue'||!m.skinColor||m.skinColor!==c.skinColor||
     JSON.stringify(bare.pack)!==signature||JSON.stringify(bare.baseRecord?.pack)!==signature)return null;
  const known=registered(direction,'pants',p.item),shorts=bare.pack.directions[direction].layers.find(l=>l.id==='shorts');
  const pinholes=sideP22Pinholes[direction],cloth=known?.layers[0],owned=new Set(['shorts',cloth?.id]);
  if(!pinholes||known?.layers.length!==1||!shorts||!cloth||shorts.depth!==cloth.depth||cloth.binding?.kind!=='fixed'||
     cloth.depthTrack||shorts.depthTrack||cloth.frames?.length!==8||bare.states?.length!==8||
     bare.states.some(s=>!s?.parts?.length||s.parts.some(part=>!Number.isFinite(part.depth)||part.depth<=cloth.depth||
      part.url!=='tools/rework-weapon-layers-hd/assets/'+part.sha256+'.png'||
      part.matrix?.length!==6||!part.matrix.every(Number.isFinite))||
      [...(s.hideBaseLayers||[]),...Object.keys(s.baseMasks||{})].some(id=>owned.has(id))))return null;
  const plan=composePoseSlots(bare,direction,[['pants',p]]);
  if(!plan)return null;
  return {...bare,id:bare.id+':own-p22-'+direction,pack:plan.pack,baseRecord:plan.baseRecord,checkpointSources:plan.refs,
   checkpointPantsApertures:{id:cloth.id,source:shorts.frames,points:pinholes},
   slotRoutes:{[w.key]:{item:w.item,quality:'hd',source:bare.id},
    [p.key]:{item:p.item,quality:'hd',source:known.pose+'/pants/'+p.item}},layeredSlots:true,omitted:[]};
 }
 function canUseVerifiedGlovePose(direction,visible){
  return !!certifiedGlovePoses?.[direction]&&!!visible?.weapon&&Object.keys(visible).length===2&&
   certifiedGlovePoses[direction].items.includes(visible.gloves?.item);
 }
 function resolveVerifiedGlovePose(bare,direction,visible){
  const worn=visible?.gloves,weapon=visible?.weapon,b=bare?.pack,d=b?.directions?.[direction],m=bare?.material,c=bare?.colorAppearance;
  if(!canUseVerifiedGlovePose(direction,visible)||!bare||bare.body!=='female'||bare.hdKind!=='female-equipment'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.item!==weapon.item||!m?.skinColor||
     m.sourceScale!==1||m.style!=='original'||m.gearRecord||c?.gender!=='feminino'||c.skinStyle!=='natural'||
     c.hairStyle!=='original'||c.hairColor!=='black'||c.eyeStyle!=='original'||c.eyeColor!=='blue'||
     c.skinColor!==m.skinColor||bare.outfitSources||bare.checkpointSources||bare.sourceRasterPadding||bare.skinRepairLayers?.length||
     JSON.stringify(b)!==certifiedGlovePoses[direction].pack||JSON.stringify(bare.baseRecord?.pack)!==certifiedGlovePoses[direction].pack)return null;
  const signed=registered(direction,'gloves',worn.item);
  if(!signed||signed.layers.length!==2)return null;
  const hands=new Set(['left-hand','right-hand']);
  if(!['left-hand','right-hand'].every(id=>{
   const l=signed.layers.find(x=>x.id===id),r=d.layers.find(x=>x.id===id);
   return l&&r&&l.depth===r.depth&&!l.depthTrack&&!r.depthTrack&&l.binding.kind==='fixed'&&r.binding.kind==='fixed'&&l.frames.length===8;
  })||bare.states?.length!==8||bare.states.some(row=>
    row.parts?.length!==1||row.parts.some(part=>!Number.isFinite(part.depth)||part.url!=='tools/rework-weapon-layers-hd/assets/'+part.sha256+'.png'||
      part.matrix?.length!==6||!part.matrix.every(Number.isFinite))||
    [...(row.hideBaseLayers||[]),...Object.keys(row.baseMasks||{})].some(id=>hands.has(id))))return null;
  // Both source alpha planes match the bare hand plane byte-for-byte.
  // Replacement at the same draw position and depth leaves all weapon
  // alpha contribution/occlusion unchanged, including translucent edges.
  const layers=d.layers.map(l=>signed.layers.find(x=>x.id===l.id)||l),
   pack={...b,directions:{...b.directions,[direction]:{...d,layers}}};
  return {...bare,id:bare.id+':own-alpha-matched-gloves:'+worn.item,pack,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...signed.refs])]},checkpointSources:signed.refs,
   slotRoutes:{[weapon.key]:{item:weapon.item,quality:'hd',source:bare.id},
    [worn.key]:{item:worn.item,quality:'hd',source:signed.pose+'/gloves/'+worn.item}},layeredSlots:true,omitted:[]};
 }
 // On the signed profile pose, the pants precede both exact-alpha hands.
 // Preserve the strict sibling's trousers and pinhole support, and replace
 // only the two hands in their existing ops without changing any depth.
 function resolveVerifiedGloveOnSidePants(bare,lower,direction,visible){
  if(!sideP22Pinholes[direction]||!visible?.weapon||!visible.gloves||!visible.pants||
     Object.keys(visible).length!==3||!lower?.checkpointPantsApertures||lower.omitted?.length||
     lower.unsupported?.length||lower.appearanceAdapted)return null;
  const {weapon,gloves,pants}=visible;
  const gloved=resolveVerifiedGlovePose(bare,direction,{weapon,gloves});
  // This is exact receiving-pose authority, never a lookup for glove art.
  const sibling=resolvePants22ByExactPose(bare,direction,{weapon,pants});
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(!gloved||!sibling||!same(sibling,lower))return null;
  const g=gloved.pack.directions[direction],b=lower.pack.directions[direction],
   hands=Object.fromEntries(g.layers.filter(l=>l.id==='left-hand'||l.id==='right-hand').map(l=>[l.id,l])),
   cloth=b.layers.find(l=>l.id===lower.checkpointPantsApertures.id);
  if(!cloth||Object.keys(hands).length!==2||Object.values(hands).some(l=>l.depth<=cloth.depth))return null;
  const pack={...lower.pack,directions:{...lower.pack.directions,[direction]:
   {...b,layers:b.layers.map(l=>Object.hasOwn(hands,l.id)?hands[l.id]:l)}}};
  return {...lower,id:lower.id+':with-alpha-matched-gloves:'+gloves.item,pack,
   baseRecord:{...lower.baseRecord,pack,sourceRefs:[...new Set([...lower.baseRecord.sourceRefs,...gloved.checkpointSources])]},
   checkpointSources:[...new Set([...lower.checkpointSources,...gloved.checkpointSources])],
   slotRoutes:{...lower.slotRoutes,[gloves.key]:gloved.slotRoutes[gloves.key]}};
 }
 // The signed fixed-raster glove and boot archives have disjoint alpha
 // supports in all eight phases: North hands y=165..366, boots y=409..511;
 // South hands y=224..362, boots y=412..518. Both authorities use the
 // same exact body/clock and preserve its weapon states. Replace the two
 // hands in-place in the boot record to keep the native ties and strata.
 function resolveVerifiedGloveAndBoot(bare,direction,visible){
  if(!['north','south'].includes(direction)||!visible?.weapon||!visible.gloves||
     !visible.boots||Object.keys(visible).length!==3)return null;
  const {weapon,gloves,boots}=visible;
  const gloved=resolveVerifiedGlovePose(bare,direction,{weapon,gloves});
  if(!gloved)return null;
  const booted=resolveNorthIsolatedBoot(bare,direction,{weapon,boots})||
   resolveAdditionalIsolatedBoot(bare,direction,{weapon,boots});
  if(!booted)return null;
  const g=gloved.pack.directions[direction],b=booted.pack.directions[direction];
  const hands=Object.fromEntries(g.layers.filter(l=>l.id==='left-hand'||l.id==='right-hand').map(l=>[l.id,l]));
  const pack={...booted.pack,directions:{...booted.pack.directions,[direction]:
   {...b,layers:b.layers.map(l=>Object.hasOwn(hands,l.id)?hands[l.id]:l)}}};
  return {...booted,id:booted.id+':with-alpha-matched-gloves:'+gloves.item,pack,
   baseRecord:{...booted.baseRecord,pack,sourceRefs:[...new Set([...booted.baseRecord.sourceRefs,...gloved.checkpointSources])]},
   checkpointSources:[...new Set([...booted.checkpointSources,...gloved.checkpointSources])],
   slotRoutes:{...booted.slotRoutes,[gloves.key]:gloved.slotRoutes[gloves.key]}};
 }
 // These independent boot mouths were checked against the same authored
 // cuff interface for all eight North pose phases. Exact layer identities
 // below bind the interface to its source, not a saved equipment set.
 const northCuffMouths=new Set([8,9,148]);
 function canUseNorthBootOnPants(direction,visible){
  return direction==='north'&&visible?.weapon&&visible.pants&&northCuffMouths.has(visible.boots?.item);
 }
 // The boot owns its four original front/rear planes, not a set ID.
 // Admit a receiving trouser source only when its actual native cuff covers
 // every certified boot mouth pixel (independent archive alpha audit).
 function resolveNorthBootOnPants(booted,panted,visible){
  const d='north',item=visible.weapon?.item,boots=visible.boots?.item,pants=visible.pants?.item;
  if(!canUseNorthBootOnPants(d,visible)||!booted||!panted||booted.omitted?.length||panted.omitted?.length||
    booted.item!==item||panted.item!==item||booted.direction!==d||panted.direction!==d||
    booted.action!=='attack-sword'||panted.action!==booted.action||booted.body!=='female'||panted.body!==booted.body||
    booted.slotRoutes?.[visible.boots.key]?.item!==boots)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const core=({id,pack,baseRecord,outfitSources,pantsSourceId,checkpointSources,slotRoutes,layeredSlots,omitted,...r})=>r;
  if(!eq(core(booted),core(panted)))return null;
  const a=booted.pack.directions[d],b=panted.pack.directions[d],{layers:x,...geoX}=a,{layers:y,...geoY}=b;
  const cloth=y.filter(l=>l.slot==='pants'),pieces=x.filter(l=>l.id.startsWith('boot'+boots+'-'));
  if(!eq(geoX,geoY)||!['frame','density','pivot'].every(k=>eq(booted.pack[k],panted.pack[k]))||
     cloth.length!==1||cloth[0].depth!==4||cloth[0].binding?.kind!=='fixed'||cloth[0].frames?.length!==8||
     !eq(x.filter(l=>l.slot!=='pants'&&!pieces.includes(l)),y.filter(l=>l.slot!=='pants'))||
     !eq(panted.baseRecord.pack,panted.pack))return null;
  const row=registered(d,'boots',boots),expectedCloth=registered(d,'pants',pants)?.layers[0];
  // Fit certificate: the opaque lower contact matches the approved B9 contact
  // over each frame. Other trouser source artwork remains indexed, but is unproven.
  const cuffCertificate=registered(d,'pants',22)?.layers[0];
  if(!row||pieces.length!==4||!eq(pieces,row.layers)||!eq(row.refs,booted.checkpointSources)||
    !expectedCloth||!eq(expectedCloth,cuffCertificate)||!eq(cloth[0],expectedCloth))return null;
  if(pieces.some(l=>y.some(k=>k.id===l.id))||row.refs.some(h=>panted.baseRecord.sourceRefs.includes(h)))return null;
  const plan=root.MareReworkModularOutfitsHD?.planIndependentPasses({
   pose:row.pose,frames:b.clip.frames,layers:y,requested:{boots:visible.boots},
   resolve:()=>({pose:row.pose,item:boots,source:booted.slotRoutes[visible.boots.key].source,layers:pieces,removed:[]})
  });
  if(!plan||plan.omitted.length)return null;
  const slotRoutes={...panted.slotRoutes,...plan.slotRoutes,
   [visible.pants.key]:{item:pants,quality:'hd',source:panted.pantsSourceId||panted.slotRoutes?.[visible.pants.key]?.source||panted.id},
   [visible.weapon.key]:booted.slotRoutes[visible.weapon.key]};
  if(Object.values(visible).some(({key,item})=>slotRoutes[key]?.item!==item||slotRoutes[key]?.quality!=='hd'))return null;
  const pack={...panted.pack,directions:{...panted.pack.directions,[d]:{...b,layers:plan.layers}}};
  return {...panted,pack,id:panted.id+':north-own-b'+boots,checkpointSources:[...new Set([...(panted.checkpointSources||[]),...row.refs])],
   baseRecord:{...panted.baseRecord,pack,sourceRefs:[...new Set([...panted.baseRecord.sourceRefs,...row.refs])]},
   slotRoutes,
   layeredSlots:true,omitted:[]};
 }
 // Both providers below attest the exact fixed-raster North sources before
 // they're exposed. Across all eight signed frames, every boot pass is
 // restricted to y>=409, and both glove passes to y<=366. Neither the
 // equipment ID of the adjacent slot nor a prebuilt outfit selects a pass.
 function resolveNorthDisjointSlots(bare,visible,solos){
  const direction='north',weapon=visible.weapon;
  const slots=Object.entries(visible).filter(([slot])=>slot!=='weapon');
  const region={boots:[409,511],gloves:[165,366]};
  const body=bare?.pack?.directions?.north;
  if(!body||bare.item!==weapon?.item||bare.action!=='attack-sword'||
     bare.direction!==direction||bare.body!=='female'||!bare.material?.skinColor||
     bare.checkpointSources||bare.outfitSources||!['boots','gloves'].every(k=>visible[k])||
     slots.some(([k])=>!Object.hasOwn(region,k))||!gloveOnlyVerified||
     !northBootFitsReceiver(bare,visible.boots.item))return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const view=({id,pack,baseRecord,checkpointSources,slotRoutes,layeredSlots,omitted,...r})=>r;
  const base=({pack,sourceRefs,...r})=>r;
  const shape=({layers,...d})=>d;
  const regions=[],passes={},refs=new Set();
  for(const [slot,v] of slots){
   const solo=solos[slot],chosen=registered(direction,slot,v.item),[min,max]=region[slot];
   if(!(slot==='boots'?northIsolatedBootIds:northGloveOnlyIds).includes(v.item)||
      regions.some(([lo,hi])=>min<=hi&&lo<=max)||
      !solo||solo.omitted?.length||!chosen||!eq(view(bare),view(solo))||
      !eq(base(bare.baseRecord),base(solo.baseRecord))||!eq(solo.baseRecord.pack,solo.pack)||
      !eq(shape(body),shape(solo.pack.directions.north))||
      !eq(chosen.refs,solo.checkpointSources)||
      solo.slotRoutes?.[weapon.key]?.item!==weapon.item||solo.slotRoutes?.[v.key]?.item!==v.item||
      solo.slotRoutes?.[v.key]?.quality!=='hd')return null;
   const list=solo.pack.directions.north.layers,own=chosen.layers;
   if(!eq(list.filter(l=>own.some(q=>q.id===l.id)),own)||
      !eq(list.filter(l=>!own.some(q=>q.id===l.id)),body.layers.filter(l=>!own.some(q=>q.id===l.id))))return null;
   const removed=[];
   for(const l of own){
    const old=body.layers.find(x=>x.id===l.id);
    if(l.binding?.kind!=='fixed'||l.frames?.length!==body.clip.frames||
       (!!old!==(slot==='gloves'))||old&&(old.depth!==l.depth||old.binding?.kind!=='fixed'))return null;
    if(old)removed.push(old.id);
   }
   const item=v.item;
   passes[slot]={pose:chosen.pose,item,source:solo.slotRoutes[v.key].source,layers:own,removed};
   chosen.refs.forEach(h=>refs.add(h));regions.push([min,max]);
  }
  const plan=root.MareReworkModularOutfitsHD?.planIndependentPasses({
   pose:poseKey(direction),frames:body.clip.frames,layers:body.layers,requested:Object.fromEntries(slots),
   resolve:slot=>passes[slot]
  });
  if(!plan||plan.omitted.length)return null;
  const pack={...bare.pack,directions:{...bare.pack.directions,north:{...body,layers:plan.layers}}};
  const slotRoutes={[weapon.key]:{item:weapon.item,quality:'hd',source:bare.id},...plan.slotRoutes};
  return {...bare,id:bare.id+':independent-north-strata:'+JSON.stringify(slotRoutes),
   pack,baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...refs])]},
   checkpointSources:[...refs],slotRoutes,layeredSlots:true,omitted:[]};
 }
 function resolveNorthGloveOnLowerPose(gloved,lower,direction,visible){
  const item=visible.weapon?.item,g=visible.gloves?.item,p=visible.pants?.item,wornBoot=visible.boots;
  const alphaMatched=certifiedGlovePoses.north?.items.includes(g)===true;
  if(direction!=='north'||(!northGloveOnlyIds.includes(g)&&!(alphaMatched&&p===22))||![22,182].includes(p)||
     Object.keys(visible).some(slot=>!['weapon','pants','boots','gloves'].includes(slot))||
     !gloved||!lower||gloved.item!==item||lower.item!==item||gloved.body!=='female'||lower.body!=='female'||
     gloved.action!=='attack-sword'||lower.action!==gloved.action||gloved.direction!==direction||lower.direction!==direction||
     gloved.slotRoutes?.[visible.gloves.key]?.item!==g||gloved.outfitSources||lower.omitted?.length||
     wornBoot&&lower.slotRoutes?.[wornBoot.key]?.item!==wornBoot.item)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const shape=({id,pack,baseRecord,outfitSources,pantsSourceId,checkpointSources,slotRoutes,layeredSlots,omitted,...r})=>r;
  if(!eq(shape(gloved),shape(lower)))return null;
  const a=gloved.pack.directions.north,b=lower.pack.directions.north;
  const {layers:x,...poseX}=a,{layers:y,...poseY}=b,hands=new Set(['left-hand','right-hand']);
  const cloth=y.find(l=>l.id===(p===182?'pants182-independent-sword':'pants22-independent'));
  const pantsRow=registered(direction,'pants',p),bootRow=wornBoot&&registered(direction,'boots',wornBoot.item);
  const gloveRow=registered(direction,'gloves',g),gloveLayers=x.filter(l=>hands.has(l.id));
  if(!eq(poseX,poseY)||!['frame','density','pivot'].every(k=>eq(gloved.pack[k],lower.pack[k]))||
     !cloth||cloth.slot!=='pants'||cloth.binding?.kind!=='fixed'||cloth.frames?.length!==8||
     x.find(l=>l.id==='shorts')?.depth!==cloth.depth||!eq(gloveRow?.layers,gloveLayers)||
     !eq(gloveRow?.refs,gloved.checkpointSources)||
     ![...hands].every(id=>x.find(l=>l.id===id)?.depth===y.find(l=>l.id===id)?.depth&&
       eq(x.find(l=>l.id===id)?.binding,y.find(l=>l.id===id)?.binding)))return null;
  const boots=wornBoot?y.filter(l=>l.id.startsWith('boot'+wornBoot.item+'-')):[];
  const preserve=l=>!hands.has(l.id)&&l.slot!=='pants'&&!boots.includes(l);
  if(!eq(x.filter(preserve),y.filter(preserve)))return null;
  if(p===182){
   if(wornBoot||lower.checkpointSources||lower.pantsSourceId!=='female-pants182-sword-attack-sword-north'||
      !eq([...new Set(lower.outfitSources)].sort(),[...new Set(cloth.frames)].sort()))return null;
  }else{
   if(!eq(pantsRow?.layers,[cloth])||wornBoot&&!eq(bootRow?.layers,boots))return null;
   const refs=new Set([...(pantsRow?.refs||[]),...(bootRow?.refs||[])]);
   if(!eq([...refs].sort(),[...(lower.checkpointSources||[])].sort()))return null;
  }
  if(alphaMatched){
   // P22 and the already selected boot seam may sit under a glove, never
   // above it. Exact hand alpha then leaves their transmission unchanged.
   // Keep the original hand order and the approved lower source's planes.
   if(!gloveLayers.every(l=>!l.depthTrack&&l.depth>cloth.depth&&
      boots.every(k=>!k.depthTrack&&k.depth<l.depth)))return null;
   const pack={...lower.pack,directions:{...lower.pack.directions,north:{...b,
    layers:y.map(l=>gloveLayers.find(k=>k.id===l.id)||l)}}};
   const slotRoutes={...lower.slotRoutes,[visible.gloves.key]:gloved.slotRoutes[visible.gloves.key]};
   if(Object.values(visible).some(({key,item})=>slotRoutes[key]?.item!==item||slotRoutes[key]?.quality!=='hd'))return null;
   const checkpointSources=[...new Set([...lower.checkpointSources,...gloveRow.refs])];
   return {...lower,pack,id:lower.id+':with-alpha-matched-gloves:'+g,checkpointSources,
    baseRecord:{...lower.baseRecord,pack,sourceRefs:[...new Set([...lower.baseRecord.sourceRefs,...checkpointSources])]},slotRoutes};
  }
  const plan=root.MareReworkModularOutfitsHD?.planIndependentPasses({
   pose:gloveRow.pose,frames:b.clip.frames,layers:y,requested:{gloves:visible.gloves},
   resolve:()=>({pose:gloveRow.pose,item:g,source:gloved.slotRoutes[visible.gloves.key].source,layers:gloveLayers,removed:[...hands]})
  });
  if(!plan||plan.omitted.length)return null;
  const slotRoutes={...gloved.slotRoutes,...lower.slotRoutes,...plan.slotRoutes,
   [visible.pants.key]:{item:p,quality:'hd',source:lower.slotRoutes?.[visible.pants.key]?.source||lower.pantsSourceId||lower.id}};
  if(Object.values(visible).some(({key,item})=>slotRoutes[key]?.item!==item||slotRoutes[key]?.quality!=='hd'))return null;
  const pack={...lower.pack,directions:{...lower.pack.directions,north:{...b,layers:plan.layers}}};
  const checkpointSources=[...new Set([...(lower.checkpointSources||[]),...gloveRow.refs])];
  return {...lower,pack,id:gloved.id+':pants'+p+(wornBoot?':boots'+wornBoot.item:''),checkpointSources,
   baseRecord:{...lower.baseRecord,pack,sourceRefs:[...new Set([...lower.baseRecord.sourceRefs,...checkpointSources])]},
   slotRoutes,layeredSlots:true,omitted:[]};
 }
 return {resolve,resolveBootOnly,resolveAdditionalIsolatedBoot,canUseNorthIsolatedBoot,resolveNorthIsolatedBoot,resolvePantsOnly,resolveNorthPantsOnOriginal,resolvePants22ByExactPose,canUseNorthBootOnPants,resolveNorthBootOnPants,resolveNorthDisjointSlots,resolveNorthGloveOnly,resolveNorthGloveOnOriginal,northGloveWitnessLook,canUseVerifiedGlovePose,resolveVerifiedGlovePose,resolveVerifiedGloveOnSidePants,resolveVerifiedGloveAndBoot,resolveNorthGloveOnLowerPose,hasAsset:hash=>allowed.has(hash)};
}
async function verify(catalog,trusted,{subtle=root.crypto?.subtle,saved=[],northBodyPack=null,gloveBodyPacks={}}={}){
 if(!subtle||!trusted||catalog.weapon!==0||catalog.coat!==151||catalog.records?.length!==120||catalog.assetHashes?.length!==1503)return null;
 const accepted={},colors={};
 // The normalized saved profile may change only the proven material, not
 // the geometry, contact timing, frame sources, or equipment.
 for(const dir of ['north','south','east','west']){
  if(!trusted[dir])return null;
  const source=JSON.stringify(trusted[dir]),bytes=await subtle.digest('SHA-256',new TextEncoder().encode(source));
  const digest=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==catalog.guards[dir])return null;
  accepted[dir]=[source];
  const trustedShape=geometry(trusted[dir]);
  for(const skinProfile of saved){
   const current=skinProfile?.[dir],skin=current?.material?.skinColor;
   if(!skin||!Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)||current.colorAppearance?.skinColor!==skin||
      current.material.sourceScale!==1||current.material.hairColor!==trusted[dir].material?.hairColor||
      current.material.eyeColor!==trusted[dir].material?.eyeColor||current.material.style!==trusted[dir].material?.style||
      geometry(current)!==trustedShape)continue;
   accepted[dir].push(JSON.stringify(current));
   if(current.colorAppearance?.hairStyle==='hair-cropped'&&current.colorAppearance?.eyeStyle==='original'&&current.material.eyeStyle===null&&
      current.material.style==='cropped'&&current.colorAppearance.hairColor===current.material.hairColor&&
      current.colorAppearance.eyeColor===current.material.eyeColor&&!current.material.gearRecord){
    const proof={geometry:trustedShape,material:materialIdentity(current.material)};
    // The standard skin variants all share this explicit head-layer authority.
    if(colors[dir]&&colors[dir].material!==proof.material){colors[dir]=null;break;}
    colors[dir]=proof;
   }
  }
 }
 const normalizedGloves=new Set([26,159]);
 for(const [key,expected] of Object.entries(extraGloveFingerprints)){
  const item=Number(key),rows=['north','south','east','west'].map(direction=>catalog.records.filter(r=>r.direction===direction&&r.slot==='gloves'&&r.item===item));
  if(rows.some(set=>set.length!==1||set[0].layers.length!==2||
      set[0].layers.some(l=>l.slot!=='top'||l.binding?.kind!=='fixed'||l.frames?.length!==8)))continue;
  const payload=JSON.stringify(rows.map(([r])=>[r.direction,r.layers]));
  const bytes=await subtle.digest('SHA-256',new TextEncoder().encode(payload));
  const actual=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(actual===expected)normalizedGloves.add(item);
 }
 const materialRows=northGloveOnlyIds.map(id=>catalog.records.filter(r=>r.direction==='north'&&r.slot==='gloves'&&r.item===id));
 const gloveDigest=await subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(materialRows.map((r,i)=>[northGloveOnlyIds[i],r[0]?.layers]))));
 const gloveOnlyVerified=materialRows.every(r=>r.length===1)&&Array.from(new Uint8Array(gloveDigest),v=>v.toString(16).padStart(2,'0')).join('')===northGloveOnlyAuthority;
 const northBootRows=northIsolatedBootIds.map(id=>catalog.records.find(r=>r.item===id&&r.direction==='north'&&r.slot==='boots')?.layers);
 const sign=async obj=>Array.from(new Uint8Array(await subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(obj)))),v=>v.toString(16).padStart(2,'0')).join('');

 // Use the native body registry as pose witness; no equipped weapon is
 // needed to authorize a layer from this already signed lower-pose atlas.
 const northIsolatedPack=northBodyPack&&await sign(northBootRows)===northBootAuthority&&
  await sign(northBodyPack)===northBootGeometry?JSON.stringify(northBodyPack):null;
 const certifiedGlovePoses={};
 for(const [direction,{archive,geometry,items}] of Object.entries(alphaGlovePoseProof)){
  const rows=items.map(item=>catalog.records.filter(r=>r.direction===direction&&r.slot==='gloves'&&r.item===item));
  const bodyPack=gloveBodyPacks[direction];
  if(bodyPack&&rows.every(set=>set.length===1)&&await sign(bodyPack)===geometry&&
     await sign(rows.map(([r])=>[r.item,r.layers]))===archive)certifiedGlovePoses[direction]={items,pack:JSON.stringify(bodyPack)};
 }
 const extraBootPacks={};
 for(const [d,proof] of Object.entries(extraBootAuthority)){
  const pack=d==='north'?northBodyPack:gloveBodyPacks[d];
  const rows=proof.items.map(id=>catalog.records.find(r=>r.item===id&&r.direction===d&&r.slot==='boots')?.layers);
  if(pack&&await sign(rows)===proof.passes&&await sign(pack)===proof.geometry)extraBootPacks[d]=JSON.stringify(pack);
 }
 const pants22Packs={};
 for(const [direction,hash] of Object.entries(sideP22Authority)){
  const rows=catalog.records.filter(r=>r.direction===direction&&r.slot==='pants'&&r.item===22);
  const pack=gloveBodyPacks[direction];
  if(pack&&rows.length===1&&await sign(pack)===alphaGlovePoseProof[direction].geometry&&
     await sign(rows[0].layers)===hash)pants22Packs[direction]=JSON.stringify(pack);
 }
 return create(catalog,accepted,normalizedGloves,colors,gloveOnlyVerified,northIsolatedPack,certifiedGlovePoses,extraBootPacks,pants22Packs);
}
const api={verify};root.MareSword0Checkpoint=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
