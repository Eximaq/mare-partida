'use strict';
const path=require('node:path'),as=require('node:assert/strict'),R=path.resolve(process.argv[2]||path.join(__dirname,'..')),{make}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance');
const J=f=>require(R+'/'+f),I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items,
dirs=['north','south','east','west'],actions=['idle','walk'],coats=[6,7,130,137,144,151,158,165,172,179],migrated=r=>/own-(?:gait(?:-context)?|walk)-torso:/.test(r?.id||'');
const actor=(w,t='light')=>A.commit({classId:w==null?'sword':I[w].type,equipment:w==null?{}:{weapon:{def:w}}},{gender:'masculino',skinColor:t,hairColor:t==='ebony'?'blue':'black',eyeColor:'blue'},()=>true);
(async()=>{const n=make();await n.ready;let observed=0;const rows=[];
 for(const action of actions)for(const direction of dirs){
  const o={consumer:'world',direction,action},baseKey={slot:'torso',body:'male',direction,action};
  for(const c of coats){
   const key={...baseKey,item:c}, resolved=n.resolveMaleGaitTorsoSource?.(key);
   if(resolved){
    if(c===6)as.equal(resolved.state,'available');
    if(c===151)as.equal(resolved.state,'unknown','mixed donor is not in the index');
    for(const [w,t] of [[2,'light'],[125,'ebony'],[null,'porcelain']]){
     const p=actor(w,t),q=n.resolveMaleGaitTorsoSource({...key,weapon:p.equipment.weapon,appearance:p.appearance96,receiver:p});
     as.deepEqual(q,resolved);
     if(resolved.source)as.strictEqual(q.source,resolved.source);
    }
    as.equal(n.resolveMaleGaitTorsoSource({...key,body:'female'}).state,'unknown');
   }
   for(let w=0;w<I.length;w++)if(I[w].slot==='weapon'){
    const p=actor(w),r=n.selectVisual({...p,equipment:{...p.equipment,coat:{def:c}}},o);
    const copy=r&&{...r};if(copy)delete copy.ownLayerSources;
    rows.push([action,direction,c,w,copy?.id,copy?.slotRoutes,copy?.outfitOverlay,copy?.base?.pack?.directions[direction]?.clip,migrated(copy)?require('crypto').createHash('sha256').update(JSON.stringify(copy)).digest('hex'):null]);
    if(resolved&&migrated(r)){
     observed++;as.equal(r.outfitOverlay.sourceRecord,resolved.source.source);
     as.equal(r.ownLayerSources.coat,resolved.key);as.equal(resolved.mirrorX,false,'exact West donor is independently published');
    }
   }
  }
 }
 if(n.resolveMaleGaitTorsoSource)as.equal(observed,107);
 console.log(JSON.stringify({rows}));
})().catch(e=>{console.error(e);process.exit(1)})
