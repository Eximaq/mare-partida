'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const banks=mod('tools/rework-combat-wardrobe/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{
 const api=make();await api.ready;
 const list=weapons.filter(w=>['rogue','sword'].includes(w.role)),slot=process.argv[2]||'gloves',items=gear[slot==='gloves'?3:0];
 assert(['gloves','coat'].includes(slot));assert.equal(list.length,12);assert.equal(items.length,10);
 let selected=0,frames=0,exposed=0,hidden=0;
 for(const {id,role} of list){
  const p=look.commit({classId:role,equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},()=>true),saved=JSON.stringify(p.appearance96);
  const o={action:api.attackActionFor(id),direction:'north',consumer:'world'};
  function select(eq){
   const player={...p,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
   const r=world.selectWorldHDOnly(api,catalog,player,o);
   assert(r&&r.direction===o.direction&&(r.resolvedAction??r.action)===o.action&&!r.omitted?.length&&!r.visualDegraded&&!r.appearanceAdapted,JSON.stringify([id,eq,r?.omitted,r?.slotResolution]));
   return {r,player};
  }
  async function bundle(pair){
   const {r,player}=pair,b=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   assert.equal(b.coverage[0].omitted.length,0);
   return {close:()=>b.release(),draw(i){let c;assert(b.draw({save(){},restore(){},drawImage(image){c=image;}},player,{...o,progress:(i+.2)/8}));return c;}};
  }
  const fixed={weapon:id,boots:148,head:19,legs:168,...(slot==='gloves'?{coat:6}:{gloves:152})},base=select(fixed),control=[];
  // Draw each distinct rig with its real weapon depth and physical canvas.
  const draw=[1,67,69,73].includes(id);
  if(draw){const b=await bundle(base);try{for(let i=0;i<8;i++)control.push(read(b.draw(i)));}finally{b.close();}}
  for(const item of items){
   const single=select({weapon:id,[slot]:item}),pair=select({...fixed,[slot]:item}),r=pair.r;
   assert.equal(r.slotRoutes[slot].item,item);assert.deepEqual(r.slotRoutes[slot],single.r.slotRoutes[slot]);
   for(const k of Object.keys(fixed))assert.deepEqual(r.slotRoutes[k],base.r.slotRoutes[k]);
   const bank=slot==='gloves'?banks.northBladeGloves:banks.northBladeCoats;
   const fit=Object.values(bank.rigs).find(g=>r.slotRoutes[slot].source.includes('/'+g.family+'/'));
   const published=slot==='coat'&&banks.northWeaponCoats[id]?.coats[item],signed=published&&r.fittedCoatPlate;
   let track,mounted;
   if(signed){
    assert.equal(r.slotRoutes[slot].source,published.path+'/coat-'+item+'@'+published.archive);
    assert.deepEqual(signed.cloth,published.cloth);track=published.cloth.map(art=>({art}));mounted=track;
   }else{
    if(!fit)throw Error('Unexpected blade source '+r.slotRoutes[slot].source);
    track=fit.items[item];mounted=slot==='gloves'&&r.mirrorBody?track.map((g,i)=>bank.mirroredPatch[i]?{...g,palm:bank.mirroredPatch[i].items[item]}:g):track;
    assert.deepEqual(slot==='gloves'?r.northGloveTrack:r.northSleeves.frames,mounted);
   }
   selected++;
   if(!draw)continue;
   const current=await bundle(pair);
   try{for(let i=0;i<8;i++){
    const c=current.draw(i),after=read(c),before=control[i],plate=cv.createCanvas(c.width,c.height),ctx=plate.getContext('2d');
    const offset=signed?[0,0]:(r.renderOffsetPhysical||[0,0]);ctx.translate(...offset);
    ctx.save();if(r.mirrorBody){ctx.translate(640,0);ctx.scale(-1,1);}
    for(const k of Object.values(track[i]))ctx.drawImage(await load('tools/rework-combat-wardrobe/assets/'+k+'.png'),0,0);
    ctx.restore();if(mounted[i].palm)ctx.drawImage(await load('tools/rework-combat-wardrobe/assets/'+mounted[i].palm+'.png'),0,0);
    const cloth=read(plate);let changed=0,own=0;
    for(let j=0;j<after.length;j++)if(after[j]!==before[j]){
     assert(cloth[j]>>>24,[id,item,i,j,'outside owned panel'].join('/'));changed++;
     if((cloth[j]>>>24)===255&&after[j]===cloth[j])own++;
    }
    if(slot==='gloves'&&fit.occluded.includes(i)){assert.equal(changed,0);hidden++;}
    else{assert(changed>30&&own>10,[id,item,i,changed,own].join('/'));exposed++;}
    frames++;plate.width=1;
   }}finally{current.close();}
  }
  assert.equal(saved,JSON.stringify(p.appearance96));
 }
 assert.equal(selected,120);assert.equal(frames,320);assert.equal(exposed+hidden,frames);console.log(JSON.stringify({slot,selected,frames,exposed,hidden}));
})().catch(e=>{console.error(e);process.exitCode=1;});
