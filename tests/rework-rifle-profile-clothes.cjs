'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const load=k=>require(path.join(root,k)),world=load('paper-doll-96-lobby.js'),catalog=load('tools/paper-doll-96-v3/weapons.json');
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const bank=load('tools/rework-combat-wardrobe/index.json'),image=require('../tools/rework-hd-test-loader.cjs').create(root);
const canvas=()=>cv.createCanvas(640,640),rgba=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
(async()=>{
 const api=make();await api.ready;const results=[];let selected=0;
 const only=process.env.HD_RIFLE_WEAPON;
 const ids=only?[Number(only)]:[4,5,113,115,116];
 for(const weapon of ids)for(const direction of ['east','west']){
  const o={consumer:'world',direction,action:'attack-firearm'},look=load('character-appearance.js').commit({classId:'gunner',equipment:{}},{
   gender:'masculino',hairColor:'blue',skinColor:(weapon%2===0)===(direction==='east')?'light':'ebony',eyeColor:'green'},()=>true);
  async function mounted(kit){
   const p={...look,equipment:Object.fromEntries(Object.entries(kit).map(([k,def])=>[k,{def}]))},r=world.selectWorldHDOnly(api,catalog,p,o);
   assert(r&&r.action===o.action&&r.direction===direction,'Missing '+JSON.stringify(kit));
   const cfg=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert.deepEqual(cfg.coverage[0].omitted,[]);
   for(const [k,id] of Object.entries(kit))assert.equal(r.slotRoutes[k]?.item,id,JSON.stringify([direction,kit,k,r.slotRoutes]));
   return {r,draw(f){let c;assert(cfg.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(f+.1)/8}));
    assert.equal(c.width,640);return c;},release:()=>cfg.release()};
  }
  const off=await mounted({weapon}),baseline=Array.from({length:8},(_,f)=>rgba(off.draw(f)));
  const sources={coat:gear[0],legs:gear[1],gloves:gear[3]};
  for(const [slot,items] of Object.entries(sources)){
   assert.equal(items.length,10);
   for(const id of items){
    const kit={weapon,[slot]:id,boots:148,head:19};
    const p={...look,equipment:Object.fromEntries(Object.entries(kit).map(([k,def])=>[k,{def}]))},r=world.selectWorldHDOnly(api,catalog,p,o);
    assert.equal(r?.slotRoutes[slot]?.item,id);assert.equal(r.slotRoutes.weapon.item,weapon);selected++;
   }
   const selection=weapon===4?items:[items[ids.indexOf(weapon)%items.length]];
   for(const id of selection){
    const kit={weapon,legs:168,boots:148,gloves:159,head:19,coat:151};delete kit[slot];
    const prev=await mounted(kit),one=await mounted({weapon,[slot]:id}),full=await mounted({...kit,[slot]:id});
    assert.deepEqual(one.r.slotRoutes[slot],full.r.slotRoutes[slot]);for(const k of Object.keys(kit))assert.deepEqual(full.r.slotRoutes[k],prev.r.slotRoutes[k]);
    for(let f=0;f<8;f++){
     const src=canvas(),ctx=src.getContext('2d');
     if(direction==='west'){ctx.translate(640,0);ctx.scale(-1,1);}
     const url=k=>'tools/rework-combat-wardrobe/assets/'+k+'.png';
     if(slot==='coat'){for(const k of Object.values(bank.rifleProfileSleeves.items[id][f]))ctx.drawImage(await image(url(k)),0,0);}
     if(slot==='gloves'){for(const seq of Object.values(bank.rifleProfileGloves.items[id].frames))ctx.drawImage(await image(url(seq[f])),0,0);}
     if(slot==='legs'){const q=bank.rifleProfilePants.items.rifle[id][f];ctx.drawImage(await image(url(q.art)),q.x,q.y);}
     const own=rgba(src),a=rgba(one.draw(f)),b=rgba(full.draw(f)),c=rgba(prev.draw(f)),base=baseline[f];
     let barePixels=0,kitPixels=0;
     for(let i=0;i<a.length;i++){
      if(!(own[i]>>>24)){if(a[i]!==base[i]||b[i]!==c[i])throw Error('Outside '+[weapon,direction,slot,id,f,i%640,i/640|0,a[i],base[i],b[i],c[i],own[i]].join('/'));continue;}
      if(a[i]!==base[i])barePixels++;if(b[i]!==c[i])kitPixels++;
     }
     assert(barePixels>(slot==='gloves'?35:900),[slot,id,f,barePixels,kitPixels].join('/'));
     assert(kitPixels>(slot==='gloves'?9:80),[slot,id,f,barePixels,kitPixels].join('/'));
     results.push({weapon,direction,slot,item:id,phase:f,barePixels,kitPixels});src.width=1;
    }
    one.release();full.release();prev.release();
   }
  }
  off.release();console.log(weapon,direction,results.length);global.gc?.();
 }
 assert.equal(selected,ids.length*60);
 assert.equal(results.length,ids.includes(4)?480+48*(ids.length-1):48*ids.length);
 if(process.env.HD_RIFLE_PROFILE_EVIDENCE)fs.writeFileSync(process.env.HD_RIFLE_PROFILE_EVIDENCE,JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
