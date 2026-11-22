'use strict';
const path=require('node:path'),a=require('node:assert/strict');
const R=path.resolve(__dirname,'..'), req=f=>require(path.join(R,f));
const {make,cv}=req('tests/rework-integration-support.cjs'),load=req('tools/rework-hd-test-loader.cjs').create(R),api=make();
const idx=req('tools/rework-modular-outfits-hd/index.json');
const options={direction:'south',action:'idle',consumer:'world'}, walk={...options,action:'walk'},px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const act=(appearance96,equipment={})=>({classId:'brawler',appearance96,equipment});
const draw=async (actor,o,r)=>{
 const p=await api.prepareConfiguration([{player:actor,options:o,source:r}],{resolve:x=>x});let c;a(p.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...o,progress:0}));
 const b=px(c);p.release();return b;
};
(async()=>{
 await api.ready;
 const ids=[8,9,134,141,148,155,162,169];
 const tones=process.env.TONE?[process.env.TONE]:['light','ebony'];
 for(const tone of tones){
  const look=global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:tone,hairStyle:tone==='ebony'?'hair-bob':'original',hairColor:tone==='ebony'?'pink':'black',eyeColor:tone==='ebony'?'green':'blue',eyeStyle:tone==='ebony'?'face-calm':'original'});
  const bare=act(look),r=api.selectVisual(bare,options),off=await draw(bare,options,r);
  for(const b of ids){
   const on=act(look,{boots:{def:b}}),saved=JSON.stringify(on),target=api.selectVisual(on,options),walkRec=api.selectVisual(on,walk);
   a(target?.id.includes(':own-b'+b+'-idle-phase0'),[tone,b,target?.id]);a.equal(target.slotRoutes.boots.item,b);a.deepEqual(target.omitted,[]);
   a.deepEqual(target.pack,r.pack);
   a.deepEqual(target.colorAppearance,r.colorAppearance);
   a.deepEqual(target.authoredPantsLayer.layers,walkRec.authoredPantsLayer.layers);
   a.equal(target.authoredPantsLayer.item,null);
   const result=await draw(on,options,target),phase=await draw(on,walk,walkRec);
   a(result.equals(phase),'approved walk phase zero differs from idle');
   const donor=idx.records.find(x=>x.id===`frozen-v47-female-151-boot${b}-south-idle`);
   const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
   const layers=donor.pack.directions.south.layers.filter(l=>l.id.startsWith('boot'+b+'-'));
   for(const l of layers)ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png'),0,0);
   const mask=px(c);let delta=0,sole=0;
   for(let i=0;i<off.length;i+=4){
    if(result.readUInt32LE(i)===off.readUInt32LE(i))continue;
    a(mask[i+3],'unrelated pixel changed');delta++;
   }
   a(delta>250);ctx.clearRect(0,0,512,512);
   for(const l of layers.filter(x=>x.id.endsWith('-front')))ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png'),0,0);
   const front=px(c);
   for(let i=0;i<off.length;i+=4)if(front[i+3]===255){a([0,1,2,3].every(j=>Math.abs(front[i+j]-result[i+j])<=1),[b,i>>>11,(i>>>2)%512,result.readUInt32LE(i),front.readUInt32LE(i)]);sole++;}
   a(sole>0);
   a.equal(JSON.stringify(on),saved);a(off.equals(await draw(bare,options,api.selectVisual(bare,options))));
   a(!api.selectVisual({...on,equipment:{boots:{def:b,variant:'test'}}},options)?.id.includes(':own-b'+b+'-idle-phase0'));
   console.log('PASS',tone,b,delta,sole);c.width=1;global.gc?.();
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
