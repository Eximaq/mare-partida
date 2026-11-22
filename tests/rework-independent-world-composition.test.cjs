'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make}=require('./rework-integration-support.cjs');
const appearance=require('../character-appearance.js');
const world=require('../paper-doll-96-lobby.js');
const weapons=require('../tools/paper-doll-96-v3/weapons.json');

const visual=make();
const look={gender:'masculino',hairStyle:'original',hairColor:'black',
 skinStyle:'natural',skinColor:'light',eyeStyle:'original',eyeColor:'blue'};
const actor=pieces=>appearance.commit({classId:'sword',factionId:'pirate',
 equipment:Object.fromEntries(pieces.map(([slot,def])=>[slot,{def}]))},look,()=>true);
const select=(pieces,action)=>world.selectWorldHDOnly(visual,weapons,actor(pieces),
 {consumer:'world',direction:'south',action});
const pieces=[['coat',6],['legs',21],['boots',9],['gloves',25]];

for(const action of ['idle','walk'])for(const armed of [false,true]){
 test(action+': every owned South layer survives the full '+(armed?'armed':'unarmed')+' loadout',async()=>{
  await visual.ready;
  const equipment=armed?[['weapon',0],...pieces]:pieces;
  const full=select(equipment,action);
  assert.ok(full,'the requested pose is available');
  assert.equal(full.resolvedAction??full.action,action);
  assert.deepEqual(full.omitted??[],[]);
  for(const [slot,item] of equipment){
   assert.equal(full.slotRoutes[slot].item,item);
   assert.equal(full.slotRoutes[slot].quality,'hd');
   assert.ok(full.slotRoutes[slot].source);
  }
  assert.equal(select([...equipment].reverse(),action).id,full.id);
 });
}

for(const direction of ['east','west']){
 test('dagger: adding an unresolved torso preserves the own gloves and trousers in '+direction,async()=>{
  await visual.ready;
  const p=appearance.commit({classId:'rogue',factionId:'pirate',equipment:{
   weapon:{def:73},gloves:{def:159},legs:{def:22},coat:{def:6}
  }},{...look,gender:'feminino'},()=>true);
  const selection=world.selectWorldHDOnly(visual,weapons,p,{action:'attack-daggers',direction,consumer:'world'});
  assert.ok(selection);
  assert.deepEqual(selection.omitted,['coat']);
  assert.equal(selection.slotRoutes.weapon.item,73);
  assert.equal(selection.slotRoutes.gloves.item,159);
  assert.equal(selection.slotRoutes.gloves.quality,'hd');
  assert.equal(selection.slotRoutes.legs.item,22);
  assert.equal(selection.slotRoutes.legs.quality,'hd');
  assert.equal(selection.action,'attack-daggers');
 });
}

const path=require('node:path');
const loadNative=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
const {cv}=require('./rework-integration-support.cjs');
const pose=action=>({consumer:'world',direction:'south',action});
async function prepare(renderer,player,options,source){
 return renderer.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source})});
}
function drawFrame(bundle,player,options,tick){
 let canvas;
 assert.ok(bundle.draw({save(){},restore(){},drawImage(image){canvas=image;}},player,{...options,progress:tick}));
 const {width,height}=canvas;
 return {width,height,pixels:canvas.getContext('2d').getImageData(0,0,width,height).data};
}

test('walking with a sword draws every phase; removing the boots changes only their own support',async()=>{
 await visual.ready;
 const options=pose('walk'),full=[['weapon',0],...pieces],p=actor(full);
 const without=full.filter(([slot])=>slot!=='boots'),q=actor(without);
 const source=select(full,'walk'),other=select(without,'walk');
 const layers=source.pack.directions.south.layers.filter(l=>source.slotResolution.boots.layers.includes(l.id));
 assert.equal(layers.length,4);
 assert.deepEqual(source.slotRoutes.gloves,other.slotRoutes.gloves);
 assert.deepEqual(source.slotRoutes.legs,other.slotRoutes.legs);
 const first=await prepare(visual,p,options,source),second=await prepare(visual,q,options,other);
 try{
  const n=first.coverage[0].frames;
  assert.equal(n,16);
  for(let i=0;i<n;i++){
   const tick=(i+.25)/n;
   const on=drawFrame(first,p,options,tick),off=drawFrame(second,q,options,tick);
   assert.deepEqual([on.width,on.height],[off.width,off.height]);
   const pack=source.pack,d=pack.directions.south;
   const matte=cv.createCanvas(512,512),images=new Map();
   for(const l of layers){
    const h=l.frames?.[i]??l.source;
    if(!images.has(h))images.set(h,await loadNative('tools/rework-modular-outfits-hd/assets/'+h+'.png'));
   }
   ReworkAccessoryVendor.compositor.render(matte.getContext('2d'),
    {...pack,directions:{south:{...d,layers}}},images,{direction:'south',frame:i,density:4});
   const alpha=matte.getContext('2d').getImageData(0,0,512,512).data;
   const pad=(on.width-512)/2;let changed=0,outside=0;
   for(let y=0;y<on.height;y++)for(let x=0;x<on.width;x++){
    const j=(y*on.width+x)*4;
    if(on.pixels[j]===off.pixels[j]&&on.pixels[j+1]===off.pixels[j+1]&&
       on.pixels[j+2]===off.pixels[j+2]&&on.pixels[j+3]===off.pixels[j+3])continue;
    changed++;
    if(x<pad||y<pad||x>=pad+512||y>=pad+512||alpha[((y-pad)*512+x-pad)*4+3]===0)outside++;
   }
   assert.ok(changed>100,'the boots must change visible pixels in frame '+i);
   assert.equal(outside,0,'only the owned boot layers may change pixels in frame '+i);
  }
 }finally{first.release();second.release();}
});

test('a failed raster is diagnosed on its slot and the other independent layers are drawn',async()=>{
 await visual.ready;
 const options=pose('idle'),p=actor([['weapon',0],...pieces]);
 const source=world.selectWorldHDOnly(visual,weapons,p,options);
 const failed=source.pack.directions.south.layers.find(l=>source.slotResolution.gloves.layers.includes(l.id)).source;
 const a=make({loadImage:file=>file.endsWith('/'+failed+'.png')?Promise.reject(Error('test load failure')):loadNative(file)});
 const bundle=await prepare(a,p,options,source);
 try{
  const [row]=bundle.coverage;
  assert.deepEqual(row.omitted,['gloves']);
  assert.equal(row.slotResolution.gloves.state,'load-failed');
  for(const slot of ['weapon','coat','legs','boots'])assert.equal(row.slotResolution[slot].state,'hd');
  assert.ok(drawFrame(bundle,p,options,0).pixels.some(Boolean));
 }finally{bundle.release();}
});

for(const direction of ['east','west']){
 test('female idle: an unbound head item cannot hide gloves, boots or trousers in '+direction,async()=>{
  await visual.ready;
  const p=appearance.commit({classId:'sword',factionId:'pirate',
   equipment:{legs:{def:22},gloves:{def:180},boots:{def:9},head:{def:99999}}},{...look,gender:'feminino'},()=>true);
  const options={action:'idle',direction,consumer:'world'};
  const selection=world.selectWorldHDOnly(visual,weapons,p,options);
  assert.ok(selection);
  assert.deepEqual(selection.omitted,['head']);
  for(const [slot,item] of [['legs',22],['gloves',180],['boots',9]]){
   assert.equal(selection.slotRoutes[slot].item,item);
   assert.equal(selection.slotRoutes[slot].quality,'hd');
  }
  const bundle=await prepare(visual,p,options,selection);
  try{assert(drawFrame(bundle,p,options,0).pixels.some(Boolean));}finally{bundle.release();}
 });
}

test('South gait recovers the existing tall boot group with its backing and no donor clothing',async()=>{
 await visual.ready;
 const kit=[['weapon',0],...pieces.map(([slot,item])=>[slot,slot==='boots'?148:item])];
 const p=actor(kit),options=pose('walk');
 const source=world.selectWorldHDOnly(visual,weapons,p,options);
 assert.deepEqual(source.omitted,[]);
 assert.equal(source.slotRoutes.boots.item,148);
 const layers=source.slotResolution.boots.layers;
 assert.equal(layers.length,6);
 assert(layers.every(id=>id.startsWith('boot148-')));
 assert(!source.pack.directions.south.layers.some(l=>l.id.startsWith('coat151-')||l.id.startsWith('glove152-')));
 const bundle=await prepare(visual,p,options,source);
 try{
  assert.equal(bundle.coverage[0].frames,16);
  assert.equal(bundle.coverage[0].slotRoutes.boots.quality,'hd');
 }finally{bundle.release();}
});

test('a registered female helmet mounts with the independent lateral clothing and keeps the saved look',async()=>{
 await visual.ready;
 const options={consumer:'world',direction:'east',action:'idle'};
 const look2={...look,gender:'feminino',skinColor:'ebony'};
 const p=appearance.commit({classId:'sword',factionId:'pirate',
  equipment:{head:{def:18},legs:{def:22},boots:{def:9},gloves:{def:180}}},look2,()=>true);
 const source=world.selectWorldHDOnly(visual,weapons,p,options);
 assert.deepEqual(source.omitted,[]);
 for(const slot of ['head','boots','legs','gloves'])assert.equal(source.slotRoutes[slot].quality,'hd');
 assert.equal(source.colorAppearance.skin,look2.skinColor);
 assert.equal(source.colorAppearance.hairColor,look2.hairColor);
 const before=JSON.stringify(p),bundle=await prepare(visual,p,options,source);
 try{
  assert(drawFrame(bundle,p,options,0).pixels.some(Boolean));
  assert.equal(JSON.stringify(p),before);
 }finally{bundle.release();}
});
