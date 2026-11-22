'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),a=require('node:assert/strict'),A=require(R+'/character-appearance'),hash=require('node:crypto').createHash,J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const heads=global.MareFemaleNamedHairHD.create(J('tools/rework-accessories/head-layer-index.json'),J('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(J('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const actor=(w,skinColor,hairStyle,h)=>A.commit({classId:w==null?'sword':I[w].type,equipment:{...(w==null?{}:{weapon:{def:w}}),...(h==null?{}:{head:{def:h}})}},{gender:'feminino',skinColor,hairStyle,hairColor:skinColor==='light'?'black':'blue',eyeColor:'blue'},()=>true);
(async()=>{const api=make();await api.ready;const receipts=[];let tracked=0,checks=0;
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
  const o={consumer:'world',direction,action};
  for(const [head,policy] of [[129,'partial'],[143,'partial'],[150,'partial'],[164,'none'],[171,'partial'],[178,'none'],...(direction==='south'?[[18,'partial'],[19,'full']]:[])]){
   const key={slot:'head',item:head,body:'female',direction,action},own=heads.resolveOwnHelmetSource(key);
   if(!process.env.BASELINE){
    a.equal(own.state,'available');a.equal(own.mirrorX,false);a.equal(own.source.policy,policy);
    for(const [w,skin,hair] of [[2,'light','original'],[125,'ebony','hair-bob'],[null,'porcelain','hair-cropped']]){
     const p=actor(w,skin,hair,head),r=heads.resolveOwnHelmetSource({...key,body:'feminino',weapon:p.equipment.weapon,receiver:p,equipment:{coat:{def:151}},appearance:p.appearance96});
     a.deepEqual(r,own);a.equal(r.source,own.source);checks++;
    }
   }
   a.equal(heads.resolveOwnHelmetSource({...key,item:157}).state,'unknown');
   a.equal(heads.resolveOwnHelmetSource({...key,body:'male'}).state,'unknown');
   if(direction!=='south')for(const item of [18,19])a.equal(heads.resolveOwnHelmetSource({...key,item}).state,'unknown');
   for(const w of [null,0,2,12,15,114,125])for(const [skinColor,hairStyle] of [['light','original'],['ebony','hair-bob'],['porcelain','hair-cropped']]){
    const p=actor(w,skinColor,hairStyle,head),r=api.selectVisual(p,o),material=r?.material||r?.femaleNamedHairRecord;
    if(material?.ownHelmetSource){
     tracked++;a.equal(material.ownHelmetSource.key,own.key);a.equal(material.ownHelmetSource.source.source,own.source.source);
     a.equal(material.gearRecord.headgearPolicy.mode,policy);
     a.equal(api.selectVisual({...p,preferences:{hideHeadgear:true}},o)?.id,api.selectVisual(actor(w,skinColor,hairStyle,null),o)?.id);
    }else if(!process.env.BASELINE)a.fail('live source missing: '+JSON.stringify([direction,action,head,w,skinColor,hairStyle]));
    receipts.push([direction,action,head,w,skinColor,hairStyle,r?.id,r?.slotRoutes,r&&hash('sha256').update(JSON.stringify(r,(k,v)=>k==='ownHelmetSource'?undefined:v)).digest('hex')]);
   }
  }
 }
 a.equal(receipts.length,1092);if(!process.env.BASELINE){a.equal(checks,156);a.equal(tracked,1092);}
 console.log(JSON.stringify({count:receipts.length,sha:hash('sha256').update(JSON.stringify(receipts)).digest('hex'),tracked,checks}));
})().catch(e=>{console.error(e);process.exit(1)})
