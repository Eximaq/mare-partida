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
 const list=weapons.filter(w=>['rogue','sword'].includes(w.role)),slot='head',items=gear[4];
 assert.equal(list.length,12);assert.equal(items.length,10);
 let selected=0,frames=0,exposed=0,hidden=0;
 for(const {id,role} of list){
  const p=look.commit({classId:role,equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},()=>true),saved=JSON.stringify(p.appearance96);
  const o={action:api.attackActionFor(id),direction:'south',consumer:'world'};
  function select(eq){
   const player={...p,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
   const r=world.selectWorldHDOnly(api,catalog,player,o);
   assert(r&&r.direction===o.direction&&(r.resolvedAction??r.action)===o.action&&!r.omitted?.length&&!r.visualDegraded&&!r.appearanceAdapted,JSON.stringify([id,eq,r?.omitted,r?.slotResolution]));
   return {r,player};
  }
  async function bundle(pair){
   const {r,player}=pair,b=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   assert.equal(b.coverage[0].omitted.length,0);
   return {close:()=>b.release(),draw(i){const tick=r.timeline.findIndex(v=>Number(v)===i);assert(tick>=0,'Missing requested blade state '+i);let c;assert(b.draw({save(){},restore(){},drawImage(image){c=image;}},player,{...o,progress:(tick+.2)/r.timeline.length}));return c;}};
  }
  const naked=select({weapon:id}),visible=[0,1,69,73].includes(id),control=[];
  if(visible){const b=await bundle(naked);try{for(let i=0;i<9;i++)control.push(read(b.draw(i)));}finally{b.close();}}
  for(const item of items){
   const pair=select({weapon:id,head:item}),r=pair.r;assert.equal(r.slotRoutes.head.item,item);assert.equal(r.southBladeHead.gear.item,item);
   assert.equal(r.slotRoutes.head.source,r.southBladeHead.gear.sourceRecord.snapshot+':'+r.southBladeHead.gear.gear.source);selected++;
   if(!visible)continue;const b=await bundle(pair),h=r.southBladeHead;
   const imgs=new Map(),gearPrefix='tools/rework-accessories/assets/';
   const geometry=h.gear.sourceRecord.entry.pack.directions.south;
   for(const key of [h.gear.gear.source,...geometry.layers.filter(l=>l.slot==='headBase').map(l=>l.source)])imgs.set(gearPrefix+key+'.png',await load(gearPrefix+key+'.png'));
   imgs.set(h.skull,await load(h.skull));
   const helmet=cv.createCanvas(640,640);h.draw(helmet.getContext('2d'),imgs);
   const ink=read(helmet),hairURL='tools/rework-base-hd/assets/'+h.hair+'.png',hairCanvas=cv.createCanvas(640,640);
   hairCanvas.getContext('2d').drawImage(await load(hairURL),0,0);const hair=read(hairCanvas);
   try{for(let i=0;i<9;i++){
    const cover=cv.createCanvas(640,640),front=cover.getContext('2d');for(const url of h.cover[i]){const src=await load('tools/rework-weapon-layers-hd/'+url),pad=(src.width-640)/2;front.drawImage(src,-pad,-pad);}const mask=read(cover);
    const c=b.draw(i),worn=read(c),old=control[i],pad=(c.width-640)/2;let change=0,own=0;
    for(let j=0;j<worn.length;j++)if(worn[j]!==old[j]){const x=j%c.width-pad,y=Math.floor(j/c.width)-pad;const p=y*640+x;assert((ink[p]>>>24)||(h.hide&&(hair[p]>>>24)),JSON.stringify([id,item,i,x,y,'outside headgear/hair']));if((ink[p]>>>24)===255&&worn[j]===ink[p])own++;change++;}
    let clear=0,bad=0;for(let p=0;p<ink.length;p++)if((ink[p]>>>24)===255&&!(mask[p]>>>24)){
     const j=((p/640|0)+pad)*c.width+p%640+pad;clear++;if(ink[p]!==worn[j])bad++;
    }assert(clear>30&&bad===0&&change>250,[id,item,i,change,own,clear,bad].join('/'));frames++;cover.width=1;
   }}finally{b.close();}
  }
  assert.equal(saved,JSON.stringify(p.appearance96));
 }
 assert.equal(selected,120);assert.equal(frames,360);console.log(JSON.stringify({selected,frames}));
})().catch(e=>{console.error(e);process.exitCode=1;});
