const fs=require('fs'),p=require('path'),crypto=require('crypto');
const loaderRoot=process.env.KAIZOKU_REPO;
const root=loaderRoot||p.resolve(__dirname,'..'),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(p.join(root,'player-rework-sword0-checkpoint.js'));
const material='tools/rework-sword0-checkpoint/sword-catalog.json',cat=require(p.join(root,'dist',material));
const assert=require("node:assert/strict"),loader=require(p.join(root,"tools/rework-hd-test-loader.cjs")).create(root),db=require(p.join(root,"tools/rework-modular-outfits-hd/index.json"));
make();
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===material?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:loader,makeCanvas:cv.createCanvas});
const o={action:'idle',direction:'south',consumer:'world'},d=r=>r.pack.directions.south;
const ids=[176,183],raw={gender:'feminino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'};
const actor=(look,boots)=>({classId:'brawler',appearance96:look,equipment:{coat:{def:151},...(boots?{boots:{def:boots}}:{})}});
const draw=async(a,s)=>{
 const q=await api.prepareConfiguration([{player:a,options:o,source:s}],{resolve:x=>x});
 let c;assert(q.draw({save(){},restore(){},drawImage(t){c=t;}},a,{...o,progress:0}));
 const b=c.getContext('2d').getImageData(0,0,512,512).data;q.release();return Buffer.from(b);
};
(async()=>{
 await api.ready;
 for(const look of [raw,global.MareCharacterAppearance.normalize({gender:'feminino'}),...Object.keys(global.MareAppearance96.skins).filter(k=>k!=='original').map(skinColor=>global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairColor:'blonde',eyeColor:'amber'}))]){
  const bare=actor(look),r=api.selectVisual(bare,o),old=await draw(bare,r);
  for(const b of ids){
   const native=db.records.find(x=>x.id===`frozen-v47-female-151-boot${b}-south-idle`),own=d(native).layers.filter(x=>x.id.startsWith('boot'+b+'-'));
   assert.equal(own.length,4);
   const a=actor(look,b),clone=api.selectVisual(a,o);
   assert(clone,b+' route missing in '+look.skinColor);
   if(look!==raw){assert.equal(clone.slotRoutes?.boots?.item,b);assert.deepEqual(clone.colorAppearance,r.colorAppearance);}
   assert.deepEqual(d(clone).layers.filter(x=>x.id.startsWith('boot'+b+'-')),own);
   const candidate=await draw(a,clone),cv0=cv.createCanvas(512,512),ctx=cv0.getContext('2d');
   for(const l of own){assert.equal(l.binding.kind,'fixed');const im=await loader('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png');ctx.drawImage(im,0,0);}
   const bytes=ctx.getImageData(0,0,512,512).data;let touched=0,outsideBoot=[];
   for(let i=0;i<old.length;i+=4)if(candidate.readUInt32LE(i)!==old.readUInt32LE(i)){if(!bytes[i+3])outsideBoot.push([(i/4)%512,Math.floor(i/2048)]);touched++;}
   assert(touched>100);
   if(look===raw){
    assert.equal(api.selectLayered(a,o),null,'Original must remain on exact route');
    assert(candidate.equals(await draw(a,api.select(a,o))),'Original exact route changed');
   }else{assert.equal(outsideBoot.length,0,'boot changed another slot');}
   const original=await draw(actor(raw,b),api.select(actor(raw,b),o));
   // Where the boot is opaque, verify that its exact texture and sole were not recolored.
   ctx.clearRect(0,0,512,512);for(const l of own.filter(x=>x.id.endsWith('-front'))){const im=await loader('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png');ctx.drawImage(im,0,0);}const front=ctx.getImageData(0,0,512,512).data;
   let unchanged=0;for(let i=0;i<old.length;i+=4)if(front[i+3]===255){
    for(let k=0;k<4;k++)assert(Math.abs(candidate[i+k]-original[i+k])<=1,'opaque front texture changed');
    unchanged++;
   }
   assert(unchanged>0);
   let bottom=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i+3])bottom=Math.floor(i/2048);
   assert(bottom>390);
   for(let i=(bottom-15)*2048;i<old.length;i+=4){
    assert.equal(candidate[i+3],original[i+3],'sole silhouette changed');
    for(let k=0;k<3;k++)assert(Math.abs(candidate[i+k]-original[i+k])<=3,'sole color changed beyond low-alpha blending');
   }

   console.log(look.skinColor,b,touched,outsideBoot.length,outsideBoot.slice(0,3),outsideBoot.slice(-3));
  }
  assert(old.equals(await draw(bare,api.selectVisual(bare,o))),'removal altered body');
  for(const b of [8,9,134,141,148,155,162,169])assert.equal(api.selectLayered(actor(look,b),o),null,'nonvalidated boot was promoted');
  const dressed=actor(look,176);dressed.equipment.pants={def:168};
  assert(!api.selectLayered(dressed,o)?.id.includes(':fixed-south-idle-b'),'idle patch leaked into pants');
  for(const options of [{...o,action:'walk'},{...o,action:'attack-unarmed'},{...o,direction:'east'},{...o,direction:'west'}])
   assert(!api.selectLayered(actor(look,176),options)?.id.includes(':fixed-south-idle-b'),'idle patch leaked outside tested pose');

 }
 console.log('stable south-idle boot swaps');
})().catch(e=>{console.error(e);process.exitCode=1});
