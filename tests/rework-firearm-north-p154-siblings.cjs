const p=require('node:path'),a=require('node:assert/strict'),R=process.env.KAIZOKU_REPO||p.dirname(__dirname),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const weapons=[4,5,115,116],weapon=Number(process.env.P154_RECEIVER);
if(!process.env.P154_RECEIVER){
 const {spawnSync}=require('node:child_process');
 for(const item of weapons){
  const r=spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,P154_RECEIVER:String(item)}});
  if(r.error)throw r.error;
  if(r.status!==0)process.exit(r.status??1);
 }
 console.log('PASS 96 distinct right-rifle P154 frames');process.exit(0);
}
a(weapons.includes(weapon));
const read=f=>require(p.join(R,f)),l=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),load=f=>f.startsWith('tools/rework-firearm113-coat/')&&!f.endsWith('ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c.png')?cv.loadImage(p.join(R,'dist',f)):l(f.replace('tools/rework-firearm113-coat/','tools/rework-base-hd/')),world=make({loadImage:load}),opt={direction:'north',action:'attack-firearm',consumer:'world'};
const appearance=global.MareFemaleNamedHairHD.create(read('tools/rework-accessories/head-layer-index.json'),
 read('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(read('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const author=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{appearanceRegistry:appearance,makeCanvas:cv.createCanvas});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const stage=async(actor)=>{const r=world.selectVisual(actor,opt);a(r,JSON.stringify(actor));const b=await world.prepareConfiguration([{player:actor,options:opt,source:r}],{resolve:x=>x});
 return {r,b,draw(i){let c;a(b.draw({save(){},restore(){},drawImage(out){c=out;}},actor,{...opt,progress:(i+.1)/8}));return pix(c);}};};
async function render(r,frame){
 const map=new Map(await Promise.all(author.requiredFiles(r,{frame}).map(async f=>[f,await load(f)]))),out=cv.createCanvas(640,640),coat=cv.createCanvas(640,640),cc=coat.getContext('2d'),pants=cv.createCanvas(640,640),pc=pants.getContext('2d'),parts=[];let anatomy;
 author.render(out.getContext('2d'),r,map,{frame,captureOps({op,canvas}){
  for(const c of parts)c.getContext('2d').drawImage(canvas,0,0);
  if(op.part){const c=cv.createCanvas(640,640),cx=c.getContext('2d');cx.drawImage(canvas,0,0);cx.globalCompositeOperation='destination-out';parts.push(c);}
  if(op.layer?.id.startsWith('coat151-whole-'))cc.drawImage(canvas,0,0);
  if(op.layer?.id==='body-clothed')anatomy=pix(canvas);
  if(op.layer?.id==='candidate-pants154')pc.drawImage(canvas,0,0);
  canvas.width=1;
 }});
 const b={parts:parts.map(pix),coat:pix(coat),pants:pix(pants),anatomy};for(const c of [out,coat,pants,...parts])c.width=1;return b;
}
(async()=>{await world.ready;let count=0;
const profiles=[{},...['porcelain','ebony'].map(skinColor=>({skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}))];
const contrast=new Map();
for(const look of profiles){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...look}),
 actor={id:'same-p154-actor',classId:'gunner',appearance96,equipment:{weapon:{def:weapon}}},
 fitted={...actor,equipment:{...actor.equipment,legs:{def:154}}},snapshot=JSON.stringify(actor),saved=JSON.stringify(fitted);
 const [bare,wear]=await Promise.all([stage(actor),stage(fitted)]),d=r=>r.pack.directions.north;
 const withCoat=world.selectVisual({...actor,equipment:{...actor.equipment,weapon:{def:113},coat:{def:151},legs:{def:154}}},opt);
 a(wear.r.northFirearmPants154&&withCoat.northFirearmPants154);
 const raw=read('tools/rework-weapon-layers-hd/index.json').femaleRegistrations;
 const own=raw.find(x=>x.item===weapon&&x.direction==='north'&&x.action==='attack-firearm'),
  base113=raw.find(x=>x.item===113&&x.direction==='north'&&x.action==='attack-firearm');
 a.deepEqual(own.baseRecord,base113.baseRecord);a.deepEqual(wear.r.states,own.states);
 a.deepEqual(wear.r.states.map(q=>q.parts.map(p=>[p.side,p.depth])),[[['right',5.81]],[],[],[],[],[],[],[['right',5.81]]]);
 const cloth=ids=>ids.find(x=>x.id==='candidate-pants154');
 a.deepEqual(cloth(d(wear.r).layers),cloth(d(withCoat).layers));
 a.deepEqual(d(wear.r).layers.filter(x=>x.id!=='candidate-pants154'),d(bare.r).layers);
 a(!d(wear.r).layers.some(x=>x.id.startsWith('coat151')));
 for(const name of ['states','material','northFirearmVisibleSkin','northFirearmHeadRecoil','colorAppearance'])
  a.deepEqual(wear.r[name],bare.r[name]);
 for(const name of ['clip','poses','rest'])a.deepEqual(d(wear.r)[name],d(bare.r)[name]);
 a.equal(d(wear.r).clip.frames,8);a.equal(d(wear.r).clip.fps,12);a.equal(d(wear.r).clip.contactFrame,4);
 const mutate=actor.equipment;
 const trace=[false,true,false,true].map(withPants=>{
  if(withPants)mutate.legs={def:154};else delete mutate.legs;
  const got=world.selectVisual(actor,opt);a.deepEqual(got,withPants?wear.r:bare.r);
  return got.id;
 });
 delete mutate.legs;a.equal(JSON.stringify(actor),snapshot);a.equal(JSON.stringify(fitted),saved);
 const generic=world.selectVisual(fitted,{...opt,action:'attack'});a(generic?.northFirearmPants154);a.deepEqual(generic.states,wear.r.states);
 a.equal(trace[0],trace[2]);a.equal(trace[1],trace[3]);a.notEqual(trace[0],trace[1]);
 for(const equipment of [
   {...fitted.equipment,legs:{def:154,variant:'other'}},{...fitted.equipment,weapon:{def:weapon,variant:'other'}},
   {...fitted.equipment,head:{def:129}},{...fitted.equipment,gloves:{def:26}},
   {...fitted.equipment,boots:{def:148}},{...fitted.equipment,coat:{def:151}},{...fitted.equipment,weapon:{def:114}},{...fitted.equipment,weapon:{def:17}}])
  a(!world.selectVisual({...fitted,equipment},opt)?.northFirearmPants154);
 for(const direction of ['south','east','west'])a(!world.selectVisual(fitted,{...opt,direction})?.northFirearmPants154);
 for(let i=0;i<8;i++){
  const [bs,ws,cs]=[await render(bare.r,i),await render(wear.r,i),await render(withCoat,i)];
  const before=bare.draw(i),after=wear.draw(i);
  a.deepEqual(bs.parts,ws.parts);a(bs.anatomy.equals(ws.anatomy));a(ws.pants.equals(cs.pants));
  let region=0,delta=0,skinProven=0,skinFrozen=0,waistCloth=0;
  const source=d(wear.r).layers.find(x=>x.id==='body-clothed').frames[i],
   mask=await load('tools/rework-firearm113-coat/assets/'+wear.r.northFirearmVisibleSkin[source]+'.png');
  const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(mask,0,0);const material=pix(c);c.width=1;
  const last=contrast.get(i);
  if(appearance96.skinColor==='porcelain')contrast.set(i,{before,after,cloth:ws.pants,anatomy:ws.anatomy});
  for(let j=0;j<after.length;j+=4){
   if(before.readUInt32LE(j)!==after.readUInt32LE(j)){a(ws.pants[j+3]);a(!bs.parts.some(p=>p[j+3]===255));delta++;}
   const y=Math.floor(j/2560);
   if(y>=310&&y<333&&ws.pants[j+3]>=250&&after.readUInt32LE(j)!==before.readUInt32LE(j))waistCloth++;
   // Coordinates only bound the waist audit. Pixel ownership comes from the actual body mask,
   // opaque old coat, and absence of any current pants contribution at this index.
   if(y>=298&&y<333&&!ws.pants[j+3]&&cs.coat[j+3]===255&&material[j+3]&&ws.anatomy[j+3]===255&&ws.anatomy.readUInt32LE(j)===after.readUInt32LE(j)){
    region++;a.equal(after.readUInt32LE(j),before.readUInt32LE(j));
    if(last&&last.anatomy.readUInt32LE(j)!==ws.anatomy.readUInt32LE(j)){
     if(last.after.readUInt32LE(j)===after.readUInt32LE(j))skinFrozen++;else skinProven++;
    }
   }
  }
  if(last)a(last.cloth.equals(ws.pants),'raw cloth recolored');
  a.equal(skinFrozen,0);a.equal(region,0,'unexpected new skin in the waist band');a(waistCloth>1000,'native waistband not visibly seated');a(delta>1000);a(bare.draw(i).equals(before));a(wear.draw(i).equals(after));count++;
  console.log(appearance96.skinColor,i,JSON.stringify({delta,region,skinProven,skinFrozen,waistCloth}));global.gc?.();
 }
 bare.b.release();wear.b.release();
}
a.equal(count,24);console.log('PASS',weapon,count);
})().catch(e=>{console.error(e);process.exitCode=1});
