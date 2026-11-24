'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the published game');
const {make,cv}=require('./rework-integration-support.cjs');
const mod=s=>require(path.join(root,s)),looks=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),
 catalog=mod('tools/paper-doll-96-v3/weapons.json'),loader=require('../tools/rework-hd-test-loader.cjs').create(root);
const raw=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
(async()=>{
 const api=make();await api.ready;
 const v5=looks.commit({classId:'gunner',equipment:{weapon:{def:115},coat:{def:151},head:{def:157}}},
  {gender:'masculino',skinColor:'light',hairColor:'black',eyeColor:'blue',hairStyle:'hair-spiky',eyeStyle:'original'},()=>true);
 const signed=world.selectWorldHDOnly(api,catalog,v5,{consumer:'world',direction:'south',action:'attack-firearm'});
 assert.equal(signed.id,'rifle115-v5-south-native-layers');assert.equal(new Set(signed.timeline).size,5);
 const guns=catalog.items.filter(w=>w.category===catalog.classes.gunner).map(w=>w.itemId);assert.equal(guns.length,6);
 const heads=global.MareReworkHead.create(mod('tools/rework-accessories/head-layer-index.json'),{appearanceAPI:global.MareAppearance96,makeCanvas:cv.createCanvas});
 const full={coat:130,legs:168,boots:148,gloves:159};let contexts=0,phases=0,eyePixels=0,skullPhases=0,fringe=0,matchedLids=0;
 for(const weapon of guns)for(const direction of ['south','north','east','west']){
  const o={action:'attack-firearm',direction,consumer:'world'};
  function choose(hairStyle,eyeStyle,head){
   const items={...full,weapon,...(head==null?{}:{head})},equipment=Object.fromEntries(Object.entries(items).map(([slot,def])=>[slot,{def}]));
   const p=looks.commit({classId:'gunner',equipment},{gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'blue',hairStyle,eyeStyle},()=>true);
   const r=world.selectWorldHDOnly(api,catalog,p,o);assert(r&&!r.omitted?.length&&!r.visualDegraded&&!r.appearanceAdapted,[weapon,direction,hairStyle,eyeStyle,head]);
   assert.equal(r.resolvedAction||r.action,o.action);assert.equal(r.direction,direction);
   for(const [slot,id] of Object.entries(items)){assert.equal(r.slotRoutes[slot].item,id);assert.equal(r.slotRoutes[slot].quality,'hd');}
   return {p,r};
  }
  const normal=choose('hair-cropped','original',178),calm=choose('hair-cropped','face-calm',178);
  assert.notEqual(normal.r.id,calm.r.id);assert.deepEqual(normal.r.timeline,calm.r.timeline);
  for(const face of Object.keys(looks.choices.eyeStyle))for(const hair of ['original','hair-cropped','none'])choose(hair,face,19);
  const h=calm.r.namedFirearmHead.h,eye=global.MareReworkEyeStylesHD.maleSource({pack:h.pack,direction});
  assert(eye);const detailed=(weapon===114&&direction==='east')||(weapon===115&&direction==='south')||(weapon===116&&direction==='west')||(weapon===4&&direction==='north');
  let foreground;
  if(detailed&&!eye.north){
   const sources=new Map();for(const file of heads.requiredFiles(h.named))sources.set(file,await loader(file));
   foreground=heads.composeNative(h.named,sources,{width:160,height:160,targetNeck:h.pack.directions[direction].rest.NECK,
    look:h.look,hairRamp:global.MareAppearance96.hairs.blue.ramp});
  }
  const bald=detailed&&choose('none','original',null),original=detailed&&choose('original','original',null);
  const cases=detailed?[normal,calm,bald,original]:[normal,calm],configs=[];
  for(const {p,r} of cases)configs.push(await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})}));
  function draw(i,t){let pixels;assert(configs[i].draw({save(){},restore(){},drawImage(c){pixels=raw(c);}},cases[i].p,{...o,progress:(t+.25)/cases[i].r.timeline.length}));return pixels;}
  function image(im){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(im,0,0);const px=raw(c);c.width=1;return px;}
  const hair=detailed&&image(await loader('tools/rework-base-hd/assets/'+h.hair.source+'.png'));
  const skull=detailed&&image(await loader('tools/rework-base-hd/assets/'+h.skull.source+'.png'));
  try{
   assert(configs.every(c=>!c.coverage[0].omitted?.length));
   const seen=new Set();for(let t=0;t<calm.r.timeline.length;t++){
    const key=calm.r.timeline[t];if(seen.has(key))continue;seen.add(key);
    const i=calm.r.states.findIndex(s=>s.state===key);assert(i>=0);
    const pose=h.states?.[i],dx=pose?.x||0,dy=pose?.y||0,tag=[weapon,direction,i].join('/');
    const a=draw(0,t),b=draw(1,t);const bounds=(eye.boxes||[]).map(([l,t,r,b])=>[l+dx,t+dy,r+dx,b+dy]);
    let changed=0;for(let j=0;j<a.length;j++)if(a[j]!==b[j]){
     const x=j%640,y=Math.floor(j/640);assert(bounds.some(([l,t,r,b])=>l<=x&&x<=r&&t<=y&&y<=b),tag+' outside signed eyes '+x+','+y);
     assert.equal(a[j]>>>24,b[j]>>>24);changed++;
    }
    if(foreground){
     const occluded=new Uint8Array(640*310);for(const [s,n] of pose?.guard||[])occluded.fill(1,s,s+n);
     const ref=cv.createCanvas(640,640),cx=ref.getContext('2d'),prior=cx.createImageData(640,640);
     new Uint32Array(prior.data.buffer).set(a);cx.putImageData(prior,0,0);
     global.MareReworkEyeStylesHD.reshape(cx,'face-calm',direction,bounds);const correct=raw(ref);ref.width=1;
     for(const [left,top,right,bottom] of bounds)for(let x=left;x<=right;x++){
      let blocked=false;for(let y=top;y<=bottom;y++){
       const k=y*640+x,j=(k-dy*640-dx)*4+3;
       if(occluded[k]||foreground.head[j]||foreground.hair[j]){blocked=true;break;}
      }
      if(blocked)continue;
      for(let y=top;y<=bottom;y++){const k=y*640+x;assert.equal(b[k],correct[k],tag+' signed eyelid');if(correct[k]!==a[k])matchedLids++;}
     }
    }
    if(eye.north)assert.equal(changed,0);else assert(changed>2,tag+' no expression pixels');
    for(const [start,count] of pose?.guard||[])for(let k=start;k<start+count;k++)assert.equal(a[k],b[k],tag+' foreground weapon');
    phases++;eyePixels+=changed;
    if(detailed){
     const baldPixels=draw(2,t),old=draw(3,t),covered=new Set();
     for(const [s,n] of pose?.guard||[])for(let j=s;j<s+n;j++)covered.add(j);
     let removed=0,left=0;for(let y=50;y<177;y++)for(let x=170;x<470;x++){
      const j=y*640+x,k=j-dy*640-dx;if(covered.has(j))continue;
      if(hair[k]>>>24===255&&!skull[k]&&old[j]>>>24===255){removed++;if(baldPixels[j]>>>24)left++;}
     }
     assert(removed>5,tag+' no signed hair fringe');assert.equal(left,0,tag+' ghost hair');skullPhases++;fringe+=removed;
    }
   }
   contexts++;
  }finally{for(const c of configs)c.release();}
 }
 assert.equal(contexts,24);assert(phases>=130);assert(skullPhases>=25);assert(eyePixels>3000&&fringe>3000&&matchedLids>250);
 console.log(JSON.stringify({contexts,phases,eyePixels,skullPhases,fringe,matchedLids}));
})().catch(e=>{console.error(e);process.exitCode=1;});
