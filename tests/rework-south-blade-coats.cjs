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
 const list=weapons.filter(w=>['rogue','sword'].includes(w.role)),slot='coat',items=gear[0];
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
  const fixed={weapon:id,head:19,legs:168,boots:148,gloves:25},base=select(fixed),before=[],draw=[0,1,69,73].includes(id);
  if(draw){const b=await bundle(base);try{for(let i=0;i<9;i++)before.push(read(b.draw(i)));}finally{b.close();}}
  for(const item of items){
   const single=select({weapon:id,coat:item}),pair=select({...fixed,coat:item}),r=pair.r;
   assert.deepEqual(single.r.slotRoutes.coat,r.slotRoutes.coat);
   for(const k of Object.keys(fixed))assert.deepEqual(base.r.slotRoutes[k],r.slotRoutes[k]);
   const group=banks.southBladeCoats.rigs[role==='rogue'?'daggers':'sword'],mat=banks.southBladeCoats.sources[item];
   const stamp=r.southBladeGloves.base.southBladeCoat;assert(stamp);assert.deepEqual(stamp.frames,group.items[item]);
   assert.equal(r.slotRoutes.coat.source,mat.record+'/'+mat.materials[0]+'@'+(role==='rogue'?'daggers':'sword')+'-south');
   selected++;if(!draw)continue;
   const b=await bundle(pair);try{for(let i=0;i<9;i++){
    const c=b.draw(i),worn=read(c),old=before[i],pad=(c.width-640)/2,ink=cv.createCanvas(640,640),a=ink.getContext('2d'),reg=stamp.frames[i];
    const front=await load('tools/rework-combat-wardrobe/assets/'+reg.front+'.png');a.drawImage(front,0,0);const face=read(ink);
    if(reg.rear)a.drawImage(await load('tools/rework-combat-wardrobe/assets/'+reg.rear+'.png'),0,0);const support=read(ink);
    a.clearRect(0,0,640,640);a.drawImage(await load('tools/rework-combat-wardrobe/assets/'+r.southBladeGloves.frames[i]+'.png'),0,0);const glove=read(ink);
    const layers=await Promise.all(stamp.cover[i].map(u=>load('tools/rework-weapon-layers-hd/'+u)));a.clearRect(0,0,640,640);a.drawImage(layers[0],-pad,-pad);a.globalCompositeOperation='destination-out';a.drawImage(layers[1],-pad,-pad);const metal=read(ink);
    let changed=0,own=0;
    for(let j=0;j<worn.length;j++){
     const x=j%c.width-pad,y=Math.floor(j/c.width)-pad,k=y*640+x;
     if(worn[j]!==old[j]){
      assert(x>=0&&x<640&&y>=0&&y<640&&(support[k]>>>24)&&((metal[k]>>>24)!==255||(old[j]>>>24)<255),[id,item,i,x,y,'outside coat'].join('/'));changed++;
     }
     if(x>=0&&x<640&&y>=0&&y<640&&(face[k]>>>24)===255&&!(metal[k]>>>24)&&!(glove[k]>>>24)){
      if(worn[j]!==face[k])assert.fail([id,item,i,x,y,'coat material'].join('/'));own++;
     }
    }
    assert(changed>300&&own>100,[id,item,i,changed,own].join('/'));frames++;ink.width=1;
   }}finally{b.close();}
  }
  assert.equal(saved,JSON.stringify(p.appearance96));
 }
 assert.equal(selected,120);assert.equal(frames,360);console.log(JSON.stringify({selected,frames}));
})().catch(e=>{console.error(e);process.exitCode=1;});
