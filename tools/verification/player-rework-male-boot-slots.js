/* Read-only Bota ownership registry. No gear IDs or companion tuples are enumerated. */
(function(root){'use strict';
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sha=h=>/^[a-f0-9]{64}$/.test(h);
 const hashes=l=>[...new Set(l.frames||[l.source])];
 const effective=(l,n)=>{if(l.frames?.length===n&&l.frames.every(sha)){const {source,...rest}=l;return rest;}return l;};
 const authority=(r,id)=>{
  if(Array.isArray(r.equipmentLayerGroups?.boots))return {kind:'declared',ids:r.equipmentLayerGroups.boots};
  if(Array.isArray(r.bootsOverlay?.sourceLayerIds))return {kind:'derived',ids:r.bootsOverlay.sourceLayerIds};
  // The frozen catalog attests the original order, transforms and selected
  // PNGs. The name is only used *inside* that source-bound namespace.
  if(r.frozenBootContract&&sha(r.sourceAuthoritySHA256)&&sha(r.sourceSelection?.portableSHA256)||
     r.frozenPantsSource&&sha(r.sourcePackSHA256)&&sha(r.sourcePortableSHA256)||
     r.frozenGloveLayers&&r.sourceOutfitId&&sha(r.sourcePackSHA256)&&sha(r.sourcePortableSHA256)){
   const pattern=new RegExp('^(?:equip-)?boot'+id+'-');
   return {kind:'frozen',ids:r.pack.directions[r.direction].layers.filter(l=>pattern.test(l.id)).map(l=>l.id)};
  }
  return null;
 };
 function create(index,archive){
  const byId=new Map(index.records.map(r=>[r.id,r])),buckets=new Map(),held=[];
  for(const r of index.records){
   const item=r.equipment?.boots;
   if(r.body!=='male'||!Number.isSafeInteger(item))continue;
   const d=r.pack?.directions?.[r.direction];if(!d){held.push({id:r.id,reason:'missing-direction'});continue;}
   const own=authority(r,item),claim=own?.ids;
   if(!claim?.length||new Set(claim).size!==claim.length){held.push({id:r.id,reason:'no-separate-ownership'});continue;}
   const members=d.layers.filter(l=>claim.includes(l.id)),refs=[...new Set(members.flatMap(hashes))];
   if(members.length!==claim.length||members.length<4||refs.some(h=>!sha(h)||!r.sourceRefs.includes(h)||!archive.sources[h])||
      members.some(l=>!l.binding||!Number.isFinite(l.depth)||l.frames&&l.frames.length!==d.clip.frames)){
    held.push({id:r.id,reason:'incomplete-owned-source'});continue;
   }
   if(own.kind==='frozen'&&r.frozenGloveLayers){
    const parent=byId.get(r.sourceOutfitId),q=parent?.pack?.directions?.[r.direction];
    if(parent?.equipment?.boots!==item||!q||!members.every(l=>q.layers.some(x=>same(l,x)))){
     held.push({id:r.id,reason:'boot-mismatch-in-glove-record'});continue;
    }
   }
   if(own.kind==='derived'){
    const parent=byId.get(r.bootsOverlay.sourceRecord),base=byId.get(r.bootsOverlay.baseRecord),pq=parent?.pack?.directions?.[r.direction];
    if(!base||parent?.equipment?.boots!==item||!pq||!claim.every(id=>pq.layers.some(l=>l.id===id))){
     held.push({id:r.id,reason:'unverified-derivation'});continue;
    }
   }
   const geometry={density:r.pack.density,frame:r.pack.frame,pivot:r.pack.pivot,clip:d.clip,rest:d.rest,poses:d.poses,
    mirror:[r.mirrorX===true,d.renderMirrorFrom??null]};
   const key=[r.action,r.direction,item].join('/');
   const entry={item,action:r.action,direction:r.direction,sourceId:r.id,kind:own.kind,
    record:r,geometry,layers:members,sourceRefs:refs,
    // Inventory/provenance is not approval to activate a different pose.
    requiresCalibration:!!r.bootsOverlay?.requiresVisualCalibration,
    fused:r.bodyOcclusion??null,unavailable:r.productionEnabled===false};
   if(!buckets.has(key))buckets.set(key,[]);
   buckets.get(key).push(entry);
  }
  const candidates=(action,direction,item)=>[...(buckets.get([action,direction,item].join('/'))||[])];
  function forPose({target,item}={}){
   if(!target||target.body!=='male'||target.productionEnabled===false||target.bodyOcclusion)return null;
   const {direction,action,pack}=target,d=pack?.directions?.[direction];if(!d)return null;
   const pose={density:pack.density,frame:pack.frame,pivot:pack.pivot,clip:d.clip,rest:d.rest,poses:d.poses,
    mirror:[target.mirrorX===true,d.renderMirrorFrom??null]};
   const targetOwn=target.equipment?.boots==null?[]:authority(target,target.equipment.boots)?.ids;
   if(!targetOwn)return null;
   // Remove only explicitly owned equipment layers from the comparison.
   // The entire unclaimed body stays a witness, including the legs and any
   // unclassified clothing baked into them. No geometric nearest match.
   const native=(record,q,boots)=>{
    const groups=record.equipmentLayerGroups||{},ids=new Set([...boots,...Object.entries(groups).filter(([k])=>k!=='boots').flatMap(([,v])=>Array.isArray(v)?v:[])]);
    return q.layers.filter(l=>!ids.has(l.id)).map(l=>effective(l,q.clip.frames));
   };
   const evidence=native(target,d,targetOwn),res=[];
   for(const e of candidates(action,direction,item)){
    if(e.unavailable||e.fused||e.requiresCalibration||!same(e.geometry,pose))continue;
    const original=e.record.pack.directions[direction],keys=e.layers.map(l=>l.id);
    if(!same(native(e.record,original,keys),evidence)||e.layers.some(l=>d.layers.some(q=>q.id===l.id&&!targetOwn.includes(q.id))))continue;
    res.push({item,slot:'boots',direction,action,sourceId:e.sourceId,layers:e.layers,sourceRefs:e.sourceRefs,replaceLayerIds:targetOwn});
   }
   // No first-match heuristic when two archives draw different parts on the
   // same nominal rig. Identical duplicates are harmless.
   return res.length&&res.every(e=>same([e.layers,e.sourceRefs],[res[0].layers,res[0].sourceRefs]))?res[0]:null;
  }
  return {candidates,forPose,entries:()=>[...buckets.values()].flat(),held:()=>[...held]};
 }
 const api={create};root.MareReworkMaleBootSlots=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
