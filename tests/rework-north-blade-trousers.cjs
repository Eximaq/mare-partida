'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const wardrobe=mod('tools/rework-combat-wardrobe/index.json').northFocusTrousers;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
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
async function reference(r,images,t,cloth,fit){
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
 const c=cv.createCanvas(...r.nativeCanvas);weaponArt.render(c.getContext('2d'),{...r,basePack:patch},map,{frame:t,appearance:r.colorAppearance});
 clean.width=1;layer.width=1;return c;
}
const blades=weapons.filter(w=>['sword','rogue'].includes(w.role));
const chosen=process.argv[2]?blades.filter(w=>w.id===Number(process.argv[2])):blades;
assert.equal(blades.length,12);assert(chosen.length);
async function check(api,w){
 const opt={action:api.attackActionFor(w.id),consumer:'world',direction:'north'},family=w.role==='sword'?'sword':'daggers';
 const player=look.commit({classId:w.role,equipment:{}},{gender:'masculino',hairColor:'blue',eyeColor:'green',skinColor:w.id%2?'ebony':'light'},()=>true);
 const saved=JSON.stringify(player),fit=wardrobe.bladeReceivers[family];
 function select(eq){
  const actor={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
  const r=world.selectWorldHDOnly(api,catalog,actor,opt);
  assert.deepEqual(r.omitted||[],[]);assert(!r.visualDegraded&&!r.appearanceAdapted);
  for(const [slot,id] of Object.entries(eq))assert.equal(r.slotRoutes?.[slot]?.item??(slot==='weapon'?r.item:undefined),id);
  return {actor,r};
 }
 async function prepare({actor,r}){
  const b=await api.prepareConfiguration([{player:actor,options:opt}],{resolve:()=>({player:actor,options:opt,source:r})});
  assert.deepEqual(b.coverage[0].omitted,[]);
  return {draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},actor,{...opt,progress:(f+.2)/8}));
   assert.equal(api.snapshot().last.frame,f);return c;},close:()=>b.release()};
 }
 const neighbors={weapon:w.id,head:19,boots:148},control=select(neighbors),render=[0,1,67,69,73].includes(w.id);
 const base=render?await prepare(control):null,bare=select({weapon:w.id}).r;
 const receiver=bare.independentPlan?.base||bare,images=new Map();
 if(render)for(const url of weaponArt.requiredFiles(receiver))images.set(url,await load(url));
 let frames=0;
 try{
  for(const item of gear[1]){
   const alone=select({weapon:w.id,legs:item}),dressed=select({...neighbors,legs:item}),{r}=dressed;
   assert.equal(r.slotRoutes.legs.source,wardrobe.items[item].source+'@'+fit.source);
   assert.deepEqual(r.slotRoutes.legs,alone.r.slotRoutes.legs);
   for(const k of Object.keys(neighbors))assert.deepEqual(r.slotRoutes[k],control.r.slotRoutes[k]);
   assert.deepEqual(select({legs:item,...neighbors}).r.slotRoutes,r.slotRoutes);
   if(!render)continue;
   const kit=await prepare(dressed),individual=await prepare(alone);
   try{for(let f=0;f<8;f++){
    const c=kit.draw(f),actual=pixels(c),before=pixels(base.draw(f));
    const offsets=r.renderOffsetPhysical||[0,0],mirrored=r.mirrorBody===true;
    const tile=cv.createCanvas(c.width,c.height),cx=tile.getContext('2d'),row=fit.phases[f];cx.imageSmoothingEnabled=false;
    cx.translate(...offsets);if(mirrored){cx.translate(640,0);cx.scale(-1,1);}
    cx.transform(...row.transform);cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+wardrobe.items[item].cloth[f]+'.png'),0,0);
    const owned=pixels(tile),mask=new Uint8Array(640*640);for(const [start,len] of row.cut)mask.fill(1,start,start+len);
    const original=await reference(receiver,images,f,wardrobe.items[item],fit);
    assert(Buffer.from(pixels(original).buffer).equals(Buffer.from(pixels(individual.draw(f)).buffer)),JSON.stringify([w.id,item,f,'full native reference']));original.width=1;
    let changed=0,visible=0;
    for(let i=0;i<actual.length;i++)if(actual[i]!==before[i]){
     const x=i%c.width-offsets[0],y=Math.floor(i/c.width)-offsets[1],px=mirrored?639-x:x;
     assert(owned[i]>>>24||px>=0&&px<640&&y>=0&&y<640&&mask[y*640+px],JSON.stringify([w.id,item,f,x,y,'outside fabric and original shorts']));
     changed++;if(owned[i]>>>24)visible++;
    }
    assert(changed>300&&visible>300,JSON.stringify([w.id,item,f,changed,visible]));tile.width=1;frames++;
   }}finally{kit.close();individual.close();}
  }
 }finally{base?.close();}
 assert.equal(saved,JSON.stringify(player));return frames;
}
(async()=>{const api=make();await api.ready;let frames=0;
 for(const w of chosen){frames+=await check(api,w);global.gc?.();}
 assert.equal(frames,chosen.filter(w=>[0,1,67,69,73].includes(w.id)).length*80);
 console.log(JSON.stringify({weapons:chosen.length,singles:chosen.length*10,mixed:chosen.length*10,frames}));
})().catch(e=>{console.error(e);process.exitCode=1;});
