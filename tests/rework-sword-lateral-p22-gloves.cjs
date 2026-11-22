'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
const Module=require('node:module');
if(process.env.COMPOSE_TRIAL){
 for(const filename of ['player-rework-native-hd.js','player-rework-sword0-checkpoint.js']){
  const f=base+'/'+filename,m=new Module(f);m.filename=f;m.paths=Module._nodeModulePaths(base);
  m._compile(fs.readFileSync(process.env.COMPOSE_TRIAL+'/'+filename,'utf8'),f);m.loaded=true;require.cache[f]=m;
 }
}
require(base+'/player-rework-sword0-checkpoint.js');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance');
const loader=require(base+'/tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
const R=f=>require(path.join(base,f)),skin=global.MareFemaleNamedHairHD.create(R('tools/rework-accessories/head-layer-index.json'),R('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(R('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:R('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:skin});
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function capture(rec,f){
 const hands={},imgs=new Map(),c=cv.createCanvas(1,1),size=640+2*(rec.paddingPhysical||0),gear=cv.createCanvas(size,size),g=gear.getContext('2d');
 for(const file of reg.requiredFiles(rec,{frame:f}))imgs.set(file,await (file.startsWith(prefix)?cv.loadImage(path.join(release,file)):loader(file)));
 reg.render(c.getContext('2d'),rec,imgs,{frame:f,captureOps:({op,canvas})=>{
  if(['left-hand','right-hand'].includes(op.layer?.id))hands[op.layer.id]=pixels(canvas);
  g.globalCompositeOperation=op.part?'source-over':'destination-out';g.drawImage(canvas,0,0);canvas.width=1;
 }});
 const res={c:pixels(c),w:pixels(gear),hands};c.width=gear.width=1;return res;
}
(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint ready');
 const dirs=['east','west'],stock=[0,1,67,68,69,70],skinColors=Object.keys(global.MareAppearance96.skins);
 let checks=0,frames=0,world=0,mixed=0,maximum=0;
 const premult=(o,i,j)=>Math.round(o.c[i+j]*o.c[i+3]/255);
 for(const direction of dirs)for(const [wi,def] of stock.entries())for(const skinColor of skinColors){
  const appearance96=A.normalize({gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor});
  const outfit=(p,g)=>({classId:'sword',appearance96,equipment:{weapon:{def},legs:p?{def:p}:null,gloves:g?{def:g}:null}}),
   o={action:'attack-sword',consumer:'world',direction};
  const base=api.selectVisual(outfit(),o),lower=api.selectVisual(outfit(22),o);
  for(const [gi,g] of [131,180].entries()){
   const p=outfit(22,g),before=JSON.stringify(p),alone=api.selectVisual(outfit(null,g),o),combo=api.selectVisual(p,o);
   a.equal(combo?.slotRoutes?.gloves?.item,g,JSON.stringify([direction,def,skinColor,g]));
   a.deepEqual(combo.slotRoutes.legs,lower.slotRoutes.legs);a.deepEqual(combo.slotRoutes.gloves,alone.slotRoutes.gloves);
   a.deepEqual(combo.slotRoutes.weapon,lower.slotRoutes.weapon);
   a.deepEqual(combo.checkpointPantsApertures,lower.checkpointPantsApertures);
   a.deepEqual(combo.states,lower.states);a.deepEqual(combo.material,lower.material);a.deepEqual(combo.colorAppearance,lower.colorAppearance);
   a.deepEqual(combo.omitted,[]);a.equal(JSON.stringify(p),before);
   a.equal(api.selectVisual(outfit(22),o).id,lower.id);a.equal(api.selectVisual(outfit(null,g),o).id,alone.id);
   a.notEqual(api.selectVisual(outfit(168,g),o)?.slotRoutes?.gloves?.quality,'hd');
   const hands=new Set(['left-hand','right-hand']),ls=r=>r.pack.directions[direction].layers;
   a.deepEqual(ls(combo).filter(l=>hands.has(l.id)),ls(alone).filter(l=>hands.has(l.id)));
   a.deepEqual(ls(combo).filter(l=>!hands.has(l.id)),ls(lower).filter(l=>!hands.has(l.id)));
   checks++;
   if(skinColor!==(wi%2?'ebony':'light')||gi!==wi%2)continue;
   let clipVisible=0;
   for(let f=0;f<8;f++){
    const x=await capture(base,f),l=await capture(lower,f),g=await capture(alone,f),b=await capture(combo,f);
    a(l.w.equals(b.w));a(g.w.equals(b.w));a(x.w.equals(b.w));
    a.deepEqual(g.hands,b.hands,'actual glove planes must be identical when pants change');
    const originalPants=lower.checkpointPantsApertures.points[f],pad=lower.paddingPhysical||0,size=640+pad*2;
    for(const [px,py] of originalPants){const i=4*((py+pad)*size+px+pad);a.equal(b.c.readUInt32LE(i),l.c.readUInt32LE(i),'pinholes must remain repaired');}
    let vis=0;
    for(let i=0;i<x.c.length;i+=4){
     const original=x.c.readUInt32LE(i),gloved=g.c.readUInt32LE(i),panted=l.c.readUInt32LE(i),both=b.c.readUInt32LE(i);
     a.equal(l.c[i+3],b.c[i+3]);a.equal(x.c[i+3],g.c[i+3]);
     if(panted===original||gloved===original)a.equal(both,panted===original?gloved:panted);
     else {
      for(let j=0;j<3;j++)maximum=Math.max(maximum,Math.abs(premult(b,i,j)-(premult(l,i,j)+premult(g,i,j)-premult(x,i,j))));
      mixed++;
     }
     vis+=+(both!==panted);
    }
    clipVisible+=vis;frames++;
    if(f===2&&def===0){
     const bundle=await api.prepareConfiguration([{player:p,options:o}]);
     try{let t;a(bundle.draw({save(){},restore(){},drawImage(x){t=x}},p,{...o,progress:(f+.25)/8}));a(pixels(t).equals(b.c));world++;}
     finally{bundle.release();}
    }
    global.gc?.();
   }
   a(clipVisible>100,'clip must visibly change its gloves');
  }
 }
 a.deepEqual([checks,frames,world],[192,96,2]);a.equal(mixed,0,'authored contours overlap, but visible deltas should stay disjoint');a(maximum<=1,'independent RGBA contribution max '+maximum);
 console.log('PASS',checks,'compound selectors,',frames,'all side phases,',world,'prepared World draws;',mixed,'overlap samples max',maximum);
})().catch(e=>{console.error(e);process.exitCode=1});
