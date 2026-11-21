'use strict';
const p=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const R=p.resolve(__dirname,'..');
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=global.MareCharacterAppearance;
const slots=['head','necklace','coat','legs','boots','weapon','cloak','gloves','ring','belt','charm','akuma_no_mi','visual_completo'];
const empty=Object.fromEntries(slots.map(k=>[k,null])), dirs=['north','south','east','west'];
const cohorts={sword:[[0,1,67,68,69,70],'attack-sword'],gunner:[[4,5,113,114,115,116],'attack-firearm'],brawler:[[2,3,110,111,112],'attack-unarmed'],cyborg:[[14,15,117,118,119,120],'attack-unarmed'],rogue:[[12,13,71,72,73,74],'attack-daggers'],strategist:[[16,17,121,122,123,124],'attack-focus'],healer:[[31,32,125,126,127,128],'attack-focus']};
const save=(classId,gear,dense,appearance={})=>JSON.parse(JSON.stringify(A.commit({classId,equipment:{...(dense?empty:{}),...gear}},{gender:'masculino',...appearance},()=>true)));
const id=r=>r?.id?.split(':slots:')[0]??null;
const canon=(r,key='id')=>r&&({...r,[key]:r[key]?.split(':slots:')[0]});
(async()=>{
 const stock=make(),provider=make();
 await Promise.all([stock.ready,provider.ready]);a.equal(provider.snapshot().state,'ready');
 const cases=[
  [110,'brawler','attack-unarmed',['north'],{},{}],
  [114,'gunner','attack-firearm',['north','east','west'],{},{}],
  [14,'cyborg','attack-unarmed',['south','east','west'],{},{}],
  [0,'sword','idle',['south'],{coat:{def:6},boots:{def:9}},{hairColor:'blue'}],
  [0,'sword','idle',['north'],{coat:{def:6},gloves:{def:25}},{hairColor:'blue'}],
  [0,'sword','walk',['north'],{coat:{def:6},gloves:{def:25}},{hairColor:'blue'}]
 ];
 let draws=0,poses=0,negatives=0;
 for(const [weapon,classId,action,where,gear,look] of cases)for(const direction of where){
  const equipment={weapon:{def:weapon},...gear}, options={action,direction,consumer:'world'};
  const sparse=save(classId,equipment,false,look),dense=save(classId,equipment,true,look),saved=JSON.stringify(dense);
  const s=stock.selectVisual(sparse,options),d=provider.selectVisual(dense,options);
  a(s?.id,`signed sparse coverage ${weapon} ${action} ${direction}`);
  a.deepEqual(canon(d),canon(s),`dense exact signed visual ${weapon} ${action} ${direction}`);
  // The absence test distinguishes literal null from every other value, even
  // for a slot that is ignored by more general routes.
  for(const bad of [undefined,false,0,'none','original',{def:23}]){
   const actor={...dense,equipment:{...dense.equipment,cloak:bad}};
   const r=provider.selectVisual(actor,options);a.notEqual(id(r),id(s));
   negatives++;
  }
  for(const field of ['variant','variantId','appearanceVariant']){
   const actor={...dense,equipment:{...dense.equipment,weapon:{def:weapon,[field]:'outside-authority'}}};
   const r=provider.selectVisual(actor,options);a.notEqual(id(r),id(s));
   negatives++;
  }
  const sCfg=await stock.prepareConfiguration([{player:sparse,options}]);
  const dCfg=await provider.prepareConfiguration([{player:dense,options}]);
  const trace=dCfg.coverage[0];a.deepEqual(canon(trace,'source'),canon(sCfg.coverage[0],'source'));a.equal(canon(trace,'source').source,id(s));
  const frames=`frames ${trace.frames}`;
  try{
   const hashes=new Set();
   const draw=(cfg,actor,o)=>{const c=cv.createCanvas(384,384),x=c.getContext('2d');a(cfg.draw(x,actor,o));const px=x.getImageData(0,0,384,384).data;a(px.some((v,i)=>i%4===3&&v));const h=crypto.createHash('sha256').update(px).digest('hex');c.width=1;draws++;return h;};
   for(let f=0;f<trace.frames;f++){
    const o={...options,x:192,y:245,progress:(f+.125)/trace.frames};
    const hash=draw(dCfg,dense,o);a.equal(hash,draw(sCfg,sparse,o));hashes.add(hash);poses++;
   }
   a.equal(hashes.size,trace.frames);
  }finally{sCfg.release();dCfg.release();}
  a.equal(JSON.stringify(dense),saved);
  console.log(weapon,action,direction,frames,trace.source);
 }
 let broad=0;
 for(const gender of ['masculino','feminino'])for(const [classId,[weapons,attack]] of Object.entries(cohorts))for(const weapon of weapons)for(const direction of dirs)for(const action of ['idle','walk',attack]){
  const gear={weapon:{def:weapon}},o={action,direction,consumer:'world'},s=save(classId,gear,false,{gender}),d=save(classId,gear,true,{gender});
  const before=id(stock.selectVisual(s,o));
  a.equal(id(provider.selectVisual(s,o)),before,'sparse routes stay unchanged');
  a.equal(id(provider.selectVisual(d,o)),before,JSON.stringify([gender,classId,weapon,action,direction]));
  broad++;
 }
 a.deepEqual({broad,poses,draws,negatives},{broad:984,poses:78,draws:156,negatives:90});
 console.log(JSON.stringify({broad,poses,draws,negatives}));
})().catch(e=>{console.error(e);process.exitCode=1});
