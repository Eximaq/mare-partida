'use strict';
const a=require('node:assert/strict'),path=require('node:path'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(path.join(R,f));
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),load=r('tools/rework-hd-test-loader.cjs').create(R),api=make(),outfits=r('tools/rework-modular-outfits-hd/index.json');
const o={consumer:'world',action:'walk',direction:'south'},create=()=>cv.createCanvas(512,512),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
const actor=(look,equip)=>A.commit({classId:'brawler',equipment:Object.fromEntries(Object.entries(equip).map(([k,def])=>[k,{def}]))},{gender:'feminino',...look},()=>true);
const draw=(bundle,p,k)=>{let c;a(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(k+.125)/40}));return px(c);};
const plan=(player,source)=>api.prepareConfiguration([{player,options:o,source}],{resolve:x=>x});
(async()=>{
 await api.ready;
 const gloves=[25,26,138,145,159,166,173],cloths=[{coat:151},{coat:151,legs:168,boots:9}],looks=[{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}];
 let frames=0;
 for(const equipment of cloths)for(const look of looks){
  const p=actor(look,equipment),base=api.selectVisual(p,o),qb=await plan(p,base),s=base.authoredPantsLayer.spec;
  try{for(const glovesID of gloves){
   const withGlove={...equipment,gloves:glovesID},q=actor(look,withGlove),save=JSON.stringify(q),withSrc=api.selectVisual(q,o);
   a(withSrc?.ownSouthGloveCuff,'signed exact South cuff missing '+glovesID);
   a.equal(withSrc.slotRoutes.gloves.item,glovesID);a.deepEqual(withSrc.omitted,[]);a.deepEqual(withSrc.pack,base.pack);
   for(const [k,v] of Object.entries(withGlove))a.equal(withSrc.slotRoutes[k].item,v);
   a.deepEqual(withSrc.colorAppearance,base.colorAppearance);
   a.deepEqual(withSrc.authoredPantsLayer.layers.filter(l=>l.slot!=='gloves'),base.authoredPantsLayer.layers);
   const donor=outfits.records.find(x=>x.id===`frozen-female-glove${glovesID}-south-walk-native-layers`);
   const actualLayer=withSrc.authoredPantsLayer.layers.find(l=>l.slot==='gloves'),source=donor.pack.directions.south.layers.find(l=>l.id===actualLayer.id);
   const qg=await plan(q,withSrc);
   try{for(let k=0;k<40;k++){
    const phase=s.frameToPhase[k];if(s.frameToPhase[k-1]===phase)continue;
    const before=draw(qb,p,k),after=draw(qg,q,k),ref=create(),c=ref.getContext('2d');
    a.equal(actualLayer.frames[phase],source.frames[k]);
    const own=await load('tools/rework-modular-outfits-hd/assets/'+source.frames[k]+'.png');
    c.drawImage(own,0,0);const mask=px(ref),b=c.createImageData(512,512);b.data.set(before);c.putImageData(b,0,0);c.drawImage(own,0,0);
    const expected=px(ref);
    let changes=0;for(let n=0;n<before.length;n+=4){
     if(mask[n+3]){
      a.equal(after.readUInt32LE(n),expected.readUInt32LE(n),'only authored glove source over actual cuff');
      changes+=before.readUInt32LE(n)!==after.readUInt32LE(n);
     }else a.equal(before.readUInt32LE(n),after.readUInt32LE(n),'other slot/appearance changed');
    }
    a(changes>100);frames++;ref.width=1;
   }}finally{qg.release();global.gc?.();}
   a.equal(JSON.stringify(q),save);a.deepEqual(api.selectVisual(p,o),base);
   a(!api.selectVisual(actor(look,{gloves:glovesID}),o)?.ownSouthGloveCuff);
   a(!api.selectVisual(actor(look,{...withGlove,weapon:0}),o)?.ownSouthGloveCuff);
   a(!api.selectVisual(actor(look,{...withGlove,coat:6}),o)?.ownSouthGloveCuff);
   a(!api.selectVisual({...q,equipment:{...q.equipment,gloves:{def:glovesID,variant:'different'}}},o)?.ownSouthGloveCuff);
   console.log('PASS',glovesID,look.skinColor,Object.keys(equipment).join('/'),frames);
  }}finally{qb.release();}
 }
 a.equal(frames,280);
})().catch(e=>{console.error(e);process.exitCode=1;});
