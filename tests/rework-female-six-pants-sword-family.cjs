'use strict';
if(!process.env.KAIZOKU_DIRECTION){
 const spawn=require('node:child_process').spawnSync;
 for(const a of ['idle','walk','attack-sword'])for(const d of ['north','south','east','west'])for(const id of [1,67,68,69,70]){
  const v=spawn(process.execPath,[...process.execArgv,__filename,...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,KAIZOKU_DIRECTION:d,KAIZOKU_ACTION:a,ISOLATE_SWORD_ID:String(id)}});
  if(v.status!==0)process.exit(v.status??1);
 }
 process.exit(0);
}
const path=require('node:path'),a=require('node:assert/strict'),R=path.resolve(process.argv[2]||path.join(__dirname,'..')),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),w=make();
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),direction=process.env.KAIZOKU_DIRECTION, action=process.env.KAIZOKU_ACTION, o={action,direction,consumer:'world'};
const pack=require(path.join(R,'tools/rework-weapon-layers-hd/index.json')),outfits=require(path.join(R,'tools/rework-modular-outfits-hd/index.json')).records;
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
return {r,release(){b.release();},draw(frame){let s;a(b.draw({save(){},restore(){},drawImage(c){s=c;}},actor,{...options,progress:(frame+.1)/r.pack.directions[direction].clip.frames}));return s;}}}
(async()=>{await w.ready;let tested=0,selectors=0;
 const ids=process.env.ISOLATE_SWORD_ID?[Number(process.env.ISOLATE_SWORD_ID)]:[1,67,68,69,70],fields={skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'};
 const A=global.MareCharacterAppearance;
 for(const id of ids){
  const ws0=ref(0,direction),ws1=ref(id,direction);a.deepEqual(ws0.baseRecord,ws1.baseRecord);
  const appearance96=A.normalize({gender:'feminino',...fields});
  const actor=(equipment,patch={})=>({classId:'sword',appearance96:{...appearance96,...patch},equipment});
  const e={weapon:{def:id}},p=actor(e), before=await stage(p),wr=before.r;
  const frames=wr.pack.directions[direction].clip.frames;
  for(const def of [140,147,154,161,175,182]){
   const gear={...e,legs:{def}},q=actor(gear),next=await stage(q),r=next.r;
   for(const skinColor of Object.keys(A.skins)){
    const ra=w.selectVisual(actor(gear,{skinColor}),o),rb=w.selectVisual(actor(e,{skinColor}),o);
    a(ra?.pantsSourceId);
    a.deepEqual(ra.slotRoutes?.weapon,{quality:'hd',item:id,source:ws1.id});
    a.deepEqual(ra.slotRoutes?.legs,{quality:'hd',item:def,source:ra.pantsSourceId});a.deepEqual(ra.states,rb.states);a.deepEqual(ra.material,rb.material);selectors++;
   }
   a.equal(r.item,id);a.equal(r.pantsSourceId,'female-pants'+def+'-sword-'+action+'-'+direction);
   a.deepEqual(wr.states,r.states);a.deepEqual(r.states,ws1.states);a.deepEqual(r.material,wr.material);
   const {layers:original,...d}=wr.pack.directions[direction],{layers:withPants,...newD}=r.pack.directions[direction];a.deepEqual(newD,d);
   a.deepEqual(original.filter(l=>l.slot!=='pants'),withPants.filter(l=>l.slot!=='pants'));
   const shorts=original.find(l=>l.slot==='pants'),pants=withPants.find(l=>l.slot==='pants');
   const own=outfits.find(q=>q.id===r.pantsSourceId);a.equal(own.sourceSwordRecord,ws0.id);a.deepEqual(own.pack.directions[direction].layers[0],pants);
   for(const i of frames===1?[0]:[0,4]){
    const ac=before.draw(i),en=next.draw(i);a.equal(ac.width,en.width);a.equal(ac.height,en.height);
    const mask=cv.createCanvas(ac.width,ac.height),ctx=mask.getContext('2d');
    ctx.drawImage(await load('tools/rework-base-hd/assets/'+(shorts.frames?.[i]||shorts.source)+'.png'),r.paddingPhysical,r.paddingPhysical);
    ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+pants.frames[i]+'.png'),r.paddingPhysical,r.paddingPhysical);
    const md=px(mask),v0=await visibleBlade(wr,i),v1=await visibleBlade(r,i);
    a(v0.equals(v1),'compositor weapon alpha/occlusion changed '+[id,def,direction,action,i]);
    const x=px(ac),y=px(en);let diff=0;
    for(let n=0;n<x.length;n+=4){
     if(x.readUInt32LE(n)===y.readUInt32LE(n))continue;
     a(md[n+3],'difference outside pants ownership');a(v0[n+3]!==255,'output changed under opaque visible weapon '+[id,direction,i]);diff++;
    }
    a(diff>100);tested++;mask.width=1;global.gc?.();
   }
   for(const equipment of [{weapon:{def:id,variant:'other'},legs:{def}},{weapon:{def:id},legs:{def,variant:'other'}},
     {...q.equipment,head:{def:129}},{...q.equipment,coat:{def:151}},{...q.equipment,boots:{def:9}}])a(!w.selectVisual(actor(equipment),o)?.pantsSourceId);
   next.release();loaded.clear();global.gc?.();
  }
  before.release();global.gc?.();console.log('sword'+id,action,direction,tested,selectors);
 }
 a.equal(tested,ids.length*(action==='idle'?6:12));a.equal(selectors,ids.length*48);console.log('PASS',action,direction,tested,selectors);
})().catch(e=>{console.error(e);process.exitCode=1;});
