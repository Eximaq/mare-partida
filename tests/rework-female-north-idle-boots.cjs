const fs=require('fs'),p=require('path'),crypto=require('crypto');
const loaderRoot=process.env.KAIZOKU_REPO;
const root=loaderRoot||p.resolve(__dirname,'..'),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(p.join(root,'player-rework-sword0-checkpoint.js'));
const material='tools/rework-sword0-checkpoint/sword-catalog.json',cat=require(p.join(root,'dist',material));
const assert=require("node:assert/strict"),loader=require(p.join(root,"tools/rework-hd-test-loader.cjs")).create(root),db=require(p.join(root,"tools/rework-modular-outfits-hd/index.json"));
make();
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===material?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:loader,makeCanvas:cv.createCanvas});
const o={action:'idle',direction:'north',consumer:'world'},d=r=>r.pack.directions.north;
const ids=[8,9,134,141,148,155,162,169,176,183],raw={gender:'feminino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'};
const actor=(look,boots)=>({classId:'brawler',appearance96:look,equipment:{coat:{def:151},...(boots?{boots:{def:boots}}:{})}});
const draw=async(a,s)=>{
 const q=await api.prepareConfiguration([{player:a,options:o,source:s}],{resolve:x=>x});
 let c;assert(q.draw({save(){},restore(){},drawImage(t){c=t;}},a,{...o,progress:0}));
 const b=c.getContext('2d').getImageData(0,0,512,512).data;q.release();return Buffer.from(b);
};
(async()=>{
 await api.ready;
 for(const look of [raw,global.MareCharacterAppearance.normalize({gender:'feminino'}),...['porcelain','ebony'].map(skinColor=>global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairColor:'blonde',eyeColor:'amber'}))]){
  const bare=actor(look),r=api.selectVisual(bare,o),old=await draw(bare,r);
  for(const b of ids){
   const native=db.records.find(x=>x.id===`frozen-v47-female-151-boot${b}-north-idle`),own=d(native).layers.filter(x=>x.id.startsWith('boot'+b+'-'));
   assert.equal(own.length,4);
   const a=actor(look,b),clone=api.selectVisual(a,o);
   assert(clone,b+' route missing in '+look.skinColor);
   if(look!==raw){assert.equal(clone.slotRoutes?.boots?.item,b);assert.deepEqual(clone.colorAppearance,r.colorAppearance);}
   assert.deepEqual(d(clone).layers.filter(x=>x.id.startsWith('boot'+b+'-')),own);
   const candidate=await draw(a,clone),cv0=cv.createCanvas(512,512),ctx=cv0.getContext('2d');
   for(const l of own){assert.equal(l.binding.kind,'fixed');const im=await loader('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png');ctx.drawImage(im,0,0);}
   const bytes=ctx.getImageData(0,0,512,512).data;let touched=0;
   for(let i=0;i<old.length;i+=4)if(candidate.readUInt32LE(i)!==old.readUInt32LE(i)){assert(bytes[i+3],b+' outside own pixel');touched++;}
   assert(touched>100);
   if(look===raw)assert(candidate.equals(await draw(a,api.select(a,o))),b+' original source changed');
   console.log(look.skinColor,b,touched);
  }
  assert(old.equals(await draw(bare,api.selectVisual(bare,o))),'removal altered body');
 }
 console.log('40 stable north-idle boot swaps');
})().catch(e=>{console.error(e);process.exitCode=1});
