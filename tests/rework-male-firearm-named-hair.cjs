'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'));
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),looks=require(path.join(root,'character-appearance.js')),catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const apiHead=global.MareReworkHead.create(require(path.join(root,'tools/rework-accessories/head-layer-index.json')),{appearanceAPI:global.MareAppearance96,makeCanvas:cv.createCanvas});
const loadImage=require('../tools/rework-hd-test-loader.cjs').create(root);
const choicesDir=['south','north','east','west'];
const readPixels=canvas=>new Uint32Array(canvas.getContext('2d').getImageData(0,0,640,640).data.buffer);

async function verifyUnavailableHelmet(api){
 const pose={action:'attack-firearm',direction:'east',consumer:'world'};
 const actor=looks.commit({classId:'gunner',equipment:{weapon:{def:4},coat:{def:130},head:{def:19}}},
  {gender:'masculino',skinColor:'light',hairColor:'blue',eyeColor:'green',hairStyle:'hair-cropped',eyeStyle:'original'},()=>true);
 const select=(renderer,p)=>world.selectWorldHDOnly(renderer,catalog,p,pose);
 const head=select(api,actor).namedFirearmHead.h;
 const source=(head.separateGear?.gear||head.named.ownHelmet.gear).source,missing='tools/rework-accessories/assets/'+source+'.png';
 const offline=make({loadImage:file=>{if(file===missing)throw Error('Artificial missing helmet');return loadImage(file);}});
 await offline.ready;
 async function draw(renderer,p){
  const cfg=await renderer.prepareConfiguration([{player:p,options:pose}],{resolve:()=>({source:select(renderer,p),player:p,options:pose})});
  try{let pixels;assert(cfg.draw({save(){},restore(){},drawImage(tile){pixels=Buffer.from(readPixels(tile).buffer);}},p,pose));
   return {coverage:cfg.coverage[0],pixels};
  }finally{cfg.release();}
 }
 const rendered=await draw(offline,actor),bare=await draw(api,{...actor,equipment:{weapon:actor.equipment.weapon,coat:actor.equipment.coat}});
 assert.deepEqual(rendered.coverage.omitted,['head']);assert.equal(rendered.coverage.slotRoutes.head.quality,'missing');
 assert.deepEqual(rendered.coverage.slotRoutes.coat,bare.coverage.slotRoutes.coat);
 assert.equal(Buffer.compare(rendered.pixels,bare.pixels),0,'Only the missing helmet may disappear');
}
(async()=>{
 const api=make();await api.ready;await verifyUnavailableHelmet(api);
 const guns=catalog.items.filter(w=>w.category===catalog.classes.gunner).map(w=>w.itemId);
 assert.equal(guns.length,6);
 const totals={poses:0,samples:0,transparentHairChecks:0,sourcePixels:0};
 for(const gun of guns)for(const direction of choicesDir){
  for(const mode of ['cropped','spiky']){
   const full=mode==='cropped',equipment={weapon:gun,coat:full?130:151,...(full?{legs:168,boots:148,gloves:152,head:[129,18,19][guns.indexOf(gun)%3]}:{})};
   const [skinColor,hairColor,eyeColor]=full?['ebony','blue','green']:['light','black','blue'];
   const pose={action:'attack-firearm',direction,consumer:'world'};
   function actor(hairStyle){return looks.commit({classId:'gunner',equipment:Object.fromEntries(Object.entries(equipment).map(([k,def])=>[k,{def}]))},
    {gender:'masculino',skinColor,eyeColor,hairColor,hairStyle,eyeStyle:'original'},()=>true);}
   const p=actor('hair-'+mode),reference=actor('original'),select=player=>world.selectWorldHDOnly(api,catalog,player,pose),r=select(p),control=select(reference);
   assert(r?.namedFirearmHead,[gun,direction,mode,'receiver'].join('/'));
   assert.deepEqual(r.omitted||[],[]);assert.equal(r.action,pose.action);assert.equal(r.direction,direction);
   for(const [s,id] of Object.entries(equipment)){assert.equal(r.slotRoutes[s].item,id);assert.equal(r.slotRoutes[s].quality,'hd');
    if(s!=='head')assert.deepEqual(r.slotRoutes[s],control.slotRoutes[s]);}
   const h=r.namedFirearmHead.h,images=new Map(),record=h.named;
   for(const file of apiHead.requiredFiles(record))images.set(file,await loadImage(file));
   const material=apiHead.composeNative(record,images,{width:160,height:160,targetNeck:h.pack.directions[direction].rest.NECK,
    look:h.look,hairRamp:global.MareAppearance96.hairs[hairColor].ramp});
   if(h.separateGear){
    const gear=h.separateGear,src=gear.sourceRecord,previous=src.entry.pack.directions[direction].headgearPolicy.headAdjustment||{};
    const adjust=src.adjustmentRecord.adjustment,neck=h.pack.directions[direction].rest.NECK,g=cv.createCanvas(640,640),z=g.getContext('2d');
    const art=await loadImage('tools/rework-accessories/assets/'+gear.gear.source+'.png');
    z.drawImage(art,Math.round((neck.x-src.rest.NECK.x+(previous.x||0)+(adjust.gearX||0))*4),Math.round((neck.y-src.rest.NECK.y+(previous.y||0)+(adjust.gearY||0))*4));
    material.head=z.getImageData(0,0,640,640).data;g.width=1;
   }
   if(full&&global.MareHeadgear.resolve({def:equipment.head}).hideHair)material.hair.fill(0);
   const own=cv.createCanvas(640,640),oc=own.getContext('2d'),raw=oc.createImageData(640,640);
   const layer=cv.createCanvas(640,640),lc=layer.getContext('2d');
   for(const slot of ['hair',...(full?['head']:[])]){
    raw.data.set(material[slot]);lc.putImageData(raw,0,0);oc.drawImage(layer,0,0);
   }
   const named=readPixels(own),sample=(layer)=>{oc.clearRect(0,0,640,640);oc.drawImage(layer,0,0);return readPixels(own);};
   const oldHair=sample(await loadImage('tools/rework-base-hd/assets/'+h.hair.source+'.png'));
   const skull=sample(await loadImage('tools/rework-base-hd/assets/'+h.skull.source+'.png'));
   function prepare(player,source){return api.prepareConfiguration([{player,options:pose}],{resolve:()=>({player,options:pose,source})});}
   const c=await prepare(p,r),base=await prepare(reference,control);
   try{assert.equal(c.coverage[0].omitted?.length||0,0);
    const draw=(configuration,actor,t)=>{let raster;assert(configuration.draw({save(){},restore(){},drawImage(tile){raster=readPixels(tile);}},actor,{...pose,progress:(t+.25)/r.timeline.length}));return raster;};
    // The timeline repeats native states. Exercise each authored state at its real timestamp.
    const unique=new Set();for(let t=0;t<r.timeline.length;t++){
     const state=r.timeline[t];if(unique.has(state))continue;unique.add(state);
     const f=r.states.findIndex(s=>s.state===state),frame=h.states?.[f],out=draw(c,p,t),old=draw(base,reference,t);
     const skip=new Uint8Array(640*640);for(const [i,n] of frame?.guard||[])skip.fill(1,i,i+n);
     const dx=frame?.x||0,dy=frame?.y||0;
     const tag=[gun,direction,mode,state].join('/');
     assert.equal(Buffer.compare(Buffer.from(out.buffer,640*300*4),Buffer.from(old.buffer,640*300*4)),0,tag+' changed the body below the head');
     let visible=0,matched=0,missing=0,fringe=0,obsolete=0,materialPixels=0;
     for(let y=50;y<300;y++)for(let x=100;x<550;x++){
      const k=y*640+x,j=k-dy*640-dx;if(skip[k])continue;
      const alpha=named[j]>>>24;
      if(alpha>=250){
       // At most (255 - alpha) levels of any RGB channel can come from the
       // underlying surface, plus native 8-bit premultiplication rounding.
       assert(out[k]>>>24>=alpha-1,tag+' lost material coverage');
       for(const shift of [0,8,16])assert(Math.abs((out[k]>>>shift&255)-(named[j]>>>shift&255))<=257-alpha,tag+' wrong material colour');
       materialPixels++;
      }
      if(material.head[j*4+3]===255||material.hair[j*4+3]===255&&!material.head[j*4+3]){visible++;if(out[k]===named[j])matched++;else missing++;}
      if(!full&&y<184&&oldHair[j]>>>24===255&&!skull[j]&&!named[j]&&old[k]>>>24===255){fringe++;if(out[k]>>>24)obsolete++;}
     }
     assert(materialPixels>500&&visible>0,tag+' insufficient authored material '+materialPixels+'/'+visible);
     assert.equal(missing,0,tag+' mismatching hair/helmet pixels '+missing+'/'+visible);
     assert.equal(obsolete,0,tag+' old hairstyle remained '+obsolete+'/'+fringe);
     totals.sourcePixels+=matched;totals.transparentHairChecks+=fringe;totals.samples++;
    }
    assert.equal(unique.size,r.states.length);totals.poses++;
   }finally{c.release();base.release();own.width=layer.width=1;}
  }
 }
 assert.equal(totals.poses,48);assert.equal(totals.samples,332);assert(totals.transparentHairChecks>10000);
 console.log(JSON.stringify(totals));
})().catch(e=>{console.error(e);process.exitCode=1;});
