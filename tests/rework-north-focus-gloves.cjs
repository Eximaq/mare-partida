'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const mod=file=>require(path.join(root,file)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),listed=require('../tools/audit-hd-wardrobe-product.cjs');
const bank=mod('tools/rework-combat-wardrobe/index.json').northFocusGloves;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
const ids=[16,17,31,32,121,122],pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const nativePath=url=>new URL(url,'https://art.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1);

// The reference inserts separate garment rasters into a copy of the original
// weapon rig. It contains no fitted-wardrobe flags and uses the regular renderer.
async function originalWithGloves(r,images,item,t){
 const rig=r.basePack,d=rig.pack.directions.north,track=bank.items[item];
 const nativeFar=d.layers.find(l=>l.id==='forearm-hand-far').frames[t],pin=bank.pins[t];
 const kind=nativeFar===pin.open?'open':r.w121IndependentNorth?'staff':'normal';
 const far=track.far[t][kind],near=track.near[t].normal;
 const map=new Map(images),bindings={...rig.images},layers=[...d.layers],mask=new Uint8Array(640*640);
 const parts={};
 for(const [name,key,depth] of [['back fingers',far.behind,3],['grip',far.grip,3.05],['far',far.hand,4.25],['near',near.hand,6.25]]){
  if(!key)continue;
  const url='../rework-combat-wardrobe/assets/'+key+'.png',im=await load(nativePath(url));
  map.set(nativePath(url),im);bindings[key]=url;
  layers.push({id:name,slot:'top',binding:{kind:'fixed'},source:key,depth});
  const tmp=cv.createCanvas(640,640);tmp.getContext('2d').drawImage(im,0,0);const rgba=pixels(tmp);tmp.width=1;
  let occupied=0;for(let i=0;i<mask.length;i++)if(rgba[i*4+3]){mask[i]=1;occupied++;}
  assert(occupied>0);parts[name]={key,occupied};
 }
 if(t===2||t===6)assert(parts['back fingers']);
 if(r.w121IndependentNorth)assert(parts.grip);
 const copy={...r,basePack:{...rig,images:bindings,pack:{...rig.pack,directions:{north:{...d,layers}}}}};
 const c=cv.createCanvas(640,640);weaponArt.render(c.getContext('2d'),copy,map,{frame:t,appearance:r.colorAppearance});
 return {c,parts,mask,far:far.source,near:near.source};
}
(async()=>{
 const api=make();await api.ready;const rows=[];
 for(const id of ids){
  const player=look.commit({classId:listed.weapons.find(w=>w.id===id).role,equipment:{weapon:{def:id}}},
   {gender:'masculino',skinColor:id%2?'ebony':'light',hairColor:'blue',eyeColor:'green'},()=>true);
  const o={consumer:'world',action:api.attackActionFor(id),direction:'north'},original=JSON.stringify(player);
  const select=p=>world.selectWorldHDOnly(api,catalog,p,o);
  const prepare=async p=>{const r=select(p),b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert.deepEqual(b.coverage[0].omitted,[],JSON.stringify(b.coverage[0].slotResolution));return b;};
  const draw=(b,p,t)=>{let frame;assert(b.draw({save(){},restore(){},drawImage(c){frame=c;}},p,{...o,progress:(t+.2)/8}));
   assert.equal(frame.width,640);return pixels(frame);};
  const base=select(player),r=base.independentPlan?.base||base,images=new Map();
  for(const file of weaponArt.requiredFiles(r))images.set(file,await load(file));
  const naked=await prepare(player);
  try{for(const [index,item] of listed.gear[3].entries()){
   const gloves={def:item},solo={...player,equipment:{...player.equipment,gloves}};
   const off={...player,equipment:{...player.equipment,head:{def:listed.gear[4][index]},boots:{def:listed.gear[2][index]},legs:{def:listed.gear[1][index]},coat:{def:[151,158,165,179][index%4]}}};
   const on={...player,equipment:{...off.equipment,gloves}};
   const single=await prepare(solo),kit=await prepare(on),control=await prepare(off);
   try{
    const a=single.coverage[0],b=kit.coverage[0];
    assert.equal(a.slotRoutes.gloves.item,item);assert.equal(a.slotRoutes.gloves.quality,'hd');assert.deepEqual(b.slotRoutes.gloves,a.slotRoutes.gloves);
    for(const slot of Object.keys(off.equipment))assert.deepEqual(b.slotRoutes[slot],control.coverage[0].slotRoutes[slot]);
    assert.deepEqual(select({...on,equipment:Object.fromEntries(Object.entries(on.equipment).reverse())}).slotRoutes,b.slotRoutes);
    for(let t=0;t<8;t++){
     const expected=await originalWithGloves(r,images,item,t),full=draw(single,solo,t);
     assert(full.equals(pixels(expected.c)),[id,item,t,'owned gloves and each receiving depth'].join('/'));expected.c.width=1;
     const before=draw(naked,player,t),mixed=draw(kit,on,t),other=draw(control,off,t);
     let soloChanged=0,mixedChanged=0;
     for(let i=0;i<expected.mask.length;i++){
      const k=i*4,diff=full.readUInt32LE(k)!==before.readUInt32LE(k),ensemble=mixed.readUInt32LE(k)!==other.readUInt32LE(k);
      if(diff||ensemble)assert(expected.mask[i],'glove affected another part at '+i);
      soloChanged+=Number(diff);mixedChanged+=Number(ensemble);
     }
     assert(soloChanged>150&&mixedChanged>150);
     rows.push({weapon:id,item,t,far:expected.far,near:expected.near,parts:expected.parts,soloChanged,mixedChanged});
    }
   }finally{single.release();kit.release();control.release();}
  }}finally{naked.release();}
  assert.equal(JSON.stringify(player),original);console.log(id,'ten gloves, 80 individual and 80 mixed phases');global.gc?.();
 }
 assert.equal(rows.length,480);
 if(process.env.HD_GLOVE_RESULTS)fs.writeFileSync(process.env.HD_GLOVE_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
