'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const repo=__dirname;
const imp=f=>require(path.join(repo,f));
global.ReworkAccessoryVendor=imp('tools/rework-accessories/vendor.js');
for(const [k,f] of Object.entries({
 MareNativeSkinHD:'player-rework-skin-hd',MareReworkBaseHD:'player-rework-base-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkModularOutfitsHD:'player-rework-modular-outfits-hd',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets',
}))global[k]=imp(f+'.js');
global.MareCharacterAppearance=imp('character-appearance.js');
global.MareAppearance96=imp('tools/paper-doll-96-v3/appearance.js');
const load=imp('tools/rework-hd-test-loader.cjs').create(repo),rt=imp('player-rework-native-hd.js').create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(repo,p))),loadImage:load,makeCanvas:cv.createCanvas});
const verifiedNorthGloves=[26,131,138,145,152,159,166,173,180];
const eq=(g,b)=>({appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'},equipment:{legs:{def:133},coat:{def:151},gloves:{def:g},boots:b?{def:b}:null}});
require('node:test')('derived male punch keeps each glove and boot in its verified region',async()=>{
 await rt.ready;
 let count=0,extra=0,existing=0;
 for(const direction of ['north','south','east','west']){
 const o={action:'attack',direction};
 for(const g of [25,26,131,138,145,159,166,173,180])
 for(const b of [8,134,141,148,162,169,176,183]){
   const player=eq(g,b),exact=rt.select(player,o),r=rt.selectVisual(player,o);
   assert.equal(exact,null,`unexpected exact source ${direction}/${g}/${b}`);
   assert(r?.partitionedMalePunch,`missing registered slots ${direction}/${g}/${b}`);
   assert.equal(r?.slotRoutes?.boots?.item,b);
   assert.equal(r?.slotRoutes?.gloves?.item,g);
   assert.equal(r?.resolvedAction,'attack-unarmed');
   assert.equal(r?.pack?.directions[direction].clip.frames,8);
   const colored=rt.selectVisual({...player,appearance96:global.MareCharacterAppearance.normalize({})},o)?.partitionedMalePunch;
   assert.equal(!!colored?.paletteParts,(direction==='north'&&verifiedNorthGloves.includes(g))||(direction==='south'&&[26,159].includes(g)));
   count++;
 }
 for(const [g,b] of [[25,155],[152,8],[152,155],[25,9],[25,null]]){
  const player=eq(g,b); const r=rt.selectVisual(player,o);
  assert(!r?.partitionedMalePunch,[direction,g,b]);
  if(r)existing++;
 }
 }
 assert.equal(count,288);console.log({count,existing});
 const compare=(a,b)=>Buffer.from(a.data).equals(Buffer.from(b.data));
 const idx=imp('tools/rework-modular-outfits-hd/index.json');
 const painter=global.MareReworkModularOutfitsHD.create(idx,{vendor:global.ReworkAccessoryVendor});
 let rendered=0;
 for(const direction of ['north','south','east','west'])for(const [g,b] of [[25,8],[180,183]]){
   const player=eq(g,b),options={action:'attack',direction,consumer:'world'},source=rt.selectVisual(player,options),{upper,lower}=source.partitionedMalePunch;
   const bundle=await rt.prepareConfiguration([{player,options,source}],{resolve:p=>p});
   assert.equal(bundle.coverage?.[0]?.frames,8);
   const images=new Map();
   for(const r of [upper,lower])for(const file of painter.requiredFiles(r))if(!images.has(file))images.set(file,await load(file));
   for(let frame=0;frame<8;frame++){
    const tc=cv.createCanvas(900,900).getContext('2d'),uc=cv.createCanvas(640,640).getContext('2d'),lc=cv.createCanvas(640,640).getContext('2d');
    const orig=tc.drawImage.bind(tc);let result;
    tc.drawImage=(...x)=>{result=x[0];orig(...x)};
    assert(bundle.draw(tc,player,{...options,progress:(frame+.25)/8,x:440,y:660}));
    assert.equal(result?.width,640);assert.equal(result?.height,640);
    const native=result.getContext('2d');
    painter.render(uc,upper,images,{frame,makeCanvas:cv.createCanvas});
    painter.render(lc,lower,images,{frame,makeCanvas:cv.createCanvas});
    assert(compare(native.getImageData(0,0,640,400),uc.getImageData(0,0,640,400)));
    assert(compare(native.getImageData(0,400,640,240),lc.getImageData(0,400,640,240)));
    rendered++;
   }
   bundle.release();
 }
 assert.equal(rendered,64);console.log({rendered});

});

require('node:test')('North punch preserves normalized and custom skin/hair for verified gloves',async()=>{
 await rt.ready;

 let n=0,worldFrames=0;
 const pieces=new Map();
 const actorFor=(g,b,skinColor,hairColor)=>({...eq(g,b),appearance96:global.MareCharacterAppearance.normalize({skinColor,hairColor})});
 const options={direction:'north',action:'attack',consumer:'world'};
 async function capture(actor,source){
  const bundle=await rt.prepareConfiguration([{player:actor,options,source}],{resolve:p=>p});
  assert.equal(bundle.coverage[0].frames,8);
  const captures=[];
  for(let frame=0;frame<8;frame++){
   const cx=cv.createCanvas(680,700).getContext('2d'),draw=cx.drawImage.bind(cx);let native;
   cx.drawImage=(c,...x)=>{native=c.getContext('2d');draw(c,...x);};
   assert(bundle.draw(cx,actor,{...options,progress:(frame+.25)/8,x:320,y:475}));
   captures.push([Buffer.from(native.getImageData(0,0,640,400).data),Buffer.from(native.getImageData(0,400,640,240).data)]);
  }
  bundle.release();return captures;
 }

 for(const g of verifiedNorthGloves)for(const b of [8,134,141,148,155,162,169,176,183]){
  const actor={...eq(g,b),appearance96:global.MareCharacterAppearance.normalize({})},o={direction:'north',action:'attack'};
  const r=rt.selectVisual(actor,o);
  assert(r?.partitionedMalePunch?.paletteParts,`missing North palette route ${g}/${b}`);
  assert.equal(r.colorAppearance?.skin,'light');
  assert.equal(r.colorAppearance?.hairColor,'black');
  assert.equal(r.slotRoutes.boots.item,b);
  assert.equal(r.slotRoutes.gloves.item,g);
  const frames=await capture(actor,r);
  assert(frames.every(x=>x[1].equals(frames[0][1])),'static lower');
  for(let f=0;f<8;f++){
   if(pieces.has(g+'/top/'+f))assert(frames[f][0].equals(pieces.get(g+'/top/'+f)),'same glove upper changed with boot');
   else pieces.set(g+'/top/'+f,frames[f][0]);
   if(pieces.has(b+'/bottom/'+f))assert(frames[f][1].equals(pieces.get(b+'/bottom/'+f)),'same boot lower changed with glove');
   else pieces.set(b+'/bottom/'+f,frames[f][1]);
  }
  worldFrames+=8;n++;

 }
 assert.equal(n,81);assert.equal(worldFrames,648);
 let contrast=0;
 for(const g of verifiedNorthGloves.filter(x=>![26,159].includes(x)))for(const b of [148,155]){
  for(const [skin,hair] of [['olive','auburn'],['ebony','silver']]){
   const actor=actorFor(g,b,skin,hair),source=rt.selectVisual(actor,options);
   assert.equal(source?.colorAppearance?.skin,skin);assert.equal(source?.colorAppearance?.hairColor,hair);
   for(const [f,px] of (await capture(actor,source)).entries()){
    assert(!px[0].equals(pieces.get(g+'/top/'+f)));assert(!px[1].equals(pieces.get(b+'/bottom/'+f)));
    contrast++;
   }
  }
 }
 assert(!rt.selectLayered(actorFor(25,8),options)?.partitionedMalePunch);
 assert(!rt.selectLayered(actorFor(26,9),options)?.partitionedMalePunch);
 assert(!rt.selectLayered(actorFor(26,null),options)?.partitionedMalePunch);
 assert.equal(contrast,224);console.log({n,worldFrames,contrast});
});
