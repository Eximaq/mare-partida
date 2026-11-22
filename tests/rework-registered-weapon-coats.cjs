'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const index=mod('tools/rework-weapon-layers-hd/index.json');
const registry=mod('player-rework-weapon-native-hd.js').create(index,{makeCanvas:cv.createCanvas});
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const proof=mod('tools/rework-weapon-layers-hd/sixth-coats-source-proof.json');
 let frames=0;
 const socketRig=index.separableAttackRigs.find(r=>r.directions.east.weapons[118]);
 const rigs=[...proof.rigs,{...socketRig,item:118}];
 for(const rig of rigs)for(const [direction,track] of Object.entries(rig.directions)){
  const p=look.commit({classId:weapons.find(w=>w.id===rig.item).role,equipment:{weapon:{def:rig.item}}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const o={action:'attack-unarmed',direction,consumer:'world'},select=()=>world.selectWorldHDOnly(api,catalog,p,o);
  const bare=select(),stored=JSON.stringify(p.appearance96);
  // Isolate the receiving actor's saved body. The reference uses the original
  // signed textile and hardware and does not call the new garment selector.
  const body={...bare,states:bare.states.map(s=>({...s,layers:[s.layers[0]]}))};
  const reference=new Map(await Promise.all(registry.requiredFiles(body).map(async f=>[f,await load(f)])));
  for(const id of Object.keys(track.coats).map(Number)){
   p.equipment.coat={def:id};
   const source=select();assert.equal(source.slotRoutes.coat.item,id);assert.deepEqual(source.omitted,[]);
   const kit=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source})});
   try{
    assert.equal(kit.coverage[0].frames,8);
    for(let i=0;i<8;i++){
     const pass=track.coats[id][i],metal=bare.states[i].layers[1];
     const shift=pass.socket?pass.socket.position.map((v,k)=>v-metal.attachment.anchor[k]):[0,0];assert.equal(source.states[i].layers[1].sha256,pass.sha256);
     const expected=cv.createCanvas(640,640),ctx=expected.getContext('2d');
     registry.render(ctx,body,reference,{frame:i});const without=bytes(expected);
     ctx.drawImage(await load('tools/rework-weapon-layers-hd/'+pass.url),0,0);
     ctx.drawImage(await load('tools/rework-weapon-layers-hd/'+metal.url),...shift);
     let actual;assert(kit.draw({save(){},restore(){},drawImage(c){actual=c;}},p,{...o,progress:(i+.25)/bare.timeline.length}));
     assert(bytes(actual).equals(bytes(expected)),[rig.item,id,direction,i].join('/'));
     const gearOnly=cv.createCanvas(640,640);const gx=gearOnly.getContext('2d'),pixels=gx.createImageData(640,640);
     pixels.data.set(without);gx.putImageData(pixels,0,0);gx.drawImage(await load('tools/rework-weapon-layers-hd/'+metal.url),...shift);
     assert(!bytes(actual).equals(bytes(gearOnly)),'cloth contributes visible pixels');
     expected.width=gearOnly.width=1;frames++;
    }
   }finally{kit.release();}
   p.equipment={boots:{def:9},coat:{def:id},weapon:{def:rig.item}};
   assert.deepEqual(select().slotRoutes.coat,source.slotRoutes.coat);
   delete p.equipment.boots;assert.deepEqual(select().slotRoutes.coat,source.slotRoutes.coat);
   delete p.equipment.coat;assert.equal(select().id,bare.id);
   assert.equal(JSON.stringify(p.appearance96),stored);
  }
 }
 assert.equal(frames,192);console.log(JSON.stringify({frames,routes:24}));
})().catch(e=>{console.error(e);process.exitCode=1;});