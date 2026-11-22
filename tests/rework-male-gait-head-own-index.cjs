'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make}=require(R+'/tests/rework-integration-support.cjs'),a=require('node:assert/strict'),A=require(R+'/character-appearance'),hash=require('node:crypto').createHash,J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const actor=(w,skinColor,head)=>A.commit({classId:w==null?'sword':I[w].type,equipment:{...(w==null?{}:{weapon:{def:w}}),...(head==null?{}:{head:{def:head}})}},{gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'},()=>true);
(async()=>{const api=make();await api.ready;let mounted=0,checked=0;const receipts=[];
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
  const o={consumer:'world',direction,action};
  for(const item of [19,136,164,178]){
   const key={slot:'head',item,body:'male',direction,action},own=api.resolveMaleGaitHeadSource?.(key);
   if(own){
    a.equal(own.state,'available');a.equal(own.mirrorX,false);
    for(const [w,t] of [[2,'light'],[125,'ebony'],[null,'porcelain']]){
     const p=actor(w,t,item),r=api.resolveMaleGaitHeadSource({...key,body:'masculino',weapon:p.equipment.weapon,receiver:p,equipment:{coat:{def:151}},appearance:{...p.appearance96,hairStyle:'hair-spiky',hairColor:'blue'}});
     a.deepEqual(r,own);a.equal(r.source,own.source);checked++;
    }
    a.equal(api.resolveMaleGaitHeadSource({...key,item:157}).state,'unknown');
    a.equal(api.resolveMaleGaitHeadSource({...key,body:'female'}).state,'unknown');
   }
   for(const [w,k] of I.entries())if(k.slot==='weapon')for(const skinColor of Object.keys(A.skins)){
    const p=actor(w,skinColor,item),r=api.selectVisual(p,o);
    if(r?.ownIndependentCarryHat)mounted++;
    if(own&&r?.ownIndependentCarryHat){
     a.equal(r.ownLayerSources.head,own.key);a.equal(r.gearOnlyRecord.gear.source,own.source.source);
     a.equal(r.gearOnlyRecord.hideHair,[19,136].includes(item));
     a.equal(api.selectVisual({...p,preferences:{hideHeadgear:true}},o)?.id,api.selectVisual(actor(w,skinColor,null),o)?.id);
    }
    const copy=r&&{...r};if(copy)delete copy.ownLayerSources;
    receipts.push([direction,action,item,w,skinColor,r?.id,r?.slotRoutes,r?.ownIndependentCarryHat?hash('sha256').update(JSON.stringify(copy)).digest('hex'):null]);
   }
  }
 }
 a.equal(receipts.length,10752);
 if(api.resolveMaleGaitHeadSource)a.equal(checked,96);
 const sha=hash('sha256').update(JSON.stringify(receipts)).digest('hex');
 console.log(JSON.stringify({count:receipts.length,mounted,sha}));
})().catch(e=>{console.error(e);process.exit(1)})
