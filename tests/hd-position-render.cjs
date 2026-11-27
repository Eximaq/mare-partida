'use strict';
// Compare the map draw path with a separately exported pre-workbench build.
// HD_PUBLISHED_ROOT selects the executable renderer and its archived artwork.
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT||path.resolve(__dirname,'..');
const from=n=>require(path.join(root,n));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs'),world=from('paper-doll-96-lobby.js'),weapons=from('tools/paper-doll-96-v3/weapons.json');
const ref=process.argv.includes('--reference'),census=process.argv.includes('--census');
// Historical reference builds placed the final helmet at the canvas origin on
// padded carries. Reconstruct those expected pixels independently using the
// dimensions of the signed body frame. All other draws remain the reference build's.
let referenceBody;
if(ref){
 const registry=global.MareOriginalHairHelmetsHD,create=registry.create;
 registry.create=(...args)=>{
  const heads=create(...args),draw=heads.draw;
  heads.draw=(ctx,r,images,proof,options)=>{
   if(!referenceBody||options?.paddingPhysical)return draw(ctx,r,images,proof,options);
   const {frame,density}=referenceBody;
   ctx.save();try{
    ctx.translate((ctx.canvas.width-frame.width*density)/2,(ctx.canvas.height-frame.height*density)/2);
    return draw(ctx,r,images,proof);
   }finally{ctx.restore();}
  };
  return heads;
 };
}
const api=make();
const position=ref?null:from('hd-position.js');
const {gear,slots,weapons:arms}=require('../tools/audit-hd-wardrobe-product.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const contexts=[['masculino',0,'idle','south'],['feminino',73,'attack-daggers','east'],['feminino',null,'idle','south'],['masculino',0,'walk','west']];
const checks=path.join(__dirname,'hd-position-reference.json');
async function run(gender,id,action,direction,outfit){
 const equipment=Object.fromEntries(slots.map((s,i)=>[s,{def:outfit[i]}]));
 if(id!==null)equipment.weapon={def:id};
 const a=MareCharacterAppearance.apply({classId:arms.find(w=>w.id===id)?.role||'sword',equipment},{gender,skinColor:'light',hairColor:'black'});
 const o={action,direction,consumer:'world'},r=world.selectWorldHDOnly(api,weapons,a,o);
 assert.ok(r);const base=r.independentPlan?.base;
 referenceBody=ref&&base?.hdKind==='carry'?base.pack:null;
 const pose={player:a,options:o};
 const b=await api.prepareConfiguration([pose],{inspectPositions:!ref,resolve:()=>({...pose,source:r})});
 try{
 const v=b.positionView?.(o),count=r.hdKind==='weapon'?r.timeline.length:r.pack.directions[direction].clip.frames;
 const image=(i,bundle=b)=>{
  const c=cv.createCanvas(200,200),ctx=c.getContext('2d');let raw;
  ctx.drawImage=(im)=>{raw=im;};
  assert.ok(bundle.draw(ctx,a,{...o,progress:(i+.25)/count}));
  return raw.getContext('2d').getImageData(0,0,raw.width,raw.height).data;
 };
 const rgba=Array.from({length:count},(_,i)=>hash(image(i))),baseline={rgba,coverage:b.coverage,meta:api.snapshot().last};
 if(ref)return baseline;
 const tests={};
 for(const [slot,entry] of Object.entries(equipment)){
  const t=v.targets.find(t=>t.slot===slot&&t.part==='*');
  if(slot==='head'&&gender==='masculino'&&[18,19].includes(entry.def)){assert(!t);assert.equal(r.slotRoutes?.head,undefined);tests.head={id:entry.def,hidden:true};continue;}
  if(!t){tests[slot]={id:entry.def,result:'sem operação de ajuste'};continue;}
  const {limits,...identity}=t;
  const m={...position.empty(),records:[{...identity,phases:{},cycle:[0,0]}]};
  v.set(m);assert.equal(hash(image(0)),rgba[0]);
  const moved={...m,records:[{...m.records[0],cycle:[2,1]}]};v.set(moved);
  const adjusted=Array.from({length:count},(_,i)=>hash(image(i)));
  const changed=adjusted.map((h,i)=>h!==rgba[i]);
  if(slot==='coat'&&action==='walk'&&!census&&!process.argv.includes('--cycles')){
   const map=await api.prepareConfiguration([pose],{bakePositions:true,positions:moved,resolve:()=>({...pose,source:r})});
   try{assert.deepEqual(Array.from({length:count},(_,i)=>hash(image(i,map))),adjusted);}
   finally{map.release();}
  }
  v.set(m);assert.deepEqual(Array.from({length:count},(_,i)=>hash(image(i))),rgba);
  tests[slot]={id:entry.def,result:changed.some(Boolean)?'ajuste desenhado':'sem diferença',changed:changed.filter(Boolean).length,frames:count};
 }
 return {baseline,tests};
 }finally{b.release();}
}
(async()=>{
 await api.ready;const outfit=[6,22,148,159,18],results=[];
 if(census||process.argv.includes('--cycles')){
  const full=!census,chosen=process.env.HD_WEAPON_IDS?.split(',').map(Number),rows=chosen?arms.filter(w=>chosen.includes(w.id)):arms;
  assert(rows.length&&(!chosen||rows.length===chosen.length));
  assert.equal(arms.length,42);assert.deepEqual(gear.map(v=>v.length),[10,10,10,10,10]);
  const directions=full?(process.env.HD_DIRECTIONS||'north,south,east,west').split(','):['south'];
  assert(directions.every(d=>['north','south','east','west'].includes(d)));
  const stats={};for(const gender of ['masculino','feminino'])for(const w of rows){
   const clothes=gear.map(s=>s[arms.indexOf(w)%s.length]);
   for(const d of directions)for(const action of full?['idle','walk',api.attackActionFor(w.id)]:['idle']){
    const key=[gender,w.id,action,d].join('/');
    const {tests}=await run(gender,w.id,action,d,clothes);stats[key]=tests;
   }
  }
  const expected=2*rows.length*directions.length*(full?3:1);assert.equal(Object.keys(stats).length,expected);
  console.log(JSON.stringify(stats));
  for(const [k,result] of Object.entries(stats))for(const [slot,t] of Object.entries(result))assert.ok(t.hidden===true||t.changed>0,k+' / '+slot+' #'+t.id+' / '+t.result);return;
 }
 // Keep testing an actually visible helmet on both rigs. The masculine #18
 // and #19 policy is checked separately against the unequipped actor.
 for(const args of contexts)results.push(await run(...args,args[0]==='masculino'?[...outfit.slice(0,-1),129]:outfit));
 if(ref){fs.writeFileSync(process.argv[process.argv.indexOf('--reference')+1],JSON.stringify(results.map(r=>({rgba:r.rgba,contract:hash(JSON.stringify([r.coverage,r.meta]))})),null,2)+'\n');return;}
 const golden=JSON.parse(fs.readFileSync(checks));
 assert.equal(results.length,golden.length);
 for(const [i,{baseline,tests}] of results.entries()){
  assert.deepEqual(baseline.rgba,golden[i].rgba);assert.equal(hash(JSON.stringify([baseline.coverage,baseline.meta])),golden[i].contract);
  for(const [slot,t] of Object.entries(tests))assert.equal(t.changed,t.frames,contexts[i]+' / '+slot);
  assert.equal(Object.keys(tests).length,contexts[i][1]===null?5:6);console.log(contexts[i],tests);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
