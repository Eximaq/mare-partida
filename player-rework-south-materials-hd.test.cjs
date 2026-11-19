'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const repo=__dirname;
const imp=f=>require(path.join(repo,f));
global.ReworkAccessoryVendor=imp('tools/rework-accessories/vendor.js');
for(const [k,f] of Object.entries({
 MareReworkBaseHD:'player-rework-base-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets',
}))global[k]=imp(f+'.js');
global.MareReworkModularOutfitsHD=imp('player-rework-modular-outfits-hd.js');
const m=imp('player-rework-native-hd.js');
const load=imp('tools/rework-hd-test-loader.cjs').create(repo),rt=m.create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(repo,p))),loadImage:load,makeCanvas:cv.createCanvas});
global.MareAppearance96=imp('tools/paper-doll-96-v3/appearance.js');
global.MareReworkEyeStylesHD=imp('player-rework-eye-styles-hd.js');
global.MareCharacterAppearance=imp('character-appearance.js');
const fixture=imp('tools/rework-modular-outfits-hd/index.json');
const renderer=global.MareReworkModularOutfitsHD.create(fixture,{vendor:global.ReworkAccessoryVendor});
const lim=48,cache=new Map();
async function render(r,o,frame,only){
 const d=r.pack.directions[o.direction],layers=only?only:d.layers;
 const rr={...r,mirrorLayerIDs:r.mirrorLayerIDs?.filter(id=>layers.some(l=>l.id===id)),pack:{...r.pack,directions:{[o.direction]:{...d,layers}}}};
 const sources=renderer.requiredFiles(rr,{frame}),images=new Map();
 for(const file of sources){
  if(!cache.has(file))cache.set(file,await load(file));
  images.set(file,cache.get(file));while(cache.size>lim)cache.delete(cache.keys().next().value);
 }
 const c=cv.createCanvas(r.pack.frame.width*4,r.pack.frame.height*4),ctx=c.getContext('2d');
 renderer.render(ctx,rr,images,{frame,makeCanvas:cv.createCanvas});
 return Buffer.from(ctx.getImageData(0,0,c.width,c.height).data);
}
require('node:test')('registered South tops and pants preserve strict saved eye, hair, skin and hand ownership',async()=>{
 await rt.ready;
 let checked=0;
 for(const action of ['idle','walk','attack-unarmed'])for(const coat of [6,137,144])for(const look of [
  global.MareCharacterAppearance.normalize({gender:'masculino'}),
  global.MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'silver'}),
 ]) {
  const o={action,direction:'south',consumer:'world'};
  const p=(pants,top)=>({appearance96:look,equipment:{...(top==null?{}:{coat:{def:top}}),...(pants==null?{}:{legs:{def:pants}})}});
  const mixed=rt.selectVisual(p(21,coat),o),top=rt.selectVisual(p(null,coat),o),pants=rt.selectVisual(p(21,null),o);
  assert(mixed?.strictSouthAppearance, action+'/'+coat+'/'+JSON.stringify(look));
  assert(top?.strictSouthAppearance);assert(pants?.strictSouthAppearance);
  assert.equal(mixed.colorAppearance.eyeColor,look.eyeColor);assert.equal(mixed.colorAppearance.skin,look.skinColor);assert.equal(mixed.colorAppearance.hairColor,look.hairColor);
  const d=mixed.pack.directions.south,ls=d.layers,pp=ls.filter(l=>l.id.startsWith('pants21-')),cc=ls.filter(l=>!l.id.startsWith('base:')&&!pp.includes(l));
  const naked=(r,subset,source)=>({...r,strictSouthAppearance:source.strictSouthAppearance});
  for(let f=0;f<d.clip.frames;f++){
   const combined=await render(mixed,o,f),afterRemoval=await render(pants,o,f),g=await render(top,o,f);
   const mixedWithoutCoat=await render(naked(mixed,ls,pants),o,f,ls.filter(l=>!cc.includes(l)));
   assert(mixedWithoutCoat.equals(afterRemoval),'coat unequip changed skin/hair/eyes or body '+[action,coat,f,look.skinColor]);
   assert((await render(mixed,o,f,ls.filter(l=>!pp.includes(l)))).equals(g),'pants unequip changed skin/hair/eyes or body');
   assert(!combined.equals(afterRemoval));checked++;
  }
  console.log(action,coat,look.skinColor,look.eyeColor,'no pixels outside independent equipment ownership changed at remove',d.clip.frames);
  cache.clear();if(global.gc)global.gc();
 }
 assert.equal(checked,150);
});
