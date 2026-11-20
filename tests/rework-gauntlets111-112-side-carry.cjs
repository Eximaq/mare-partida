'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),api=make();
const load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname)),V=global.ReworkAccessoryVendor.compositor;
const save=(item,tone='light',extras={},app={})=>JSON.parse(JSON.stringify(A.commit({id:'gauntlet-side',classId:'brawler',equipment:{weapon:{def:item}},...extras},{skinColor:tone,...app},()=>true)));
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const skins=process.env.SHORT_TEST?['light','ebony']:Object.keys(A.skins);
const items=process.argv[2]?[Number(process.argv[2])]:[111,112],directions=['east','west'],actions=['idle','walk'];
(async()=>{
 await api.ready;
 for(const item of items)for(const direction of directions)for(const action of actions){
  const opt={direction,action,consumer:'world'},q=save(item),stock={...q,appearance96:{...q.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
  const own=api.selectVisual(q,opt),legacy=api.selectVisual(stock,opt);
  a(own?.gauntletPairSideSavedPalette,'expected exact HD lateral carry with saved appearance');
  const {base,plan,r:unused}=own;const parts=plan.parts;
  a.deepEqual(base,legacy.base);a.deepEqual(parts.map(({joinedFringe,...v})=>v),legacy.plan.parts);a(!parts[1].joinedFringe);
  a.equal(base.mirrorX===true,direction==='west');
  a.equal(own.relicEyes.samples.length,18);
  for(const [actor,more]of [[save(item,'light',{classId:'cyborg'}),{}],[save(item,'light',{equipment:{weapon:{def:item},gloves:{def:26}}}),{}],
   [save(item,'light',{equipment:{weapon:{def:item,appearanceVariant:'other'}}}),{}],[save(item,'light',{}, {hairColor:'brown'}),{}],[stock,{}],
   [q,{weaponless:true}],[q,{consumer:'portrait'}],[q,{action:'attack-unarmed'}],[q,{direction:'south'}],[q,{direction:'north'}]])
   a(!api.selectVisual(actor,{...opt,...more})?.gauntletPairSideSavedPalette);
  const d=base.pack.directions[direction],n=d.clip.frames,near=d.layers.find(l=>l.id==='handNear'),part=parts[0];
  a.equal(n,action==='walk'?16:1);a.equal(d.clip.fps,n);a.deepEqual(base.pack.pivot,{x:64,y:112});
  a.deepEqual([near.binding.a,near.binding.b],[part.binding.a,part.binding.b]);a.equal(d.layers.some(l=>l.binding?.a===parts[1].binding.a&&l.binding?.b===parts[1].binding.b),false);
  const crop=await load('tools/rework-weapon-layers-hd/'+part.source.url);
  const skin=await load('tools/rework-weapon-layers-hd/'+part.joinedFringe.urls[0]);
  const cloth=await load('tools/rework-weapon-layers-hd/'+part.joinedFringe.urls[2]);
  const gear=await load('tools/rework-weapon-layers-hd/'+part.joinedFringe.urls[1]);
  const plane=(image)=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(image,0,0);return px(c);};
  const C=plane(crop),S=plane(skin),P=plane(cloth),G=plane(gear);
  let sCount=0,pCount=0,originalCount=0;
  for(let k=0;k<C.length;k+=4)if(C[k+3]){
   originalCount++;if(S[k+3]){sCount++;a(!P[k+3]&&G[k+3]<255);}if(P[k+3]){pCount++;a(!S[k+3]&&G[k+3]<255);}
  }
  a.deepEqual([originalCount,sCount,pCount],item===111?[1880,1228,519]:[1198,679,421]);
  const controls=[];
  for(let f=0;f<n;f++){
   const z=cv.createCanvas(512,512),zz=z.getContext('2d'),ps=d.poses[f],m=V.rigid(part.sourceBone[part.binding.b],part.sourceBone[part.binding.a],ps[part.binding.b],ps[part.binding.a]);
   const proyect=(img,mirror=true)=>{zz.resetTransform();zz.clearRect(0,0,512,512);if(mirror&&base.mirrorX){zz.translate(512,0);zz.scale(-1,1);}zz.imageSmoothingEnabled=false;zz.transform(...m.slice(0,4),m[4]*4,m[5]*4);zz.drawImage(img,0,0);return px(z);};
   const material=proyect(skin),metal=proyect(gear),garment=proyect(cloth),mounted=proyect(crop);
   zz.resetTransform();zz.clearRect(0,0,512,512);if(base.mirrorX){zz.translate(512,0);zz.scale(-1,1);}
   const ras=await load('tools/rework-base-hd/assets/'+near.source+'.png');
   V.render(zz,{...base.pack,directions:{[direction]:{...d,layers:[near]}}},new Map([[near.source,ras]]),{direction,frame:f,density:4});
   const palm=px(z);let contact=0;
   for(let i=3;i<palm.length;i+=4)if(palm[i]&&mounted[i])contact++;
   a(contact>50,'native near hand remains connected');
   controls.push({material,garment,metal,contact});
  }
  const draw=(handle,u,i)=>{let c;a(handle.draw({save(){},restore(){},drawImage(x){c=x;}},u,{...opt,progress:(i+.25)/n}));return px(c);};
  const original=await api.prepareConfiguration([{player:stock,source:legacy,options:opt}],{resolve:x=>x});
  const silhouette=Array.from({length:n},(_,i)=>draw(original,stock,i));original.release();
  for(const tone of skins){
   const actor=save(item,tone),memo=JSON.stringify(actor),r=api.selectVisual(actor,opt);
   const uncolored={...r,id:r.id+':source-control',plan:{...r.plan,parts:r.plan.parts.map(({joinedFringe,...x})=>x)}};
   const removedFar={...r,id:r.id+':proof-only-far-removed',plan:{...r.plan,parts:r.plan.parts.slice(0,1)}};
   const get=source=>api.prepareConfiguration([{player:actor,source,options:opt}],{resolve:x=>x});
   const live=await get(r),ctrl=await get(uncolored),noFar=tone==='light'?await get(removedFar):null;
   let changed=0,shorts=0,opaque=0;
   try{
    for(let f=0;f<n;f++){
     const b=draw(live,actor,f),reference=draw(ctrl,actor,f),inplace=silhouette[f],{material,garment,metal}=controls[f];
     if(noFar)a(b.equals(draw(noFar,actor,f)),'far/equipped hand remains invisible, no foreign hand');
     for(let i=0;i<b.length;i+=4){
      a.equal(b[i+3],inplace[i+3]);const diff=b.readUInt32LE(i)!==reference.readUInt32LE(i);
      if(diff){a(material[i+3]>0,'not inside registered skin support');changed++;}
      if(garment[i+3]&&!material[i+3]){a(!diff);shorts++;}
      if(metal[i+3]===255&&!material[i+3]){a(!diff);opaque++;}
     }
    }
    a(changed>0&&shorts>0&&opaque>0);a.equal(JSON.stringify(actor),memo);
    console.log(item,direction,action,tone,n,'changed/cloth/metal/contact',changed,shorts,opaque,Math.min(...controls.map(x=>x.contact)));
   }finally{live.release();ctrl.release();noFar?.release();}
   global.gc?.();
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
