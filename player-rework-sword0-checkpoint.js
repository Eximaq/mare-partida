(function(root){'use strict';
// Opt-in staging adapter. Caller supplies the exact-source SHA-256 function and
// uses this only after existing SelectVisual routes have reported no match.
const claims={
 pants:new Set(['shorts']),
 boots:new Set(),
 gloves:new Set(['left-hand','right-hand','left-hand-foreground','right-hand-foreground'])
};
function create(catalog,accepted){
 const rows=new Map(catalog.records.map(r=>[[r.direction,r.slot,r.item].join('/'),r]));
 const allowed=new Set(catalog.assetHashes);
 const applies=(origin,direction)=>accepted[direction]===JSON.stringify(origin);
 function resolve(origin,direction,visible){
  if(!origin||!applies(origin,direction)||visible.weapon?.item!==catalog.weapon||visible.torso?.item!==catalog.coat)return null;
  const requested=Object.entries(visible).filter(([slot])=>Object.hasOwn(claims,slot));
  if(!requested.length||Object.keys(visible).some(s=>!(Object.hasOwn(claims,s)||s==='weapon'||s==='torso')))return null;
  const selected=requested.map(([slot,v])=>rows.get([direction,slot,v.item].join('/')));
  // Do not omit an unknown requested piece or substitute an old one.
  if(selected.some(r=>!r))return null;
  const stable=origin.pack.directions[direction],states=catalog.states[direction];
  if(states?.length!==8||stable?.clip?.frames!==8)return null;
  const layers=stable.layers.filter(l=>!selected.some(r=>claims[r.slot].has(l.id))).concat(selected.flatMap(r=>r.layers));
  if(layers.length!==new Set(layers.map(l=>l.id)).size)return null;
  const refs=[...new Set(selected.flatMap(r=>r.layers.flatMap(l=>l.frames||[l.source])))];
  if(refs.some(r=>!allowed.has(r)))return null;
  const pack={...origin.pack,directions:{...origin.pack.directions,[direction]:{...stable,layers}}};
  const source=origin.id,slotRoutes=Object.fromEntries(Object.values(visible).map(v=>[v.key,{item:v.item,quality:'hd',source}]));
  return {...origin,pack,states,id:source+':portable-sword0:'+JSON.stringify(slotRoutes),slotRoutes,layeredSlots:true,omitted:[],
   baseRecord:{...origin.baseRecord,pack,sourceRefs:[...new Set([...origin.baseRecord.sourceRefs,...refs])]},
   outfitSources:[...new Set([...origin.outfitSources,...refs])]};
 }
 return {resolve,hasAsset:hash=>allowed.has(hash)};
}
async function verify(catalog,trusted,{subtle=root.crypto?.subtle}={}){
 if(!subtle||!trusted||catalog.weapon!==0||catalog.coat!==151||catalog.records?.length!==120||catalog.assetHashes?.length!==1503)return null;
 const accepted={};
 for(const dir of ['north','south','east','west']){
  if(!trusted[dir])return null;
  const source=JSON.stringify(trusted[dir]),bytes=await subtle.digest('SHA-256',new TextEncoder().encode(source));
  const digest=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==catalog.guards[dir])return null;
  accepted[dir]=source;
 }
 return create(catalog,accepted);
}
const api={verify};root.MareSword0Checkpoint=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
