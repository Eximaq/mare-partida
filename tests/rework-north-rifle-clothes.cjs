'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const mod=k=>require(path.join(root,k)),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const clothes=mod('tools/rework-combat-wardrobe/index.json').northRifleClothes;
const image=require('../tools/rework-hd-test-loader.cjs').create(root),canvas=()=>cv.createCanvas(640,640);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
(async()=>{
 const api=make();await api.ready;const rows=[],o={consumer:'world',action:'attack-firearm',direction:'north'};
 for(const id of [4,5,113,115,116]){
  const p=look.commit({classId:'gunner',equipment:{}},{gender:'masculino',skinColor:id%2?'ebony':'light',hairColor:'blue',eyeColor:'green'},()=>true);
  const appearance=JSON.stringify(p.appearance96);
  async function pose(eq){
   const player={...p,equipment:Object.fromEntries(Object.entries(eq).map(([s,i])=>[s,{def:i}]))};
   const r=world.selectWorldHDOnly(api,catalog,player,o);
   const b=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   assert.deepEqual(b.coverage[0].omitted,[]);for(const [s,i] of Object.entries(eq))assert.equal(r.slotRoutes[s].item,i);
   return {r,draw(f){let c;const tick=r.timeline.indexOf(String(f));assert(tick>=0&&r.timeline.length===48);
    assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},player,{...o,progress:(tick+.25)/48}));return pixels(c);
   },release:()=>b.release()};
  }
  const off=await pose({weapon:id}),fixed={weapon:id,legs:168,boots:148,head:19},dressed=await pose(fixed);
  const naked=[],others=[],back=canvas();back.getContext('2d').drawImage(await image('tools/rework-weapon-layers-hd/assets/'+clothes.pins[0].back+'.png'),0,0);
  const coverage=pixels(back);back.width=1;
  for(let f=0;f<3;f++){naked.push(off.draw(f));others.push(dressed.draw(f));}
  for(const item of gear[3]){
   const pass=clothes.gloves[item],solo=await pose({weapon:id,gloves:item}),kit=await pose({...fixed,gloves:item});
   assert.equal(pass.frames.length,3);assert.deepEqual(solo.r.slotRoutes.gloves,kit.r.slotRoutes.gloves);
   for(const s of Object.keys(fixed))assert.deepEqual(kit.r.slotRoutes[s],dressed.r.slotRoutes[s]);
   for(let f=0;f<3;f++){
    const plate=canvas();plate.getContext('2d').drawImage(await image('tools/rework-combat-wardrobe/assets/'+pass.frames[f]+'.png'),0,0);
    const own=pixels(plate),a=solo.draw(f),b=kit.draw(f);let visible=0,visibleDressed=0,hidden=0;
    for(let k=0;k<a.length;k++){
     if(!(own[k]>>>24)){assert.equal(a[k],naked[f][k]);assert.equal(b[k],others[f][k]);continue;}
     // The selected helmet hides the original hair, exposing part of the grip.
     if(b[k]!==others[f][k])visibleDressed++;
     if((coverage[k]>>>24)===255){assert.equal(a[k],naked[f][k]);hidden++;continue;}
     if(a[k]!==naked[f][k])visible++;
     if((own[k]>>>24)===255&&!(coverage[k]>>>24))assert.equal(a[k],own[k]);
    }
    assert(visible>55&&visibleDressed>8&&hidden>310,[id,item,f,visible,visibleDressed,hidden].join('/'));
    rows.push({weapon:id,slot:'gloves',item,phase:f,visible,visibleDressed,hidden});plate.width=1;
   }
   solo.release();kit.release();
  }

  const pair=await pose({...fixed,gloves:159}),baseline=[0,1,2].map(f=>pair.draw(f));
  for(const item of gear[0]){
   const src=clothes.coats[item],solo=await pose({weapon:id,torso:item}),all=await pose({...fixed,gloves:159,torso:item});
   assert.equal(src.frames.length,3);assert.equal(solo.r.slotRoutes.torso.source,src.source);
   assert.deepEqual(solo.r.slotRoutes.torso,all.r.slotRoutes.torso);
   for(const s of Object.keys(fixed))assert.deepEqual(all.r.slotRoutes[s],pair.r.slotRoutes[s]);
   for(const [f,phase] of src.frames.entries()){
    const surface=async key=>{const c=canvas();if(key)c.getContext('2d').drawImage(await image('tools/rework-combat-wardrobe/assets/'+key+'.png'),0,0);
      const p=pixels(c);c.width=1;return p;};
    const front=await surface(phase.front),sleeves=await surface(phase.sleeves),uncovered=await surface(phase.frontBare),a=solo.draw(f),b=all.draw(f);
    let n=0,kitN=0,core=0,mobile=0;
    for(let k=0;k<a.length;k++){
     if(!(front[k]>>>24)&&!(sleeves[k]>>>24))assert.equal(a[k],naked[f][k]);
     if(!(uncovered[k]>>>24)&&!(sleeves[k]>>>24))assert.equal(b[k],baseline[f][k]);
     if((front[k]>>>24)===255){assert.equal(a[k],front[k]);core++;}
     if(a[k]!==naked[f][k]){n++;if(!(front[k]>>>24)&&(sleeves[k]>>>24))mobile++;}
     if(b[k]!==baseline[f][k])kitN++;
    }
    assert(core>40&&n>2900&&kitN>2900,[id,item,f,n,core,kitN].join('/'));
    if(phase.sleeves)assert(mobile>5,[id,item,f,'sleeve coverage',mobile].join('/'));
    rows.push({weapon:id,slot:'torso',item,phase:f,visible:n,visibleDressed:kitN,core,mobile});
   }
   solo.release();all.release();
  }
  pair.release();
  off.release();dressed.release();assert.equal(JSON.stringify(p.appearance96),appearance);
  console.log(id,'10 coats and 10 glove pairs on three original recoil drawings');global.gc?.();
 }
 assert.equal(rows.length,300);
 if(process.env.HD_RIFLE_CLOTHES_RESULTS)fs.writeFileSync(process.env.HD_RIFLE_CLOTHES_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
