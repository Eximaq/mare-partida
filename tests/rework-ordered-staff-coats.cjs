'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the published build');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const bank=mod('tools/rework-combat-wardrobe/index.json').maleStaffCoats;
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const fabric=h=>load('tools/rework-combat-wardrobe/assets/'+h+'.png');
const native=h=>load('tools/rework-weapon-layers-hd/assets/'+h+'.png');
const create=()=>cv.createCanvas(640,640);
function stamp(img,mirror){
 const c=create(),x=c.getContext('2d');if(mirror){x.translate(640,0);x.scale(-1,1);}x.drawImage(img,0,0);return c;
}
(async()=>{
 const ids=process.argv.slice(2).map(Number),all=[31,123,124,125,126,127,128];
 assert(!ids.length||ids.every(i=>all.includes(i)));
 const list=ids.length?ids:all,api=make();await api.ready;let ticks=0;const results=[];
 for(const id of list)for(const direction of ['east','west']){
  const role=weapons.find(w=>w.id===id).role,options={consumer:'world',direction,action:'attack-focus'};
  const p=look.commit({classId:role,equipment:{weapon:{def:id}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const select=player=>world.selectWorldHDOnly(api,catalog,player,options);
  const prepare=async(player,source)=>api.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source})});
  const draw=(bundle,player,t)=>{let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},player,{...options,progress:(t+.2)/8}));return c;};
  const bare=select(p),base=await prepare(p,bare),west=direction==='west';
  try{for(const coat of [151,158,165,179]){
   const player={...p,equipment:{weapon:{def:id},coat:{def:coat}}},row=select(player);
   assert.deepEqual(row.omitted,[]);assert.equal(row.slotRoutes.coat.item,coat);assert.equal(row.slotRoutes.weapon.item,id);
   const on=await prepare(player,row);assert.deepEqual(on.coverage[0].omitted,[]);
   try{for(let t=0;t<8;t++){
    const before=draw(base,p,t),bc=read(before),after=read(draw(on,player,t));
    const own=stamp(await fabric(bank.coats[coat][t]),west),owned=read(own);
    const signed=bank.signedMasks[id],cut=stamp(await fabric((signed||bank.hands)[t]),west),mask=read(cut);
    let metal,metalPixels;
    if(!signed){metal=stamp(await native(bare.states[t].layers.find(l=>l.id==='gear').sha256),false);metalPixels=read(metal);}
    let exact=0,changed=0;
    for(let k=0;k<bc.length;k++){
     if(after[k]===bc[k])continue;
     assert(k>=205*640&&owned[k]>>>24&&!(mask[k]>>>24)&&(!metalPixels||(metalPixels[k]>>>24)<255),[id,direction,coat,t,k,'outside owned fabric'].join('/'));
     if(after[k]===owned[k])exact++;
     changed++;
    }
    assert(exact>2000&&changed>2500,[id,direction,coat,t,exact,changed].join('/'));
    if(signed){
     // Independent reconstruction of the signed source-over and protected pixels.
     const ref=create(),ctx=ref.getContext('2d');ctx.drawImage(before,0,0);ctx.drawImage(own,0,0);
     const pixels=read(ref);for(let k=0;k<pixels.length;k++)assert.equal(after[k],k<205*640||mask[k]>>>24?bc[k]:pixels[k]);
     ref.width=1;
    }
    for(const c of [own,cut,metal])if(c)c.width=1;ticks++;
   }}finally{on.release();}
   {
    const equipped={...player,equipment:{boots:{def:169},coat:{def:coat},head:{def:19},weapon:{def:id}}};
    const combined=select(equipped);
    assert.deepEqual(combined.omitted,[]);assert.deepEqual(combined.slotRoutes.coat,row.slotRoutes.coat);
    const reverse={...equipped,equipment:Object.fromEntries(Object.entries(equipped.equipment).reverse())};
    assert.deepEqual(select(reverse).slotRoutes,combined.slotRoutes);
   }
  }}finally{base.release();}
  results.push({id,direction,coats:4,frames:32});console.log(id,direction,32);global.gc?.();
 }
 assert.equal(ticks,list.length*64);if(process.env.HD_STAFF_RESULTS)fs.writeFileSync(process.env.HD_STAFF_RESULTS,JSON.stringify({ticks,results}));
})().catch(error=>{console.error(error);process.exitCode=1;});
