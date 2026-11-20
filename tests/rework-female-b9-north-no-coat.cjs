const fs=require('fs'),p=require('path'),crypto=require('crypto');
const loaderRoot=process.env.KAIZOKU_REPO;
const root=loaderRoot||p.resolve(__dirname,'..'),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(p.join(root,'player-rework-sword0-checkpoint.js'));
const material='tools/rework-sword0-checkpoint/sword-catalog.json',cat=require(p.join(root,'dist',material));
const assert=require("node:assert/strict"),loader=require(p.join(root,"tools/rework-hd-test-loader.cjs")).create(root),db=require(p.join(root,"tools/rework-modular-outfits-hd/index.json"));
make();
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===material?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:loader,makeCanvas:cv.createCanvas});
const o={action:'idle',direction:'north',consumer:'world'},d=r=>r.pack.directions.north;
const ids=[9],raw={gender:'feminino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'};
const actor=(look,boots)=>({classId:'brawler',appearance96:look,equipment:{...(boots?{boots:{def:boots}}:{})}});
const draw=async(a,s)=>{
 const q=await api.prepareConfiguration([{player:a,options:o,source:s}],{resolve:x=>x});
 let c;assert(q.draw({save(){},restore(){},drawImage(t){c=t;}},a,{...o,progress:0}));
 const b=c.getContext('2d').getImageData(0,0,512,512).data;q.release();return Buffer.from(b);
};
(async()=>{
 await api.ready;
 const originalByBoot=new Map();let samples=0;for(const look of [raw,global.MareCharacterAppearance.normalize({gender:'feminino'}),...Object.keys(global.MareAppearance96.skins).filter(k=>k!=='original').map(skinColor=>global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}))]){
  const bare=actor(look),r=api.selectVisual(bare,o),old=await draw(bare,r);
  for(const b of ids){
   const native=db.records.find(x=>x.id===`frozen-v47-female-151-boot${b}-north-idle`),own=d(native).layers.filter(x=>x.id.startsWith('boot'+b+'-'));
   assert.equal(own.length,4);
   const a=actor(look,b),clone=api.selectVisual(a,o);
   assert(clone,b+' route missing in '+look.skinColor);
   if(look!==raw){assert.equal(clone.slotRoutes?.boots?.item,b);assert.deepEqual(clone.colorAppearance,r.colorAppearance);}
   assert.deepEqual(clone.fixedIdleBoots.layers,own);
   const candidate=await draw(a,clone),cv0=cv.createCanvas(512,512),ctx=cv0.getContext('2d');
   for(const l of own){assert.equal(l.binding.kind,'fixed');const im=await loader('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png');ctx.drawImage(im,0,0);}
   const bytes=ctx.getImageData(0,0,512,512).data;let touched=0;
   for(let i=0;i<old.length;i+=4)if(candidate.readUInt32LE(i)!==old.readUInt32LE(i)){assert(bytes[i+3],b+' outside own pixel');touched++;}
   assert(touched>100);
   const control=await draw({...a,equipment:{...a.equipment,coat:{def:151}}},api.selectVisual({...a,equipment:{...a.equipment,coat:{def:151}}},o));
   let min=512,peak=0,points=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i+3])min=Math.min(min,Math.floor(i/2048));
   for(let i=min*2048;i<bytes.length;i+=4)if(bytes[i+3]&&candidate.readUInt32LE(i)!==control.readUInt32LE(i)){
    points++;peak=Math.max(peak,...[0,1,2,3].map(k=>Math.abs(candidate[i+k]-control[i+k])));
   } assert.equal(points,0,'removing coat altered within the boot');
   const prev=originalByBoot.get(b);
   if(prev){
    let bottom=0,max=0,cnt=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i+3])bottom=Math.floor(i/2048);
    for(let i=(bottom-15)*2048;i<bytes.length;i+=4)if(bytes[i+3]){
     assert.equal(candidate[i+3],prev[i+3]);
     const d=Math.max(...[0,1,2].map(k=>Math.abs(candidate[i+k]-prev[i+k]))); max=Math.max(d,max); if(d>3)cnt++;
    }
    console.log('sole',look.skinColor,b,max,cnt);
    assert(max<=3&&cnt===0,'chroma reflected from sole');
   }else originalByBoot.set(b,candidate);
   if(look===raw||look.skinColor==='ebony'){
    assert(await api.prepare(a,o));
    const c=cv.createCanvas(512,512),t=c.getContext('2d');let cap;
    t.drawImage=(surface,...args)=>{cap=surface;};
    assert(api.draw(t,a,{...o,x:256,y:448,progress:0}));assert(cap);
    assert(candidate.equals(Buffer.from(cap.getContext('2d').getImageData(0,0,512,512).data)));
   }
   samples++;
   console.log(look.skinColor,b,touched);
  }
  assert(old.equals(await draw(bare,api.selectVisual(bare,o))),'removal altered body');
  assert(!api.selectVisual(actor(look,176),o)?.fixedIdleBoots,'B176 leaked into B9 registration');
  for(const options of [{...o,action:'walk'},{...o,action:'attack-unarmed'},{...o,direction:'south'},{...o,direction:'east'},{...o,direction:'west'}]){
   assert(!api.selectVisual(actor(look,9),options)?.fixedIdleBoots,'proof escaped direction or action');
  }
  for(const [k,v] of Object.entries({coat:151,head:19,legs:168,weapon:0,gloves:152})){
   const extra=actor(look,9);extra.equipment[k]={def:v};
   const result=api.selectVisual(extra,o);
   if(k==='legs'&&result?.fixedIdleBoots){
    assert(result.id.includes(':pants168:idle-north-frame0:fixed-north-idle-b9'),'extra trousers must use the proven two-slot route');
    assert.equal(result.slotRoutes.legs.item,168);assert.equal(result.slotRoutes.boots.item,9);
   }else assert(!result?.fixedIdleBoots,'proof escaped supported slots');
  }
 }
 console.log(samples+' stable bare north-idle boot swaps');
})().catch(e=>{console.error(e);process.exitCode=1});
