'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,slots}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const rgba=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const weapon=Number(process.argv[4]||110);assert([2,3,110].includes(weapon));
 const direction=process.argv[2];assert(['east','west'].includes(direction));
 const skin=process.argv[3]||'ebony',lookData={gender:'masculino',skinColor:skin,hairColor:skin==='light'?'white':'blue',eyeColor:skin==='light'?'amber':'green',hairStyle:'original',eyeStyle:'original'};
 const body=look.commit({classId:'brawler',equipment:{}},lookData,()=>true);
 const opts={action:'attack-unarmed',direction,consumer:'world'};
 async function prepare(equipment){
  const p={...body,equipment:Object.fromEntries(Object.entries(equipment).map(([s,def])=>[s,{def}]))};
  const r=world.selectWorldHDOnly(api,catalog,p,opts);assert(!r.omitted?.length);
  for(const [slot,id] of Object.entries(equipment)){
   const actual=r.slotRoutes?.[slot]?.item??(slot==='weapon'?r.item:undefined);assert.equal(actual,id);
  }
  const b=await api.prepareConfiguration([{player:p,options:opts}],{resolve:()=>({player:p,source:r,options:opts})});
  assert.deepEqual(b.coverage[0].omitted,[]);
  return {r,draw(frame){let c;assert(b.draw({save(){},restore(){},drawImage(x){c=x}},p,{...opts,progress:(frame+.25)/8}));return c;},release:()=>b.release()};
 }
 const bare=await prepare({}),stock=await prepare({weapon}),frames=[],results=[];
 // Capture native references once. For every other slot the expected
 // foreground is the same isolated metal from this weapon's own archive.
 for(let phase=0;phase<8;phase++){
  const l=stock.r.states[phase].layers.find(l=>l.component==='equipment');
  const im=await load('tools/rework-weapon-layers-hd/'+l.url);
  function armed(c){
   const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');ctx.drawImage(c,0,0);
   ctx.save();if(l.mirrorX){ctx.translate(640,0);ctx.scale(-1,1);}ctx.drawImage(im,0,0);ctx.restore();
   const data=rgba(tile);tile.width=1;return data;
  }
  const reference=armed(bare.draw(phase)),original=rgba(stock.draw(phase)),edges=[];
  for(let k=0;k<reference.length;k++)if(reference[k]!==original[k]){
   assert.equal(reference[k]>>>24,original[k]>>>24,'original and modular silhouettes');edges.push(k);
  }
  frames.push({armed,reference,original,edges});
 }
 const scenarios=gear.flatMap((ids,index)=>ids.map(id=>({[slots[index]]:id})));
 for(let i=0;i<10;i++)scenarios.push(Object.fromEntries(slots.map((slot,j)=>[slot,gear[j][(i+j)%10]])));
 let completed=0;
 for(const kit of scenarios){
  const outfit=await prepare(kit),armed=await prepare({...kit,weapon});
  try{for(let phase=0;phase<8;phase++){
   const {armed:overlay,reference,original,edges}=frames[phase],expected=overlay(outfit.draw(phase)),actual=rgba(armed.draw(phase));
   for(const p of edges)if(expected[p]===reference[p])expected[p]=original[p];
   let changed=0,bad=0;for(let i=0;i<actual.length;i++){if(actual[i]!==original[i])changed++;if(actual[i]!==expected[i])bad++;}
   assert.equal(bad,0,[direction,skin,JSON.stringify(kit),phase,'unexpected pixels'].join('/'));
   results.push({kit,phase,changed});
  }
  assert(results.slice(-8).some(x=>x.changed>0),'outfit never drawn '+JSON.stringify(kit));completed++;
  }finally{outfit.release();armed.release();}
  if(completed%10===0){console.log(direction,skin,completed);global.gc?.();}
 }
 assert.equal(results.length,480);bare.release();stock.release();
 if(process.env.HD_GAUNTLET_RESULTS)fs.writeFileSync(process.env.HD_GAUNTLET_RESULTS,JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
