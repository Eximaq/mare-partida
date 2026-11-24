'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT,project=path.join(__dirname,'..');
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n));global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require(path.join(project,'tests/rework-integration-support.cjs'));
const {weapons}=require(path.join(project,'tools/audit-hd-wardrobe-product.cjs')),load=require(path.join(project,'tools/rework-hd-test-loader.cjs')).create(root);
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height),packed=data=>new Uint32Array(data.data.buffer);
async function check(api,weapon,direction){
 const equipment={coat:{def:6},legs:{def:22},boots:{def:148},gloves:{def:159},head:{def:18}},gun={weapon:{def:weapon}};
 const actor=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const o={action:'attack-unarmed',direction,consumer:'world'};
 async function prepare(eq,source){
  const p={...actor,equipment:eq},r=source||world.selectWorldHDOnly(api,catalog,p,o);
  assert(r&&!r.omitted?.length&&!r.visualDegraded&&!r.appearanceAdapted);
  const b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
  return {r,b,draw(t){let im;assert(b.draw({save(){},restore(){},drawImage(c){im=c;}},p,{...o,progress:(t+.25)/(r.timeline?.length||8)}));return im;}};
 }
 const bare=await prepare({}),original=await prepare(gun),shirt=await prepare(equipment),armed=await prepare({...equipment,...gun});
 const grip=armed.r.wardrobeGrip;assert(grip);for(const [slot,v] of Object.entries({...equipment,...gun}))assert.equal(armed.r.slotRoutes[slot].item,v.def);
 assert.deepEqual(armed.r.timeline,original.r.timeline);assert.equal(armed.r.fps,original.r.fps);
 const unworn=await prepare(gun,{...armed.r,id:armed.r.id+':bare-contact-proof',gearOnlyRecord:null,headRecord:null,nativeSlotPack:null,wardrobeGrip:{...grip,dressed:bare.r}});
 const assets=new Map(),art=async ref=>{if(!assets.has(ref))assets.set(ref,await load('tools/rework-weapon-layers-hd/'+ref));return assets.get(ref);};
 const n=original.r.timeline.length,px=(c,w,pad=0)=>{const dst=cv.createCanvas(w,w);dst.getContext('2d').drawImage(c,pad,pad);const data=packed(rgba(dst));dst.width=1;return data;};
 try{for(let tick=0;tick<n;tick++){
  const phase=Number(original.r.timeline[tick]),stock=original.draw(tick),current=armed.draw(tick),size=stock.width;
  assert.deepEqual(Buffer.from(rgba(stock).data),Buffer.from(rgba(unworn.draw(tick)).data),[weapon,direction,phase,'naked contact'].join('/'));
  const layer=original.r.states[phase].layers[0],pad=(size-640)/2,coat=shirt.draw(phase),nude=bare.draw(phase);
  const old=px(nude,size,pad),dressed=px(coat,size,pad),real=packed(rgba(stock)),out=packed(rgba(current)),stage=cv.createCanvas(size,size),x=stage.getContext('2d');
  const distal=original.r.w2NorthOwnAttack?.[phase]||original.r.w3NorthOwnAttack?.[phase];
  if(distal){
   if(layer){x.drawImage(await art(distal.gear),pad,pad);x.drawImage(await art(distal.cut),pad,pad);}
   const support=packed(rgba(stage));let seen=0;
   for(let i=0;i<out.length;i++)if(out[i]!==dressed[i]){assert(support[i],[weapon,direction,phase,'outside distal contact'].join('/'));seen++;}
   if(layer)assert(seen>0);
  }else{
   const own=layer.ownGauntlet112Gear||[layer.ownArm117Gear||layer.ownCannon15Gear||layer];
   x.drawImage(coat,0,0);for(const g of own)x.drawImage(await art(g.url),0,0);
   if(layer.ownCannon15Restore){
    x.save();x.beginPath();layer.ownCannon15Restore.forEach(([u,v],i)=>i?x.lineTo(u,v):x.moveTo(u,v));x.closePath();x.clip();x.drawImage(coat,0,0);x.restore();
   }
   const predicted=packed(rgba(stage));let coverage=null;
   if(layer.mask){x.clearRect(0,0,size,size);x.drawImage(await art(layer.mask.url),0,0);coverage=rgba(stage).data;}
   let fabricSamples=0;
   for(let i=0;i<out.length;i++){
    let want=predicted[i];
    if(coverage&&!coverage[4*i])want=dressed[i];
    else if(dressed[i]===old[i])want=real[i];
    else if(predicted[i]!==dressed[i])fabricSamples++;
    if(out[i]!==want)assert.fail([weapon,direction,phase,i,'metal/garment mismatch'].join('/'));
   }
   if(!coverage)assert(fabricSamples>0);
  }
  stage.width=stage.height=1;
 }}finally{for(const v of [bare,original,shirt,armed,unworn])v.b.release();}
 return n;
}
(async()=>{const api=make();await api.ready;await api.warmSwordCheckpoint();let ticks=0;
 for(const [w,d] of [[2,'north'],[3,'north'],[15,'south'],[109,'south'],[112,'south'],[117,'east'],[117,'west'],[117,'south']]){
  const n=await check(api,w,d);ticks+=n;console.log(w,d,n);global.gc?.();}
 assert.equal(ticks,104);console.log('PASS',ticks,'weapon ticks and complete wardrobe');})().catch(e=>{console.error(e);process.exitCode=1;});