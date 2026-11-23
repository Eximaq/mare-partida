'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = process.env.HD_PUBLISHED_ROOT;
assert(root, 'Set HD_PUBLISHED_ROOT to the exported game');
const {make} = require('./rework-integration-support.cjs');
const {gear,slots,weapons} = require('../tools/audit-hd-wardrobe-product.cjs');
const world = require(path.join(root,'paper-doll-96-lobby.js'));
const appearance = require(path.join(root,'character-appearance.js'));
const catalog = require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const focus = weapons.filter(w=>['healer','strategist'].includes(w.role));
const dirs = ['east','west','south','north'];
const selection = process.env.FOCUS_HAIR_GROUP || 'all';
assert(['all',...dirs].includes(selection));
const part = (direction)=>selection==='all'||direction===selection;
const renderCases = {
 east:[16,17,31,32,121,122,123,128],
 west:[32,121,124],north:[16,17,31,32,121,122,123,128],south:[16,17,31,123]
};
const pigments=new Set(appearance.eyes.green.ramp.map(hex=>{
 const n=parseInt(hex.slice(1),16);return ((n>>16)&255)|(n&0xff00)|((n&255)<<16);
}));
const profiles=require(path.join(root,'player-rework-modular-outfits-hd.js'));
function irisPixels(before,after,direction){
 if(direction==='north')return 0;
 const profile=direction!=='south',anchors=profile?profiles.sideIrisSamples(direction):profiles.southIrisSamples();
 const seen=new Set();
 for(const [x,y] of anchors)for(let dy=-2;dy<=2;dy++){
  const j=(y+(profile?64:0)+dy)*640+x+(profile?64:0);
  if((before[j]>>>24)===255&&pigments.has(before[j]&0xffffff)){
   assert.equal(after[j],before[j],'Saved green iris pixel changed when only the hairstyle changed');seen.add(j);
  }
 }
 assert(seen.size>=6,'Expected the signed visible iris');return seen.size;
}
const rows=[];
async function main(){
 const api=make();await api.ready;
 let selected=0,drawn=0,frames=0;
 for(const direction of dirs.filter(part)){
  for(const [i,w] of focus.entries()){
   const o={consumer:'world',action:'attack-focus',direction};
   const clothes=Object.fromEntries(slots.map((s,n)=>[s,gear[n][(i*3+n)%gear[n].length]]));
   function query(hairStyle,helmet){
    const equipment={...clothes,weapon:w.id};
    if(helmet==null)delete equipment.head;else equipment.head=helmet;
    const p=appearance.commit({classId:w.role,equipment:Object.fromEntries(Object.entries(equipment).map(([k,id])=>[k,{def:id}]))},
     {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle},()=>true);
    const r=world.selectWorldHDOnly(api,catalog,p,o),label=[w.id,direction,hairStyle,helmet].join('/');
    assert(r,label);assert.equal(r.resolvedAction||r.action,'attack-focus',label);assert.equal(r.direction,direction,label);
    assert(!r.visualDegraded&&!r.appearanceAdapted);assert.deepEqual(r.omitted||[],[],label);
    for(const [slot,id] of Object.entries(equipment)){assert.equal(r.slotRoutes?.[slot]?.item,id,label+'/'+slot);assert.equal(r.slotRoutes[slot].quality,'hd',label);}
    assert.equal(p.appearance96.hairStyle,hairStyle);return {p,r,label};
   }
   async function draw(entry){
    const {p,r,label}=entry,kit=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
    try{assert.deepEqual(kit.coverage[0].omitted||[],[],label);assert.equal(kit.coverage[0].source,r.id,label);
     const count=r.timeline?.length??kit.coverage[0].frames,phases=[];
     for(let f=0;f<count;f++){let canvas;
      assert(kit.draw({save(){},restore(){},drawImage(c){canvas=c;}},p,{...o,progress:(f+.1)/count}),label+'/'+f);
      assert(canvas&&canvas.width===640&&canvas.height===640,label+'/'+f);
      phases.push(new Uint32Array(canvas.getContext('2d').getImageData(0,0,640,640).data.buffer));}
     return phases;
    }finally{kit.release();}
   }
   const helmet=clothes.head,short=query('hair-cropped',null),capped=query('hair-cropped',helmet);selected+=2;
   for(const h of gear[slots.indexOf('head')])query('hair-cropped',h);
   if(!renderCases[direction].includes(w.id))continue;
   const [raw,named,head]=[await draw(query('original',null)),await draw(short),await draw(capped)];
   assert.equal(raw.length,named.length);assert.equal(raw.length,head.length);
   let maxY=0,minHair=Infinity,minHelmet=Infinity,iris=0;
   for(let f=0;f<raw.length;f++){
    iris+=irisPixels(raw[f],named[f],direction);
    let deltaHair=0,deltaHelmet=0;
    for(let j=0;j<raw[f].length;j++){
     const hair=raw[f][j]!==named[f][j],gearChange=named[f][j]!==head[f][j];if(!hair&&!gearChange)continue;
     if(hair)deltaHair++;if(gearChange)deltaHelmet++;maxY=Math.max(maxY,Math.floor(j/640));}
    minHair=Math.min(minHair,deltaHair);minHelmet=Math.min(minHelmet,deltaHelmet);
    assert(deltaHair>100&&deltaHelmet>100,[w.id,direction,f,deltaHair,deltaHelmet].join('/'));
   }
   assert(maxY<302,[w.id,direction,'difference below head',maxY].join('/'));
   rows.push({weapon:w.id,direction,helmet,frames:raw.length,minHair,minHelmet,maxY,iris});drawn++;frames+=raw.length;
   console.log(JSON.stringify(rows.at(-1)));global.gc?.();
  }
 }
 assert.equal(focus.length,12);
 const expected=dirs.filter(part).length*focus.length;assert.equal(selected,2*expected);
 assert.equal(drawn,dirs.filter(part).reduce((sum,d)=>sum+renderCases[d].length,0));
 if(process.env.WARDROBE_EVIDENCE)fs.writeFileSync(process.env.WARDROBE_EVIDENCE,JSON.stringify({selected,allHelmets:expected*10,drawn,frames,rows}));
 console.log(JSON.stringify({selected,allHelmets:expected*10,drawn,frames}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});