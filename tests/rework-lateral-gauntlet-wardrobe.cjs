'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,slots,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const rgba=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{
 const weapon=Number(process.argv[4]||110);assert([2,3,110,111,112,118,119].includes(weapon));
 const mechanical=weapon===119,fitted=[111,112,118,119].includes(weapon),bucket='tools/rework-weapon-layers-hd/';
 const aliases=new Map(),armImages=new Map(),armKeys=[],api=make({loadImage:url=>armImages.get(url)||load(aliases.get(url)||url)});
 await api.ready;await api.warmSwordCheckpoint();
 const direction=process.argv[2];assert(['east','west'].includes(direction));
 const skin=process.argv[3]||'ebony',lookData={gender:'masculino',skinColor:skin,hairColor:skin==='light'?'white':'blue',eyeColor:skin==='light'?'amber':'green',hairStyle:'original',eyeStyle:'original'};
 const body=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},lookData,()=>true);
 const opts={action:'attack-unarmed',direction,consumer:'world'};
 const index=require(path.join(root,bucket,'index.json'));
 const metal119=["f29908a3298269aa27bd592e1b0770c29f803c7662ef92402739b0ef68edffce","eca7901c398636e4bbd7d5e941ab91cdcc367bc15d9f088f51273df9295b13dd","88f0f7098ac815a592641bb69d12df87ce704509e016b4440d670349fb4b8a01","5f5a724956ad34888551198b9abba548730744b965dc79b577838ff88c59a38a","fe2a21451b49097e72829ce2250db4e60ff7548a3339eafde07ce4dd85a310dc","8154417e082ba5b828e44fa07d9bf6276e34701ef574a8d4b92dade770abde42","82fbe9cec557f80b93dce0e899341b69a6e6e976107f61afd445311879badac6","2cc2f8996d8be32fc7ca899eb28125cad44f5c06db49998cdb19e6541bcb0755"];
 const rig=mechanical?{coats:{},weapons:{119:metal119.map(h=>({url:'assets/'+h+'.png',mirrorX:direction==='west'}))}}:fitted&&index.separableAttackRigs.find(r=>r.rig===(weapon===118?'male-punch-native-right-cuff':'male-authored-gauntlet'+weapon+'-eight')).directions[direction];
 // Build an independent reference from the unarmed wardrobe, the authored
 // physical head translation and the original cuff/sleeve archive.
 function reference(r,kit){
  const d=r.pack.directions[direction],track=rig.coats[kit.coat];
  const poses=d.poses.map(p=>({...p,NECK:{...p.NECK,y:p.NECK.y+0.5},NOSE:{...p.NOSE,y:p.NOSE.y+0.5}}));
  const layers=d.layers.map(l=>armKeys.length&&l.id==='skin-arms-phase'?{...l,source:armKeys[0],frames:armKeys}:l);
  if(track){
   const frames=track.map(l=>{
    assert(!l.occludedBy&&!l.offset&&!l.mask);
    const key='oracle-sleeve-'+l.sha256;aliases.set('tools/rework-base-hd/assets/'+key+'.png',bucket+l.url);return key;
   });
   layers.push({id:'reference-sleeve',source:frames[0],frames,slot:'body',depth:6,binding:{kind:'fixed'}});
  }
  const pack={...r.pack,directions:{[direction]:{...d,poses,layers}}};
  return {...r,pack,id:r.id+'-reference-'+(kit.coat??'bare'),...(r.nativeSlotPack?{nativeSlotPack:{...r.nativeSlotPack,mounted:{...r.nativeSlotPack.mounted,pack}}}:{})};
 }
 async function prepare(equipment,transform){
  const p={...body,equipment:Object.fromEntries(Object.entries(equipment).map(([s,def])=>[s,{def}]))};
  const selected=world.selectWorldHDOnly(api,catalog,p,opts);assert(!selected.omitted?.length);const r=transform?transform(selected):selected;
  for(const [slot,id] of Object.entries(equipment)){
   const actual=r.slotRoutes?.[slot]?.item??(slot==='weapon'?r.item:undefined);assert.equal(actual,id);
  }
  const b=await api.prepareConfiguration([{player:p,options:opts}],{resolve:()=>({player:p,source:r,options:opts})});
  assert.deepEqual(b.coverage[0].omitted,[]);
  return {r,draw(frame){let c;assert(b.draw({save(){},restore(){},drawImage(x){c=x}},p,{...opts,progress:(frame+.25)/(r.timeline?.length||8)}));return c;},release:()=>b.release()};
 }
 let bare=await prepare({},fitted?r=>reference(r,{}):null);const stock=await prepare({weapon}),frames=[],results=[];
 const anatomy=fitted&&!mechanical?await prepare({weapon},r=>({...r,id:r.id+':oracle-anatomy',states:r.states.map(s=>({...s,layers:s.layers.slice(0,1)}))})):null;
 if(weapon===111){
  // Discover every changed coverage sample by comparing the complete signed
  // body to the unarmed export; resolve the replacement from the original PNG.
  const keys=bare.r.pack.directions[direction].layers.find(l=>l.id==='skin-arms-phase').frames;
  for(let i=0;i<8;i++){
   const ref=rgba(bare.draw(i)),signed=rgba(anatomy.draw(i)),tile=cv.createCanvas(640,640),cx=tile.getContext('2d');
   cx.drawImage(await load(bucket+rig.base[i].url),0,0);const source=cx.getImageData(0,0,640,640);
   cx.clearRect(0,0,640,640);cx.drawImage(await load('tools/rework-base-hd/assets/'+keys[i]+'.png'),0,0);
   const arm=cx.getImageData(0,0,640,640),data=new Uint32Array(arm.data.buffer),native=new Uint32Array(source.data.buffer);
   let changed=0;
   for(let pos=0;pos<ref.length;pos++)if(ref[pos]>>>24!==signed[pos]>>>24){
    assert.equal(ref[pos]>>>24,data[pos]>>>24,'source arm owns change');
    assert.equal(native[pos]>>>24,signed[pos]>>>24,'native palette preserves coverage');
    data[pos]=native[pos];changed++;
   }
   assert.equal(changed,[0,584,586,617,0,613,590,0][i]);
   cx.putImageData(arm,0,0);const key='reference-arm-'+i;armImages.set('tools/rework-base-hd/assets/'+key+'.png',tile);armKeys.push(key);
  }
  bare.release();bare=await prepare({},r=>reference(r,{}));
 }
 const sleeves=new Map();
 if(anatomy)for(const [id,track] of Object.entries(rig.coats)){
  const model=await prepare({},r=>reference(r,{coat:Number(id)}));
  const originals=await Promise.all(track.map(l=>load(bucket+l.url)));sleeves.set(Number(id),{model,originals});
 }
 for(let phase=0;phase<8;phase++){
  const l=fitted?rig.weapons[weapon][phase]:stock.r.states[phase].layers.find(l=>l.component==='equipment');
  let im=await load(bucket+l.url);
  function armed(c,coat){
   const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');ctx.drawImage(c,0,0);
   const socket=fitted&&rig.coats[coat]?.[phase].socket;
   const offset=socket?socket.position.map((v,j)=>v-l.attachment.anchor[j]):l.attachment?.fallbackOffset||[0,0];
   ctx.save();if(l.mirrorX){ctx.translate(640,0);ctx.scale(-1,1);}ctx.drawImage(im,...offset);ctx.restore();
   const data=rgba(tile);tile.width=1;return data;
  }
  if(mechanical){
   // Discover the subpixel contact directly in the approved atomic image.
   const old=armed(bare.draw(phase)),target=rgba(stock.draw(phase));
   const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');ctx.drawImage(im,0,0);let patched=0;
   for(let k=0;k<old.length;k++)if(old[k]>>>24!==target[k]>>>24){
    assert.equal(old[k],0);assert([2,3].includes(target[k]>>>24));
    const x=k%640,y=Math.floor(k/640),dot=ctx.createImageData(1,1);
    new Uint32Array(dot.data.buffer)[0]=target[k];ctx.putImageData(dot,l.mirrorX?639-x:x,y);patched++;
   }
   assert.equal(patched,[1,0,0,0,1,0,0,1][phase]);im=tile;
  }
  const prediction=anatomy?rgba(bare.draw(phase)):armed(bare.draw(phase));
  const original=rgba((anatomy||stock).draw(phase)),edges=[];
  for(let k=0;k<prediction.length;k++)if(prediction[k]!==original[k]){
   assert.equal(prediction[k]>>>24,original[k]>>>24,'original and modular silhouettes');edges.push(k);
  }
  const sleeveColors=new Map();
  for(const [id,{model,originals}] of sleeves){
   const ctx=cv.createCanvas(640,640).getContext('2d');ctx.drawImage(anatomy.draw(phase),0,0);ctx.drawImage(originals[phase],0,0);
   const from=rgba(model.draw(phase)),to=rgba(ctx.canvas),pixels=[];
   for(let k=0;k<from.length;k++)if(from[k]!==to[k]){assert.equal(from[k]>>>24,to[k]>>>24);pixels.push(k,from[k],to[k]);}
   sleeveColors.set(id,pixels);ctx.canvas.width=1;
  }
  function expected(outfit,coat){
   if(!anatomy){
    const px=armed(outfit);for(const k of edges)if(px[k]===prediction[k])px[k]=original[k];return px;
   }
   const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');ctx.drawImage(outfit,0,0);
   const im=ctx.getImageData(0,0,640,640),px=new Uint32Array(im.data.buffer);
   const samples=sleeveColors.get(coat);
   if(samples){for(let j=0;j<samples.length;j+=3){const k=samples[j];if(px[k]===samples[j+1])px[k]=samples[j+2];}}
   else for(const k of edges)if(px[k]===prediction[k])px[k]=original[k];
   ctx.putImageData(im,0,0);const out=armed(tile,coat);tile.width=1;return out;
  }
  frames.push({expected,stock:rgba(stock.draw(phase))});
 }
 const scenarios=gear.flatMap((ids,index)=>ids.map(id=>({[slots[index]]:id})));
 for(let i=0;i<10;i++)scenarios.push(Object.fromEntries(slots.map((slot,j)=>[slot,gear[j][(i+j)%10]])));
 let completed=0;
 for(const kit of scenarios){
  const referenceKit={...kit};if(fitted&&rig.coats[kit.coat])delete referenceKit.coat;
  const outfit=await prepare(referenceKit,fitted?r=>reference(r,kit):null),armed=await prepare({...kit,weapon});
  try{for(let phase=0;phase<8;phase++){
   const {stock:original}=frames[phase],expected=frames[phase].expected(outfit.draw(phase),kit.coat),actual=rgba(armed.draw(phase));
   let changed=0,bad=0;for(let i=0;i<actual.length;i++){if(actual[i]!==original[i])changed++;if(actual[i]!==expected[i])bad++;}
   assert.equal(bad,0,[direction,skin,JSON.stringify(kit),phase,'unexpected pixels'].join('/'));
   results.push({kit,phase,changed});
  }
  assert(results.slice(-8).some(x=>x.changed>0),'outfit never drawn '+JSON.stringify(kit));completed++;
  }finally{outfit.release();armed.release();}
  if(completed%10===0){console.log(direction,skin,completed);global.gc?.();}
 }
 assert.equal(results.length,480);bare.release();stock.release();anatomy?.release();for(const {model} of sleeves.values())model.release();
 if(weapon===118&&direction==='east'){
  const url=bucket+rig.coats[151][2].url;
  let fail=true;
  const fault=make({loadImage:p=>{if(fail&&p===url)throw Error('simulated missing sleeve');return load(p);}});
  await fault.ready;await fault.warmSwordCheckpoint();
  const player={...body,equipment:{weapon:{def:118},coat:{def:151},gloves:{def:152},boots:{def:148}}};
  const source=world.selectWorldHDOnly(fault,catalog,player,opts);
  for(const expected of [['coat'],[]]){
   const bundle=await fault.prepareConfiguration([{player,options:opts}],{resolve:()=>({player,source,options:opts})});
   try{
    const cover=bundle.coverage[0];assert.deepEqual(cover.omitted,expected);assert.equal(cover.slotRoutes.weapon.item,118);
    for(const [slot,id] of [['gloves',152],['boots',148]]){assert.equal(cover.slotRoutes[slot].item,id);assert.equal(cover.slotRoutes[slot].quality,'hd');}
    if(fail)assert.equal(cover.slotResolution.coat.state,'load-failed');
    else assert.equal(cover.slotRoutes.coat.item,151);
    assert(bundle.draw(cv.createCanvas(640,640).getContext('2d'),player,{...opts,progress:.5}));
   }finally{bundle.release();}
   fail=false;
  }
 }
 if(process.env.HD_GAUNTLET_RESULTS)fs.writeFileSync(process.env.HD_GAUNTLET_RESULTS,JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
