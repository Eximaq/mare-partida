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
const eq=(g,b)=>({appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'},equipment:{legs:{def:133},coat:{def:151},gloves:{def:g},boots:b?{def:b}:null}});
require('node:test')('South punch keeps equipment separate and changes only the 45 iris pixels',async()=>{
 await rt.ready;

 let n=0,worldFrames=0;
 const pieces=new Map();
 const actorFor=(g,b,skinColor,hairColor,eyeColor)=>({...eq(g,b),appearance96:global.MareCharacterAppearance.normalize({skinColor,hairColor,eyeColor})});
 const options={direction:'south',action:'attack',consumer:'world'};
 async function capture(actor,source){
  const bundle=await rt.prepareConfiguration([{player:actor,options,source}],{resolve:p=>p});
  assert.equal(bundle.coverage[0].frames,8);
  const captures=[];
  for(let frame=0;frame<8;frame++){
   const cx=cv.createCanvas(680,700).getContext('2d'),draw=cx.drawImage.bind(cx);let native;
   cx.drawImage=(c,...x)=>{native=c.getContext('2d');draw(c,...x);};
   assert(bundle.draw(cx,actor,{...options,progress:(frame+.25)/8,x:320,y:475}));
   captures.push([Buffer.from(native.getImageData(0,0,640,400).data),Buffer.from(native.getImageData(0,400,640,240).data)]);
   cx.canvas.width=cx.canvas.height=0;
  }
  bundle.release();return captures;
 }

 for(const g of [26,159])for(const b of [8,134,141,148,155,162,169,176,183]){
  const actor={...eq(g,b),appearance96:global.MareCharacterAppearance.normalize({})},o={direction:'south',action:'attack'};
  const r=rt.selectVisual(actor,o);
  assert(r?.partitionedMalePunch?.paletteParts?.strictSouthEyes,'blocked '+g+'/'+b);
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
 assert.equal(n,18);assert.equal(worldFrames,144);
 let contrast=0;
 for(const [g,b] of [[26,148],[159,155]]){
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
 const eyes=Object.keys(global.MareCharacterAppearance.eyes),expected=['blue','brown','green','gray','amber','violet'];
 assert.deepEqual(eyes.slice().sort(),expected.slice().sort());
 let count=0,world=0;
 for(const eye of eyes)for(const g of [26,159])for(const b of [8,134,141,148,155,162,169,176,183]){
   const actor=actorFor(g,b,undefined,undefined,eye),r=rt.selectVisual(actor,options);
   assert.equal(rt.select(actor,options),null,'old exact must keep precedence');
   assert(r?.partitionedMalePunch?.paletteParts?.strictSouthEyes);
   assert.equal(r.colorAppearance.eyeColor,eye);
   assert.equal(r.slotRoutes.gloves.item,g);
   assert.equal(r.slotRoutes.boots.item,b);count++;
 }
 const where=(a,b)=>{const changes=[];for(let i=0;i<a.length;i+=4)if(a.readUInt32LE(i)!==b.readUInt32LE(i)){
   assert.equal(a[i+3],b[i+3]); const x=(i/4)%640,y=Math.floor(i/(640*4));
   assert(x>280&&x<360&&y>185&&y<235);changes.push(i);
 } return changes;};
 for(const [g,b,skin,hair] of [[26,8,'light','black'],[159,155,'ebony','silver']]){
  const source=color=>actorFor(g,b,skin,hair,color),player=source('blue');
  const blue=await capture(player,rt.selectVisual(player,options));world+=8;
  let expectedMask;
  for(const eye of eyes.filter(x=>x!=='blue')){
   const p=source(eye),show=await capture(p,rt.selectVisual(p,options));
   const supports=show.map((frame,i)=>{assert(frame[1].equals(blue[i][1]));const d=where(frame[0],blue[i][0]);assert.equal(d.length,45);return d;});
   if(expectedMask)assert.deepEqual(supports,expectedMask);else expectedMask=supports;
   world+=8;
  }
 }
 for(const [g,b] of [[25,8],[26,9],[26,null]]){
  assert(!rt.selectLayered(actorFor(g,b,'light','black','green'),options)?.partitionedMalePunch);
 }
 const p=actorFor(26,8,'light','black','blue');
 for(const [k,v] of [['hairStyle','hair-cropped'],['eyeStyle','face-almond'],['eyeColor','unsupported']])
  assert(!rt.selectLayered({...p,appearance96:{...p.appearance96,[k]:v}},options)?.partitionedMalePunch);
 assert.equal(count,108);assert.equal(world,96);console.log({select:count,added:90,world,irisPixels:45});
});
