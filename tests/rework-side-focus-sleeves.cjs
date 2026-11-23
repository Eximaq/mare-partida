'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),mod=n=>require(path.join(root,n));
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const library=mod('tools/rework-combat-wardrobe/index.json').maleStaffCoats,items=[6,7,130,137,144,172];
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
function stamp(im,west){const c=cv.createCanvas(640,640),x=c.getContext('2d');if(west){x.translate(640,0);x.scale(-1,1);}
 x.drawImage(im,0,0);const data=read(c);c.width=1;return data;}
(async()=>{
 const api=make();await api.ready;const counts={selected:0,drawn:0};const report=[];
 const gearIds=[16,17,31,32,122,123,124,125,126,127,128];
 for(const weapon of gearIds)for(const direction of ['east','west']){
  const o={consumer:'world',action:'attack-focus',direction};
  const p=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  const select=equipment=>{const player={...p,equipment:Object.fromEntries(Object.entries(equipment).map(([k,v])=>[k,{def:v}]))};
   const row=world.selectWorldHDOnly(api,catalog,player,o);assert.deepEqual(row.omitted||[],[],[weapon,direction,JSON.stringify(equipment)].join('/'));return {player,row};};
  const prepare=async pair=>{const b=await api.prepareConfiguration([{player:pair.player,options:o}],{resolve:()=>({player:pair.player,options:o,source:pair.row})});
   assert.deepEqual(b.coverage[0].omitted,[]);return {draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},pair.player,{...o,progress:(f+.25)/pair.row.timeline.length}));return read(c);},release:()=>b.release()};};
  const off={weapon,boots:148,head:19,gloves:159},base=select(off),cycle=[31,32,17,16,128].includes(weapon)&&direction===(weapon%2?'east':'west'),before=cycle?await prepare(base):null;
  for(const item of items){
   const single=select({weapon,coat:item}),eq={...off,coat:item},kit=select(eq);counts.selected++;
   assert.equal(kit.row.slotRoutes.coat.item,item);assert.deepEqual(kit.row.slotRoutes.coat,single.row.slotRoutes.coat);
   for(const key of Object.keys(off))assert.deepEqual(kit.row.slotRoutes[key],base.row.slotRoutes[key]);
   assert.deepEqual(select(Object.fromEntries(Object.entries(eq).reverse())).row.slotRoutes,kit.row.slotRoutes);
   if(!cycle)continue;
   const on=await prepare(kit);
   const mode=[31,123,124,125,126,127,128].includes(weapon)?'grip':[17,122].includes(weapon)?'orb':'open';
   for(let f=0;f<8;f++){
    const a=before.draw(f),b=on.draw(f),plate=kit.row.fittedCoatPlate,west=direction==='west';
    const fabric=id=>load('tools/rework-combat-wardrobe/assets/'+id+'.png');
    const cloth=stamp(await fabric(library.sleeves.items[item][mode][f]),west);
    const hand=stamp(await fabric(plate.masks[f]),west);
    const metal=plate.metal?.[f]?stamp(await load('tools/rework-weapon-layers-hd/assets/'+plate.metal[f]+'.png'),false):null;
    let changed=0,exact=0,lowerTorso=0;
    for(let i=0;i<a.length;i++){
     const contacted=(hand[i]>>>24)===255||(metal?.[i]>>>24)===255,alpha=cloth[i]>>>24;
     if(a[i]!==b[i]){assert(i>=205*640&&alpha&&!contacted,[weapon,item,f,i,'outside garment']);changed++;if(b[i]===cloth[i])exact++;}
     // Every fully opaque fabric pixel below the helmet, clear of both contacts, must reach the map canvas.
     if(i>=305*640&&alpha===255&&!hand[i]&&!metal?.[i]){assert.equal(b[i],cloth[i],[weapon,item,f,i,'missing weave']);lowerTorso++;}
    }
    assert(lowerTorso>0&&exact>=lowerTorso&&changed>=exact,[weapon,item,f,lowerTorso,exact,changed]);counts.drawn++;
    report.push({weapon,item,direction,phase:f,exact,changed});
   }on.release();
  }before?.release();global.gc?.();
 }
 assert.deepEqual(counts,{selected:132,drawn:240});console.log(JSON.stringify(counts));
 if(process.env.HD_SLEEVE_RESULTS)fs.writeFileSync(process.env.HD_SLEEVE_RESULTS,JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
