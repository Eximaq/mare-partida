// Each direction gets a fresh renderer/cache; press coverage includes all 8 phases.
if(!process.argv[2])for(const d of ['north','east','west']){
 const r=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename,d],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
if(!process.argv[2])process.exit(0);
const path=require('node:path'),a=require('node:assert/strict'),R=path.resolve(__dirname,'..'),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),w=make();
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),direction=process.argv[2]||'north',o={action:'attack-sword',direction,consumer:'world'};
const pack=require(path.join(R,'tools/rework-weapon-layers-hd/index.json'));
const ref=(item,d)=>pack.femaleRegistrations.find(r=>r.item===item&&r.direction===d&&r.action===o.action);
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const read=f=>require(path.join(R,f)),loaded=new Map();
const ap=global.MareFemaleNamedHairHD.create(read('tools/rework-accessories/head-layer-index.json'),
 read('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(read('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const registry=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:pack.femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:ap});
async function visibleBlade(r,frame){
 const size=r.pack.frame.width*4+2*r.paddingPhysical,vis=cv.createCanvas(size,size),out=cv.createCanvas(size,size),cx=vis.getContext('2d');
 const files=registry.requiredFiles(r,{frame}),imgs=new Map(await Promise.all(files.map(async f=>{if(!loaded.has(f))loaded.set(f,load(f));return [f,await loaded.get(f)];})));
 let found=false;
 registry.render(out.getContext('2d'),r,imgs,{frame,captureOps({op,canvas}){
  if(op.part){a(!found,'single authored weapon part');found=true;cx.drawImage(canvas,0,0);cx.globalCompositeOperation='destination-out';}
  else if(found)cx.drawImage(canvas,0,0);
  canvas.width=1;
 }});
 a(found);const result=px(vis);vis.width=out.width=1;return result;
}
async function stage(actor,options=o){const r=w.selectVisual(actor,options);a(r,JSON.stringify(actor));const b=await w.prepareConfiguration([{player:actor,options,source:r}],{resolve:x=>x});
return {r,release(){b.release();},draw(frame){let s;a(b.draw({save(){},restore(){},drawImage(c){s=c;}},actor,{...options,progress:(frame+.1)/8}));return s;}}}
(async()=>{await w.ready;let tested=0;
const ids=[0,1,67,68,69,70];
for(const id of ids){
const ws0=ref(0,direction),ws1=ref(id,direction);a.deepEqual(ws0.baseRecord,ws1.baseRecord);
for(const fields of [{},{skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'},{skinColor:'copper',hairStyle:'hair-cropped',hairColor:'white',eyeColor:'blue'}]){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...fields});
 for(const [key,value] of Object.entries(fields))a.equal(appearance96[key],value);
 const actor=equipment=>({classId:'sword',appearance96,equipment}),e={weapon:{def:id}},p=actor(e),q=actor({...e,legs:{def:182}}),saved=JSON.stringify(q);
 const before=await stage(p),next=await stage(q),wr=before.r,r=next.r;
 a.equal(r.item,id);a.equal(r.pantsSourceId,'female-pants182-sword-attack-sword-'+direction);
 a.deepEqual(wr.states,r.states);a.deepEqual(r.states,ws1.states);a.deepEqual(r.material,wr.material);
 const {layers:original,...d}=wr.pack.directions[direction],{layers:withPants,...newD}=r.pack.directions[direction];a.deepEqual(newD,d);
 a.deepEqual(original.filter(l=>l.slot!=='pants'),withPants.filter(l=>l.slot!=='pants'));
 const shorts=original.find(l=>l.slot==='pants'),pants=withPants.find(l=>l.slot==='pants');
 const zero=w.selectVisual(actor({weapon:{def:0},legs:{def:182}}),o);a(zero?.pantsSourceId);a.deepEqual(zero.states,ws0.states);a.deepEqual(zero.pack.directions[direction].layers.find(l=>l.slot==='pants'),pants);
 for(let i=0;i<8;i++){
  const ac=before.draw(i),en=next.draw(i);a.equal(ac.width,en.width);a.equal(ac.height,en.height);
  const mask=cv.createCanvas(ac.width,ac.height),ctx=mask.getContext('2d');
  ctx.drawImage(await load('tools/rework-base-hd/assets/'+shorts.frames[i]+'.png'),r.paddingPhysical,r.paddingPhysical);
  ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+pants.frames[i]+'.png'),r.paddingPhysical,r.paddingPhysical);
  const md=px(mask),v0=await visibleBlade(wr,i),v1=await visibleBlade(r,i);
  // Compare the visible weapon pass itself, not the background showing through its translucent ink.
  a(v0.equals(v1),'compositor weapon alpha/occlusion changed '+[id,direction,i]);
  const x=px(ac),y=px(en);let diff=0;
  for(let n=0;n<x.length;n+=4){
   if(x.readUInt32LE(n)===y.readUInt32LE(n))continue;
   a(md[n+3],'difference outside pants ownership');a(v0[n+3]!==255,'output changed under opaque visible weapon '+[id,direction,i]);diff++;
  }
  a(diff>100);tested++;mask.width=1;global.gc?.();
 }
 if(id!==0)for(const equipment of [{weapon:{def:id},legs:{def:168}},{weapon:{def:id,variant:'other'},legs:{def:182}},{weapon:{def:id},legs:{def:182,variant:'other'}},
   {...q.equipment,head:{def:129}},{...q.equipment,coat:{def:151}},{...q.equipment,boots:{def:9}}])a(!w.selectVisual(actor(equipment),o)?.pantsSourceId);

 a.equal(JSON.stringify(q),saved);before.release();next.release();loaded.clear();global.gc?.();console.log('sword'+id+'/p182',appearance96.skinColor,'8');
}
}
a.equal(tested,24*ids.length);console.log('PASS',tested);
})().catch(e=>{console.error(e);process.exitCode=1;});
