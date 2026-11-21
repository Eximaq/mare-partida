'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const repo=path.resolve(__dirname,'..');
const imp=f=>require(path.join(repo,f));
global.ReworkAccessoryVendor=imp('tools/rework-accessories/vendor.js');
for(const [k,f] of Object.entries({
 MareNativeSkinHD:'player-rework-skin-hd',MareReworkBaseHD:'player-rework-base-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkModularOutfitsHD:'player-rework-modular-outfits-hd',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets',
}))global[k]=imp(f+'.js');
global.MareCharacterAppearance=imp('character-appearance.js');
global.MareAppearance96=imp('tools/paper-doll-96-v3/appearance.js');
const load=imp('tools/rework-hd-test-loader.cjs').create(repo),rt=imp('player-rework-native-hd.js').create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(repo,p))),loadImage:load,makeCanvas:cv.createCanvas});
const eq=(g,b)=>({appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'},equipment:{legs:{def:133},coat:{def:151},gloves:{def:g},boots:b?{def:b}:null}});
const additional=[131,138,152],gloves=[...additional,145,166,173,180],boots=[8,134,141,148,155,162,169,176,183];
const options={direction:'south',action:'attack',consumer:'world'};
const actor=(g,b,look)=>({...eq(g,b),appearance96:global.MareCharacterAppearance.normalize(look)});
const baseline=process.env.KAIZOKU_BASELINE_NATIVE?require(process.env.KAIZOKU_BASELINE_NATIVE).create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(repo,p))),loadImage:load,makeCanvas:cv.createCanvas}):null;
const name='registered-frozen-glove-native-attack';
const outfit=global.MareReworkModularOutfitsHD.create(imp('tools/rework-modular-outfits-hd/index.json'),{vendor:global.ReworkAccessoryVendor});
const get=(ctx)=>Buffer.from(ctx.getImageData(0,0,640,640).data);
function diff(a,b,test){
 let n=0;
 for(let i=0;i<a.length;i+=4)if(a.readUInt32LE(i)!==b.readUInt32LE(i)){assert.equal(a[i+3],b[i+3]);assert(test(i/4));n++;}
 return n;
}
async function run(api,player,source,visit){
 const bundle=await api.prepareConfiguration([{player,options,source}],{resolve:p=>p});
 assert.equal(bundle.coverage[0].frames,8);
 try{
  for(let frame=0;frame<8;frame++){
   const c=cv.createCanvas(680,700),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let output;
   ctx.drawImage=(tile,...p)=>{output=tile;draw(tile,...p)};
   assert(bundle.draw(ctx,player,{...options,x:320,y:475,progress:(frame+.25)/8}));
   assert(output?.width===640&&output?.height===640);
   await visit(get(output.getContext('2d')),frame);
   c.width=c.height=0;
  }
 }finally{bundle.release();}
}
require('node:test')('Southern palette: seven audited gloves keep their own material on every pose',async()=>{
 await Promise.all([rt.ready,baseline?.ready]);
 let count=0,world=0,early=0,sourceRecomposed=0,otherBootFrames=0;
 for(const g of gloves)for(const b of boots)for(const eyeColor of ['blue','brown','green','gray','amber','violet']){
  const p=actor(g,b,{skinColor:'ebony',hairColor:'silver',eyeColor});
  if(baseline&&additional.includes(g))assert(!baseline.selectVisual(p,options)?.partitionedMalePunch?.paletteParts);
  const s=rt.selectVisual(p,options);
  assert(s?.partitionedMalePunch?.paletteParts?.strictSouthEyes,[g,b,eyeColor]);
  assert.equal(s.slotRoutes.gloves.item,g);assert.equal(s.slotRoutes.boots.item,b);
  assert.equal(s.slotRoutes.legs.item,133);assert.equal(s.slotRoutes.coat.item,151);
  assert.equal(s.colorAppearance.skin,'ebony');assert.equal(s.colorAppearance.hairColor,'silver');assert.equal(s.colorAppearance.eyeColor,eyeColor);count++;
 }
 const originals=Array.from({length:8},()=>new Map());
 for(const g of gloves){
  const b=8,original=eq(g,b);
  if(baseline)await run(baseline,original,baseline.selectVisual(original,options),(rgba,f)=>{originals[f].set(g,rgba);early++;});
  await run(rt,original,rt.selectVisual(original,options),(rgba,f)=>{if(baseline)assert(rgba.equals(originals[f].get(g)));early++;});
  const dark={skinColor:'ebony',hairColor:'silver',eyeColor:'green'};
  const colored=actor(g,b,dark),r=rt.selectVisual(colored,options);
  const lookBlue=actor(g,b,{...dark,eyeColor:'blue'}),rBlue=rt.selectVisual(lookBlue,options);
  const light=actor(g,b,{skinColor:'light',hairColor:'black',eyeColor:'green'}),rLight=rt.selectVisual(light,options);
  const darkFirst=[],images=new Map();
  const p=r.partitionedMalePunch.paletteParts;
  const drawOutfit=async(rec,frame,appearance)=>{
   const w=rec.pack.frame.width*4,c=cv.createCanvas(w,w),cx=c.getContext('2d');
   for(const f of outfit.requiredFiles(rec,{frame}))if(!images.has(f))images.set(f,await load(f));
   outfit.render(cx,rec,images,{frame,appearance,makeCanvas:cv.createCanvas});return c;
  };
  await run(rt,colored,r,(rgba,f)=>{darkFirst[f]=rgba;world++;});
  await run(rt,lookBlue,rBlue,async(rgba,f)=>{
   assert.equal(diff(rgba,darkFirst[f],i=>i/640>=185&&i/640<235&&i%640>280&&i%640<360),45);
   const slot=p.gloveOnly.pack.directions.south.layers;
   assert.equal(slot.length,1);assert.equal(slot[0].id,name);
   const glove=await drawOutfit(p.gloveOnly,f),gloveRGBA=get(glove.getContext('2d'));
   // All opaque glove details are literal source colors. No warm material is reinterpreted as anatomy.
   let n=0;
   for(let i=0;i<gloveRGBA.length;i+=4)if(gloveRGBA[i+3]===255){
    assert.equal(rgba.readUInt32LE(i),gloveRGBA.readUInt32LE(i));assert.equal(darkFirst[f].readUInt32LE(i),gloveRGBA.readUInt32LE(i));n++;
   }
   assert(n>0,`nonempty opaque glove ${g} phase ${f}: ${n}`);
   const noGlove=await drawOutfit(p.coloredUpper,f,{...r.colorAppearance,eyeColor:'original'});
   const actual=noGlove.getContext('2d');actual.drawImage(glove,0,0);
   const lower=await drawOutfit(p.staticLower,0,r.colorAppearance);
   actual.clearRect(0,400,640,240);
   actual.putImageData(lower.getContext('2d').getImageData(0,336,512,176),64,400);
   // The engine's Blue eye choice can differ only at 45 iris pixels; this also
   // checks the hundreds of translucent glove edges and everything below.
   assert(diff(rgba,get(actual),i=>i/640>=185&&i/640<235&&i%640>280&&i%640<360)<=45);
   glove.width=glove.height=noGlove.width=noGlove.height=lower.width=lower.height=0;
   sourceRecomposed++;world++;
  });
  for(const alternate of [155,183]){
   const player=actor(g,alternate,dark), source=rt.selectVisual(player,options);
   await run(rt,player,source,(rgba,f)=>{
    assert(rgba.subarray(0,640*400*4).equals(darkFirst[f].subarray(0,640*400*4)));
    assert(!rgba.subarray(640*400*4).equals(darkFirst[f].subarray(640*400*4)));
    otherBootFrames++;
   });
  }
  await run(rt,light,rLight,(rgba,f)=>{
   let top=0,bottom=0;
   assert(diff(rgba,darkFirst[f],i=>{if(i/640>=400)bottom++;else top++;return true;})>1000);
   assert(top>0&&bottom>0,'upper and lower anatomy must both follow appearance');
   world++;
  });
 }
 for(const [g,b,direction] of [[25,8,'south'],[145,9,'south'],[145,null,'south'],[145,8,'east'],[145,8,'west']])
  assert(!rt.selectVisual(actor(g,b,{skinColor:'ebony',hairColor:'silver',eyeColor:'green'}),{...options,direction})?.partitionedMalePunch?.paletteParts);
 assert.deepEqual({count,world,early,sourceRecomposed,otherBootFrames},{count:gloves.length*54,world:gloves.length*24,early:gloves.length*(baseline?16:8),sourceRecomposed:gloves.length*8,otherBootFrames:gloves.length*16});
 console.log({count,world,early,sourceRecomposed,otherBootFrames});
});
