const path=require('node:path'),a=require('node:assert/strict'),R=path.resolve(__dirname,'..'),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),w=make();
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),o={action:'attack-sword',direction:'south',consumer:'world'};
const pack=require(path.join(R,'tools/rework-weapon-layers-hd/index.json'));
const ref=(item,d)=>pack.femaleRegistrations.find(r=>r.item===item&&r.direction===d&&r.action===o.action);
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function stage(actor,options=o){const r=w.selectVisual(actor,options);a(r,JSON.stringify(actor));const b=await w.prepareConfiguration([{player:actor,options,source:r}],{resolve:x=>x});
return {r,release(){b.release();},draw(frame){let s;a(b.draw({save(){},restore(){},drawImage(c){s=c;}},actor,{...options,progress:(frame+.1)/8}));return s;}}}
(async()=>{await w.ready;let tested=0;
const ws0=ref(0,'south'),ws1=ref(1,'south');a.deepEqual(ws0.baseRecord,ws1.baseRecord);
for(const fields of [{},{skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}]){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...fields}), actor=equipment=>({classId:'sword',appearance96,equipment}),e={weapon:{def:1}},p=actor(e),q=actor({...e,legs:{def:182}}),saved=JSON.stringify(q);
 const before=await stage(p),next=await stage(q),wr=before.r,r=next.r;
 a.equal(r.item,1);a.equal(r.pantsSourceId,'female-pants182-sword-attack-sword-south');
 a.deepEqual(wr.states,r.states);a.deepEqual(r.states,ws1.states);a.deepEqual(r.material,wr.material);
 const {layers:original,...d}=wr.pack.directions.south,{layers:withPants,...newD}=r.pack.directions.south;a.deepEqual(newD,d);
 a.deepEqual(original.filter(l=>l.slot!=='pants'),withPants.filter(l=>l.slot!=='pants'));
 const shorts=original.find(l=>l.slot==='pants'),pants=withPants.find(l=>l.slot==='pants');
 const zero=w.selectVisual(actor({weapon:{def:0},legs:{def:182}}),o);a(zero?.pantsSourceId);a.deepEqual(zero.states,ws0.states);a.deepEqual(zero.pack.directions.south.layers.find(l=>l.slot==='pants'),pants);
 for(let i=0;i<8;i++){
  const ac=before.draw(i),en=next.draw(i);a.equal(ac.width,en.width);a.equal(ac.height,en.height);
  const mask=cv.createCanvas(ac.width,ac.height),ctx=mask.getContext('2d');
  ctx.drawImage(await load('tools/rework-base-hd/assets/'+shorts.frames[i]+'.png'),0,0);
  ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+pants.frames[i]+'.png'),0,0);
  const md=px(mask),wimg=cv.createCanvas(ac.width,ac.height),wc=wimg.getContext('2d');
  const part=r.states[i].parts[0];wc.transform(...part.matrix);
  if(part.sourceClip){wc.beginPath();wc.rect(...part.sourceClip);wc.clip();}
  wc.drawImage(await load(part.url),0,0);const blade=px(wimg);
  const x=px(ac),y=px(en);let diff=0;
  for(let n=0;n<x.length;n+=4){
   if(x.readUInt32LE(n)===y.readUInt32LE(n))continue;
   a(md[n+3],'difference outside pants ownership');a(blade[n+3]!==255,'opaque blade pixel changed');diff++;
  }
  a(diff>100);tested++;mask.width=wimg.width=1;
 }
 for(const equipment of [{weapon:{def:1},legs:{def:168}},{weapon:{def:1,variant:'other'},legs:{def:182}},{weapon:{def:1},legs:{def:182,variant:'other'}},
   {...q.equipment,head:{def:129}},{...q.equipment,coat:{def:151}},{...q.equipment,boots:{def:9}}])a(!w.selectVisual(actor(equipment),o)?.pantsSourceId);
 for(const direction of ['north','east','west'])a(!w.selectVisual(q,{...o,direction})?.pantsSourceId);
 a.equal(JSON.stringify(q),saved);before.release();next.release();console.log('sword1/p182',appearance96.skinColor,'8');
}
a.equal(tested,16);console.log('PASS',tested);
})().catch(e=>{console.error(e);process.exitCode=1;});
