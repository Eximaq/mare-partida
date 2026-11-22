'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),a=require('node:assert/strict'),A=require(R+'/character-appearance'),hash=require('node:crypto').createHash,J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const heads=global.MareFemaleNamedHairHD.create(J('tools/rework-accessories/head-layer-index.json'),J('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(J('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const actor=(w,skinColor,hairStyle,h=136)=>A.commit({classId:w==null?'sword':I[w].type,equipment:{...(w==null?{}:{weapon:{def:w}}),...(h==null?{}:{head:{def:h}})}},{gender:'feminino',skinColor,hairStyle,hairColor:skinColor==='light'?'black':'blue',eyeColor:'blue'},()=>true);
(async()=>{const api=make();await api.ready;let registered=0,checked=0;const receipts=[];
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
  const o={consumer:'world',direction,action},key={slot:'head',item:136,body:'female',direction,action},own=heads.resolveOwnHelmetSource?.(key);
  if(own){
   a.equal(own.state,'available');a.equal(own.mirrorX,false);a.equal(own.source.policy,'full');
   for(const [w,t,hair] of [[2,'light','original'],[125,'ebony','hair-bob'],[null,'porcelain','hair-cropped']]){
    const p=actor(w,t,hair),r=heads.resolveOwnHelmetSource({...key,body:'feminino',weapon:p.equipment.weapon,receiver:p,equipment:{coat:{def:151}},appearance:p.appearance96});
    a.deepEqual(r,own);a.equal(r.source,own.source);checked++;
   }
   a.equal(heads.resolveOwnHelmetSource({...key,item:157}).state,'unknown');
   a.equal(heads.resolveOwnHelmetSource({...key,body:'male'}).state,'unknown');
  }
  for(const w of [null,...I.flatMap((k,i)=>k.slot==='weapon'?[i]:[])])for(const skinColor of ['light','ebony','porcelain'])for(const hairStyle of ['original','hair-bob','hair-cropped']){
   const p=actor(w,skinColor,hairStyle),r=api.selectVisual(p,o),material=r?.material||r?.femaleNamedHairRecord;
   if(material?.ownHelmetSource){
    registered++;a.equal(material.ownHelmetSource.key,own.key);a.equal(material.ownHelmetSource.source.source,own.source.source);
    a.equal(material.gearRecord.headgearPolicy.mode,'full');
    a.equal(api.selectVisual({...p,preferences:{hideHeadgear:true}},o)?.id,api.selectVisual(actor(w,skinColor,hairStyle,null),o)?.id);
   }
   receipts.push([direction,action,w,skinColor,hairStyle,r?.id,r?.slotRoutes,r&&hash('sha256').update(JSON.stringify(r,(key,v)=>key==='ownHelmetSource'?undefined:v)).digest('hex')]);
  }
 }
 a.equal(receipts.length,3096);
 if(heads.resolveOwnHelmetSource){a.equal(checked,24);a(registered>250);}
 const sha=hash('sha256').update(JSON.stringify(receipts)).digest('hex');
 console.log(JSON.stringify({count:receipts.length,sha,registered}));
})().catch(e=>{console.error(e);process.exit(1)})
