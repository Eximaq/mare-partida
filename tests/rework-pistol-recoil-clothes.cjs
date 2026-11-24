'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const load=k=>require(path.join(root,k)),world=load('paper-doll-96-lobby.js'),catalog=load('tools/paper-doll-96-v3/weapons.json');
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const bank=load('tools/rework-combat-wardrobe/index.json'),image=require('../tools/rework-hd-test-loader.cjs').create(root);
const canvas=()=>cv.createCanvas(640,640),rgba=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);

(async()=>{
 const api=make();await api.ready;const rows=[];let selected=0;
 const ids=process.env.HD_PISTOL_DIRECTION?[process.env.HD_PISTOL_DIRECTION]:['north','east','west'];
 const reg=bank.pistolRecoilClothes;
 const pistols=load('tools/rework-weapon-layers-hd/archives/archive-index.json').pistolWardrobe.directions;
 for(const direction of ids){
  const weapon=114,pistol=pistols[direction],o={consumer:'world',action:'attack-firearm',direction};
  const look=load('character-appearance.js').commit({classId:'gunner',equipment:{}},{gender:'masculino',skinColor:weapon%2?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  function select(kit){
   const p={...look,equipment:Object.fromEntries(Object.entries(kit).map(([k,id])=>[k,{def:id}]))},r=world.selectWorldHDOnly(api,catalog,p,o);
   assert(r?.action===o.action&&r.direction===direction);for(const [slot,id] of Object.entries(kit))assert.equal(r.slotRoutes[slot]?.item,id);
   assert.deepEqual(r.omitted||[],[],JSON.stringify([weapon,kit,r.omitted]));return {p,r};
  }
  async function mounted(kit){
   const {p,r}=select(kit);const cfg=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});assert.deepEqual(cfg.coverage[0].omitted,[]);
   return {r,draw(f){let c;const t=r.timeline.indexOf(r.states[f].state);assert(t>=0);assert(cfg.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(t+.1)/r.timeline.length}));return c;},release:()=>cfg.release()};
  }
  const bare=await mounted({weapon}),count=bare.r.states.length,without=Array.from({length:count},(_,f)=>rgba(bare.draw(f)));
  const registered=reg[direction];
  for(const [slot,items] of Object.entries({coat:gear[0],gloves:gear[3]})){
   for(const item of items){select({weapon,[slot]:item});selected++;}
   for(const item of items){
    const other={...slot==='coat'?{gloves:159}:{coat:130},boots:148,legs:168,head:19},one=await mounted({weapon,[slot]:item}),prev=await mounted({weapon,...other}),full=await mounted({weapon,...other,[slot]:item});
    assert.deepEqual(one.r.slotRoutes[slot],full.r.slotRoutes[slot]);for(const k of Object.keys(other))assert.deepEqual(prev.r.slotRoutes[k],full.r.slotRoutes[k]);
    for(let f=0;f<count;f++){
     const shape=canvas(),ctx=shape.getContext('2d'),row=registered.items[(slot==='coat'?'torso':slot)+item].phases[f];
     for(const t of [row.front,row.rear])if(t)ctx.drawImage(await image('tools/rework-combat-wardrobe/assets/'+t[0]+'.png'),t[1],t[2]);
     if(weapon===114&&slot==='gloves'&&item===25&&!one.r.slotRoutes.gloves.source.includes('@')){
      ctx.clearRect(0,0,640,640);for(const sha of pistol.slots.gloves[25][f].front)ctx.drawImage(await image('tools/rework-weapon-layers-hd/assets/'+sha+'.png'),0,0);
     }
     if(direction==='north'&&slot==='coat'&&bank.maleNorthPistolCoats.coats[item]&&one.r.slotRoutes.coat.source.includes('/coat-')){
      ctx.clearRect(0,0,640,640);ctx.drawImage(await image('tools/rework-combat-wardrobe/assets/'+bank.maleNorthPistolCoats.coats[item][f]+'.png'),0,0);
     }
     const own=rgba(shape);
     const a=rgba(one.draw(f)),b=rgba(full.draw(f)),c=rgba(prev.draw(f)),base=without[f];let single=0,mixed=0;
     for(let i=0;i<a.length;i++){
      if(!(own[i]>>>24)){if(a[i]!==base[i]||b[i]!==c[i])throw Error('Changed foreign pixels '+[weapon,slot,item,f,i%640,i/640|0,a[i],base[i],b[i],c[i]].join('/'));continue;}
      single+=Number(a[i]!==base[i]);mixed+=Number(b[i]!==c[i]);
     }
     assert(single>(slot==='gloves'?30:800)&&mixed>(slot==='gloves'?10:250),[weapon,slot,item,f,single,mixed].join('/'));rows.push({weapon,direction,slot,item,f,single,mixed});shape.width=1;
    }
    one.release();prev.release();full.release();
   }
  }

  bare.release();console.log(direction,rows.length);global.gc?.();
 }
 assert.equal(selected,ids.length*20);
 assert.equal(rows.length,ids.length*160);
 if(process.env.HD_PISTOL_RECOIL_EVIDENCE)fs.writeFileSync(process.env.HD_PISTOL_RECOIL_EVIDENCE,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
