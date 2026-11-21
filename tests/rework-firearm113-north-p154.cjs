const path=require('node:path'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),R=path.dirname(__dirname);
const {make,cv}=require(path.join(R,'tests/rework-integration-support.cjs'));
const loadOriginal=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const prefix='tools/rework-firearm113-coat/assets/';
const load=p=>p.startsWith(prefix)?cv.loadImage(path.join(R,'dist',p)):loadOriginal(p);
const own={"id":"candidate-pants154","slot":"pants","depth":3.1,"binding":{"kind":"fixed"},"frames":["41e94088b60e88d6b98ca0c09478f891e36a0f39f59da69c87318859f15afef3","c9834f990f9e9afa6f0e6766d573d2bfa9f1d5ea128a6749ec273b0b56d6ee9e","bd4d27cb20973968a9fc1bbfe8458679179760bd99842f8ae5965b6f473b2816","262fa0086cdfc53e03c9fb52a7dd431f7ecac526125ff4292b7e8b4ad0f90ea3","a4319e35a1e07944be80b580ac28b52b29a0be795de6d8f2f40a26c06ccbf50c","9f8f5b2ac67398f658efe11b9e2a75a8a105de2f35ef00dc299b11e58b133410","c2951b09fa4dc5d78c7539f7fc9484325a6bc981db67b1ae84e3d4b38a1f6ca8","fc343cb7ab7e11104b5b6157d942421102fa9285e837937c393729d3e12da3f4"],"source":"41e94088b60e88d6b98ca0c09478f891e36a0f39f59da69c87318859f15afef3"};
const femaleIdx={schema:'female-native-equipment-registration-v1',records:[]};
const heads=require(R+'/tools/rework-accessories/head-layer-index.json'),birth=require(R+'/tools/rework-base-hd/index.json'),ownership=require(R+'/tools/rework-accessories/female-original-face-ownership.json');
const B=global.MareReworkBaseHD.create(birth);
const C=(w=640,h=w)=>cv.createCanvas(w,h);
const H=global.MareFemaleNamedHairHD.create(heads,ownership,{baseRegistry:B,makeCanvas:C});
const api=global.MareReworkFemaleEquipmentHD.create(femaleIdx,{vendor:global.ReworkAccessoryVendor.compositor,appearanceRegistry:H,makeCanvas:C});
const d=r=>r.pack.directions.north, pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
(async()=>{
 const runtime=make({loadImage:load});await runtime.ready;
 for(const h of own.frames){
  assert.match(h,/^[a-f0-9]{64}$/);
  const artifact=fs.readFileSync(path.join(R,'dist',prefix,h+'.png'));
  assert.equal(artifact.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(crypto.createHash('sha256').update(artifact).digest('hex'),h);
 }
 const opts={direction:'north',action:'attack-firearm'};
 const pick=(p,o=opts)=>runtime.selectVisual(p,o);
 let N=0,weaponOutside=0,max=0;
 const cache=new Map();
 for(const s of ['light','porcelain','ebony']){
  const p={classId:'gunner',appearance96:global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:s,...(s==='light'?{}:{hairStyle:'hair-bob',hairColor:s==='ebony'?'pink':'white',eyeColor:'green',eyeStyle:'face-calm'})}),equipment:{coat:{def:151},weapon:{def:113}}};
  const a=runtime.selectVisual(p,opts);assert.equal(a.material.skinColor,s);
  const pack={...a.pack,directions:{north:{...d(a),layers:[...d(a).layers,own]}}};
  const synthesized={...a,pack,baseRecord:{...a.baseRecord,pack,sourceRefs:[...a.baseRecord.sourceRefs,...own.frames]},northFirearmCoatSources:[...a.northFirearmCoatSources,...own.frames]};
  const equipped={...p,equipment:{...p.equipment,legs:{def:154}}};
  const candidate=pick(equipped);
  const saves=[JSON.stringify(p),JSON.stringify(equipped)];
  const ready=async(pickActor,source)=>runtime.prepareConfiguration([{player:pickActor,options:opts,source}],{resolve:x=>x});
  const record=await ready(p,a),prepared=await ready(equipped,candidate);
  const draw=(cfg,actor,frame)=>{
   let out;const optsRaw={...opts,progress:(frame+.15)/8};
   assert(cfg.draw({save(){},restore(){},drawImage(c){out=c;}},actor,optsRaw));return pixels(out);
  };
  assert(candidate?.northFirearmPants154);assert.deepEqual(d(candidate),d(synthesized));
  assert.deepEqual(candidate.states,a.states);assert.deepEqual(candidate.material,a.material);
  assert.deepEqual(candidate.northFirearmVisibleSkin,a.northFirearmVisibleSkin);
  assert.deepEqual(candidate.northFirearmHeadRecoil,a.northFirearmHeadRecoil);
  for(let frame=0;frame<8;frame++){
   const renders=async(r)=>{
    const c=C(),images=new Map(),parts=[];
    for(const f of api.requiredFiles(r,{frame})){if(!cache.has(f))cache.set(f,await load(f));images.set(f,cache.get(f));}
    api.render(c.getContext('2d'),r,images,{frame,makeCanvas:C,captureOps({op,canvas}){
     for(const p of parts)p.getContext('2d').drawImage(canvas,0,0);
     if(op.part){const part=C(),ctx=part.getContext('2d');ctx.drawImage(canvas,0,0);ctx.globalCompositeOperation='destination-out';parts.push(part);}
     canvas.width=1;
    }});
    const rgba=pixels(c),weapons=parts.map(pixels);for(const p of [c,...parts])p.width=1;
    return {rgba,weapons};
   };
   const [off,on]=await Promise.all([renders(a),renders(candidate)]),before=off.rgba,after=on.rgba;
   assert.deepEqual(off.weapons,on.weapons,'visible gun opacity/colour changed');
   const cloth=C(),x=cloth.getContext('2d');x.drawImage(await load('tools/rework-firearm113-coat/assets/'+own.frames[frame]+'.png'),0,0);
   const mask=pixels(cloth);cloth.width=1;
   let diffs=0;
   for(let i=0;i<before.length;i+=4){
    const arr=[0,1,2,3];
    if(arr.some(j=>before[i+j]!==after[i+j])){
     assert(mask[i+3]>0,`outside alpha s=${s}, frame=${frame}, i=${i/4}`);
     if(off.weapons.some(p=>p[i+3]===255))weaponOutside++;
     diffs++;
    }

   }
   assert.deepEqual(draw(record,p,frame),before);
   assert.deepEqual(draw(prepared,equipped,frame),after);
   assert(diffs>0);max=Math.max(max,diffs);N++;
   console.log(s,frame,'pixels',diffs,'crossing weapon',weaponOutside);
  }
  {
   const restored=pick(p);assert.deepEqual(restored,a);
   const afterRemoval=await ready(p,restored);
   for(let i=0;i<8;i++)assert.deepEqual(draw(record,p,i),draw(afterRemoval,p,i),'restored output');
   afterRemoval.release();
   for(const e of [{boots:{def:148}},{gloves:{def:26}},{head:{def:129}},{legs:{def:154,variant:'other'}},{legs:{def:182}},{weapon:{def:114}},{coat:{def:6}},{coat:{def:151,variant:'other'}}])
    assert(!pick({...equipped,equipment:{...equipped.equipment,...e}})?.northFirearmPants154);
   for(const direction of ['east','west','south'])assert(!pick(equipped,{...opts,direction})?.northFirearmPants154);
   assert.deepEqual(saves,[JSON.stringify(p),JSON.stringify(equipped)]);
   record.release();prepared.release();
  }
 }
 assert.equal(N,24);assert.equal(weaponOutside,0);console.log({N,max,weaponOutside,archivedPngs:own.frames.length});
})().catch(e=>{console.error(e);process.exitCode=1});
