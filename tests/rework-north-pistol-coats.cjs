'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the published game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby')),look=require(path.join(root,'character-appearance'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const source=require(path.join(root,'tools/rework-combat-wardrobe/index.json')).maleNorthPistolCoats;
const image=require('../tools/rework-hd-test-loader.cjs').create(root);
const options={action:'attack-firearm',direction:'north',consumer:'world'};
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
(async()=>{
 const api=make();await api.ready;let ticks=0;
 for(const parts of [{},{legs:21,boots:9,gloves:25}]){
  const setting={weapon:114,...parts};
  function player(extra){
   const equipment=Object.fromEntries(Object.entries({...setting,...extra}).map(([k,def])=>[k,{def}]));
   return look.commit({classId:'gunner',equipment},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  }
  const select=p=>world.selectWorldHDOnly(api,weapons,p,options);
  const prepare=(p,s)=>api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:s})});
  const draw=(on,p,t)=>{let c;assert(on.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(t+.2)/8}));return c;};
  const p=player({}),bare=select(p),off=await prepare(p,bare);
  try{for(const coat of [151,158,165,179]){
   const q=player({coat}),r=select(q);assert.deepEqual(r.omitted,[]);
   assert.equal(r.slotRoutes.coat.item,coat);assert.equal(r.slotRoutes.weapon.item,114);
   // Gloves are an independent foreground group above the coat. Walk the
   // actual signed group chain and verify all eight source and drawing passes.
   const coatGroups=[];
   for(let group=r.signedWeaponGarments;group;group=group.base?.signedWeaponGarments){
    if(group.coatAssets)coatGroups.push(group);
   }
   assert.equal(coatGroups.length,1);
   const [registeredCoat]=coatGroups;
   assert.deepEqual(registeredCoat.coatAssets,source.coats[coat]);
   assert.deepEqual(registeredCoat.phases.map(phase=>phase.front),source.coats[coat].map(sha=>[sha]));
   for(const s of Object.keys(parts))assert.deepEqual(r.slotRoutes[s],bare.slotRoutes[s]);
   assert.deepEqual(select({...q,equipment:Object.fromEntries(Object.entries(q.equipment).reverse())}).slotRoutes,r.slotRoutes);
   const on=await prepare(q,r);assert.deepEqual(on.coverage[0].omitted,[]);
   try{for(let t=0;t<8;t++){
    const before=draw(off,p,t),after=pixels(draw(on,q,t)),base=pixels(before);
    const own=await image('tools/rework-combat-wardrobe/assets/'+source.coats[coat][t]+'.png');
    const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');ctx.drawImage(own,0,0);
    const cloth=pixels(tile);let visible=0;
    for(let k=0;k<base.length;k++)if(after[k]!==base[k]){
     assert(cloth[k]>>>24,[coat,t,k,'outside own garment'].join('/'));if(cloth[k]===after[k])visible++;
    }
    assert(visible>2000,[coat,t,visible].join('/'));
    if(!parts.gloves){
     ctx.clearRect(0,0,640,640);ctx.drawImage(before,0,0);ctx.drawImage(own,0,0);
     assert.deepEqual(after,pixels(tile));
    }
    tile.width=1;ticks++;
   }}finally{on.release();}
  }}finally{off.release();}
 }
 assert.equal(ticks,64);console.log(ticks,'drawn pistol coat phases');
 if(process.env.HD_PISTOL_RESULTS)fs.writeFileSync(process.env.HD_PISTOL_RESULTS,JSON.stringify({ticks,id:114,direction:'north',coats:Object.keys(source.coats)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
