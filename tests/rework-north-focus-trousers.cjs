'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const mod=file=>require(path.join(root,file)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),listed=require('../tools/audit-hd-wardrobe-product.cjs');
const fit=mod('tools/rework-combat-wardrobe/index.json').northFocusTrousers;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
const ids=[16,17,31,32,121,122],pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const nativePath=url=>new URL(url,'https://art.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1);
// The reference floods the historical shorts directly in their own PNG.
// Other disconnected pixels in that layer can belong to the original wrist.
function removeOriginal(im){
 const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 const data=ctx.getImageData(0,0,640,640),a=data.data,stack=[353*640+300];
 let n=0;while(stack.length){
  const p=stack.pop();if(!a[4*p+3])continue;
  a.fill(0,4*p,4*p+4);n++;
  for(const q of [p-1,p+1,p-640,p+640])if(q>=0&&q<640*640&&a[4*q+3])stack.push(q);
 }
 assert(n>6500&&n<9000);ctx.putImageData(data,0,0);return c;
}
async function reference(r,images,t,cloth){
 const rig=r.basePack,d=rig.pack.directions.north,key=cloth.cloth[t],stock=d.layers.find(l=>l.id==='shorts').frames[t];
 const im=await load('tools/rework-modular-outfits-hd/assets/'+key+'.png'),layer=cv.createCanvas(640,640),cx=layer.getContext('2d');
 const row=fit.phases[t],s=row.donorFit,q=row.receiverFit;
 const sx=(q[1]-q[0])/(s[1]-s[0]),sy=(q[3]-q[2])/(s[3]-s[2]);
 // Compose the affine map in double precision before the canvas converts it to floats.
 cx.imageSmoothingEnabled=false;cx.setTransform(sx,0,0,sy,q[0]-s[0]*sx,q[2]-s[2]*sy);
 cx.drawImage(im,0,0);
 const stockPath=nativePath(rig.images[stock]),clean=removeOriginal(images.get(stockPath)),map=new Map(images);
 const file='../rework-modular-outfits-hd/assets/'+key+'.png';
 map.set(stockPath,clean);map.set(nativePath(file),layer);
 const patch={...rig,images:{...rig.images,[key]:file},pack:{...rig.pack,directions:{north:{...d,layers:[
  ...d.layers,{id:'reference-material',source:key,slot:'top',depth:2.25,binding:{kind:'fixed'}}]}}}};
 const c=cv.createCanvas(640,640);weaponArt.render(c.getContext('2d'),{...r,basePack:patch},map,{frame:t,appearance:r.colorAppearance});
 const source=pixels(layer);clean.width=1;layer.width=1;return {c,source};
}
(async()=>{
 const api=make();await api.ready;const rows=[];
 for(const id of ids){
  const player=look.commit({classId:listed.weapons.find(w=>w.id===id).role,equipment:{weapon:{def:id}}},
   {gender:'masculino',skinColor:id%2?'ebony':'light',hairColor:'blue',eyeColor:'green'},()=>true);
  const o={consumer:'world',action:api.attackActionFor(id),direction:'north'},before=JSON.stringify(player);
  const select=p=>world.selectWorldHDOnly(api,catalog,p,o);
  const prepare=async p=>{const r=select(p),b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert.deepEqual(b.coverage[0].omitted,[]);return b;};
  const draw=(b,p,t)=>{let frame;assert(b.draw({save(){},restore(){},drawImage(c){frame=c;}},p,{...o,progress:(t+.2)/8}));
   assert.equal(frame.width,640);return pixels(frame);};
  const base=select(player),r=base.independentPlan?.base||base,images=new Map();
  for(const file of weaponArt.requiredFiles(r))images.set(file,await load(file));
  for(const [index,item] of listed.gear[1].entries()){
   const pants={def:item},single={...player,equipment:{...player.equipment,legs:pants}},extra={head:{def:listed.gear[4][index]},boots:{def:listed.gear[2][index]},coat:{def:[151,158,165,179][index%4]}};
   const off={...player,equipment:{...player.equipment,...extra}},on={...player,equipment:{...off.equipment,legs:pants}};
   const naked=await prepare(player),one=await prepare(single),control=await prepare(off),kit=await prepare(on);
   try{
    const solo=one.coverage[0],mixed=kit.coverage[0];
    assert.equal(solo.slotRoutes.legs.item,item);assert.equal(solo.slotRoutes.legs.quality,'hd');
    assert.deepEqual(mixed.slotRoutes.legs,solo.slotRoutes.legs);
    for(const k of Object.keys(off.equipment))assert.deepEqual(mixed.slotRoutes[k],control.coverage[0].slotRoutes[k]);
    assert.deepEqual(select({...on,equipment:Object.fromEntries(Object.entries(on.equipment).reverse())}).slotRoutes,mixed.slotRoutes);
    for(let f=0;f<8;f++){
     const {c,source}=await reference(r,images,f,fit.items[item]),actual=draw(one,single,f);
     assert(actual.equals(pixels(c)),[id,item,f,'original pants and receiving body'].join('/'));c.width=1;
     const basePixels=draw(naked,player,f),mixedPixels=draw(kit,on,f),other=draw(control,off,f);
     const allowed=new Uint8Array(640*640);for(const [at,n] of fit.phases[f].cut)allowed.fill(1,at,at+n);
     let count=0,visible=0;
     for(let i=0;i<allowed.length;i++){
      const k=i*4,changed=mixedPixels.readUInt32LE(k)!==other.readUInt32LE(k);
      if(changed||actual.readUInt32LE(k)!==basePixels.readUInt32LE(k))assert(allowed[i]||source[k+3]);
      if(changed){count++;if(source[k+3])visible++;}
     }
     assert(visible>300);rows.push({weapon:id,item,frame:f,source:fit.items[item].cloth[f],changed:count,visible});
    }
   }finally{naked.release();one.release();control.release();kit.release();}
  }
  assert.equal(JSON.stringify(player),before);console.log(id,'10 trousers, 80 solo and 80 mixed frames');global.gc?.();
 }
 assert.equal(rows.length,480);
 if(process.env.HD_TROUSER_RESULTS)fs.writeFileSync(process.env.HD_TROUSER_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
