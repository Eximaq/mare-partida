const p=require('node:path'),a=require('node:assert/strict'),R=process.env.KAIZOKU_REPO||p.dirname(__dirname),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
if(process.env.CANDIDATE)global.MareReworkFemaleEquipmentHD=require(process.env.CANDIDATE);
const read=f=>require(p.join(R,f)),l=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),load=f=>f.startsWith('tools/rework-firearm113-coat/')?cv.loadImage(p.join(R,'dist',f)):l(f),world=make({loadImage:load}),opt={direction:'north',action:'attack-firearm',consumer:'world'};
const appearance=global.MareFemaleNamedHairHD.create(read('tools/rework-accessories/head-layer-index.json'),
 read('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(read('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const author=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{appearanceRegistry:appearance,makeCanvas:cv.createCanvas});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const stage=async(actor)=>{const r=world.selectVisual(actor,opt);a(r,JSON.stringify(actor));const b=await world.prepareConfiguration([{player:actor,options:opt,source:r}],{resolve:x=>x});
 return {r,b,draw(i){let c;a(b.draw({save(){},restore(){},drawImage(out){c=out;}},actor,{...opt,progress:(i+.1)/8}));return pix(c);}};};
async function render(r,frame){
 const map=new Map(await Promise.all(author.requiredFiles(r,{frame}).map(async f=>[f,await load(f)]))),out=cv.createCanvas(640,640),coat=cv.createCanvas(640,640),cc=coat.getContext('2d'),parts=[];
 author.render(out.getContext('2d'),r,map,{frame,captureOps({op,canvas}){
  for(const c of parts)c.getContext('2d').drawImage(canvas,0,0);
  if(op.part){const c=cv.createCanvas(640,640),cx=c.getContext('2d');cx.drawImage(canvas,0,0);cx.globalCompositeOperation='destination-out';parts.push(c);}
  if(op.layer?.id.startsWith('coat151-whole-'))cc.drawImage(canvas,0,0);
  canvas.width=1;
 }});
 const b={parts:parts.map(pix),coat:pix(coat)};for(const c of [out,coat,...parts])c.width=1;return b;
}
(async()=>{await world.ready;let count=0;
const profiles=process.env.SKIN?[{skinColor:process.env.SKIN,hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}]:[{},...Object.keys(global.MareAppearance96.skins).map(skinColor=>({skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}))];
const id=114;
for(const look of profiles){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...look}),
 act=(item,coat)=>({classId:'gunner',appearance96,equipment:{weapon:{def:item},...(coat?{coat:{def:151}}:{})}});
 const equipped=act(id,true),save=JSON.stringify(equipped);
 const before=await stage(act(id,false)),after=await stage(equipped),ref=world.selectVisual(act(113,true),opt);
 const catalog=read('tools/rework-weapon-layers-hd/index.json').femaleRegistrations;
 a.deepEqual(before.r.states,catalog.find(r=>r.item===id&&r.direction==='north'&&r.action===opt.action).states);
 a.deepEqual(before.r.baseRecord.pack,catalog.find(r=>r.item===113&&r.direction==='north'&&r.action===opt.action).baseRecord.pack);
 for(const item of [4,5,115,116])a(!world.selectVisual(act(item,true),opt)?.northFirearmCoatSources);
 for(const equipment of [{...equipped.equipment,coat:{def:6}},{...equipped.equipment,coat:{def:151,variant:'other'}},
   {...equipped.equipment,weapon:{def:114,variant:'other'}},{...equipped.equipment,head:{def:129}},
   {...equipped.equipment,legs:{def:182}},{...equipped.equipment,boots:{def:148}},{...equipped.equipment,gloves:{def:26}}])
  a(!world.selectVisual({...equipped,equipment},opt)?.northFirearmCoatSources);
 for(const direction of ['south','east','west'])a(!world.selectVisual(equipped,{...opt,direction})?.northFirearmCoatSources);
 a(after.r.northFirearmCoatSources);a.deepEqual(before.r.states,after.r.states);a.deepEqual(before.r.material,after.r.material);
 a.deepEqual(before.r.northFirearmVisibleSkin,after.r.northFirearmVisibleSkin);a.deepEqual(before.r.northFirearmHeadRecoil,after.r.northFirearmHeadRecoil);
 a.deepEqual(after.r.pack,ref.pack);
 for(let i=0;i<8;i++){
  const x=before.draw(i),y=after.draw(i),s=await render(before.r,i),t=await render(after.r,i);
  a.equal(s.parts.length,t.parts.length);let delta=0,outside=0,opaque=0;const conflict=[];
  for(const [j,b] of s.parts.entries()){let n=0;for(let k=0;k<b.length;k+=4)if(b.readUInt32LE(k)!==t.parts[j].readUInt32LE(k))n++;if(n)conflict.push(n);}
  for(let k=0;k<x.length;k+=4)if(x.readUInt32LE(k)!==y.readUInt32LE(k)){delta++;if(!t.coat[k+3])outside++;if(s.parts.some(b=>b[k+3]===255))opaque++;}
  a.deepEqual({conflict,outside,opaque},{conflict:[],outside:0,opaque:0});
  a(delta>1000);a(before.draw(i).equals(x));count++;global.gc?.();
 }
 a.equal(JSON.stringify(equipped),save);before.b.release();after.b.release();console.log(id,appearance96.skinColor,'8');
}
a.equal(count,8*profiles.length);console.log('PASS',count);
})().catch(e=>{console.error(e);process.exitCode=1});
