if(!process.env.REWORK_IDLE_PANTS_ID){
 const spawn=require('node:child_process').spawnSync;
 for(const id of ['21','133','168','182']){
  const result=spawn(process.execPath,[...process.execArgv,__filename],{stdio:'inherit',env:{...process.env,REWORK_IDLE_PANTS_ID:id}});
  if(result.status!==0)process.exit(result.status??1);
 }
 process.exit(0);
}
const pth=require('node:path'),assert=require('node:assert/strict'),root=pth.resolve(__dirname,'..');
const {make,cv}=require('./rework-integration-support.cjs'),api=make(),cand=api;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const d={consumer:'world',direction:'south',progress:0};
async function capture(api,p,action){
 const o={...d,action},source=api.selectVisual(p,o);
 assert(source,JSON.stringify([p,action,api.snapshot()]));
 const h=await api.prepareConfiguration([{player:p,options:o,source}],{resolve:x=>x});
 try{
  let sprite;assert(h.draw({ save(){},restore(){},drawImage(im){sprite=im;} },p,{...o,x:256,y:448}));
  assert.equal(sprite.width,512);
  return Buffer.from(sprite.getContext('2d').getImageData(0,0,512,512).data);
 }finally{h.release();}
}
(async()=>{await Promise.all([api.ready,cand.ready]);
const spec=require(pth.join(root,'tools/rework-modular-outfits-hd/index.json')).authoredPantsSouth;
const rgba=async h=>{const c=cv.createCanvas(512,512),cx=c.getContext('2d');cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'),0,0);return cx.getImageData(0,0,512,512).data;};
const oi=require(pth.join(root,'tools/rework-modular-outfits-hd/index.json')),of=global.MareReworkModularOutfitsHD.create(oi);
async function coatDomain(r){
 const dx=r.pack.directions.south,layers=dx.layers.filter(l=>!l.id.startsWith('base:')),d={...dx,layers};
 const record={...r,pack:{...r.pack,directions:{south:d}},sourceRefs:[...new Set(layers.flatMap(x=>x.frames||[x.source]))]},surface=cv.createCanvas(512,512),ctx=surface.getContext('2d');
 const images=new Map(await Promise.all(of.requiredFiles(record,{frame:0}).map(async p=>[p,await load(p)])));
 of.render(ctx,record,images,{frame:0,appearance:r.colorAppearance,makeCanvas:cv.createCanvas});
 return ctx.getImageData(0,0,512,512).data;
}
let frames=0;
for(const [def,s]of Object.entries(spec.items).filter(([d])=>d===process.env.REWORK_IDLE_PANTS_ID)){
const cloth=await rgba(s[0].cloth),ownerSHA=s[0].ownerAlpha||s[0].owner;
const owner=ownerSHA?await rgba(ownerSHA):null;
for(const profile of [{},{skinColor:'ebony',eyeColor:'green',eyeStyle:'face-calm',hairStyle:'hair-bob',hairColor:'pink'}])for(const id of [7,137,144,158,165,179]){
const p={classId:'brawler',appearance96:global.MareCharacterAppearance.normalize({gender:'feminino',...profile}),equipment:{coat:{def:id}}};
const q={...p,equipment:{...p.equipment,legs:{def:Number(def)}}},saved=JSON.stringify(q),skinColor=q.appearance96.skinColor;
const ri=api.selectVisual(p,{...d,action:'idle'}),rw=cand.selectVisual(q,{...d,action:'idle'});assert(ri&&rw?.authoredIdleCoatPants, [skinColor,id,def].join('/'));
const idle=await capture(api,p,'idle'),pair=await capture(cand,q,'idle');const still=await capture(cand,p,'idle');assert.deepEqual(idle,still);
let delta=0,outside=0;for(let i=0;i<idle.length;i+=4)if(idle.readUInt32LE(i)!==pair.readUInt32LE(i)){delta++;if(!cloth[i+3]||owner?.[i+(s[0].ownerAlpha?3:0)])outside++;}
const barePants=await capture(api,{...q,equipment:{legs:{def:Number(def)}}},'idle'),coatMask=await coatDomain(ri);
let outCoat=0,coatDelta=0;
for(let i=0;i<pair.length;i+=4)if(pair.readUInt32LE(i)!==barePants.readUInt32LE(i)){coatDelta++;if(!coatMask[i+3])outCoat++;}
assert(delta&&coatDelta);assert.equal(outside,0);assert.equal(outCoat,0);assert.equal(JSON.stringify(q),saved);
for(const [slot,value] of Object.entries({boots:176,gloves:152,head:129,weapon:0,pants:def}))assert(!cand.selectVisual({...q,equipment:{...q.equipment,[slot]:{def:value}}},{...d,action:'idle'})?.authoredIdleCoatPants);
for(const cid of [6,130,151,172])assert(!cand.selectVisual({...q,equipment:{...q.equipment,coat:{def:cid}}},{...d,action:'idle'})?.authoredIdleCoatPants);
assert(!cand.selectVisual({...q,equipment:{...q.equipment,coat:{def:id,variant:'other'}}},{...d,action:'idle'})?.authoredIdleCoatPants);
console.log(skinColor,id,def,delta,outside,coatDelta,outCoat,rw.id,++frames);
}
}
assert.equal(frames,12);console.log('PASS',frames);
})().catch(e=>{console.error(e);process.exitCode=1});