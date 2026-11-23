'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const {make,cv}=require('./rework-integration-support.cjs'),world=require(path.join(root,'paper-doll-96-lobby.js'));
const gear=require('../tools/audit-hd-wardrobe-product.cjs').gear,look=require(path.join(root,'character-appearance.js'));
const cat=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const load=require('../tools/rework-hd-test-loader.cjs').create(root),opts={consumer:'world',direction:'north',action:'attack-firearm'};
const makeCanvas=()=>cv.createCanvas(640,640);
function get(c){return c.getContext('2d').getImageData(0,0,640,640);}
function surface(im){const c=makeCanvas();c.getContext('2d').drawImage(im,0,0);return c;}
(async()=>{
 const api=make();await api.ready;let total=0,combos=0;
 for(const weapon of [4,5,113,115,116]){
  const wearer=look.commit({classId:'gunner',equipment:{weapon:{def:weapon}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const select=p=>world.selectWorldHDOnly(api,cat,p,opts),prepare=(p,r)=>api.prepareConfiguration([{player:p,options:opts}],{resolve:()=>({player:p,options:opts,source:r})});
  const draw=(b,p,i)=>{let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...opts,progress:(i+.2)/48}));return c;};
  const base=select(wearer),off=await prepare(wearer,base);
  // Render just the receiving hands and metal in their actual order. This
  // independently checks pixels exposed when the original opaque hair moves.
  const source={...base,id:base.id+'/test-rear-only',states:base.states.map(s=>({...s,layers:s.layers.slice(0,3),canvasRoundingPatch:[]}))};
  const under=await prepare(wearer,source);
  try{for(const head of gear[4]){
   const p={...wearer,equipment:{...wearer.equipment,head:{def:head}}},r=select(p),h=r.rifleLower?.helmet;
   assert(h);assert.deepEqual(r.omitted,[]);assert.equal(r.slotRoutes.head.item,head);
   const on=await prepare(p,r);assert.deepEqual(on.coverage[0].omitted,[]);
   try{
    const skull=surface(await load('tools/rework-base-hd/assets/'+h.skull+'.png')),sc=get(skull);
    sc.data.set(global.MareAppearance96.recolor(sc.data,global.MareNativeSkinHD.mask(sc.data,640,'anatomy'),global.MareAppearance96.skins.ebony.ramp));
    skull.getContext('2d').putImageData(sc,0,0);
    const hair=surface(await load('tools/rework-base-hd/assets/'+h.hair+'.png')),hairData=get(hair).data;
    const helm=await load('tools/rework-accessories/assets/'+h.gear.gear.source+'.png'),receipt=h.gear.sourceRecord,adj=receipt.adjustmentRecord.adjustment;
    const prior=receipt.entry.pack.directions.north.headgearPolicy?.headAdjustment||{},neck=h.pack.directions.north.poses[0].NECK;
    const offset=axis=>Math.round(4*(neck[axis]-receipt.rest.NECK[axis]+(prior[axis]||0)+(adj[axis==='x'?'gearX':'gearY']||0)));
    const expected=new Map();
    for(let t=0;t<48;t++){
     const state=+base.timeline[t],result=draw(on,p,t);
     if(!expected.has(state)){
      const ref=surface(draw(off,wearer,t)),ctx=ref.getContext('2d'),bare=Buffer.from(get(ref).data);
      if(h.hide){
       const back=surface(draw(under,wearer,t));back.getContext('2d').drawImage(skull,0,0);
       const old=get(ref),recovered=get(back);for(let k=0;k<hairData.length;k+=4)
        if(hairData[k+3])old.data.set(recovered.data.subarray(k,k+4),k);
       ctx.putImageData(old,0,0);back.width=1;
      }
      ctx.drawImage(helm,offset('x'),offset('y'));const bytes=Buffer.from(get(ref).data);
      assert(!bytes.equals(bare));expected.set(state,bytes);ref.width=1;
     }
     assert(Buffer.from(get(result).data).equals(expected.get(state)),[weapon,head,t,state,'source and recovered scalp'].join('/'));total++;
    }
    assert.equal(expected.size,3);skull.width=hair.width=1;
   }finally{on.release();}
   for(const legs of gear[1])for(const boots of gear[2]){
    const p={...wearer,equipment:{legs:{def:legs},head:{def:head},boots:{def:boots},weapon:{def:weapon}}},r=select(p);
    assert.deepEqual(r.omitted,[]);for(const [slot,entry] of Object.entries(p.equipment))assert.equal(r.slotRoutes[slot].item,entry.def);combos++;
   }
  }}finally{off.release();under.release();}
  console.log(weapon,'10 heads and 1,000 mixed triples');global.gc?.();
 }
 assert.equal(total,2400);assert.equal(combos,5000);
 if(process.env.HD_RIFLE_RESULTS)fs.writeFileSync(process.env.HD_RIFLE_RESULTS,JSON.stringify({total,combos}));
})().catch(e=>{console.error(e);process.exitCode=1;});
