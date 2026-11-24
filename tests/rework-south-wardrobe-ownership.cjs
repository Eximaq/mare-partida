'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs');
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 let checks=0;const o={action:'attack-unarmed',direction:'south',consumer:'world'};
 for(const color of [{skinColor:'light',hairColor:'black',eyeColor:'blue'},{skinColor:'ebony',hairColor:'silver',eyeColor:'green'}]){
  const actor=look.commit({classId:'brawler',equipment:{}},{gender:'masculino',hairStyle:'original',eyeStyle:'original',...color},()=>true);
  async function frames(equipment,ownSlot){
   const p={...actor,equipment};let s=world.selectWorldHDOnly(api,catalog,p,o);assert(s&&!s.omitted?.length&&!s.visualDegraded&&!s.appearanceAdapted);
   assert.deepEqual(p.appearance96,actor.appearance96);
   for(const [slot,item] of Object.entries(equipment))assert.equal(s.slotRoutes[slot].item,item.def);
   if(ownSlot){
    const ids=s.slotResolution[ownSlot].layers,group=s.nativeSlotPack,d=group.mounted.pack.directions.south;
    assert(ids.length&&ids.every(id=>d.layers.some(l=>l.id===id)));
    const pack={...group.mounted.pack,directions:{south:{...d,layers:d.layers.filter(l=>ids.includes(l.id))}}};
    s={...s,id:s.id+':source-alpha:'+ownSlot,pack,nativeSlotPack:{...group,mounted:{...group.mounted,pack}}};
   }
   const b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:s})});
   try{
    const result=[];assert.equal(b.coverage[0].frames,8);
    for(let i=0;i<8;i++){let im;assert(b.draw({save(){},restore(){},drawImage(c){im=c;}},p,{...o,progress:(i+.25)/8}));
     result.push(new Uint32Array(im.getContext('2d').getImageData(0,0,im.width,im.height).data.buffer));}
    return result;
   }finally{b.release();}
  }
  const naked=await frames({}),pants=await frames({legs:{def:21}}),pantsMask=await frames({legs:{def:21}},'legs');
  for(const id of [137,144,172]){
   const coat=await frames({coat:{def:id}}),coatMask=await frames({coat:{def:id}},'coat'),set=await frames({legs:{def:21},coat:{def:id}});
   for(let phase=0;phase<8;phase++){
    const a=naked[phase],p=pants[phase],c=coat[phase],mix=set[phase];let lower=0,upper=0;
    assert.equal(a.length,mix.length);
    for(let k=0;k<a.length;k++){
     if((pantsMask[phase][k]>>>24)===0&&a[k]===p[k]){if(c[k]!==mix[k])assert.fail('Pants affect another layer '+[id,phase,k]);}
     else lower++;
     if((coatMask[phase][k]>>>24)===0&&a[k]===c[k]){if(p[k]!==mix[k])assert.fail('Coat affects another layer '+[id,phase,k]);}
     else upper++;
    }
    assert(lower&&upper);checks++;
   }
  }
 }
 assert.equal(checks,48);console.log(JSON.stringify({cycles:6,frames:checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});