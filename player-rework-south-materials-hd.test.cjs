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
async function render(r,o,frame,only,overrides={}){
 const d=r.pack.directions[o.direction],layers=only?only:d.layers;
 const rr={...r,mirrorLayerIDs:r.mirrorLayerIDs?.filter(id=>layers.some(l=>l.id===id)),pack:{...r.pack,directions:{[o.direction]:{...d,layers}}}};
 const sources=renderer.requiredFiles(rr,{frame}),images=new Map();
 for(const file of sources){
  if(!cache.has(file))cache.set(file,await load(file));
  images.set(file,overrides[file]||cache.get(file));while(cache.size>lim)cache.delete(cache.keys().next().value);
 }
 const c=cv.createCanvas(r.pack.frame.width*4,r.pack.frame.height*4),ctx=c.getContext('2d');
 renderer.render(ctx,rr,images,{frame,makeCanvas:cv.createCanvas});
 return Buffer.from(ctx.getImageData(0,0,c.width,c.height).data);
}
require('node:test')('registered South tops and pants preserve strict saved eye, hair, skin and hand ownership',async()=>{
 await rt.ready;
 let checked=0;
 for(const action of ['idle','walk','attack-unarmed'])for(const coat of [6,7,130,137,144,158,165,172,179])for(const look of [
  global.MareCharacterAppearance.normalize({gender:'masculino'}),
  global.MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'silver'}),
 ]) {
  const o={action,direction:'south',consumer:'world'};
  const p=(pants,top)=>({appearance96:look,equipment:{...(top==null?{}:{coat:{def:top}}),...(pants==null?{}:{legs:{def:pants}})}});
  // This oracle renders the modular material pass directly. Compare sources from the same pass.
  const material=actor=>rt.select(actor,o)||rt.selectLayered(actor,o);
  const mixed=material(p(21,coat)),top=material(p(null,coat)),pants=material(p(21,null));
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
 assert.equal(checked,450);
});

function differingOn(a,b,masks,id){
 let n=0;
 for(let i=0;i<a.length;i+=4){
  if(a.readUInt32LE(i)===b.readUInt32LE(i))continue;
  assert(masks.some(m=>m[i+3]!==0),'pixel escaped owned layer: '+id+'/'+i);n++;
 }
 return n;
}
const faceDef={"81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449":{"width":512,"points":[{"x":239,"y":141},{"x":240,"y":141},{"x":239,"y":142},{"x":240,"y":142},{"x":239,"y":143},{"x":240,"y":143},{"x":243,"y":143},{"x":244,"y":143},{"x":239,"y":144},{"x":240,"y":144},{"x":241,"y":144},{"x":243,"y":144},{"x":244,"y":144},{"x":239,"y":145},{"x":240,"y":145},{"x":241,"y":145},{"x":242,"y":145},{"x":243,"y":145},{"x":244,"y":145},{"x":239,"y":146},{"x":240,"y":146},{"x":241,"y":146},{"x":242,"y":146},{"x":243,"y":146},{"x":268,"y":142},{"x":268,"y":143},{"x":269,"y":143},{"x":272,"y":143},{"x":273,"y":143},{"x":268,"y":144},{"x":269,"y":144},{"x":271,"y":144},{"x":272,"y":144},{"x":273,"y":144},{"x":268,"y":145},{"x":269,"y":145},{"x":270,"y":145},{"x":271,"y":145},{"x":272,"y":145},{"x":273,"y":145},{"x":268,"y":146},{"x":269,"y":146},{"x":270,"y":146},{"x":271,"y":146},{"x":272,"y":146}]},"6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a":{"width":640,"points":[{"x":303,"y":205},{"x":304,"y":205},{"x":303,"y":206},{"x":304,"y":206},{"x":303,"y":207},{"x":304,"y":207},{"x":307,"y":207},{"x":308,"y":207},{"x":303,"y":208},{"x":304,"y":208},{"x":305,"y":208},{"x":307,"y":208},{"x":308,"y":208},{"x":303,"y":209},{"x":304,"y":209},{"x":305,"y":209},{"x":306,"y":209},{"x":307,"y":209},{"x":308,"y":209},{"x":303,"y":210},{"x":304,"y":210},{"x":305,"y":210},{"x":306,"y":210},{"x":307,"y":210},{"x":332,"y":206},{"x":332,"y":207},{"x":333,"y":207},{"x":336,"y":207},{"x":337,"y":207},{"x":332,"y":208},{"x":333,"y":208},{"x":335,"y":208},{"x":336,"y":208},{"x":337,"y":208},{"x":332,"y":209},{"x":333,"y":209},{"x":334,"y":209},{"x":335,"y":209},{"x":336,"y":209},{"x":337,"y":209},{"x":332,"y":210},{"x":333,"y":210},{"x":334,"y":210},{"x":335,"y":210},{"x":336,"y":210}]}};
const owners=new Map();
const strictOwner=(r)=>{
 const src=r.strictSouthAppearance.face;if(owners.has(src))return owners.get(src);
 const {width,points}=faceDef[src],c=cv.createCanvas(width,width),ctx=c.getContext('2d'),a=ctx.createImageData(width,width);
 for(const {x,y}of points){const i=(y*width+x)*4;a.data[i]=255;a.data[i+3]=255;}
 ctx.putImageData(a,0,0);
 const result={['tools/rework-modular-outfits-hd/assets/'+src+'.png']:c};owners.set(src,result);return result;
};
require('node:test')('isolated South P22 and P133 reuse the same body and change only the verified iris',async()=>{
 await rt.ready;
 let checked=0;
 for(const action of ['idle','walk','attack-unarmed'])for(const look of [
  global.MareCharacterAppearance.normalize({gender:'masculino'}),
  global.MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'silver'}),
 ]) {
  const o={action,direction:'south',consumer:'world'};
  const get=(pants,a)=>rt.selectVisual({appearance96:a,equipment:{legs:{def:pants}}},o);
  const twenty=get(22,look), one=get(133,look),before=look=>({...look,eyeColor:'original'});
  const baseline22=get(22,before(look)),baseline133=get(133,before(look));
  assert(twenty?.strictSouthAppearance&&one?.strictSouthAppearance,action);
  assert.equal(twenty.colorAppearance.eyeColor,look.eyeColor);
  assert.equal(one.colorAppearance.eyeColor,look.eyeColor);
  assert.equal(twenty.strictSouthAppearance.face,one.strictSouthAppearance.face);
  assert.deepEqual(twenty.paletteSourceMasks,one.paletteSourceMasks);
  const d=twenty.pack.directions.south,ls=d.layers,x=one.pack.directions.south.layers;
  const sameBase=(r,items)=>r.pack.directions.south.layers.filter(l=>!items.includes(l));
  const p22=ls.filter(l=>l.id.startsWith('pants22-')),p133=x.filter(l=>/^(?:pants133-|own133-)/.test(l.id));
  assert.equal(p22.length,1);assert.equal(p133.length,1);
  assert.deepEqual(sameBase(twenty,p22),sameBase(one,p133));
  const face=ls.filter(l=>l.slot==='face');
  for(let f=0;f<d.clip.frames;f++){
   const x22=await render(twenty,o,f),x133=await render(one,o,f);
   const a22=await render(twenty,o,f,sameBase(twenty,p22)),a133=await render(one,o,f,sameBase(one,p133));
   assert(a22.equals(a133),'changed body after P22↔P133 swap');checked++;
   assert(differingOn(x22,x133,[await render({...twenty,strictSouthAppearance:undefined},o,f,p22),await render({...one,strictSouthAppearance:undefined},o,f,p133)],action+'/pants-swap'));
   const irisMask=await render({...twenty,strictSouthAppearance:undefined},o,f,face,strictOwner(twenty));
   for(const [next,prior]of [[twenty,baseline22],[one,baseline133]]){
    const a=await render(next,o,f),b=await render(prior,o,f);
    const count=differingOn(a,b,[irisMask],action+'/iris-owner-only');
    assert(count>=1&&count<=60,'change local to iris and overbroad prior face ownership');
   }
   if(global.gc)global.gc();
  }
  console.log(action,look.skinColor,look.eyeColor,d.clip.frames,'frames, P22↔P133 same base, eyes localized');
 }
 assert.equal(checked,50);console.log(checked+' P22/P133 slot swaps, 100 exact-route iris comparisons');
});
