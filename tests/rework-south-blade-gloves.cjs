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
 const list=weapons.filter(w=>['rogue','sword'].includes(w.role)),slot='gloves',items=gear[3];
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
  const fixed={weapon:id,head:19},base=select(fixed),before=[],visible=[0,1,69,73].includes(id);
  if(visible){const b=await bundle(base);try{for(let n=0;n<9;n++)before.push(read(b.draw(n)));}finally{b.close();}}
  for(const item of items){
   const own=select({weapon:id,gloves:item}),pair=select({...fixed,gloves:item}),r=pair.r;
   assert.deepEqual(own.r.slotRoutes.gloves,r.slotRoutes.gloves);assert.deepEqual(base.r.slotRoutes.head,r.slotRoutes.head);
   const reg=banks.southBladeGloves,group=reg.rigs[role==='rogue'?'daggers':'sword'],mat=reg.sources[item];
   assert.equal(r.slotRoutes.gloves.item,item);assert.equal(r.slotRoutes.gloves.source,mat.record+'/'+mat.material+'@'+(role==='rogue'?'daggers':'sword')+'-south');
   const {frames:track,cover}=r.southBladeGloves;
   assert.deepEqual(track,reg.bindings[id].map(k=>group.contacts[k][item]));assert.equal(track.length,9);selected++;
   if(!visible)continue;
   const b=await bundle(pair);try{for(let n=0;n<9;n++){
    const c=b.draw(n),after=read(c),old=before[n],pad=(c.width-640)/2,plate=cv.createCanvas(640,640),ctx=plate.getContext('2d');
    ctx.drawImage(await load('tools/rework-combat-wardrobe/assets/'+track[n]+'.png'),0,0);const fabric=read(plate);
    ctx.clearRect(0,0,640,640);const [weapon,front]=await Promise.all(cover[n].map(k=>load('tools/rework-weapon-layers-hd/'+k)));
    ctx.drawImage(weapon,-pad,-pad);ctx.globalCompositeOperation='destination-out';ctx.drawImage(front,-pad,-pad);const metal=read(plate);
    const stamp=cv.createCanvas(640,640),sc=stamp.getContext('2d');sc.drawImage(await load('tools/rework-combat-wardrobe/assets/'+track[n]+'.png'),0,0);sc.globalCompositeOperation='destination-out';sc.drawImage(plate,0,0);
    const ref=cv.createCanvas(c.width,c.height),rc=ref.getContext('2d'),im=rc.createImageData(c.width,c.height);new Uint32Array(im.data.buffer).set(old);rc.putImageData(im,0,0);rc.drawImage(stamp,pad,pad);const expected=read(ref);
    let clear=0,change=0,metalOnly=0;
    for(let j=0;j<after.length;j++){
     const x=j%c.width-pad,y=Math.floor(j/c.width)-pad,i=y*640+x,valid=x>=0&&y>=0&&x<640&&y<640;
     if(after[j]!==old[j]){assert(valid&&(fabric[i]>>>24)>0&&(metal[i]>>>24)<255,[id,item,n,x,y,'outside visible glove'].join('/'));change++;}
     if(valid&&(fabric[i]>>>24)>100&&!(metal[i]>>>24)){clear++;}
     if(after[j]!==expected[j])assert.fail([id,item,n,x,y,'owned glove composite'].join('/'));
     if(valid&&(fabric[i]>>>24)>0&&(metal[i]>>>24)===255){assert.equal(after[j],old[j]);metalOnly++;}
    }
    assert(change>60&&clear>20,[id,item,n,change,clear].join('/'));frames++;plate.width=stamp.width=ref.width=1;
   }}finally{b.close();}
  }
  assert.equal(saved,JSON.stringify(p.appearance96));
 }
 assert.equal(selected,120);assert.equal(frames,360);console.log(JSON.stringify({selected,frames}));
})().catch(e=>{console.error(e);process.exitCode=1;});
