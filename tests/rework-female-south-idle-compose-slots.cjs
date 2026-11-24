'use strict';
const path=require('node:path'),a=require('node:assert/strict');
const R=process.env.STAGE||path.resolve(__dirname,'..'), req=f=>require(path.join(R,f));
const {make,cv}=req('tests/rework-integration-support.cjs'),api=make(),load=req('tools/rework-hd-test-loader.cjs').create(R);
const o={direction:'south',action:'idle',consumer:'world'},px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const draw=async (actor,r)=>{
 const p=await api.prepareConfiguration([{player:actor,options:o,source:r}],{resolve:x=>x});let c;
 try{a(p.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...o,progress:0}));return px(c);}finally{p.release();}
};
(async()=>{
 await api.ready;
 const tones=process.env.TONE?[process.env.TONE]:['light','ebony'];
 for(const tone of tones){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:tone,hairStyle:tone==='ebony'?'hair-bob':'original',hairColor:tone==='ebony'?'pink':'black',eyeColor:tone==='ebony'?'green':'blue',eyeStyle:tone==='ebony'?'face-calm':'original'});
 const me=equipment=>({classId:'brawler',appearance96,equipment}), rec=equipment=>api.selectVisual(me(equipment),o);
 const show=(equipment)=>draw(me(equipment),rec(equipment)),bare=await show({});
 for(const pants of [168,182]){
  const legs={def:pants},solo=rec({legs}), p=await show({legs});
  a.equal(solo.authoredPantsLayer.item,pants);
  for(const boot of [8,9,134,141,148,155,162,169]){
   const boots={def:boot},equipment={boots,legs},save=JSON.stringify(equipment),joint=rec(equipment);
   a.equal(joint?.slotRoutes?.boots?.item,boot,'boot owned pass must survive equipping pants');
   a.equal(joint?.slotRoutes?.legs?.item,pants,'pants owned pass must survive equipping boots');
   a.deepEqual(joint.omitted,[]);
   const alone=await show({boots}), mix=await show(equipment);
   const box=cv.createCanvas(512,512),cx=box.getContext('2d'),item=solo.authoredPantsLayer.spec.items[pants][0];
   const loadP=hash=>load('tools/rework-modular-outfits-hd/assets/'+hash+'.png');
   const alpha=await loadP(item.ownerAlpha);cx.drawImage(alpha,0,0);const owner=px(box);
   cx.clearRect(0,0,512,512);cx.drawImage(await loadP(item.cloth),0,0);
   const owned=cx.getImageData(0,0,512,512);
   for(let i=0;i<owner.length;i+=4){a(owner[i+3]===0||owner[i+3]===255);if(owner[i+3])owned.data.fill(0,i,i+4);}
   cx.putImageData(owned,0,0);
   const ref=cv.createCanvas(512,512),ctx=ref.getContext('2d');
   const setPixels=(c,bytes)=>{const z=c.createImageData(512,512);z.data.set(bytes);c.putImageData(z,0,0);};
   setPixels(ctx,alone);ctx.drawImage(box,0,0);const expected=px(ref);
   a(mix.equals(expected),'signed pants phase must draw over the same exact independent boot/body pixels');
   a.deepEqual(joint.colorAppearance,solo.colorAppearance);
   a.equal(JSON.stringify(equipment),save);
   a.deepEqual(rec({legs}),solo,'removing boots restores original pants route');
   a(!rec({boots:{...boots,variant:'test'},legs})?.id.includes(':own-south-boot:'));
   a(!rec({boots,legs,head:{def:164}})?.id.includes(':own-south-boot:'));
   let diff=0,bchanges=0,pchanges=0;
   for(let i=0;i<mix.length;i+=4){
    const f=bare.readUInt32LE(i),b=alone.readUInt32LE(i),l=p.readUInt32LE(i),m=mix.readUInt32LE(i);
    if(b!==f) bchanges++;if(l!==f)pchanges++;
    if(m!==l)diff++;
   }
   a.deepEqual(joint.pack,solo.pack);
   a(diff>200&&bchanges>200&&pchanges>200,'both item art is visible');
   console.log('PASS',tone,pants,boot,diff,bchanges,pchanges);global.gc?.();
  }
 }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
