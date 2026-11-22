'use strict';
// This is a selector audit, not render/alpha evidence. The historical
// weapon-pairs matrix is a different, unmodified entry point.
const slots=['head','coat','legs','boots','gloves'];
const canonical=k=>({torso:'coat',pants:'legs'})[k]||k;
const route=(record,slot)=>Object.entries(record?.slotRoutes||{}).find(([key])=>canonical(key)===slot)?.[1];
const trusted=(record,slot,id)=>{
 const r=route(record,slot);
 return !!r&&r.item===id&&r.quality==='hd'&&typeof r.source==='string'&&r.source.length>0&&
  !record.appearanceAdapted&&![...(record.omitted||[]),...(record.unsupported||[])].some(k=>canonical(k)===slot);
};
const poseKey=r=>{
 const d=r?.pack?.directions?.[r.direction],action=r?.resolvedAction||r?.action;
 if(!r?.body||!r.direction||!action||!d?.clip||!r.pack.pivot)return null;
 return JSON.stringify([r.body,r.direction,action,r.pack.pivot,r.pack.density,d.clip,
  r.timeline,r.fps,r.visualSampling,!!r.mirrorX]);
};
function* probePairs(buckets){
 const seen=new Set();
 const emit=(slot,a,other,b)=>{
  const k=JSON.stringify([slot,a,other,b]);
  if(seen.has(k))return null;
  seen.add(k);return [[slot,a],[other,b]];
 };
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
  const s=slots[i],t=slots[j],a=buckets[s],b=buckets[t];
  // Cyclic zip covers every independently declared item against every
  // neighbor slot category without multiplying item counts.
  for(let k=0;a.hd.length&&b.hd.length&&k<Math.max(a.hd.length,b.hd.length);k++){
   const p=emit(s,a.hd[k%a.hd.length],t,b.hd[k%b.hd.length]);if(p)yield p;
  }
  // Exercise a missing or unverified neighbor in each slot. This records a
  // dropout of the declared HD item independently of the unresolved neighbor.
  if(b.unverified.length)for(const x of a.hd){const p=emit(s,x,t,b.unverified[0]);if(p)yield p;}
  if(a.unverified.length)for(const y of b.hd){const p=emit(s,a.unverified[0],t,y);if(p)yield p;}
 }
}
function classify(slot,id,solo,mixed,neighbor,phaseCompatible){
 if(trusted(mixed,slot,id))return trusted(solo,slot,id)?'declaredRetained':'declaredOnlyWithNeighbor';
 if(!trusted(solo,slot,id))return solo?'unverifiedSolo':'noSoloHDSelection';
 if(neighbor&&!phaseCompatible)return 'declaredDropPoseAuthorityUnresolved';
 return neighbor?'declaredDropWithTwoSoloAuthorities':'declaredDropWithUnverifiedNeighbor';
}
function scoreProbe(pair,solo,mixed){
 const [[s,a],[t,b]]=pair,first=solo[s].get(a),second=solo[t].get(b),pose=poseKey(first),compatible=!!pose&&pose===poseKey(second);
 return pair.map(([slot,id],i)=>({
  slot,id,mark:classify(slot,id,i?second:first,mixed,i?trusted(first,s,a):trusted(second,t,b),compatible),
  soloRoute:route(i?second:first,slot)?.source,mixedRoute:route(mixed,slot)?.source,
 }));
}
async function main(){
 const fs=require('node:fs'),path=require('node:path');
 const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
 const mod=f=>require(path.join(root,f+'.js')),readJSON=f=>JSON.parse(fs.existsSync(f)?fs.readFileSync(f):require('node:zlib').gunzipSync(fs.readFileSync(f+'.gz')));
 const json=f=>readJSON(path.join(root,f));
 const {items,inventorySlotsLeft,inventorySlotsRight}=mod('item-catalog').create({forge:mod('forge-system'),prison:mod('prison-system'),haki:mod('haki-system'),akuma:mod('akuma-system'),hakiProgression:mod('haki-progression')});
 const weapons=items.flatMap((x,def)=>x.slot==='weapon'?[{role:x.type,def}]:[]);
 const contexts=[...weapons,...[...new Set(weapons.map(x=>x.role))].sort().map(role=>({role,def:null}))];
 const groups=Object.fromEntries(slots.map(s=>[s,items.flatMap((x,i)=>x.slot===s?[i]:[])]));
 const bodies=['masculino','feminino'],directions=['north','south','east','west'];
 const actions=['idle','walk','attack','skill','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'];
 const filter=process.env.AUDIT_FILTER?JSON.parse(process.env.AUDIT_FILTER):{};
 const allowed={weapon:[null,...weapons.map(x=>x.def)],family:contexts.map(x=>x.role),body:bodies,dir:directions,action:actions};
 if(!filter||Array.isArray(filter)||typeof filter!=='object')throw Error('AUDIT_FILTER must be an object');
 for(const [k,v]of Object.entries(filter))if(!Object.hasOwn(allowed,k)||!Array.isArray(v)||!v.length||v.some(x=>!allowed[k].includes(x)))throw Error('Invalid AUDIT_FILTER '+k);
 const match=(k,v)=>!filter[k]||filter[k].includes(v);
 const published=process.env.HD_PUBLISHED_ROOT&&path.resolve(process.env.HD_PUBLISHED_ROOT),prefix='tools/rework-sword0-checkpoint/';
 if(published)mod('player-rework-sword0-checkpoint');
 const {make,cv}=require(path.join(root,'tests/rework-integration-support.cjs'));
 const fileLoad=require(path.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
 const api=make(published?{fetchJSON:async f=>readJSON(path.join(f.startsWith(prefix)?published:root,f)),loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(published,f)):fileLoad(f)}:{});
 await api.ready;if(api.snapshot().state!=='ready')throw Error(api.snapshot().error);
 if(published&&!await api.warmSwordCheckpoint())throw Error('Signed sword registrations were not verified.');
 const world=mod('paper-doll-96-lobby'),A=mod('character-appearance'),catalog=json('tools/paper-doll-96-v3/weapons.json');
 const W=json('tools/rework-weapon-layers-hd/index.json'),punch='attack-unarmed';
 const family={sword:'attack-sword',brawler:punch,gunner:'attack-firearm',rogue:'attack-daggers',cyborg:'attack-tech',strategist:'attack-focus',healer:'attack-focus'};
 const authored=(role,def)=>{
  if(def==null)return punch;
  const own=[...new Set([...(W.femaleRegistrations||[]),...(W.orderedAttackProfiles||[])].filter(r=>r.item===def&&r.action?.startsWith('attack-')).map(r=>r.action))];
  return own.length===1?own[0]:family[role];
 };
 const padding=process.env.NULL_SLOTS==='1'?Object.fromEntries([...inventorySlotsLeft,...inventorySlotsRight,'visual_completo'].map(s=>[s,null])):{};
 const select=(player,base,entries,o)=>world.selectWorldHD(api,catalog,
  {...player,equipment:{...base,...Object.fromEntries(entries.map(([s,def])=>[s,{def}]))}},o);
 const profile=process.env.AUDIT_PROFILE||'default';
 if(!['default','signed-sword'].includes(profile)||profile==='signed-sword'&&!published)throw Error('Invalid AUDIT_PROFILE or no signed build');
 const saved=profile==='signed-sword'?readJSON(path.join(published,prefix,'sword-catalog.json')).appearance96:null;
 const pairArg=process.env.AUDIT_PAIR?JSON.parse(process.env.AUDIT_PAIR):null;
 if(pairArg&&(!Array.isArray(pairArg)||pairArg.length!==2||pairArg.some(x=>!Array.isArray(x)||x.length!==2||
    !groups[x[0]]?.includes(x[1]))||pairArg[0][0]===pairArg[1][0]))throw Error('AUDIT_PAIR requires two items in different visual slots');
 const counts={},bySlot={},examples={},grouped={};let poseContexts=0,soloQueries=0,mixedQueries=0;
 const add=(obj,key)=>{obj[key]=(obj[key]||0)+1;};
 for(const {role,def}of contexts.filter(x=>match('weapon',x.def)&&match('family',x.role))){
  const base={...padding,...(def==null?{}:{weapon:{def}})};
  for(const gender of bodies.filter(x=>match('body',x)&&(!saved||saved.gender===x)))for(const tone of (process.env.TONES==='light'?['light']:Object.keys(A.skins))){
   const player=A.commit({classId:role,equipment:base},{...saved,gender,skinColor:tone},()=>true);
   for(const direction of directions.filter(d=>match('dir',d)))
    for(const action of [...new Set(['idle','walk','attack','skill',authored(role,def)])].filter(x=>match('action',x))){
    const o={action,direction,consumer:'world'},solo={},bucket={};
    poseContexts++;
    for(const slot of slots){
     solo[slot]=new Map();bucket[slot]={hd:[],unverified:[]};
     for(const id of pairArg?pairArg.filter(x=>x[0]===slot).map(x=>x[1]):groups[slot]){
      const r=select(player,base,[[slot,id]],o);soloQueries++;
      solo[slot].set(id,r);
      bucket[slot][trusted(r,slot,id)?'hd':'unverified'].push(id);
     }
    }
    for(const pair of pairArg?[pairArg]:probePairs(bucket)){
     const mixed=select(player,base,pair,o);mixedQueries++;
     for(const scored of scoreProbe(pair,solo,mixed)){
      add(counts,scored.mark);add(bySlot[scored.slot]??={},scored.mark);
      if(scored.mark.startsWith('declaredDrop')){
       const key=[gender,role,direction,action,scored.slot,scored.mark].join('/');
       add(grouped,key);
       examples[key]??={weapon:def,tone,equipment:Object.fromEntries(pair),mixedSource:mixed?.id, ...scored};
      }
     }
    }
   }
  }
 }
 console.log(JSON.stringify({mode:'slot-independence',filter,profile,pair:pairArg,poseContexts,soloQueries,mixedQueries,counts,bySlot,
  grouped,examples,authority:'Independent explicit solo slot declarations and World mixed selection, not Canvas proof. "Drop" shows a missing explicit declaration. It does not prove that the render has no layer, compatible art is absent, or a guard is the only cause. Two solo authorities merely match reported body, action, direction, pivot, scale, clock and mirror metadata; check underlying layer ownership and occlusion when resolving.'},null,2));
}
module.exports={trusted,poseKey,probePairs,scoreProbe};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
