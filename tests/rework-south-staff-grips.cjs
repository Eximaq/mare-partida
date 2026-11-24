'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,slots,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const mod=p=>require(path.join(root,p)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),bank=mod('tools/rework-combat-wardrobe/index.json').southStaffGrips;
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(h,bank='rework-combat-wardrobe'){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/'+bank+'/assets/'+h+'.png'),0,0);
 const result=pixels(c);c.width=1;return result;}
(async()=>{
 const api=make();await api.ready;const counts={individual:0,pairs:0,drawn:0},log=[];
 const o={consumer:'world',action:'attack-focus',direction:'south'};
 for(const [i,weapon] of [123,124,125,126,127,128].entries()){
  const p=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:i%2?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  function select(eq){const player={...p,equipment:Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]))},r=world.selectWorldHDOnly(api,catalog,player,o);
   assert.deepEqual(r.omitted||[],[],JSON.stringify(eq));for(const [slot,id] of Object.entries(eq)){assert.equal(r.slotRoutes[slot].item,id);assert.equal(r.slotRoutes[slot].quality,'hd');}return {player,r};}
  async function prepare(eq){const {player,r}=select(eq),bundle=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   assert.deepEqual(bundle.coverage[0].omitted,[]);return {draw(f){let c;assert(bundle.draw({save(){},restore(){},drawImage(im){c=im;}},player,{...o,progress:(f+.2)/8}));return pixels(c);},release:()=>bundle.release()};}
  const alone={};
  for(const [j,items] of gear.entries())for(const id of items){const slot=slots[j];alone[id]=select({weapon,[slot]:id}).r.slotRoutes[slot];counts.individual++;}
  const fixed={weapon,head:19,legs:168,boots:148};
  for(const coat of gear[0])for(const gloves of gear[3]){const eq={...fixed,coat,gloves},r=select(eq).r;for(const [s,id] of Object.entries(eq))if(s!=='weapon')assert.deepEqual(r.slotRoutes[s],alone[id]);
   assert.deepEqual(r.slotRoutes,select(Object.fromEntries(Object.entries(eq).reverse())).r.slotRoutes);counts.pairs++;}
  const pairings=i===0?[0,6]:[i],base=await prepare(fixed);const bare=Array.from({length:8},(_,f)=>base.draw(f));base.release();
  for(const n of pairings){
   const coat=gear[0][n],gloves=gear[3][n],originalContact=weapon===123&&coat===6&&gloves===25?await prepare({weapon,coat,gloves}):null,C=await prepare({...fixed,coat}),G=await prepare({...fixed,coat,gloves});
   for(let f=0;f<8;f++){
    const clothed=C.draw(f),gloved=G.draw(f),signed=originalContact?originalContact.draw(f):bare[f],row=bank.items[weapon].frames[f],mask=await plane(row.mask),native=await plane(row.source,'rework-weapon-layers-hd'),gl=await plane(row.gloves[gloves]);
    let fabric=0,texture=0,grip=0,metal=0;
    for(let k=0;k<mask.length;k++){
     if(bare[f][k]!==clothed[k])fabric++;
     if(clothed[k]!==gloved[k]){texture++;if((mask[k]>>>8)&255)grip++;}
     if((mask[k]>>>24)===255&&!((mask[k]>>>8)&255)&&(native[k]>>>24)===255&&(signed[k]>>>24)===255){
      assert.equal(gloved[k],signed[k],[weapon,coat,gloves,f,k,'metal']);metal++;}
     if((gl[k]>>>24)===255&&!(weapon===123&&gloves===25))assert.equal(gloved[k],gl[k],[weapon,gloves,f,k,'glove']);
     if(Math.floor(k/640)<190)assert.equal(gloved[k],bare[f][k],[weapon,coat,f,k,'head']);
    }
    assert(fabric>600&&texture>80&&grip>30&&metal>100,[weapon,f,fabric,texture,grip,metal]);counts.drawn+=2;
    log.push({weapon,coat,gloves,frame:f,fabric,texture,grip,metal});
   }
   originalContact?.release();C.release();G.release();global.gc?.();
  }
 }
 assert.deepEqual(counts,{individual:300,pairs:600,drawn:112});console.log(JSON.stringify(counts));
 if(process.env.HD_STAFF_GRIP_RESULTS)fs.writeFileSync(process.env.HD_STAFF_GRIP_RESULTS,JSON.stringify(log));
})().catch(e=>{console.error(e);process.exitCode=1;});
