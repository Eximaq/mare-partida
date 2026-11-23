'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name)),vendor=mod('tools/rework-accessories/vendor.js');
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),cat=mod('tools/paper-doll-96-v3/weapons.json');
const source=mod('tools/rework-combat-wardrobe/index.json').maleSwordCoats, art=id=>load('tools/rework-combat-wardrobe/assets/'+id+'.png');
const create=size=>cv.createCanvas(size,size),px=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const W=640;
async function runWeapon(api,weapon){
 let frames=0;
 for(const direction of ['east','west']){
  const actor=look.commit({classId:'sword',equipment:{weapon:{def:weapon},head:{def:19}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
  const options={consumer:'world',action:'attack-sword',direction};
  async function prepare(p){
   const r=world.selectWorldHDOnly(api,cat,p,options);
   assert(r&&!r.omitted.length&&!r.visualDegraded&&!r.appearanceAdapted);
   const b=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   return {r,b,draw(t){let c;assert(b.draw({save(){},restore(){},drawImage(result){c=result;}},p,{...options,progress:(t+.25)/8}));return c;}};
  }
  const stock=await prepare(actor),r=stock.r,rig=r.basePack.pack,d=rig.directions[direction],maps=new Map();
  const url=s=>new URL(s,'https://game.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1);
  for(const [key,p] of Object.entries(r.basePack.images))maps.set(key,await load(url(p)));
  const fitted=r.ownGauntletHead,head=fitted.gear.sourceRecord;
  const helmet=await load('tools/rework-accessories/assets/'+fitted.gear.gear.source+'.png');
  const adjustment=head.adjustmentRecord.adjustment,prior=head.entry.pack.directions[direction].headgearPolicy.headAdjustment;
  assert.equal(fitted.gear.sourceScale,1);
  const masks=[];
  for(let i=0;i<8;i++){
   const ref=create(W),x=ref.getContext('2d'),pad=r.renderOffsetPhysical[0];
   x.drawImage(stock.draw(i),-pad,-pad);
   const original=px(ref),blk=create(W),bx=blk.getContext('2d'),at=r.states[i].attachment;
   bx.imageSmoothingEnabled=false;bx.save();bx.transform(...at.matrix);
   if(at.mirrorX){bx.translate(at.size[0],0);bx.scale(-1,1);}bx.drawImage(await load(url(at.url)),0,0);bx.restore();
   const front=create(W),fx=front.getContext('2d'),layers=d.layers.filter(l=>l.depth>at.depth&&l.depth<8);
   vendor.compositor.render(fx,{...rig,directions:{[direction]:{...d,layers}}},maps,{direction,frame:i,density:4});
   bx.globalCompositeOperation='destination-out';bx.drawImage(front,0,0);const visibleBlade=px(blk);
   const matte=create(W),mx=matte.getContext('2d');
   if(direction==='west'){mx.translate(W,0);mx.scale(-1,1);}mx.drawImage(await art(source.hands[i]),0,0);const hands=px(matte);
   // The skull, face and equipped helmet are painted above this coat.
   const cover=create(W),top=cover.getContext('2d'),pose=d.poses[i];
   const upper=d.layers.filter(l=>l.depth>8&&(!fitted.hideHair||l.slot!=='hair'));
   vendor.compositor.render(top,{...rig,directions:{[direction]:{...d,layers:upper}}},maps,{direction,frame:i,density:4});
   const offset=(k,delta)=>Math.round(4*(pose.NECK[k]-head.rest.NECK[k]+(prior?.[k]||0)+(delta||0)));
   top.drawImage(helmet,offset('x',adjustment.gearX),offset('y',adjustment.gearY));
   masks.push({background:ref,original,visibleBlade,hands,foreground:px(cover)});cover.width=1;
   for(const c of [blk,front,matte])c.width=1;
  }
  try{for(const item of gear[0]){
   const p={...actor,equipment:{...actor.equipment,coat:{def:item}}},suit=await prepare(p);
   try{
    assert.equal(suit.r.slotRoutes.coat.item,item);assert.deepEqual(suit.r.swordTrack.cloth,source.coats[item]);
    for(const slot of ['weapon','head'])assert.deepEqual(suit.r.slotRoutes[slot],r.slotRoutes[slot]);
    assert.deepEqual(suit.r.states,r.states);assert.deepEqual(suit.r.timeline,r.timeline);
    let cycleContacts=0;
    for(let i=0;i<8;i++){
     const {background,original,visibleBlade,hands,foreground}=masks[i],c=create(W),x=c.getContext('2d');
     x.drawImage(suit.draw(i),-r.renderOffsetPhysical[0],-r.renderOffsetPhysical[1]);const dressed=px(c);
     const tile=await art(source.coats[item][i]);
     const stamp=()=>{x.save();if(direction==='west'){x.translate(W,0);x.scale(-1,1);}x.drawImage(tile,-64,-64);x.restore();};
     x.clearRect(0,0,W,W);stamp();const fabric=px(c);
     x.clearRect(0,0,W,W);x.drawImage(background,0,0);
     stamp();const exactCloth=px(c);
     let changed=0,ownOpaque=0;
     for(let j=0;j<fabric.length;j++){
      if(!fabric[j]||hands[j]||visibleBlade[j]){
       if(dressed[j]!==original[j])throw Error([weapon,direction,item,i,j,'outside the owned cloth'].join('/'));
       if(fabric[j]&&(hands[j]||visibleBlade[j]))cycleContacts++;
      }else{
       if(!foreground[j]){
        if(dressed[j]!==exactCloth[j])throw Error([weapon,direction,item,i,j,'wrong source pixel or blend'].join('/'));
        if((fabric[j]>>>24)===255){assert.equal(dressed[j],fabric[j]);ownOpaque++;}
       }else if((foreground[j]>>>24)===255&&dressed[j]!==original[j]){
        throw Error([weapon,direction,item,i,j,'overpainted foreground'].join('/'));
       }
       if(dressed[j]!==original[j])changed++;
      }
     }
     assert(changed>1000&&ownOpaque>0,[weapon,direction,item,i,changed,ownOpaque].join('/'));
     c.width=1;frames++;
    }
    assert(cycleContacts>20,[weapon,direction,item,'missing physical contact through the full cycle'].join('/'));
   }finally{suit.b.release();}
  }}finally{stock.b.release();for(const {background} of masks)background.width=1;}
 }
 return frames;
}
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const group=weapons.filter(w=>w.role==='sword'),subset=process.argv.slice(2).map(Number);
 const list=subset.length?group.filter(w=>subset.includes(w.id)):group;
 assert.equal(group.length,6);assert.equal(list.length,subset.length||6);
 assert.equal(gear[0].length,10);assert.deepEqual(Object.keys(source.coats).map(Number).sort((a,b)=>a-b),[...gear[0]].sort((a,b)=>a-b));
 let frames=0;for(const {id} of list){frames+=await runWeapon(api,id);console.log('weapon',id,'frames',frames);}
 assert.equal(frames,list.length*2*gear[0].length*8);
})().catch(e=>{console.error(e);process.exitCode=1;});
