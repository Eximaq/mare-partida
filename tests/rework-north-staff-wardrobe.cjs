'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,slots,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const mod=p=>require(path.join(root,p)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),bank=mod('tools/rework-combat-wardrobe/index.json').northStaffWardrobe;
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(h,x,y){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-combat-wardrobe/assets/'+h+'.png'),x,y);
 const r=pixels(c);c.width=1;return r;}
const regions={head:[125,42,493,293],gloves:[175,172,450,406],coat:[170,170,493,545],legs:[160,295,442,550],boots:[160,363,440,555]};
(async()=>{
 const api=make();await api.ready;const counts={individual:0,pairs:0,phases:0,comparisons:0,holdTicks:0},evidence=[];
 const o={consumer:'world',action:'attack-focus',direction:'north'};
 for(const [n,weapon] of [123,124,125,126,127,128].entries()){
  const p=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:n%2?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  const clock=bank.items[weapon].sequence,eq={weapon,coat:[6,7,130,137,144,179][n],legs:gear[1][n],boots:gear[2][n],gloves:gear[3][n],head:gear[4][n]};
  function select(gear){const player={...p,equipment:Object.fromEntries(Object.entries(gear).map(([s,id])=>[s,{def:id}]))},record=world.selectWorldHDOnly(api,catalog,player,o);
   assert.deepEqual(record.omitted||[],[],JSON.stringify(gear));for(const [s,id] of Object.entries(gear)){assert.equal(record.slotRoutes[s].quality,'hd');assert.equal(record.slotRoutes[s].item,id);}
   assert.equal(record.direction,'north');assert.equal(record.action,'attack-focus');assert.deepEqual(record.timeline,clock);return {player,record};}
  async function draw(gear){const {player,record}=select(gear);
   const prepared=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:record})});
   assert.deepEqual(prepared.coverage[0].omitted,[]);const out=[];
   for(let t=0;t<clock.length;t++){let c;assert(prepared.draw({save(){},restore(){},drawImage(image){c=image;}},player,{...o,progress:(t+.1)/clock.length}));
    const f=Number(clock[t]);if(out[f]){assert(Buffer.from(pixels(c).buffer).equals(Buffer.from(out[f].buffer)));}else out[f]=pixels(c);}
   prepared.release();return out;}
  const lone={};for(const [i,slot] of slots.entries())for(const id of gear[i]){lone[id]=select({weapon,[slot]:id}).record.slotRoutes[slot];counts.individual++;}
  for(const coat of gear[0])for(const gloves of gear[3]){const mixed={...eq,coat,gloves},route=select(mixed).record.slotRoutes;
   for(const [s,id] of Object.entries(mixed))if(s!=='weapon')assert.deepEqual(route[s],lone[id],[weapon,s,id]);
   assert.deepEqual(route,select(Object.fromEntries(Object.entries(mixed).reverse())).record.slotRoutes);counts.pairs++;}
  const frames=await draw(eq),bare=await draw({weapon}),row=[];
  for(const slot of slots){const {[slot]:gone,...others}=eq;assert(gone!==undefined);const partial=await draw(others),[x0,y0,x1,y1]=regions[slot];
   for(let f=0;f<9;f++){
    const src=frames[f],other=partial[f];let delta=0;
    for(let j=0;j<src.length;j++)if(src[j]!==other[j]){assert(j%640>=x0&&j%640<x1&&Math.floor(j/640)>=y0&&Math.floor(j/640)<y1,[weapon,slot,f,j]);delta++;}
    assert(delta>(slot==='gloves'?90:210),[weapon,slot,f,delta]);row.push({slot,frame:f,changed:delta});counts.comparisons++;
    if(slot==='head'){
     const track=bank.items[weapon].frames[f];
     const keep=await plane(track.mask,0,0),gl=await plane(track.gloves[eq.gloves],175,172);
     let exact=0;
     // Distal metal is outside the torso and head, with its own native
     // paint. Fingers may legitimately cover the handle.
     for(let j=0;j<src.length;j++)if(j%640>(weapon<126?370:354)&&(keep[j]&0xff0000)&&!gl[j]&&(bare[f][j]>>>24)>246&&other[j]===bare[f][j])exact++;
     assert(exact>185,[weapon,f,exact]);row[row.length-1].nativeMetal=exact;
    }
   }
   global.gc?.();
  }
  counts.phases+=9;counts.holdTicks+=clock.length-9;evidence.push({weapon,equipment:eq,frames:row});global.gc?.();
 }
 assert.deepEqual(counts,{individual:300,pairs:600,phases:54,comparisons:270,holdTicks:6});console.log(JSON.stringify(counts));
 if(process.env.HD_NORTH_STAFF_RESULTS)fs.writeFileSync(process.env.HD_NORTH_STAFF_RESULTS,JSON.stringify(evidence));
})().catch(error=>{console.error(error);process.exitCode=1});
