'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const C=require('../tools/paper-doll-96-v3/weapons.json');
const cls=w=>w.category!=='focus'?Object.keys(C.classes).find(x=>C.classes[x]===w.category):[31,32,125,126,127,128].includes(w.itemId)?'healer':'strategist';
const dirs=['south','north','east','west'],take=(api,p,o)=>api.selectVisual(p,o);
const roster=[2,3,14,15,16,31,32,110,111,112,117,118,119,120,121,122,123,124,125,126,127,128];
test('known no-hair-occlusion hats attach to the exact own male carry without changing its pose',async()=>{
 const n=make();await n.ready;let count=0;
 for(const dir of dirs)for(const action of ['idle','walk'])for(const weapon of roster){
  const o={action,direction:dir,consumer:'world'},p={classId:cls(C.items.find(r=>r.itemId===weapon)),
   appearance96:A.normalize({gender:'masculino'}),equipment:{weapon:{def:weapon},head:null,legs:null,coat:null}};
  const base=take(n,p,o);assert(base?.hdKind==='carry');
  for(const head of [164,178]){
   const dressed={...p,equipment:{...p.equipment,head:{def:head}}};
   const own=take(n,dressed,o);
   assert(own?.ownIndependentCarryHat,JSON.stringify({weapon,head,dir,action}));
   assert.equal(own.slotRoutes.head.item,head);
   assert.deepEqual(own.omitted,[]);
   assert.deepEqual(own.plan,base.plan);
   assert.deepEqual(own.pack,base.pack);
   assert.deepEqual(own.colorAppearance,base.colorAppearance);
   assert(!take(n,{...dressed,equipment:{...dressed.equipment,head:{def:head,variant:'outside-authority'}}},o)?.ownIndependentCarryHat);
   count++;
  }
 }
 assert.equal(count,352);
});

test('fully covering helmets have their own exact clearance and retain separate authored hair',async()=>{
 const n=make(),auth=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json').verifiedHeadgear;
 await n.ready;let passed=0,held=0;
 for(const direction of dirs)for(const action of ['idle','walk'])for(const weapon of roster){
  const o={direction,action,consumer:'world'};
  const p={classId:cls(C.items.find(x=>x.itemId===weapon)),appearance96:A.normalize({gender:'masculino'}),equipment:{weapon:{def:weapon}}};
  const bare=take(n,p,o),known=auth.plans[bare?.id];
  assert(known);
  for(const head of [19,136]){
   const actual=take(n,{...p,equipment:{...p.equipment,head:{def:head}}},o);
   if(!known.fullHeadClear.includes(head)){
    assert(!actual?.ownIndependentCarryHat,'unproved hat contact must remain outside this route');held++;continue;
   }
   assert(actual?.ownIndependentCarryHat&&actual.gearOnlyRecord.hideHair,JSON.stringify({direction,action,weapon,head,source:actual?.id}));
   assert.equal(actual.slotRoutes.head.item,head);assert.deepEqual(actual.omitted,[]);
   assert.deepEqual(actual.plan,bare.plan);assert.deepEqual(actual.pack,bare.pack);
   assert.equal(actual.pack.directions[direction].layers.filter(l=>l.slot==='hair').length,1);
   passed++;
  }
 }
 assert.deepEqual([passed,held],[309,43]);
});

test('own carry with hat is exactly the weapon body plus the existing approved hat raster',async()=>{
 const n=make();await n.ready;
 const gearIndex=require('../tools/rework-accessories/head-layer-index.json'),compat=MareNativeHeadCompat.create({makeCanvas:cv.createCanvas}),
   hats=MareOriginalHairHelmetsHD.create(gearIndex,{compat,makeCanvas:cv.createCanvas});
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const on=(p,head)=>({...p,equipment:{...p.equipment,head:{def:head}}});
 const canvas=()=>cv.createCanvas(512,512),bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
 const draw=(q,p,o,frame,count)=>{let c;assert(q.draw({save(){},restore(){},drawImage(i){c=i}},p,{...o,progress:(frame+.25)/count}));return c;};
 let count=0;
 for(const weapon of [2,117,126])for(const [direction,action] of [['south','idle'],['north','walk'],['east','idle'],['west','walk']]){
  const p={classId:cls(C.items.find(x=>x.itemId===weapon)),appearance96:A.normalize({gender:'masculino'}),equipment:{weapon:{def:weapon}}};
  const o={action,direction,consumer:'world'},r=take(n,p,o),d=r.pack.directions[direction];
  const original=await n.prepareConfiguration([{player:p,options:o}]);
  try{
   for(const head of [164,178]){
    const dressed=on(p,head),g=take(n,dressed,o);
    const actual=await n.prepareConfiguration([{player:dressed,options:o}]);
    try{
     const names=hats.requiredFiles(g.gearOnlyRecord),images=new Map(await Promise.all(names.map(async f=>[f,await load(f)])));
     const layer=d.layers.find(l=>l.slot==='headBase');
     for(const frame of (action==='idle'?[0]:[0,5,15])){
      const path='tools/rework-base-hd/assets/'+(layer.frames?.[frame]||layer.source)+'.png';
      const proof=hats.validate(g.gearOnlyRecord,{basePack:r.pack,baseBody:'male',baseDirection:direction,baseFrame:frame,baseMirrorX:!!r.base.mirrorX,baseImages:new Map([[path,await load(path)]]),headImages:images});
      assert(proof.compatible);
      const before=draw(original,p,o,frame,d.clip.frames),after=draw(actual,dressed,o,frame,d.clip.frames),expect=canvas();
      expect.getContext('2d').drawImage(before,0,0);
      hats.draw(expect.getContext('2d'),g.gearOnlyRecord,images,proof);
      assert(bytes(expect).equals(bytes(after)),JSON.stringify({weapon,direction,action,frame,head}));
      assert(!bytes(before).equals(bytes(after)),'visible matched hat');
      expect.width=1;count++;
     }
    }finally{actual.release();global.gc?.();}
   }
  }finally{original.release();}
 }
 assert.equal(count,48);
});

test('full helmets only hide the separate hair pass; map bundle keeps own weapon in every facing',async()=>{
 const n=make();await n.ready;
 const baseIndex=require('../tools/rework-base-hd/index.json'),carryIndex=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json'),gearIndex=require('../tools/rework-accessories/head-layer-index.json');
 const compat=MareNativeHeadCompat.create({makeCanvas:cv.createCanvas});
 const hats=MareOriginalHairHelmetsHD.create(gearIndex,{compat,makeCanvas:cv.createCanvas});
 const carries=MareReworkWeaponCarryHD.create(baseIndex,carryIndex,{makeCanvas:cv.createCanvas});
 const read=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..')),cache=new Map();
 const files=async names=>new Map(await Promise.all(names.map(async f=>{if(!cache.has(f))cache.set(f,read(f));return [f,await cache.get(f)];})));
 const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
 let total=0;
 for(const direction of dirs)for(const action of ['idle','walk'])for(const head of [19,136]){
  const o={direction,action,consumer:'world'};
  const p={classId:'brawler',appearance96:A.normalize({gender:'masculino'}),equipment:{weapon:{def:2}}},dressed={...p,equipment:{...p.equipment,head:{def:head}}};
  const bare=take(n,p,o),winner=take(n,dressed,o),refs=winner.gearOnlyRecord,d=bare.pack.directions[direction];
  const source=await n.prepareConfiguration([{player:dressed,options:o}]);
  try{
   for(const i of (action==='idle'?[0]:[0,8,15])){
    const filesIn=new Set([...hats.requiredFiles(refs),...carries.requiredFiles(bare,{frame:i})]),images=await files([...filesIn]);
    const proof=hats.validate(refs,{basePack:bare.pack,baseDirection:direction,baseBody:bare.body,baseFrame:i,baseMirrorX:!!bare.base.mirrorX,baseImages:images,headImages:images});
    assert(proof.compatible);
    const expected=cv.createCanvas(512,512),original=cv.createCanvas(512,512);
    carries.render(expected.getContext('2d'),bare,images,{frame:i,hiddenSlots:['hair']});
    carries.render(original.getContext('2d'),bare,images,{frame:i});
    hats.draw(expected.getContext('2d'),refs,images,proof);
    let actual;assert(source.draw({save(){},restore(){},drawImage(c){actual=c}},dressed,{...o,progress:(i+.25)/d.clip.frames}));
    assert(pix(actual).equals(pix(expected)),JSON.stringify({direction,action,head,i}));
    assert(!pix(expected).equals(pix(original)));
    const hidden={...dressed,preferences:{hideHeadgear:true}};
    assert.equal(take(n,hidden,o)?.id,bare.id,'hiding worn headgear must keep the exact visible HD carry');
    assert.equal(hidden.equipment.head.def,head);
    expected.width=original.width=1;total++;
   }
  }finally{source.release();cache.clear();global.gc?.();}
 }
 assert.equal(total,32);
});
