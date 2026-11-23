'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {complete,weapons,slots,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json');
const bank=path.join(root,'tools/rework-combat-wardrobe'),sources=JSON.parse(fs.readFileSync(path.join(bank,'index.json'))).maleDaggerCoats;
const digest=a=>createHash('sha256').update(a).digest('hex');
async function test(){
 const api=make();await api.ready;assert(await api.warmSwordCheckpoint());
 const loaded=new Map(),rows=[];
 async function image(hash){
  if(!loaded.has(hash)){
   const bytes=fs.readFileSync(path.join(bank,'assets',hash+'.png'));assert.equal(digest(bytes),hash);
   loaded.set(hash,await cv.loadImage(bytes));
  }
  return loaded.get(hash);
 }
 const daggers=weapons.filter(w=>w.role==='rogue'),coats=gear[slots.indexOf('coat')],directions=['east','west'];
 const orderedIds=ids=>Array.from(ids,Number).sort((a,b)=>a-b);
 assert.equal(daggers.length,6);assert.equal(coats.length,10);
 assert.deepEqual(orderedIds(Object.keys(sources.handMasks)),orderedIds(daggers.map(w=>w.id)));
 assert.deepEqual(orderedIds(Object.keys(sources.coats)),orderedIds(coats));
 for(const w of daggers)for(const direction of directions){
  const options={action:'attack-daggers',direction,consumer:'world'};
  const actor=coat=>look.commit({classId:w.role,equipment:{weapon:{def:w.id},...(coat!=null?{coat:{def:coat}}:{})}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  async function prepare(coat){
   const player=actor(coat),source=world.selectWorldHDOnly(api,catalog,player,options);
   assert(complete(source,coat!=null?[['coat',coat]]:[],w.id,options),[w.id,direction,coat].join('/'));
   const bundle=await api.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source})});
   assert.deepEqual(bundle.coverage[0].omitted||[],[]);assert.equal(bundle.coverage[0].frames,8);
   return {source,bundle,frame(i){
    let frame;assert(bundle.draw({save(){},restore(){},drawImage(im){frame=im;}},player,{...options,progress:(i+.25)/8}));
    return frame;
   }};
  }
  const bare=await prepare(null);
  try{for(const item of coats){
   const cloth=sources.coats[item],on=await prepare(item),diffs=[];
   assert.equal(cloth.length,8);assert.equal(sources.handMasks[w.id].length,8);
   try{for(let i=0;i<8;i++){
    const mask=await image(sources.handMasks[w.id][i]),art=await image(cloth[i]);
    const tile=cv.createCanvas(640,640),tx=tile.getContext('2d');
    tx.drawImage(art,0,0);const own=tx.getImageData(0,0,640,640);
    tx.clearRect(0,0,640,640);tx.drawImage(mask,0,0);
    const keep=tx.getImageData(0,0,640,640).data;
    for(let j=0;j<own.data.length;j+=4)if(j<205*640*4||keep[j+3])own.data[j+3]=0;
    tx.putImageData(own,0,0);
    const expected=cv.createCanvas(640,640),ctx=expected.getContext('2d'),base=bare.frame(i),drawn=on.frame(i);
    ctx.drawImage(base,0,0);
    if(direction==='west'){ctx.translate(640,0);ctx.scale(-1,1);}
    ctx.drawImage(tile,0,0);
    const pixels=c=>c.getContext('2d').getImageData(0,0,640,640).data;
    const wanted=pixels(expected),actual=pixels(drawn),body=pixels(base);
    assert.equal(digest(actual),digest(wanted),[w.id,direction,item,i].join('/'));
    let changed=0;for(let k=0;k<body.length;k+=4)
     if(body[k]!==actual[k]||body[k+1]!==actual[k+1]||body[k+2]!==actual[k+2]||body[k+3]!==actual[k+3])changed++;
    assert(changed>0);diffs.push(changed);tile.width=expected.width=1;
   }
   rows.push({weapon:w.id,direction,item,source:on.source.slotRoutes.coat.source,changedPixels:diffs});
   }finally{on.bundle.release();}
  }}finally{bare.bundle.release();}
 }
 const expectedRoutes=daggers.length*directions.length*coats.length;
 const uniqueRoutes=new Set(rows.map(r=>[r.weapon,r.direction,r.item].join('/')));
 const frames=rows.reduce((total,r)=>total+r.changedPixels.length,0);
 assert.equal(rows.length,expectedRoutes);assert.equal(uniqueRoutes.size,expectedRoutes);
 assert.equal(frames,expectedRoutes*8);
 if(process.env.WARDROBE_EVIDENCE)fs.writeFileSync(process.env.WARDROBE_EVIDENCE,JSON.stringify(rows));
 console.log(JSON.stringify({routes:rows.length,frames,assets:loaded.size}));
}
test().catch(e=>{console.error(e);process.exitCode=1;});
