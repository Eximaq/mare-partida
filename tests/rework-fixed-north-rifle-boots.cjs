'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the published game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const {gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const crop=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const art=h=>load('tools/rework-modular-outfits-hd/assets/'+h+'.png');
const options={action:'attack-firearm',direction:'north',consumer:'world'};
const stockOptions={...options,action:'attack-unarmed'};
(async()=>{
 const api=make();await api.ready;let pairs=0,states=0,soloTicks=0;
 const ids=process.argv.slice(2).map(Number),all=[4,5,113,115,116];
 assert(!ids.length||ids.every(id=>all.includes(id)));const group=ids.length?ids:all;
 const cache=new Map();
 for(const weapon of group){
  const p=look.commit({classId:'gunner',equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const player=parts=>({...p,equipment:Object.fromEntries(Object.entries(parts).map(([k,def])=>[k,{def}]))});
  const select=(a,o=options)=>world.selectWorldHDOnly(api,weapons,a,o);
  const prep=(a,r)=>api.prepareConfiguration([{player:a,options}],{resolve:()=>({player:a,options,source:r})});
  const draw=(b,q,t)=>{let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},q,{...options,progress:(t+.2)/48}));return c;};
  for(const legs of [null,...gear[1]]){
   const worn={weapon,...(legs==null?{}:{legs})},bare=player(worn),r0=select(bare),b0=await prep(bare,r0);
   try{for(const boots of gear[2]){
    const actor=player({...worn,boots}),result=select(actor);assert.deepEqual(result.omitted,[]);
    if(legs!=null)assert.deepEqual(result.slotRoutes.legs,r0.slotRoutes.legs);
    assert.deepEqual(result.slotRoutes.weapon,r0.slotRoutes.weapon);
    assert.deepEqual(select(player({boots,...worn})).slotRoutes,result.slotRoutes);
    const ref=select(player({boots}),stockOptions).independentPlan.passes.get('boots');
    const layers=[...ref.layers].sort((a,b)=>a.depth-b.depth).map(l=>({z:l.depth,h:l.frames?.[0]||l.source}));
    const feet=result.rifleLower.foot;
    assert.deepEqual(feet.rear,layers.filter(l=>l.z<0).map(l=>l.h));
    assert.deepEqual(feet.front,layers.filter(l=>l.z>0).map(l=>l.h));
    if(!cache.has(boots)){
     const parts=[];for(const l of layers){
      const im=await art(l.h);assert.equal(im.width,640);assert.equal(im.height,640);
      const tmp=cv.createCanvas(640,640),tx=tmp.getContext('2d');tx.drawImage(im,0,0);const bytes=crop(tmp);
      for(let k=3;k<bytes.length;k+=4)if(bytes[k]){const x=(k>>>2)%640,y=Math.floor((k>>>2)/640);assert(x>=235&&x<409&&y>=380&&y<540);}
      parts.push({z:l.z,img:im});tmp.width=1;
     }
     cache.set(boots,parts);
    }
    const b=await prep(actor,result);assert.deepEqual(b.coverage[0].omitted,[]);
    try{
     const statesSeen=new Map();
     for(let t=0;t<48;t++){
      const phase=+r0.timeline[t];if(legs!=null&&statesSeen.has(phase))continue;
      const after=crop(draw(b,actor,t));
      if(!statesSeen.has(phase)){
       const before=draw(b0,bare,t),ref=cv.createCanvas(640,640),cx=ref.getContext('2d');
       cx.drawImage(before,0,0);cx.globalCompositeOperation='destination-over';
       for(const part of cache.get(boots).filter(p=>p.z<0).reverse())cx.drawImage(part.img,0,0);
       cx.globalCompositeOperation='source-over';for(const part of cache.get(boots).filter(p=>p.z>0))cx.drawImage(part.img,0,0);
       const expected=crop(ref);assert(!expected.equals(crop(before)),'Foot must be visible');
       statesSeen.set(phase,expected);ref.width=1;
      }
      assert(after.equals(statesSeen.get(phase)),[weapon,legs,boots,t,phase,'foot over actual trousers'].join('/'));
      if(legs==null)soloTicks++;else states++;
     }
     assert.equal(statesSeen.size,3);if(legs!=null)pairs++;
    }finally{b.release();}
   }}finally{b0.release();}
   global.gc?.();
  }
  console.log(weapon,'10 boots, 100 pairs, 3 authored recoil states');
 }
 assert.equal(pairs,100*group.length);assert.equal(states,300*group.length);assert.equal(soloTicks,480*group.length);
 if(process.env.HD_RIFLE_RESULTS)fs.writeFileSync(process.env.HD_RIFLE_RESULTS,JSON.stringify({group,pairs,states,soloTicks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
