(function(root){'use strict';
// Use archive-bound layer sources only after existing SelectVisual routes
// have reported no match. Source verification happens once at provider startup.
const claims={
 pants:new Set(['shorts']),
 boots:new Set(),
 gloves:new Set(['left-hand','right-hand','left-hand-foreground','right-hand-foreground'])
};
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
function create(catalog,accepted){
 const rows=new Map(catalog.records.map(r=>[[r.direction,r.slot,r.item].join('/'),r]));
 const allowed=new Set(catalog.assetHashes);
 const applies=(origin,direction)=>accepted[direction]?.includes(JSON.stringify(origin));
 function resolve(origin,direction,visible,authority){
  const item=visible.weapon?.item;
  if(!origin||!applies(origin,direction)||item!==catalog.weapon&&!family.has(item)||visible.torso?.item!==catalog.coat)return null;
  const requested=Object.entries(visible).filter(([slot])=>Object.hasOwn(claims,slot));
  if(!requested.length&&item===catalog.weapon||Object.keys(visible).some(s=>!(Object.hasOwn(claims,s)||s==='weapon'||s==='torso')))return null;
  // Individually sourced hems/cuffs do not prove contact between both slots.
  // P22+B9 is the only pair checked frame by frame; P21+B9 has an exposed gap.
  if(visible.pants&&visible.boots&&!(visible.pants.item===22&&visible.boots.item===9))return null;
  // G26/G159 were inspected on both hands, every phase and direction.
  if(origin.material?.skinColor&&visible.gloves&&![26,159].includes(visible.gloves.item))return null;
  const selected=requested.map(([slot,v])=>rows.get([direction,slot,v.item].join('/')));
  // Do not omit an unknown requested piece or substitute an old one.
  if(selected.some(r=>!r))return null;
  const stable=origin.pack.directions[direction],states=item===catalog.weapon?origin.states:ownWeaponStates(origin,direction,item,authority),checked=catalog.states[direction];
  // Keep exactly the weapon already on the character, including on unequip.
  // Archive rotation trials are deliberately not promoted with the outfit slots.
  const contact=rows=>rows.map(({parts,...state})=>({...state,parts:parts.map(({matrix,...part})=>part)}));
  if(states?.length!==8||checked?.length!==8||stable?.clip?.frames!==8||
     JSON.stringify(contact(origin.states))!==JSON.stringify(contact(checked)))return null;
  const layers=stable.layers.filter(l=>!selected.some(r=>claims[r.slot].has(l.id))).concat(selected.flatMap(r=>r.layers));
  if(layers.length!==new Set(layers.map(l=>l.id)).size)return null;
  const refs=[...new Set(selected.flatMap(r=>r.layers.flatMap(l=>l.frames||[l.source])))];
  if(refs.some(r=>!allowed.has(r)))return null;
  const pack={...origin.pack,directions:{...origin.pack.directions,[direction]:{...stable,layers}}};
  const source=origin.id,slotRoutes=Object.fromEntries(Object.entries(visible).map(([slot,v])=>[v.key,{item:v.item,quality:'hd',source:slot==='weapon'&&item!==catalog.weapon?authority.donor.id:source}]));
  return {...origin,item,...(item===catalog.weapon?{}:{paddingPhysical:authority.donor.paddingPhysical}),pack,states,id:source+':portable-sword'+item+':'+JSON.stringify(slotRoutes),slotRoutes,layeredSlots:true,omitted:[],
   baseRecord:{...origin.baseRecord,pack,sourceRefs:[...new Set([...origin.baseRecord.sourceRefs,...refs])]},
   checkpointSources:refs};
 }
 return {resolve,hasAsset:hash=>allowed.has(hash)};
}
async function verify(catalog,trusted,{subtle=root.crypto?.subtle,saved={}}={}){
 if(!subtle||!trusted||catalog.weapon!==0||catalog.coat!==151||catalog.records?.length!==120||catalog.assetHashes?.length!==1503)return null;
 const accepted={};
 // The normalized saved profile may change only the proven material, not
 // the geometry, contact timing, frame sources, or equipment.
 const geometry=({id,material,colorAppearance,...source})=>JSON.stringify(source);
 for(const dir of ['north','south','east','west']){
  if(!trusted[dir])return null;
  const source=JSON.stringify(trusted[dir]),bytes=await subtle.digest('SHA-256',new TextEncoder().encode(source));
  const digest=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==catalog.guards[dir])return null;
  const current=saved[dir];
  accepted[dir]=[source];
  if(current?.material?.skinColor==='light'&&current.material.sourceScale===1&&
     current.material.hairColor===trusted[dir].material?.hairColor&&
     current.material.eyeColor===trusted[dir].material?.eyeColor&&
     current.material.style===trusted[dir].material?.style&&
     geometry(current)===geometry(trusted[dir]))accepted[dir].push(JSON.stringify(current));
 }
 return create(catalog,accepted);
}
const api={verify};root.MareSword0Checkpoint=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
